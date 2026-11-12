import type {
  ActionsElement,
  ButtonElement,
  CardChild,
  CardElement,
  ChartElement,
  DividerElement,
  FieldElement,
  FieldsElement,
  ImageElement,
  LinkButtonElement,
  SectionElement,
  TableElement,
  TextElement,
} from "chat";

// Plain object builders with the same shape as Chat SDK's card factories.
// `chat` is imported for types only: its main entry pulls in Node built-ins,
// and these builders keep the renderer usable in the browser.

export const card = (
  options: Pick<CardElement, "title" | "subtitle" | "imageUrl"> & {
    children: CardChild[];
  },
): CardElement => ({ type: "card", ...options });

export const text = (
  content: string,
  style?: TextElement["style"],
): TextElement => ({ type: "text", content, style });

export const image = (url: string, alt?: string): ImageElement => ({
  type: "image",
  url,
  alt,
});

export const divider = (): DividerElement => ({ type: "divider" });

export const section = (children: CardChild[]): SectionElement => ({
  type: "section",
  children,
});

export const field = (label: string, value: string): FieldElement => ({
  type: "field",
  label,
  value,
});

export const fields = (children: FieldElement[]): FieldsElement => ({
  type: "fields",
  children,
});

export const table = (options: Omit<TableElement, "type">): TableElement => ({
  type: "table",
  ...options,
});

export const chart = (options: Omit<ChartElement, "type">): ChartElement => ({
  type: "chart",
  ...options,
});

export const button = (
  options: Pick<ButtonElement, "id" | "label" | "style" | "value">,
): ButtonElement => ({ type: "button", ...options });

export const linkButton = (
  options: Pick<LinkButtonElement, "label" | "url">,
): LinkButtonElement => ({ type: "link-button", ...options });

export const actions = (
  children: ActionsElement["children"],
): ActionsElement => ({ type: "actions", children });
