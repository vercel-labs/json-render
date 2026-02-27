import { tool } from "ai";
import { z } from "zod";

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

const ghHeaders = { Accept: "application/vnd.github.v3+json" };

function handleGitHubError(res: Response, context: string) {
  if (res.status === 404) return { error: `Not found: ${context}` };
  if (res.status === 403)
    return { error: "GitHub API rate limit exceeded. Try again later." };
  return { error: `Failed to fetch ${context}: ${res.statusText}` };
}

// ---------------------------------------------------------------------------
// getGitHubRepo
// ---------------------------------------------------------------------------

/**
 * Get public GitHub repository information.
 * Uses the public GitHub REST API (no auth, 60 req/hr rate limit).
 */
export const getGitHubRepo = tool({
  description:
    "Get information about a public GitHub repository including stars, forks, open issues, description, language, and recent activity.",
  inputSchema: z.object({
    owner: z.string().describe("Repository owner (e.g., 'vercel')"),
    repo: z.string().describe("Repository name (e.g., 'next.js')"),
  }),
  execute: async ({ owner, repo }) => {
    const repoUrl = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;

    const [repoRes, languagesRes] = await Promise.all([
      fetch(repoUrl, { headers: ghHeaders }),
      fetch(`${repoUrl}/languages`, { headers: ghHeaders }),
    ]);

    if (!repoRes.ok) {
      return handleGitHubError(repoRes, `${owner}/${repo}`);
    }

    const repoData = (await repoRes.json()) as {
      full_name: string;
      description: string | null;
      html_url: string;
      stargazers_count: number;
      forks_count: number;
      open_issues_count: number;
      watchers_count: number;
      language: string | null;
      license: { spdx_id: string } | null;
      created_at: string;
      updated_at: string;
      pushed_at: string;
      topics: string[];
      size: number;
      default_branch: string;
      archived: boolean;
      fork: boolean;
    };

    const languages: Record<string, number> = languagesRes.ok
      ? ((await languagesRes.json()) as Record<string, number>)
      : {};

    const totalBytes = Object.values(languages).reduce((a, b) => a + b, 0);
    const languageBreakdown = Object.entries(languages)
      .map(([lang, bytes]) => ({
        language: lang,
        percentage: Math.round((bytes / totalBytes) * 100),
        bytes,
      }))
      .sort((a, b) => b.bytes - a.bytes)
      .slice(0, 8);

    return {
      name: repoData.full_name,
      description: repoData.description,
      url: repoData.html_url,
      stars: repoData.stargazers_count,
      forks: repoData.forks_count,
      openIssues: repoData.open_issues_count,
      watchers: repoData.watchers_count,
      primaryLanguage: repoData.language,
      license: repoData.license?.spdx_id ?? "None",
      createdAt: repoData.created_at,
      updatedAt: repoData.updated_at,
      lastPush: repoData.pushed_at,
      topics: repoData.topics,
      defaultBranch: repoData.default_branch,
      archived: repoData.archived,
      isFork: repoData.fork,
      languages: languageBreakdown,
    };
  },
});

// ---------------------------------------------------------------------------
// getGitHubPullRequests
// ---------------------------------------------------------------------------

type GitHubPR = {
  number: number;
  title: string;
  state: string;
  html_url: string;
  user: { login: string } | null;
  created_at: string;
  updated_at: string;
  merged_at: string | null;
  comments: number;
  labels: Array<{ name: string }>;
  draft: boolean;
};

type GitHubPRReview = {
  id: number;
};

type GitHubPRReaction = {
  total_count: number;
};

/**
 * Get pull requests from a public GitHub repository.
 * Supports filtering by state and sorting by various criteria.
 * Fetches comment counts and reactions for ranking "most popular" PRs.
 */
export const getGitHubPullRequests = tool({
  description:
    "Get pull requests from a public GitHub repository. Returns titles, authors, state, comment counts, and reactions. Use sort='popularity' to find the most discussed / reacted PRs.",
  inputSchema: z.object({
    owner: z.string().describe("Repository owner (e.g., 'vercel')"),
    repo: z.string().describe("Repository name (e.g., 'next.js')"),
    state: z
      .enum(["open", "closed", "all"])
      .nullable()
      .describe("Filter by state. Defaults to 'open'."),
    sort: z
      .enum(["created", "updated", "popularity", "long-running"])
      .nullable()
      .describe(
        "Sort order. 'popularity' sorts by reactions+comments, 'long-running' sorts by age. Defaults to 'created'.",
      ),
    perPage: z
      .number()
      .int()
      .min(1)
      .max(30)
      .nullable()
      .describe("Number of PRs to return (1-30). Defaults to 10."),
  }),
  execute: async ({ owner, repo, state, sort, perPage }) => {
    const count = perPage ?? 10;
    const prState = state ?? "open";

    // GitHub API sort param: 'popularity' and 'long-running' are API-native
    const apiSort =
      sort === "popularity"
        ? "popularity"
        : sort === "long-running"
          ? "long-running"
          : sort === "updated"
            ? "updated"
            : "created";

    const url = new URL(
      `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls`,
    );
    url.searchParams.set("state", prState);
    url.searchParams.set("sort", apiSort);
    url.searchParams.set("direction", "desc");
    url.searchParams.set("per_page", String(count));

    const res = await fetch(url.toString(), { headers: ghHeaders });

    if (!res.ok) {
      return handleGitHubError(res, `${owner}/${repo} pull requests`);
    }

    const prs = (await res.json()) as GitHubPR[];

    // Fetch review + reaction counts in parallel for richer data
    const enriched = await Promise.all(
      prs.map(async (pr) => {
        const base = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls/${pr.number}`;

        const [reviewsRes, reactionsRes] = await Promise.all([
          fetch(`${base}/reviews?per_page=100`, { headers: ghHeaders }),
          fetch(
            `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues/${pr.number}/reactions`,
            {
              headers: {
                ...ghHeaders,
                Accept: "application/vnd.github.squirrel-girl-preview+json",
              },
            },
          ),
        ]);

        const reviews: GitHubPRReview[] = reviewsRes.ok
          ? ((await reviewsRes.json()) as GitHubPRReview[])
          : [];

        let reactionCount = 0;
        if (reactionsRes.ok) {
          const reactions = (await reactionsRes.json()) as GitHubPRReaction[];
          reactionCount = reactions.length;
        }

        return {
          number: pr.number,
          title: pr.title,
          state: pr.merged_at ? "merged" : pr.state,
          author: pr.user?.login ?? "unknown",
          url: pr.html_url,
          createdAt: pr.created_at,
          updatedAt: pr.updated_at,
          comments: pr.comments,
          reviews: reviews.length,
          reactions: reactionCount,
          labels: pr.labels.map((l) => l.name),
          draft: pr.draft,
        };
      }),
    );

    return {
      repository: `${owner}/${repo}`,
      state: prState,
      count: enriched.length,
      pullRequests: enriched,
    };
  },
});
