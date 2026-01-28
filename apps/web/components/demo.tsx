"use client";

import React, {
  useEffect,
  useState,
  useCallback,
  useRef,
  useMemo,
} from "react";
import { Renderer, useUIStream, JSONUIProvider } from "@json-render/react";
import type { UITree } from "@json-render/core";
import { collectUsedComponents, serializeProps } from "@json-render/codegen";
import { toast } from "sonner";
import { CodeBlock } from "./code-block";
import { CopyButton } from "./copy-button";
import { Toaster } from "./ui/sonner";
import {
  demoRegistry,
  fallbackComponent,
  useInteractiveState,
} from "./demo/index";

const SIMULATION_PROMPT = "Create a contact form with name, email, and message";

interface SimulationStage {
  tree: UITree;
  stream: string;
}

const SIMULATION_STAGES: SimulationStage[] = [
  {
    tree: {
      root: "card",
      elements: {
        card: {
          key: "card",
          type: "Card",
          props: { title: "Contact Us", maxWidth: "md" },
          children: [],
        },
      },
    },
    stream: '{"op":"set","path":"/root","value":"card"}',
  },
  {
    tree: {
      root: "card",
      elements: {
        card: {
          key: "card",
          type: "Card",
          props: { title: "Contact Us", maxWidth: "md" },
          children: ["name"],
        },
        name: {
          key: "name",
          type: "Input",
          props: { label: "Name", name: "name" },
        },
      },
    },
    stream:
      '{"op":"add","path":"/elements/card","value":{"key":"card","type":"Card","props":{"title":"Contact Us","maxWidth":"md"},"children":["name"]}}',
  },
  {
    tree: {
      root: "card",
      elements: {
        card: {
          key: "card",
          type: "Card",
          props: { title: "Contact Us", maxWidth: "md" },
          children: ["name", "email"],
        },
        name: {
          key: "name",
          type: "Input",
          props: { label: "Name", name: "name" },
        },
        email: {
          key: "email",
          type: "Input",
          props: { label: "Email", name: "email" },
        },
      },
    },
    stream:
      '{"op":"add","path":"/elements/email","value":{"key":"email","type":"Input","props":{"label":"Email","name":"email"}}}',
  },
  {
    tree: {
      root: "card",
      elements: {
        card: {
          key: "card",
          type: "Card",
          props: { title: "Contact Us", maxWidth: "md" },
          children: ["name", "email", "message"],
        },
        name: {
          key: "name",
          type: "Input",
          props: { label: "Name", name: "name" },
        },
        email: {
          key: "email",
          type: "Input",
          props: { label: "Email", name: "email" },
        },
        message: {
          key: "message",
          type: "Textarea",
          props: { label: "Message", name: "message" },
        },
      },
    },
    stream:
      '{"op":"add","path":"/elements/message","value":{"key":"message","type":"Textarea","props":{"label":"Message","name":"message"}}}',
  },
  {
    tree: {
      root: "card",
      elements: {
        card: {
          key: "card",
          type: "Card",
          props: { title: "Contact Us", maxWidth: "md" },
          children: ["name", "email", "message", "submit"],
        },
        name: {
          key: "name",
          type: "Input",
          props: { label: "Name", name: "name" },
        },
        email: {
          key: "email",
          type: "Input",
          props: { label: "Email", name: "email" },
        },
        message: {
          key: "message",
          type: "Textarea",
          props: { label: "Message", name: "message" },
        },
        submit: {
          key: "submit",
          type: "Button",
          props: { label: "Send Message", variant: "primary" },
        },
      },
    },
    stream:
      '{"op":"add","path":"/elements/submit","value":{"key":"submit","type":"Button","props":{"label":"Send Message","variant":"primary"}}}',
  },
];

type Mode = "simulation" | "interactive";
type Phase = "typing" | "streaming" | "complete";
type Tab = "stream" | "json";
type RenderView = "dynamic" | "static";

interface DemoProps {
  fullscreen?: boolean;
  skipSimulation?: boolean;
}

const EXAMPLE_PROMPTS = [
  "Create a login form with email and password",
  "Build a feedback form with rating stars",
  "Design a contact card with avatar",
  "Make a settings panel with toggles",
];

export function Demo({
  fullscreen = false,
  skipSimulation = false,
}: DemoProps) {
  const [mode, setMode] = useState<Mode>(
    skipSimulation ? "interactive" : "simulation",
  );
  const [phase, setPhase] = useState<Phase>(
    skipSimulation ? "complete" : "typing",
  );
  const [typedPrompt, setTypedPrompt] = useState("");
  const [userPrompt, setUserPrompt] = useState("");
  const [stageIndex, setStageIndex] = useState(-1);
  const [streamLines, setStreamLines] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>("json");
  const [renderView, setRenderView] = useState<RenderView>("dynamic");
  const [simulationTree, setSimulationTree] = useState<UITree | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [selectedExportFile, setSelectedExportFile] = useState<string | null>(
    null,
  );
  const [showMobileFileTree, setShowMobileFileTree] = useState(false);
  const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(
    new Set(),
  );
  const inputRef = useRef<HTMLInputElement>(null);

  // Disable body scroll when any modal is open
  useEffect(() => {
    if (isFullscreen || showExportModal) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isFullscreen, showExportModal]);

  // Use the library's useUIStream hook for real API calls
  const {
    tree: apiTree,
    isStreaming,
    send,
    clear,
  } = useUIStream({
    api: "/api/generate",
    onError: (err: Error) => {
      console.error("Generation error:", err);
      toast.error(err.message || "Generation failed. Please try again.");
    },
  } as Parameters<typeof useUIStream>[0]);

  // Initialize interactive state for Select components
  useInteractiveState();

  const currentSimulationStage =
    stageIndex >= 0 ? SIMULATION_STAGES[stageIndex] : null;

  // Determine which tree to display - keep simulation tree until new API response
  const currentTree =
    mode === "simulation"
      ? currentSimulationStage?.tree || simulationTree
      : apiTree || simulationTree;

  const stopGeneration = useCallback(() => {
    if (mode === "simulation") {
      setMode("interactive");
      setPhase("complete");
      setTypedPrompt(SIMULATION_PROMPT);
      setUserPrompt("");
    }
    clear();
  }, [mode, clear]);

  // Typing effect for simulation
  useEffect(() => {
    if (mode !== "simulation" || phase !== "typing") return;

    let i = 0;
    const interval = setInterval(() => {
      if (i < SIMULATION_PROMPT.length) {
        setTypedPrompt(SIMULATION_PROMPT.slice(0, i + 1));
        i++;
      } else {
        clearInterval(interval);
        setTimeout(() => setPhase("streaming"), 500);
      }
    }, 20);

    return () => clearInterval(interval);
  }, [mode, phase]);

  // Streaming effect for simulation
  useEffect(() => {
    if (mode !== "simulation" || phase !== "streaming") return;

    let i = 0;
    const interval = setInterval(() => {
      if (i < SIMULATION_STAGES.length) {
        const stage = SIMULATION_STAGES[i];
        if (stage) {
          setStageIndex(i);
          setStreamLines((prev) => [...prev, stage.stream]);
          setSimulationTree(stage.tree);
        }
        i++;
      } else {
        clearInterval(interval);
        setTimeout(() => {
          setPhase("complete");
          setMode("interactive");
          setUserPrompt("");
        }, 500);
      }
    }, 600);

    return () => clearInterval(interval);
  }, [mode, phase]);

  // Track stream lines from real API
  useEffect(() => {
    if (mode === "interactive" && apiTree) {
      // Convert tree to stream line for display
      const streamLine = JSON.stringify({ tree: apiTree });
      if (
        !streamLines.includes(streamLine) &&
        Object.keys(apiTree.elements).length > 0
      ) {
        setStreamLines((prev) => {
          const lastLine = prev[prev.length - 1];
          if (lastLine !== streamLine) {
            return [...prev, streamLine];
          }
          return prev;
        });
      }
    }
  }, [mode, apiTree, streamLines]);

  const handleSubmit = useCallback(async () => {
    if (!userPrompt.trim() || isStreaming) return;
    setStreamLines([]);
    await send(userPrompt);
  }, [userPrompt, isStreaming, send]);

  // Expose action handler for registry components - shows toast with text
  useEffect(() => {
    (
      window as unknown as { __demoAction?: (text: string) => void }
    ).__demoAction = (text: string) => {
      toast(text);
    };
    return () => {
      delete (window as unknown as { __demoAction?: (text: string) => void })
        .__demoAction;
    };
  }, []);

  const jsonCode = currentTree
    ? JSON.stringify(currentTree, null, 2)
    : "// waiting...";

  // Generate all export files for Next.js project
  const exportedFiles = useMemo(() => {
    if (!currentTree || !currentTree.root) {
      return [];
    }

    const tree = currentTree;
    const components = collectUsedComponents(tree);
    const files: { path: string; content: string }[] = [];

    // Helper to generate JSX
    function generateJSX(key: string, indent: number): string {
      const element = tree.elements[key];
      if (!element) return "";

      const spaces = "  ".repeat(indent);
      const componentName = element.type;

      const propsObj: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(element.props)) {
        if (v !== null && v !== undefined) {
          propsObj[k] = v;
        }
      }

      const propsStr = serializeProps(propsObj);
      const hasChildren = element.children && element.children.length > 0;

      if (!hasChildren) {
        return propsStr
          ? `${spaces}<${componentName} ${propsStr} />`
          : `${spaces}<${componentName} />`;
      }

      const lines: string[] = [];
      lines.push(
        propsStr
          ? `${spaces}<${componentName} ${propsStr}>`
          : `${spaces}<${componentName}>`,
      );

      for (const childKey of element.children!) {
        lines.push(generateJSX(childKey, indent + 1));
      }

      lines.push(`${spaces}</${componentName}>`);
      return lines.join("\n");
    }

    // 1. package.json
    files.push({
      path: "package.json",
      content: JSON.stringify(
        {
          name: "generated-app",
          version: "0.1.0",
          private: true,
          scripts: {
            dev: "next dev",
            build: "next build",
            start: "next start",
          },
          dependencies: {
            next: "^16.1.3",
            react: "^19.2.3",
            "react-dom": "^19.2.3",
          },
          devDependencies: {
            "@types/node": "^25.0.9",
            "@types/react": "^19.2.8",
            typescript: "^5.9.3",
          },
        },
        null,
        2,
      ),
    });

    // 2. tsconfig.json
    files.push({
      path: "tsconfig.json",
      content: JSON.stringify(
        {
          compilerOptions: {
            target: "ES2017",
            lib: ["dom", "dom.iterable", "esnext"],
            allowJs: true,
            skipLibCheck: true,
            strict: true,
            noEmit: true,
            esModuleInterop: true,
            module: "esnext",
            moduleResolution: "bundler",
            resolveJsonModule: true,
            isolatedModules: true,
            jsx: "preserve",
            incremental: true,
            plugins: [{ name: "next" }],
            paths: { "@/*": ["./*"] },
          },
          include: ["next-env.d.ts", "**/*.ts", "**/*.tsx"],
          exclude: ["node_modules"],
        },
        null,
        2,
      ),
    });

    // 3. next.config.js
    files.push({
      path: "next.config.js",
      content: `/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: true,
};
`,
    });

    // 4. app/globals.css
    files.push({
      path: "app/globals.css",
      content: `@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --background: #ffffff;
  --foreground: #171717;
  --border: #e5e5e5;
  --muted-foreground: #737373;
}

@media (prefers-color-scheme: dark) {
  :root {
    --background: #0a0a0a;
    --foreground: #ededed;
    --border: #262626;
    --muted-foreground: #a3a3a3;
  }
}

body {
  background: var(--background);
  color: var(--foreground);
  font-family: system-ui, sans-serif;
}
`,
    });

    // 5. tailwind.config.js
    files.push({
      path: "tailwind.config.js",
      content: `/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        border: "var(--border)",
        "muted-foreground": "var(--muted-foreground)",
      },
    },
  },
  plugins: [],
};
`,
    });

    // 6. app/layout.tsx
    files.push({
      path: "app/layout.tsx",
      content: `import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Generated App",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
`,
    });

    // 7. Component files
    const componentTemplates: Record<string, string> = {
      Card: `"use client";

import { ReactNode } from "react";

interface CardProps {
  title?: string;
  description?: string;
  maxWidth?: "sm" | "md" | "lg";
  children?: ReactNode;
}

export function Card({ title, description, maxWidth, children }: CardProps) {
  const widthClass = maxWidth === "sm" ? "max-w-xs" : maxWidth === "md" ? "max-w-sm" : maxWidth === "lg" ? "max-w-md" : "w-full";
  
  return (
    <div className={\`border border-border rounded-lg p-4 bg-background \${widthClass}\`}>
      {title && <div className="font-semibold text-sm mb-1">{title}</div>}
      {description && <div className="text-xs text-muted-foreground mb-2">{description}</div>}
      <div className="space-y-3">{children}</div>
    </div>
  );
}
`,
      Input: `"use client";

interface InputProps {
  label?: string;
  name?: string;
  type?: string;
  placeholder?: string;
}

export function Input({ label, name, type = "text", placeholder }: InputProps) {
  return (
    <div>
      {label && <label className="text-xs text-muted-foreground block mb-1">{label}</label>}
      <input
        type={type}
        name={name}
        placeholder={placeholder}
        className="h-9 w-full bg-background border border-border rounded px-3 text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20"
      />
    </div>
  );
}
`,
      Textarea: `"use client";

interface TextareaProps {
  label?: string;
  name?: string;
  placeholder?: string;
  rows?: number;
}

export function Textarea({ label, name, placeholder, rows = 3 }: TextareaProps) {
  return (
    <div>
      {label && <label className="text-xs text-muted-foreground block mb-1">{label}</label>}
      <textarea
        name={name}
        placeholder={placeholder}
        rows={rows}
        className="w-full bg-background border border-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20 resize-none"
      />
    </div>
  );
}
`,
      Button: `"use client";

interface ButtonProps {
  label: string;
  variant?: "primary" | "secondary" | "outline";
  onClick?: () => void;
}

export function Button({ label, variant = "primary", onClick }: ButtonProps) {
  const baseClass = "px-4 py-2 rounded text-sm font-medium transition-colors";
  const variantClass = variant === "primary" 
    ? "bg-foreground text-background hover:bg-foreground/90"
    : variant === "outline"
    ? "border border-border hover:bg-border/50"
    : "bg-border/50 hover:bg-border";
    
  return (
    <button onClick={onClick} className={\`\${baseClass} \${variantClass}\`}>
      {label}
    </button>
  );
}
`,
      Text: `"use client";

interface TextProps {
  content: string;
  variant?: "body" | "caption" | "label";
}

export function Text({ content, variant = "body" }: TextProps) {
  const sizeClass = variant === "caption" ? "text-xs" : variant === "label" ? "text-sm font-medium" : "text-sm";
  return <p className={\`\${sizeClass} text-muted-foreground\`}>{content}</p>;
}
`,
      Heading: `"use client";

interface HeadingProps {
  text: string;
  level?: "h1" | "h2" | "h3" | "h4";
}

export function Heading({ text, level = "h2" }: HeadingProps) {
  const Tag = level;
  const sizeClass = level === "h1" ? "text-2xl" : level === "h2" ? "text-xl" : level === "h3" ? "text-lg" : "text-base";
  return <Tag className={\`\${sizeClass} font-semibold\`}>{text}</Tag>;
}
`,
      Stack: `"use client";

import { ReactNode } from "react";

interface StackProps {
  direction?: "horizontal" | "vertical";
  gap?: "sm" | "md" | "lg";
  children?: ReactNode;
}

export function Stack({ direction = "vertical", gap = "md", children }: StackProps) {
  const gapClass = gap === "sm" ? "gap-2" : gap === "lg" ? "gap-6" : "gap-4";
  const dirClass = direction === "horizontal" ? "flex-row" : "flex-col";
  return <div className={\`flex \${dirClass} \${gapClass}\`}>{children}</div>;
}
`,
      Grid: `"use client";

import { ReactNode } from "react";

interface GridProps {
  columns?: number;
  gap?: "sm" | "md" | "lg";
  children?: ReactNode;
}

export function Grid({ columns = 2, gap = "md", children }: GridProps) {
  const gapClass = gap === "sm" ? "gap-2" : gap === "lg" ? "gap-6" : "gap-4";
  return (
    <div className={\`grid \${gapClass}\`} style={{ gridTemplateColumns: \`repeat(\${columns}, 1fr)\` }}>
      {children}
    </div>
  );
}
`,
      Select: `"use client";

interface SelectProps {
  label?: string;
  name?: string;
  options?: Array<{ value: string; label: string }>;
  placeholder?: string;
}

export function Select({ label, name, options = [], placeholder }: SelectProps) {
  return (
    <div>
      {label && <label className="text-xs text-muted-foreground block mb-1">{label}</label>}
      <select
        name={name}
        className="h-9 w-full bg-background border border-border rounded px-3 text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20"
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
}
`,
      Checkbox: `"use client";

interface CheckboxProps {
  label?: string;
  name?: string;
  checked?: boolean;
}

export function Checkbox({ label, name, checked }: CheckboxProps) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" name={name} defaultChecked={checked} className="rounded border-border" />
      {label}
    </label>
  );
}
`,
      Radio: `"use client";

interface RadioProps {
  label?: string;
  name?: string;
  options?: Array<{ value: string; label: string }>;
}

export function Radio({ label, name, options = [] }: RadioProps) {
  return (
    <div>
      {label && <div className="text-xs text-muted-foreground mb-1">{label}</div>}
      <div className="space-y-1">
        {options.map((opt) => (
          <label key={opt.value} className="flex items-center gap-2 text-sm">
            <input type="radio" name={name} value={opt.value} className="border-border" />
            {opt.label}
          </label>
        ))}
      </div>
    </div>
  );
}
`,
      Divider: `"use client";

export function Divider() {
  return <hr className="border-border my-4" />;
}
`,
      Badge: `"use client";

interface BadgeProps {
  text: string;
  variant?: "default" | "success" | "warning" | "error";
}

export function Badge({ text, variant = "default" }: BadgeProps) {
  const colorClass = variant === "success" ? "bg-green-100 text-green-800" 
    : variant === "warning" ? "bg-yellow-100 text-yellow-800"
    : variant === "error" ? "bg-red-100 text-red-800"
    : "bg-border text-foreground";
  return <span className={\`px-2 py-0.5 rounded text-xs \${colorClass}\`}>{text}</span>;
}
`,
      Switch: `"use client";

interface SwitchProps {
  label?: string;
  name?: string;
  checked?: boolean;
}

export function Switch({ label, name, checked }: SwitchProps) {
  return (
    <label className="flex items-center justify-between gap-2 text-sm">
      {label}
      <input type="checkbox" name={name} defaultChecked={checked} className="sr-only peer" />
      <div className="w-9 h-5 bg-border rounded-full peer-checked:bg-foreground transition-colors relative after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:w-4 after:h-4 after:bg-background after:rounded-full after:transition-transform peer-checked:after:translate-x-4" />
    </label>
  );
}
`,
      Rating: `"use client";

interface RatingProps {
  label?: string;
  value?: number;
  max?: number;
}

export function Rating({ label, value = 0, max = 5 }: RatingProps) {
  return (
    <div>
      {label && <div className="text-xs text-muted-foreground mb-1">{label}</div>}
      <div className="flex gap-1">
        {Array.from({ length: max }).map((_, i) => (
          <span key={i} className={\`text-lg \${i < value ? "text-yellow-400" : "text-border"}\`}>★</span>
        ))}
      </div>
    </div>
  );
}
`,
      Form: `"use client";

import { ReactNode } from "react";

interface FormProps {
  children?: ReactNode;
}

export function Form({ children }: FormProps) {
  return <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>{children}</form>;
}
`,
    };

    // Add component files
    for (const comp of components) {
      const template = componentTemplates[comp];
      if (template) {
        files.push({
          path: `components/ui/${comp.toLowerCase()}.tsx`,
          content: template,
        });
      }
    }

    // 8. components/ui/index.ts
    const indexExports = Array.from(components)
      .filter((c) => componentTemplates[c])
      .map((c) => `export { ${c} } from "./${c.toLowerCase()}";`)
      .join("\n");
    files.push({
      path: "components/ui/index.ts",
      content: indexExports + "\n",
    });

    // 9. app/page.tsx
    const jsx = generateJSX(tree.root, 2);
    const imports = Array.from(components)
      .filter((c) => componentTemplates[c])
      .sort()
      .join(", ");
    files.push({
      path: "app/page.tsx",
      content: `"use client";

import { ${imports} } from "@/components/ui";

export default function Page() {
  return (
    <div className="min-h-screen p-8 flex items-center justify-center">
${jsx}
    </div>
  );
}
`,
    });

    // 10. README.md
    files.push({
      path: "README.md",
      content: `# Generated App

This app was generated from a json-render UI tree.

## Getting Started

\`\`\`bash
npm install
npm run dev
\`\`\`

Open [http://localhost:3000](http://localhost:3000) to view.
`,
    });

    return files;
  }, [currentTree]);

  // Reset state when export modal closes
  useEffect(() => {
    if (!showExportModal) {
      setCollapsedFolders(new Set());
      setSelectedExportFile(null);
    }
  }, [showExportModal]);

  // Get active file content
  const activeExportFile =
    selectedExportFile ||
    (exportedFiles.length > 0 ? exportedFiles[0]?.path : null);
  const activeExportContent =
    exportedFiles.find((f) => f.path === activeExportFile)?.content || "";

  // Get generated page code for the code tab
  const generatedCode =
    exportedFiles.find((f) => f.path === "app/page.tsx")?.content ||
    "// Generate a UI to see the code";

  const downloadAllFiles = useCallback(() => {
    const allContent = exportedFiles
      .map((f) => `// ========== ${f.path} ==========\n${f.content}`)
      .join("\n\n");
    const blob = new Blob([allContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "generated-app.txt";
    a.click();
    URL.revokeObjectURL(url);
    toast("Downloaded generated-app.txt");
  }, [exportedFiles]);

  const copyFileContent = useCallback((content: string) => {
    navigator.clipboard.writeText(content);
    toast("Copied to clipboard");
  }, []);

  const isTypingSimulation = mode === "simulation" && phase === "typing";
  const isStreamingSimulation = mode === "simulation" && phase === "streaming";
  const showLoadingDots = isStreamingSimulation || isStreaming;

  const handleExampleClick = useCallback((prompt: string) => {
    setMode("interactive");
    setPhase("complete");
    setUserPrompt(prompt);
    setTimeout(() => inputRef.current?.focus(), 0);
  }, []);

  return (
    <div
      className={`w-full text-left ${fullscreen ? "h-full flex flex-col" : "max-w-5xl mx-auto"}`}
    >
      {/* Prompt input */}
      <div className={fullscreen ? "mb-4" : "mb-6"}>
        <div
          className="border border-border rounded p-3 bg-background font-mono text-sm min-h-[44px] flex items-center justify-between cursor-text"
          onClick={() => {
            if (mode === "simulation") {
              setMode("interactive");
              setPhase("complete");
              setUserPrompt("");
              setTimeout(() => inputRef.current?.focus(), 0);
            } else {
              inputRef.current?.focus();
            }
          }}
        >
          {mode === "simulation" ? (
            <div className="flex items-center flex-1">
              <span className="inline-flex items-center h-5">
                {typedPrompt}
              </span>
              {isTypingSimulation && (
                <span className="inline-block w-2 h-4 bg-foreground ml-0.5 animate-pulse" />
              )}
            </div>
          ) : (
            <form
              className="flex items-center flex-1"
              onSubmit={(e) => {
                e.preventDefault();
                handleSubmit();
              }}
            >
              <input
                ref={inputRef}
                type="text"
                value={userPrompt}
                onChange={(e) => setUserPrompt(e.target.value)}
                placeholder="Describe what you want to build..."
                className="flex-1 bg-transparent outline-none placeholder:text-muted-foreground/50 text-base"
                disabled={isStreaming}
                maxLength={140}
              />
            </form>
          )}
          {mode === "simulation" || isStreaming ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                stopGeneration();
              }}
              className="ml-2 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors"
              aria-label="Stop"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="currentColor"
                stroke="none"
              >
                <rect x="6" y="6" width="12" height="12" />
              </svg>
            </button>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleSubmit();
              }}
              disabled={!userPrompt.trim()}
              className="ml-2 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors disabled:opacity-30"
              aria-label="Submit"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 5v14" />
                <path d="M19 12l-7 7-7-7" />
              </svg>
            </button>
          )}
        </div>
        {fullscreen ? (
          <div className="mt-3 flex flex-wrap gap-2 justify-center">
            {EXAMPLE_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                onClick={() => handleExampleClick(prompt)}
                className="text-xs px-3 py-1.5 rounded-full border border-border text-muted-foreground hover:text-foreground hover:border-foreground/50 transition-colors"
              >
                {prompt}
              </button>
            ))}
          </div>
        ) : (
          <div className="mt-2 flex flex-wrap gap-1.5 justify-center">
            {EXAMPLE_PROMPTS.slice(0, 2).map((prompt) => (
              <button
                key={prompt}
                onClick={() => handleExampleClick(prompt)}
                className="text-xs px-2 py-1 rounded-full border border-border text-muted-foreground hover:text-foreground hover:border-foreground/50 transition-colors"
              >
                {prompt}
              </button>
            ))}
          </div>
        )}
      </div>

      <div
        className={`grid lg:grid-cols-2 gap-4 ${fullscreen ? "flex-1 min-h-0" : ""}`}
      >
        {/* Tabbed code/stream/json panel */}
        <div className={`min-w-0 ${fullscreen ? "flex flex-col" : ""}`}>
          <div className="flex items-center gap-4 mb-2 h-6 shrink-0">
            {(["json", "stream"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`text-xs font-mono transition-colors ${
                  activeTab === tab
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
          <div
            className={`border border-border rounded bg-background font-mono text-xs text-left grid relative group ${fullscreen ? "flex-1 min-h-0" : "h-[28rem]"}`}
          >
            <div className="absolute top-2 right-2 z-10">
              <CopyButton
                text={
                  activeTab === "stream" ? streamLines.join("\n") : jsonCode
                }
                className="opacity-0 group-hover:opacity-100 text-muted-foreground"
              />
            </div>
            <div
              className={`overflow-auto ${activeTab === "stream" ? "" : "hidden"}`}
            >
              {streamLines.length > 0 ? (
                <>
                  <CodeBlock
                    code={streamLines.join("\n")}
                    lang="json"
                    fillHeight
                    hideCopyButton
                  />
                  {showLoadingDots && (
                    <div className="flex gap-1 p-3 pt-0">
                      <span className="w-1 h-1 bg-muted-foreground rounded-full animate-pulse" />
                      <span className="w-1 h-1 bg-muted-foreground rounded-full animate-pulse [animation-delay:75ms]" />
                      <span className="w-1 h-1 bg-muted-foreground rounded-full animate-pulse [animation-delay:150ms]" />
                    </div>
                  )}
                </>
              ) : (
                <div className="text-muted-foreground/50 p-3 h-full">
                  {showLoadingDots ? "streaming..." : "waiting..."}
                </div>
              )}
            </div>
            <div
              className={`overflow-auto ${activeTab === "json" ? "" : "hidden"}`}
            >
              <CodeBlock
                code={jsonCode}
                lang="json"
                fillHeight
                hideCopyButton
              />
            </div>
          </div>
        </div>

        {/* Rendered output using json-render */}
        <div className={`min-w-0 ${fullscreen ? "flex flex-col" : ""}`}>
          <div className="flex items-center justify-between mb-2 h-6 shrink-0">
            <div className="flex items-center gap-4">
              {(
                [
                  { key: "dynamic", label: "live render" },
                  { key: "static", label: "static code" },
                ] as const
              ).map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setRenderView(key)}
                  className={`text-xs font-mono transition-colors ${
                    renderView === key
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowExportModal(true)}
                disabled={!currentTree?.root}
                className="text-xs font-mono text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                title="Export as Next.js project"
              >
                export
              </button>
              <button
                onClick={() => setIsFullscreen(true)}
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Maximize"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M8 3H5a2 2 0 0 0-2 2v3" />
                  <path d="M21 8V5a2 2 0 0 0-2-2h-3" />
                  <path d="M3 16v3a2 2 0 0 0 2 2h3" />
                  <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
                </svg>
              </button>
            </div>
          </div>
          <div
            className={`border border-border rounded bg-background grid relative group ${fullscreen ? "flex-1 min-h-0" : "h-[28rem]"}`}
          >
            {renderView === "static" && (
              <div className="absolute top-2 right-2 z-10">
                <CopyButton
                  text={generatedCode}
                  className="opacity-0 group-hover:opacity-100 text-muted-foreground"
                />
              </div>
            )}
            {renderView === "dynamic" ? (
              <div className="overflow-auto">
                {currentTree && currentTree.root ? (
                  <div className="animate-in fade-in duration-200 w-full min-h-full flex items-center justify-center p-3 py-4">
                    <JSONUIProvider
                      registry={
                        demoRegistry as Parameters<
                          typeof JSONUIProvider
                        >[0]["registry"]
                      }
                    >
                      <Renderer
                        tree={currentTree}
                        registry={
                          demoRegistry as Parameters<
                            typeof Renderer
                          >[0]["registry"]
                        }
                        loading={isStreaming || isStreamingSimulation}
                        fallback={
                          fallbackComponent as Parameters<
                            typeof Renderer
                          >[0]["fallback"]
                        }
                      />
                    </JSONUIProvider>
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground/50 text-sm">
                    {isStreaming ? "generating..." : "waiting..."}
                  </div>
                )}
              </div>
            ) : (
              <div className="overflow-auto h-full font-mono text-xs text-left">
                <CodeBlock
                  code={generatedCode}
                  lang="tsx"
                  fillHeight
                  hideCopyButton
                />
              </div>
            )}
          </div>
          <Toaster position="bottom-right" />
        </div>
      </div>

      {/* Fullscreen modal */}
      {isFullscreen && (
        <div className="fixed inset-0 z-50 bg-background flex flex-col">
          <div className="flex items-center justify-between px-6 h-14 border-b border-border">
            <div className="text-sm font-mono">render</div>
            <button
              onClick={() => setIsFullscreen(false)}
              className="text-muted-foreground hover:text-foreground transition-colors p-1"
              aria-label="Close"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 6L6 18" />
                <path d="M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="flex-1 overflow-auto p-6">
            {currentTree && currentTree.root ? (
              <div className="w-full min-h-full flex items-center justify-center">
                <JSONUIProvider
                  registry={
                    demoRegistry as Parameters<
                      typeof JSONUIProvider
                    >[0]["registry"]
                  }
                >
                  <Renderer
                    tree={currentTree}
                    registry={
                      demoRegistry as Parameters<typeof Renderer>[0]["registry"]
                    }
                    loading={isStreaming || isStreamingSimulation}
                    fallback={
                      fallbackComponent as Parameters<
                        typeof Renderer
                      >[0]["fallback"]
                    }
                  />
                </JSONUIProvider>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground/50 text-sm">
                {isStreaming ? "generating..." : "waiting..."}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 sm:p-8">
          <div className="bg-background border border-border rounded-lg w-full max-w-5xl h-full max-h-[80vh] flex flex-col shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between px-4 sm:px-6 h-14 border-b border-border shrink-0">
              <div className="flex items-center gap-2 sm:gap-3">
                {/* Mobile file tree toggle */}
                <button
                  onClick={() => setShowMobileFileTree(!showMobileFileTree)}
                  className="sm:hidden text-muted-foreground hover:text-foreground transition-colors p-1"
                  aria-label="Toggle file tree"
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M3 6h18M3 12h18M3 18h18" />
                  </svg>
                </button>
                <span className="text-sm font-mono">export static code</span>
                <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded hidden sm:inline">
                  {exportedFiles.length} files
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={downloadAllFiles}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-foreground text-background rounded hover:bg-foreground/90 transition-colors"
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Download All
                </button>
                <button
                  onClick={() => setShowExportModal(false)}
                  className="text-muted-foreground hover:text-foreground transition-colors p-1"
                  aria-label="Close"
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M18 6L6 18" />
                    <path d="M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex flex-1 min-h-0 relative">
              {/* File Tree - hidden on mobile, overlay when shown */}
              <div
                className={`
                ${showMobileFileTree ? "absolute inset-0 z-10 bg-background" : "hidden"}
                sm:relative sm:block sm:w-56 sm:bg-transparent
                border-r border-border overflow-auto py-2
              `}
              >
                {(() => {
                  // Build tree structure from flat file list
                  type TreeNode = {
                    name: string;
                    path: string;
                    isFolder: boolean;
                    children: TreeNode[];
                    file?: { path: string; content: string };
                  };

                  const root: TreeNode = {
                    name: "",
                    path: "",
                    isFolder: true,
                    children: [],
                  };

                  exportedFiles.forEach((file) => {
                    const parts = file.path.split("/");
                    let current = root;

                    parts.forEach((part, idx) => {
                      const isLast = idx === parts.length - 1;
                      const path = parts.slice(0, idx + 1).join("/");
                      let child = current.children.find((c) => c.name === part);

                      if (!child) {
                        child = {
                          name: part,
                          path,
                          isFolder: !isLast,
                          children: [],
                          file: isLast ? file : undefined,
                        };
                        current.children.push(child);
                      }

                      current = child;
                    });
                  });

                  // Sort: folders first, then alphabetically
                  const sortNodes = (nodes: TreeNode[]): TreeNode[] => {
                    return nodes.sort((a, b) => {
                      if (a.isFolder && !b.isFolder) return -1;
                      if (!a.isFolder && b.isFolder) return 1;
                      return a.name.localeCompare(b.name);
                    });
                  };

                  const toggleFolder = (path: string) => {
                    setCollapsedFolders((prev) => {
                      const next = new Set(prev);
                      if (next.has(path)) {
                        next.delete(path);
                      } else {
                        next.add(path);
                      }
                      return next;
                    });
                  };

                  const renderNode = (
                    node: TreeNode,
                    depth: number,
                  ): React.ReactNode[] => {
                    const result: React.ReactNode[] = [];
                    const isExpanded = !collapsedFolders.has(node.path);

                    if (node.isFolder && node.name) {
                      result.push(
                        <button
                          key={`folder-${node.path}`}
                          onClick={() => toggleFolder(node.path)}
                          className="w-full text-left px-3 py-1 text-xs font-mono text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-colors"
                          style={{ paddingLeft: `${12 + depth * 12}px` }}
                        >
                          <span className="flex items-center gap-1.5">
                            <span
                              className={`text-gray-400 transition-transform ${isExpanded ? "rotate-90" : ""}`}
                            >
                              <svg
                                width="8"
                                height="8"
                                viewBox="0 0 24 24"
                                fill="currentColor"
                              >
                                <path d="M8 5l10 7-10 7V5z" />
                              </svg>
                            </span>
                            <span className="text-gray-400">
                              <svg
                                width="12"
                                height="12"
                                viewBox="0 0 24 24"
                                fill="currentColor"
                              >
                                <path d="M10 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-8l-2-2z" />
                              </svg>
                            </span>
                            {node.name}
                          </span>
                        </button>,
                      );
                    }

                    if (node.file) {
                      const isActive = node.file.path === activeExportFile;
                      result.push(
                        <button
                          key={node.file.path}
                          onClick={() => {
                            setSelectedExportFile(node.file!.path);
                            setShowMobileFileTree(false);
                          }}
                          className={`w-full text-left px-3 py-1 text-xs font-mono transition-colors ${
                            isActive
                              ? "bg-foreground/10 text-foreground"
                              : "text-muted-foreground hover:text-foreground hover:bg-foreground/5"
                          }`}
                          style={{ paddingLeft: `${12 + depth * 12}px` }}
                        >
                          <span className="flex items-center gap-1.5">
                            {node.name.endsWith(".tsx") ||
                            node.name.endsWith(".ts") ? (
                              <span className="text-blue-400">
                                <svg
                                  width="12"
                                  height="12"
                                  viewBox="0 0 24 24"
                                  fill="currentColor"
                                >
                                  <path d="M3 3h18v18H3V3zm16.525 13.707c-.131-.821-.666-1.511-2.252-2.155-.552-.259-1.165-.438-1.349-.854-.068-.248-.083-.382-.039-.527.11-.373.458-.487.757-.381.193.07.37.258.482.52.51-.332.51-.332.86-.553-.132-.203-.203-.293-.297-.382-.335-.382-.78-.58-1.502-.558l-.375.047c-.361.09-.705.272-.923.531-.613.721-.437 1.976.245 2.494.674.476 1.661.59 1.791 1.052.12.543-.406.717-.919.65-.387-.071-.6-.273-.831-.641l-.871.529c.1.217.217.31.39.494.803.796 2.8.749 3.163-.476.013-.04.113-.33.071-.765zm-7.158-2.032c-.227.574-.446 1.148-.677 1.722-.204-.54-.42-1.102-.648-1.68l-.002-.02h-1.09v4.4h.798v-3.269l.796 2.011h.69l.793-2.012v3.27h.798v-4.4h-1.06l-.398 1.02v-.042zm-3.39-3.15v1.2h2.99v8.424h1.524v-8.424h2.99v-1.2H8.977z" />
                                </svg>
                              </span>
                            ) : node.name.endsWith(".json") ? (
                              <span className="text-yellow-400">
                                <svg
                                  width="12"
                                  height="12"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                >
                                  <path d="M4 4h16v16H4z" />
                                  <path d="M8 8h8M8 12h8M8 16h4" />
                                </svg>
                              </span>
                            ) : node.name.endsWith(".css") ? (
                              <span className="text-pink-400">
                                <svg
                                  width="12"
                                  height="12"
                                  viewBox="0 0 24 24"
                                  fill="currentColor"
                                >
                                  <path d="M3 3h18v18H3V3zm15.751 10.875l-.634 7.125-6.125 2-6.125-2-.625-7.125h3.125l.312 3.625 3.313 1.125 3.312-1.125.375-3.625H6.125l-.313-3.125h12.376l-.312 3.125H9.125l.25 1.875h8.376v.125z" />
                                </svg>
                              </span>
                            ) : node.name.endsWith(".md") ? (
                              <span className="text-gray-400">
                                <svg
                                  width="12"
                                  height="12"
                                  viewBox="0 0 24 24"
                                  fill="currentColor"
                                >
                                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zM13 9V3.5L18.5 9H13z" />
                                </svg>
                              </span>
                            ) : (
                              <span className="text-gray-400">
                                <svg
                                  width="12"
                                  height="12"
                                  viewBox="0 0 24 24"
                                  fill="currentColor"
                                >
                                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zM13 9V3.5L18.5 9H13z" />
                                </svg>
                              </span>
                            )}
                            {node.name}
                          </span>
                        </button>,
                      );
                    }

                    // Only render children if not a folder or if folder is expanded (or root)
                    if (!node.isFolder || !node.name || isExpanded) {
                      sortNodes(node.children).forEach((child) => {
                        result.push(
                          ...renderNode(child, node.name ? depth + 1 : depth),
                        );
                      });
                    }

                    return result;
                  };

                  return renderNode(root, 0);
                })()}
              </div>

              {/* Code Preview */}
              <div className="flex-1 flex flex-col min-w-0">
                <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/30">
                  <span className="text-xs font-mono text-muted-foreground">
                    {activeExportFile}
                  </span>
                  <button
                    onClick={() => copyFileContent(activeExportContent)}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                  >
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                    Copy
                  </button>
                </div>
                <div className="flex-1 overflow-auto">
                  <CodeBlock
                    code={activeExportContent}
                    lang={activeExportFile?.endsWith(".json") ? "json" : "tsx"}
                    fillHeight
                    hideCopyButton
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
