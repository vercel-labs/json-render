export type VNode =
  | VNodeElement
  | VNodeText
  | VNodeFragment
  | VNodeComponent
  | string
  | number
  | boolean
  | null
  | undefined;

export interface VNodeElement {
  kind: "element";
  tag: string;
  props?: Record<string, unknown>;
  children?: VNode[];
}

export interface VNodeText {
  kind: "text";
  value: string;
}

export interface VNodeFragment {
  kind: "fragment";
  children: VNode[];
}

export interface VNodeComponent {
  kind: "component";
  name: string;
  props?: Record<string, unknown>;
  children?: VNode[];
}

export function element(
  tag: string,
  props?: Record<string, unknown>,
  children?: VNode[],
): VNodeElement {
  return { kind: "element", tag, props, children };
}

export function text(value: string): VNodeText {
  return { kind: "text", value };
}

export function fragment(children: VNode[]): VNodeFragment {
  return { kind: "fragment", children };
}

export function component(
  name: string,
  props?: Record<string, unknown>,
  children?: VNode[],
): VNodeComponent {
  return { kind: "component", name, props, children };
}

export function normalizeVNodeArray(
  value: VNode | VNode[],
): Exclude<VNode, boolean | null | undefined>[] {
  const source = Array.isArray(value) ? value : [value];
  return source.filter(
    (entry): entry is Exclude<VNode, boolean | null | undefined> =>
      entry !== null && entry !== undefined && entry !== false,
  );
}
