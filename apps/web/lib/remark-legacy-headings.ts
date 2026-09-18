type MarkdownNode = {
  type: string;
  depth?: number;
  value?: string;
  children?: MarkdownNode[];
  data?: { hProperties?: Record<string, unknown> };
};

function text(node: MarkdownNode): string {
  return node.children ? node.children.map(text).join("") : (node.value ?? "");
}

export function remarkLegacyHeadings() {
  return function walk(node: MarkdownNode) {
    if (node.type === "heading" && (node.depth === 2 || node.depth === 3)) {
      node.data ??= {};
      node.data.hProperties ??= {};
      node.data.hProperties.id = text(node)
        .toLowerCase()
        .replace(/[^\w\s-]/g, "")
        .replace(/\s+/g, "-")
        .trim();
    }
    node.children?.forEach(walk);
  };
}
