/**
 * End-to-end test: JSON spec → Ink terminal output.
 *
 * Exercises the full user-facing API:
 *   1. defineCatalog() with standard Ink component/action definitions
 *   2. Hand-authored Spec (same shape an LLM would generate)
 *   3. JSONUIProvider + Renderer → renderToString() → actual terminal text
 *
 * Every assertion checks real rendered output, not internal structures.
 */
import React from "react";
import { describe, it, expect } from "vitest";
import { renderToString } from "ink";
import {
  defineCatalog,
  buildUserPrompt,
  createStateStore,
  type Spec,
} from "@json-render/core";
import { schema } from "@json-render/ink/schema";
import {
  standardComponentDefinitions,
  standardActionDefinitions,
} from "@json-render/ink/catalog";
import { JSONUIProvider, Renderer } from "@json-render/ink";

function renderSpec(
  spec: Spec,
  opts: { columns?: number; initialState?: Record<string, unknown> } = {},
): string {
  return renderToString(
    <JSONUIProvider initialState={opts.initialState ?? spec.state ?? {}}>
      <Renderer spec={spec} />
    </JSONUIProvider>,
    { columns: opts.columns ?? 100 },
  );
}

const catalog = defineCatalog(schema, {
  components: standardComponentDefinitions,
  actions: standardActionDefinitions,
});

describe("ink e2e: catalog → prompt", () => {
  it("prompt includes all standard components", () => {
    const prompt = catalog.prompt();
    for (const name of Object.keys(standardComponentDefinitions)) {
      expect(prompt, `Missing component "${name}" in prompt`).toContain(name);
    }
  });

  it("prompt includes all 5 standard + built-in actions", () => {
    const prompt = catalog.prompt();
    for (const name of [
      "setState",
      "pushState",
      "removeState",
      "exit",
      "log",
    ]) {
      expect(prompt, `Missing action "${name}" in prompt`).toContain(name);
    }
  });

  it("buildUserPrompt embeds the user message", () => {
    const msg = buildUserPrompt({
      prompt: "Show me a deployment dashboard",
    });
    expect(msg).toContain("deployment dashboard");
  });
});

describe("ink e2e: simple spec → terminal output", () => {
  it("renders a Heading", () => {
    const spec: Spec = {
      root: "h",
      elements: {
        h: {
          type: "Heading",
          props: { text: "Hello Terminal", level: "h1" },
          children: [],
        },
      },
    };
    const output = renderSpec(spec);
    expect(output).toContain("Hello Terminal");
  });

  it("renders Text with content", () => {
    const spec: Spec = {
      root: "t",
      elements: {
        t: {
          type: "Text",
          props: { text: "plain text output" },
          children: [],
        },
      },
    };
    const output = renderSpec(spec);
    expect(output).toContain("plain text output");
  });

  it("renders a Badge", () => {
    const spec: Spec = {
      root: "b",
      elements: {
        b: {
          type: "Badge",
          props: { label: "ACTIVE", variant: "success" },
          children: [],
        },
      },
    };
    const output = renderSpec(spec);
    expect(output).toContain("ACTIVE");
  });

  it("renders a KeyValue pair", () => {
    const spec: Spec = {
      root: "kv",
      elements: {
        kv: {
          type: "KeyValue",
          props: { label: "Status", value: "Running" },
          children: [],
        },
      },
    };
    const output = renderSpec(spec);
    expect(output).toContain("Status");
    expect(output).toContain("Running");
  });

  it("renders a StatusLine with icon", () => {
    const spec: Spec = {
      root: "sl",
      elements: {
        sl: {
          type: "StatusLine",
          props: { text: "All checks passed", status: "success" },
          children: [],
        },
      },
    };
    const output = renderSpec(spec);
    expect(output).toContain("All checks passed");
    expect(output).toContain("✔");
  });

  it("renders a Divider with title", () => {
    const spec: Spec = {
      root: "d",
      elements: {
        d: {
          type: "Divider",
          props: { title: "Section", color: "gray" },
          children: [],
        },
      },
    };
    const output = renderSpec(spec);
    expect(output).toContain("Section");
    expect(output).toContain("─");
  });

  it("renders a List", () => {
    const spec: Spec = {
      root: "l",
      elements: {
        l: {
          type: "List",
          props: { items: ["Install", "Build", "Deploy"], ordered: true },
          children: [],
        },
      },
    };
    const output = renderSpec(spec);
    expect(output).toContain("1.");
    expect(output).toContain("Install");
    expect(output).toContain("2.");
    expect(output).toContain("Build");
    expect(output).toContain("3.");
    expect(output).toContain("Deploy");
  });

  it("renders a ProgressBar", () => {
    const spec: Spec = {
      root: "pb",
      elements: {
        pb: {
          type: "ProgressBar",
          props: { progress: 0.5, width: 20, label: "Upload" },
          children: [],
        },
      },
    };
    const output = renderSpec(spec);
    expect(output).toContain("Upload");
    expect(output).toContain("50%");
    expect(output).toContain("█");
  });
});

describe("ink e2e: nested layout → terminal output", () => {
  it("renders Box with children", () => {
    const spec: Spec = {
      root: "box",
      elements: {
        box: {
          type: "Box",
          props: { flexDirection: "column", gap: 1 },
          children: ["line1", "line2"],
        },
        line1: { type: "Text", props: { text: "First line" }, children: [] },
        line2: { type: "Text", props: { text: "Second line" }, children: [] },
      },
    };
    const output = renderSpec(spec);
    expect(output).toContain("First line");
    expect(output).toContain("Second line");
  });

  it("renders Card with title and nested content", () => {
    const spec: Spec = {
      root: "card",
      elements: {
        card: {
          type: "Card",
          props: { title: "Details", borderStyle: "round" },
          children: ["inner"],
        },
        inner: { type: "Text", props: { text: "Card body" }, children: [] },
      },
    };
    const output = renderSpec(spec);
    expect(output).toContain("Details");
    expect(output).toContain("Card body");
    // Round border chars
    expect(output).toContain("╭");
    expect(output).toContain("╰");
  });

  it("renders Table with headers and data", () => {
    const spec: Spec = {
      root: "tbl",
      elements: {
        tbl: {
          type: "Table",
          props: {
            columns: [
              { header: "Name", key: "name", width: 12 },
              { header: "Role", key: "role", width: 10 },
            ],
            rows: [
              { name: "Alice", role: "Admin" },
              { name: "Bob", role: "User" },
            ],
          },
          children: [],
        },
      },
    };
    const output = renderSpec(spec);
    expect(output).toContain("Name");
    expect(output).toContain("Role");
    expect(output).toContain("Alice");
    expect(output).toContain("Admin");
    expect(output).toContain("Bob");
    expect(output).toContain("User");
  });
});

describe("ink e2e: state binding → terminal output", () => {
  it("$state expression resolves to state value", () => {
    const spec: Spec = {
      state: { greeting: "Hello from state!" },
      root: "t",
      elements: {
        t: {
          type: "Text",
          props: { text: { $state: "/greeting" } },
          children: [],
        },
      },
    };
    const output = renderSpec(spec);
    expect(output).toContain("Hello from state!");
  });

  it("visibility hides elements when condition is false", () => {
    const spec: Spec = {
      state: { show: false },
      root: "box",
      elements: {
        box: {
          type: "Box",
          props: { flexDirection: "column" },
          children: ["always", "maybe"],
        },
        always: {
          type: "Text",
          props: { text: "Always visible" },
          children: [],
        },
        maybe: {
          type: "Text",
          props: { text: "Conditional text" },
          visible: { $state: "/show" },
          children: [],
        },
      },
    };
    const output = renderSpec(spec);
    expect(output).toContain("Always visible");
    expect(output).not.toContain("Conditional text");
  });

  it("visibility shows elements when condition is true", () => {
    const spec: Spec = {
      state: { show: true },
      root: "box",
      elements: {
        box: {
          type: "Box",
          props: { flexDirection: "column" },
          children: ["maybe"],
        },
        maybe: {
          type: "Text",
          props: { text: "Now you see me" },
          visible: { $state: "/show" },
          children: [],
        },
      },
    };
    const output = renderSpec(spec);
    expect(output).toContain("Now you see me");
  });

  it("$state equality condition works", () => {
    const spec: Spec = {
      state: { tab: "deploy" },
      root: "box",
      elements: {
        box: {
          type: "Box",
          props: { flexDirection: "column" },
          children: ["deploy-tab", "settings-tab"],
        },
        "deploy-tab": {
          type: "Text",
          props: { text: "Deploy panel" },
          visible: { $state: "/tab", eq: "deploy" },
          children: [],
        },
        "settings-tab": {
          type: "Text",
          props: { text: "Settings panel" },
          visible: { $state: "/tab", eq: "settings" },
          children: [],
        },
      },
    };
    const output = renderSpec(spec);
    expect(output).toContain("Deploy panel");
    expect(output).not.toContain("Settings panel");
  });
});

describe("ink e2e: repeat → terminal output", () => {
  it("repeat renders one row per array item with $item", () => {
    const spec: Spec = {
      state: {
        tasks: [
          { name: "Lint", done: true },
          { name: "Test", done: false },
          { name: "Build", done: true },
        ],
      },
      root: "list",
      elements: {
        list: {
          type: "Box",
          props: { flexDirection: "column" },
          repeat: { statePath: "/tasks" },
          children: ["row"],
        },
        row: {
          type: "ListItem",
          props: {
            title: { $item: "name" },
            trailing: { $item: "done" },
            leading: "•",
          },
          children: [],
        },
      },
    };
    const output = renderSpec(spec);
    expect(output).toContain("Lint");
    expect(output).toContain("Test");
    expect(output).toContain("Build");
  });
});

describe("ink e2e: full dashboard spec → terminal output", () => {
  const dashboardSpec: Spec = {
    state: {
      deployments: [
        { id: "dpl_abc", service: "api-server", status: "running" },
        { id: "dpl_def", service: "web-app", status: "building" },
        { id: "dpl_ghi", service: "worker", status: "error" },
      ],
    },
    root: "root",
    elements: {
      root: {
        type: "Box",
        props: { flexDirection: "column", padding: 1, gap: 1 },
        children: [
          "heading",
          "divider",
          "stats",
          "table",
          "progress",
          "repeats",
        ],
      },
      heading: {
        type: "Heading",
        props: { text: "Deployment Dashboard", level: "h1", color: "cyan" },
        children: [],
      },
      divider: {
        type: "Divider",
        props: { title: "Overview", color: "gray" },
        children: [],
      },
      stats: {
        type: "Box",
        props: { gap: 4 },
        children: ["kv-total", "kv-err", "badge"],
      },
      "kv-total": {
        type: "KeyValue",
        props: { label: "Total", value: "3", labelColor: "cyan" },
        children: [],
      },
      "kv-err": {
        type: "KeyValue",
        props: { label: "Errors", value: "1", labelColor: "red" },
        children: [],
      },
      badge: {
        type: "Badge",
        props: { label: "LIVE", variant: "success" },
        children: [],
      },
      table: {
        type: "Table",
        props: {
          columns: [
            { header: "Service", key: "service", width: 15 },
            { header: "Status", key: "status", width: 12 },
          ],
          rows: [
            { service: "api-server", status: "running" },
            { service: "web-app", status: "building" },
            { service: "worker", status: "error" },
          ],
          headerColor: "cyan",
        },
        children: [],
      },
      progress: {
        type: "ProgressBar",
        props: { progress: 0.85, width: 30, color: "green", label: "Deploy" },
        children: [],
      },
      repeats: {
        type: "Box",
        props: { flexDirection: "column" },
        repeat: { statePath: "/deployments", key: "id" },
        children: ["item"],
      },
      item: {
        type: "ListItem",
        props: {
          title: { $item: "service" },
          subtitle: { $item: "id" },
          leading: "▸",
          trailing: { $item: "status" },
        },
        children: [],
      },
    },
  };

  it("renders without throwing", () => {
    expect(() => renderSpec(dashboardSpec)).not.toThrow();
  });

  it("output contains heading text", () => {
    const output = renderSpec(dashboardSpec);
    expect(output).toContain("Deployment Dashboard");
  });

  it("output contains table data", () => {
    const output = renderSpec(dashboardSpec);
    expect(output).toContain("Service");
    expect(output).toContain("api-server");
    expect(output).toContain("web-app");
    expect(output).toContain("worker");
  });

  it("output contains key-value stats", () => {
    const output = renderSpec(dashboardSpec);
    expect(output).toContain("Total");
    expect(output).toContain("Errors");
  });

  it("output contains progress bar", () => {
    const output = renderSpec(dashboardSpec);
    expect(output).toContain("Deploy");
    expect(output).toContain("85%");
    expect(output).toContain("█");
  });

  it("output contains repeated deployment items", () => {
    const output = renderSpec(dashboardSpec);
    // $item expressions should resolve to actual data
    expect(output).toContain("api-server");
    expect(output).toContain("dpl_abc");
    expect(output).toContain("running");
    expect(output).toContain("web-app");
    expect(output).toContain("worker");
  });

  it("output contains badge", () => {
    const output = renderSpec(dashboardSpec);
    expect(output).toContain("LIVE");
  });

  it("output contains divider with title", () => {
    const output = renderSpec(dashboardSpec);
    expect(output).toContain("Overview");
    expect(output).toContain("─");
  });
});

describe("ink e2e: Markdown component", () => {
  it("renders bold text", () => {
    const spec: Spec = {
      root: "md",
      elements: {
        md: {
          type: "Markdown",
          props: { text: "This is **bold** text" },
          children: [],
        },
      },
    };
    const output = renderSpec(spec);
    expect(output).toContain("bold");
    expect(output).not.toContain("**");
  });

  it("renders italic text", () => {
    const spec: Spec = {
      root: "md",
      elements: {
        md: {
          type: "Markdown",
          props: { text: "This is *italic* text" },
          children: [],
        },
      },
    };
    const output = renderSpec(spec);
    expect(output).toContain("italic");
    expect(output).not.toContain("*italic*");
  });

  it("renders inline code", () => {
    const spec: Spec = {
      root: "md",
      elements: {
        md: {
          type: "Markdown",
          props: { text: "Run `npm install` to start" },
          children: [],
        },
      },
    };
    const output = renderSpec(spec);
    expect(output).toContain("`npm install`");
  });

  it("renders headings", () => {
    const spec: Spec = {
      root: "md",
      elements: {
        md: {
          type: "Markdown",
          props: { text: "# Main Title\n\n## Section" },
          children: [],
        },
      },
    };
    const output = renderSpec(spec);
    expect(output).toContain("Main Title");
    expect(output).toContain("Section");
    expect(output).not.toContain("#");
  });

  it("renders unordered lists", () => {
    const spec: Spec = {
      root: "md",
      elements: {
        md: {
          type: "Markdown",
          props: { text: "- First\n- Second\n- Third" },
          children: [],
        },
      },
    };
    const output = renderSpec(spec);
    expect(output).toContain("First");
    expect(output).toContain("Second");
    expect(output).toContain("Third");
    expect(output).toContain("•");
  });

  it("renders ordered lists", () => {
    const spec: Spec = {
      root: "md",
      elements: {
        md: {
          type: "Markdown",
          props: { text: "1. Alpha\n2. Beta\n3. Gamma" },
          children: [],
        },
      },
    };
    const output = renderSpec(spec);
    expect(output).toContain("Alpha");
    expect(output).toContain("Beta");
    expect(output).toContain("Gamma");
  });

  it("renders horizontal rules", () => {
    const spec: Spec = {
      root: "md",
      elements: {
        md: {
          type: "Markdown",
          props: { text: "Above\n\n---\n\nBelow" },
          children: [],
        },
      },
    };
    const output = renderSpec(spec);
    expect(output).toContain("Above");
    expect(output).toContain("Below");
    expect(output).toContain("─");
  });

  it("renders code blocks", () => {
    const spec: Spec = {
      root: "md",
      elements: {
        md: {
          type: "Markdown",
          props: { text: "```\nconst x = 42;\n```" },
          children: [],
        },
      },
    };
    const output = renderSpec(spec);
    expect(output).toContain("const x = 42;");
    expect(output).not.toContain("```");
  });

  it("handles mixed markdown from LLM-style text", () => {
    const spec: Spec = {
      root: "md",
      elements: {
        md: {
          type: "Markdown",
          props: {
            text:
              "Here's a summary with **key metrics** on performance:\n\n" +
              "- **Latency**: 45ms average\n" +
              "- **Uptime**: 99.9%\n" +
              "- **Requests**: 1.2M/day",
          },
          children: [],
        },
      },
    };
    const output = renderSpec(spec);
    expect(output).toContain("key metrics");
    expect(output).toContain("Latency");
    expect(output).toContain("45ms average");
    expect(output).not.toContain("**");
  });
});

describe("ink e2e: MultiSelect", () => {
  it("renders options with check indicators", () => {
    const spec: Spec = {
      root: "ms",
      elements: {
        ms: {
          type: "MultiSelect",
          props: {
            options: [
              { label: "TypeScript", value: "ts" },
              { label: "Python", value: "py" },
              { label: "Rust", value: "rs" },
            ],
            value: { $state: "/langs" },
            $bindState: { value: "/langs" },
            label: "Languages",
          },
          children: [],
        },
      },
      state: { langs: ["ts"] },
    };

    const output = renderSpec(spec);
    expect(output).toContain("Languages");
    expect(output).toContain("TypeScript");
    expect(output).toContain("Python");
    expect(output).toContain("Rust");
    // ts is selected
    expect(output).toContain("◉");
    // py and rs are not
    expect(output).toContain("◯");
    expect(output).toContain("Selected: 1");
  });

  it("renders with no selections", () => {
    const spec: Spec = {
      root: "ms",
      elements: {
        ms: {
          type: "MultiSelect",
          props: {
            options: [
              { label: "A", value: "a" },
              { label: "B", value: "b" },
            ],
            value: { $state: "/sel" },
            $bindState: { value: "/sel" },
          },
          children: [],
        },
      },
      state: { sel: [] },
    };

    const output = renderSpec(spec);
    expect(output).toContain("A");
    expect(output).toContain("B");
    expect(output).not.toContain("◉");
    expect(output).not.toContain("Selected:");
  });
});

describe("ink e2e: ConfirmInput", () => {
  it("renders confirmation prompt with message", () => {
    const spec: Spec = {
      root: "ci",
      elements: {
        ci: {
          type: "ConfirmInput",
          props: {
            message: "Delete all files?",
          },
          children: [],
        },
      },
    };

    const output = renderSpec(spec);
    expect(output).toContain("Delete all files?");
    expect(output).toContain("Yes");
    expect(output).toContain("No");
    expect(output).toContain("(y/n)");
  });

  it("renders with custom labels", () => {
    const spec: Spec = {
      root: "ci",
      elements: {
        ci: {
          type: "ConfirmInput",
          props: {
            message: "Continue?",
            yesLabel: "Proceed",
            noLabel: "Cancel",
          },
          children: [],
        },
      },
    };

    const output = renderSpec(spec);
    expect(output).toContain("Continue?");
    expect(output).toContain("Proceed");
    expect(output).toContain("Cancel");
  });
});

describe("ink e2e: Tabs", () => {
  it("renders tab bar with active indicator", () => {
    const spec: Spec = {
      root: "tabs",
      elements: {
        tabs: {
          type: "Tabs",
          props: {
            tabs: [
              { label: "Overview", value: "overview" },
              { label: "Logs", value: "logs" },
              { label: "Settings", value: "settings" },
            ],
            value: { $state: "/tab" },
            $bindState: { value: "/tab" },
          },
          children: ["content-overview"],
        },
        "content-overview": {
          type: "Text",
          props: { text: "Overview content here" },
          children: [],
          visible: { $state: "/tab", eq: "overview" },
        },
      },
      state: { tab: "overview" },
    };

    const output = renderSpec(spec);
    expect(output).toContain("Overview");
    expect(output).toContain("Logs");
    expect(output).toContain("Settings");
    expect(output).toContain("Overview content here");
    // Active tab indicator
    expect(output).toContain("━");
  });

  it("renders with icons", () => {
    const spec: Spec = {
      root: "tabs",
      elements: {
        tabs: {
          type: "Tabs",
          props: {
            tabs: [
              { label: "Home", value: "home", icon: "🏠" },
              { label: "Settings", value: "settings", icon: "⚙" },
            ],
            value: { $state: "/tab" },
            $bindState: { value: "/tab" },
          },
          children: [],
        },
      },
      state: { tab: "home" },
    };

    const output = renderSpec(spec);
    expect(output).toContain("Home");
    expect(output).toContain("Settings");
  });

  it("hides content for inactive tab via visible condition", () => {
    const spec: Spec = {
      root: "tabs",
      elements: {
        tabs: {
          type: "Tabs",
          props: {
            tabs: [
              { label: "A", value: "a" },
              { label: "B", value: "b" },
            ],
            value: { $state: "/tab" },
            $bindState: { value: "/tab" },
          },
          children: ["panel-a", "panel-b"],
        },
        "panel-a": {
          type: "Text",
          props: { text: "Panel A content" },
          children: [],
          visible: { $state: "/tab", eq: "a" },
        },
        "panel-b": {
          type: "Text",
          props: { text: "Panel B content" },
          children: [],
          visible: { $state: "/tab", eq: "b" },
        },
      },
      state: { tab: "a" },
    };

    const output = renderSpec(spec);
    expect(output).toContain("Panel A content");
    expect(output).not.toContain("Panel B content");
  });
});

describe("ink e2e: Sparkline", () => {
  it("renders sparkline blocks from data", () => {
    const spec: Spec = {
      root: "spark",
      elements: {
        spark: {
          type: "Sparkline",
          props: {
            data: [1, 5, 2, 8, 3, 7, 4],
            label: "CPU",
            color: "cyan",
          },
          children: [],
        },
      },
    };

    const output = renderSpec(spec);
    expect(output).toContain("CPU");
    // Should contain some block characters
    expect(output).toMatch(/[▁▂▃▄▅▆▇█]/);
  });

  it("handles single value", () => {
    const spec: Spec = {
      root: "spark",
      elements: {
        spark: {
          type: "Sparkline",
          props: { data: [5] },
          children: [],
        },
      },
    };

    const output = renderSpec(spec);
    expect(output).toMatch(/[▁▂▃▄▅▆▇█]/);
  });

  it("handles empty data gracefully", () => {
    const spec: Spec = {
      root: "spark",
      elements: {
        spark: {
          type: "Sparkline",
          props: { data: [], label: "Empty" },
          children: [],
        },
      },
    };

    const output = renderSpec(spec);
    expect(output).toContain("no data");
  });

  it("renders min/max sparkline with all equal values at top", () => {
    const spec: Spec = {
      root: "spark",
      elements: {
        spark: {
          type: "Sparkline",
          props: { data: [5, 5, 5] },
          children: [],
        },
      },
    };

    const output = renderSpec(spec);
    // All same value — should produce consistent blocks
    expect(output).toMatch(/[▁▂▃▄▅▆▇█]/);
  });
});

describe("ink e2e: BarChart", () => {
  it("renders horizontal bars with labels", () => {
    const spec: Spec = {
      root: "chart",
      elements: {
        chart: {
          type: "BarChart",
          props: {
            data: [
              { label: "TypeScript", value: 65, color: "blue" },
              { label: "Python", value: 20, color: "yellow" },
              { label: "Rust", value: 15, color: "red" },
            ],
            showPercentage: true,
          },
          children: [],
        },
      },
    };

    const output = renderSpec(spec);
    expect(output).toContain("TypeScript");
    expect(output).toContain("Python");
    expect(output).toContain("Rust");
    expect(output).toContain("█");
    expect(output).toContain("65%");
    expect(output).toContain("20%");
    expect(output).toContain("15%");
  });

  it("renders with showValues", () => {
    const spec: Spec = {
      root: "chart",
      elements: {
        chart: {
          type: "BarChart",
          props: {
            data: [
              { label: "A", value: 100 },
              { label: "B", value: 50 },
            ],
            showValues: true,
            width: 20,
          },
          children: [],
        },
      },
    };

    const output = renderSpec(spec);
    expect(output).toContain("100");
    expect(output).toContain("50");
  });

  it("handles empty data", () => {
    const spec: Spec = {
      root: "chart",
      elements: {
        chart: {
          type: "BarChart",
          props: { data: [] },
          children: [],
        },
      },
    };

    const output = renderSpec(spec);
    // Should render nothing (no crash)
    expect(output).toBe("");
  });
});

describe("ink e2e: state store round-trip", () => {
  it("createStateStore reads/writes state used by specs", () => {
    const store = createStateStore({ name: "Alice", count: 0 });

    expect(store.get("/name")).toBe("Alice");
    expect(store.get("/count")).toBe(0);

    store.set("/count", 42);
    expect(store.get("/count")).toBe(42);

    store.set("/name", "Bob");
    expect(store.get("/name")).toBe("Bob");
  });

  it("array manipulation (push/remove pattern)", () => {
    const store = createStateStore({ items: ["a", "b", "c"] });

    // Push
    const arr = store.get("/items") as string[];
    store.set("/items", [...arr, "d"]);
    expect((store.get("/items") as string[]).length).toBe(4);

    // Remove index 1
    const arr2 = store.get("/items") as string[];
    store.set(
      "/items",
      arr2.filter((_, i) => i !== 1),
    );
    expect(store.get("/items")).toEqual(["a", "c", "d"]);
  });
});
