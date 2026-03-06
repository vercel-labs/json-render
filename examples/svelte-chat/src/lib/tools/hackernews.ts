import { tool } from "ai";
import { z } from "zod";

/**
 * Get top stories from Hacker News.
 * Uses the official HN Firebase API. Free, no auth required.
 * https://github.com/HackerNewsAPI/API
 */
export const getHackerNewsTop = tool({
  description:
    "Get the current top stories from Hacker News, including title, score, author, URL, and comment count.",
  inputSchema: z.object({
    count: z
      .number()
      .min(1)
      .max(30)
      .describe("Number of top stories to fetch (1-30)"),
  }),
  execute: async ({ count }) => {
    const topUrl =
      "https://hacker-news.firebaseio.com/v0/topstories.json?print=pretty";
    const topRes = await fetch(topUrl);

    if (!topRes.ok) {
      return { error: "Failed to fetch Hacker News top stories" };
    }

    const topIds = (await topRes.json()) as number[];
    const storyIds = topIds.slice(0, count);

    const stories = await Promise.all(
      storyIds.map(async (id) => {
        const storyRes = await fetch(
          `https://hacker-news.firebaseio.com/v0/item/${id}.json?print=pretty`,
        );
        if (!storyRes.ok) return null;

        const story = (await storyRes.json()) as {
          id: number;
          title: string;
          url?: string;
          score: number;
          by: string;
          time: number;
          descendants?: number;
          type: string;
        };

        return {
          id: story.id,
          title: story.title,
          url: story.url ?? `https://news.ycombinator.com/item?id=${story.id}`,
          score: story.score,
          author: story.by,
          comments: story.descendants ?? 0,
          postedAt: new Date(story.time * 1000).toISOString(),
          hnUrl: `https://news.ycombinator.com/item?id=${story.id}`,
        };
      }),
    );

    return {
      stories: stories.filter(Boolean),
      fetchedAt: new Date().toISOString(),
    };
  },
});
