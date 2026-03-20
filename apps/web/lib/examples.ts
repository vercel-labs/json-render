export type Example = {
  slug: string;
  title: string;
  description: string;
  tags: string[];
  githubPath: string;
  demoUrl?: string;
};

const GITHUB_BASE =
  "https://github.com/vercel-labs/json-render/tree/main/examples";

export const examples: Example[] = [
  {
    slug: "chat",
    title: "Chat",
    description:
      "AI chat app with tool calling, streaming UI, and rich components powered by the AI SDK.",
    tags: ["React", "Next.js", "AI"],
    githubPath: "examples/chat",
    demoUrl: "https://chat-demo.json-render.dev",
  },
  {
    slug: "dashboard",
    title: "Dashboard",
    description:
      "AI-generated dashboard with drag-and-drop, charts, and real-time data binding.",
    tags: ["React", "Next.js", "AI"],
    githubPath: "examples/dashboard",
    demoUrl: "https://dashboard-demo.json-render.dev",
  },
  {
    slug: "no-ai",
    title: "No AI",
    description:
      "Static specs rendered without any AI — forms, cards, tables, and more from hardcoded JSON.",
    tags: ["React", "Next.js"],
    githubPath: "examples/no-ai",
    demoUrl: "https://no-ai-demo.json-render.dev",
  },
  {
    slug: "svelte",
    title: "Svelte",
    description:
      "Svelte renderer demo with counter, todo list, and two-way data binding.",
    tags: ["Svelte", "Vite"],
    githubPath: "examples/svelte",
    demoUrl: "https://svelte-demo.json-render.dev",
  },
  {
    slug: "svelte-chat",
    title: "Svelte Chat",
    description: "AI chat app built with SvelteKit and the Svelte renderer.",
    tags: ["Svelte", "SvelteKit", "AI"],
    githubPath: "examples/svelte-chat",
    demoUrl: "https://json-render-svelte-chat-demo.labs.vercel.dev",
  },
  {
    slug: "vue",
    title: "Vue",
    description:
      "Vue renderer demo with counter, todo list, and two-way data binding.",
    tags: ["Vue", "Vite"],
    githubPath: "examples/vue",
    demoUrl: "https://vue-demo.json-render.dev",
  },
  {
    slug: "solid",
    title: "Solid",
    description:
      "Solid renderer demo with counter, todo list, and two-way data binding.",
    tags: ["Solid", "Vite"],
    githubPath: "examples/solid",
    demoUrl: "https://solid-demo.json-render.dev",
  },
  {
    slug: "vite-renderers",
    title: "Multi-Framework Renderers",
    description:
      "Same spec rendered with React, Vue, Svelte, and Solid side by side — hot-swappable at runtime.",
    tags: ["React", "Vue", "Svelte", "Solid", "Vite"],
    githubPath: "examples/vite-renderers",
  },
  {
    slug: "react-email",
    title: "React Email",
    description:
      "Generate HTML and plain-text emails from json-render specs using React Email.",
    tags: ["React", "Email"],
    githubPath: "examples/react-email",
    demoUrl: "https://react-email-demo.json-render.dev",
  },
  {
    slug: "react-pdf",
    title: "React PDF",
    description:
      "Generate PDF documents from json-render specs with @react-pdf/renderer.",
    tags: ["React", "PDF"],
    githubPath: "examples/react-pdf",
    demoUrl: "https://react-pdf-demo.json-render.dev",
  },
  {
    slug: "react-three-fiber",
    title: "React Three Fiber",
    description:
      "3D scenes generated from json-render specs using Three.js and React Three Fiber.",
    tags: ["React", "3D"],
    githubPath: "examples/react-three-fiber",
    demoUrl: "https://react-three-fiber-demo.json-render.dev",
  },
  {
    slug: "react-native",
    title: "React Native",
    description:
      "Mobile app rendering json-render specs with Expo and React Native.",
    tags: ["React Native", "Expo"],
    githubPath: "examples/react-native",
  },
  {
    slug: "remotion",
    title: "Remotion",
    description: "Generate videos from json-render specs using Remotion.",
    tags: ["React", "Video"],
    githubPath: "examples/remotion",
    demoUrl: "https://remotion-demo.json-render.dev",
  },
  {
    slug: "image",
    title: "Image",
    description:
      "Generate OG images and social cards from json-render specs using Satori.",
    tags: ["React", "Image"],
    githubPath: "examples/image",
    demoUrl: "https://image-demo.json-render.dev",
  },
  {
    slug: "mcp",
    title: "MCP App",
    description:
      "MCP server that serves shadcn UIs to Claude, ChatGPT, Cursor, and VS Code.",
    tags: ["React", "MCP", "Vite"],
    githubPath: "examples/mcp",
  },
];

export const allTags = Array.from(
  new Set(examples.flatMap((e) => e.tags)),
).sort();

export function getGitHubUrl(example: Example): string {
  return `${GITHUB_BASE}/${example.slug}`;
}
