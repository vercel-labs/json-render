import type { MDXComponents } from "mdx/types";
import Link from "next/link";
import { Code } from "@/components/code";
import { GenerationModesDiagram } from "@/components/generation-modes-diagram";
import { PackageInstall } from "@/components/package-install";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .trim();
}

function extractText(children: React.ReactNode): string {
  if (typeof children === "string") return children;
  if (typeof children === "number") return String(children);
  if (Array.isArray(children)) return children.map(extractText).join("");
  if (children && typeof children === "object") {
    const obj = children as unknown as Record<string, unknown>;
    if ("props" in obj) {
      const props = obj.props as { children?: React.ReactNode } | undefined;
      return extractText(props?.children);
    }
  }
  return "";
}

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    ...components,
    h1: ({ children }: { children?: React.ReactNode }) => (
      <h1 className="text-3xl font-bold mb-4">{children}</h1>
    ),
    h2: ({ children }: { children?: React.ReactNode }) => {
      const id = slugify(extractText(children));
      return (
        <h2 id={id} className="group text-xl font-semibold mt-12 mb-4">
          <a href={`#${id}`} className="no-underline hover:no-underline">
            {children}
            <span className="ml-2 text-muted-foreground/0 group-hover:text-muted-foreground transition-colors select-none">
              #
            </span>
          </a>
        </h2>
      );
    },
    h3: ({ children }: { children?: React.ReactNode }) => {
      const id = slugify(extractText(children));
      return (
        <h3 id={id} className="group text-lg font-medium mt-8 mb-3">
          <a href={`#${id}`} className="no-underline hover:no-underline">
            {children}
            <span className="ml-2 text-muted-foreground/0 group-hover:text-muted-foreground transition-colors select-none">
              #
            </span>
          </a>
        </h3>
      );
    },
    p: ({ children }: { children?: React.ReactNode }) => (
      <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
        {children}
      </p>
    ),
    ul: ({ children }: { children?: React.ReactNode }) => (
      <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 mb-4">
        {children}
      </ul>
    ),
    ol: ({ children }: { children?: React.ReactNode }) => (
      <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground mb-4">
        {children}
      </ol>
    ),
    li: ({ children }: { children?: React.ReactNode }) => <li>{children}</li>,
    a: ({ href, children }: { href?: string; children?: React.ReactNode }) => {
      if (href?.startsWith("/")) {
        return (
          <Link href={href} className="text-foreground hover:underline">
            {children}
          </Link>
        );
      }
      return (
        <a
          href={href}
          className="text-foreground hover:underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          {children}
        </a>
      );
    },
    code: ({
      children,
      className,
    }: {
      children?: React.ReactNode;
      className?: string;
    }) => {
      // Fenced code blocks come through as <pre><code className="language-xxx">
      // Inline code has no className
      if (className) {
        // This is a fenced code block inside <pre> - handled by the pre component
        return <code className={className}>{children}</code>;
      }
      return (
        <code className="text-foreground bg-muted px-1.5 py-0.5 rounded text-sm">
          {children}
        </code>
      );
    },
    pre: async ({ children }: { children?: React.ReactNode }) => {
      // Extract lang and code from the <code> child
      const codeElement = children as React.ReactElement<{
        className?: string;
        children?: string;
      }>;
      const className = codeElement?.props?.className || "";
      const lang = className.replace("language-", "") || "typescript";
      const code = codeElement?.props?.children || "";

      return (
        <Code
          lang={lang as "json" | "tsx" | "typescript" | "bash" | "javascript"}
        >
          {typeof code === "string" ? code : String(code)}
        </Code>
      );
    },
    strong: ({ children }: { children?: React.ReactNode }) => (
      <strong className="text-foreground font-medium">{children}</strong>
    ),
    hr: () => <hr className="my-8 border-border" />,
    blockquote: ({ children }: { children?: React.ReactNode }) => (
      <blockquote className="border-l-2 border-border pl-4 my-4 text-sm text-muted-foreground italic">
        {children}
      </blockquote>
    ),
    table: ({ children }: { children?: React.ReactNode }) => (
      <div className="my-6 overflow-x-auto">
        <table className="mdx-table w-full text-sm border-collapse">
          {children}
        </table>
      </div>
    ),
    th: ({ children }: { children?: React.ReactNode }) => (
      <th className="border border-border px-4 py-2 text-left font-semibold bg-muted">
        {children}
      </th>
    ),
    td: ({ children }: { children?: React.ReactNode }) => (
      <td className="border border-border px-4 py-2 text-muted-foreground">
        {children}
      </td>
    ),
    em: ({ children }: { children?: React.ReactNode }) => <em>{children}</em>,
    // Custom components available in all MDX files
    GenerationModesDiagram,
    PackageInstall,
  };
}
