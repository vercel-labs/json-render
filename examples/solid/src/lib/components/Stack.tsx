import type { BaseComponentProps } from "@json-render/solid";

interface StackProps {
  gap?: number;
  padding?: number;
  direction?: "vertical" | "horizontal";
  align?: "start" | "center" | "end";
}

export function Stack(renderProps: BaseComponentProps<StackProps>) {
  return (
    <div
      style={{
        display: "flex",
        "flex-direction":
          renderProps.props.direction === "horizontal" ? "row" : "column",
        gap: renderProps.props.gap ? `${renderProps.props.gap}px` : undefined,
        padding: renderProps.props.padding
          ? `${renderProps.props.padding}px`
          : undefined,
        "align-items": renderProps.props.align,
      }}
    >
      {renderProps.children}
    </div>
  );
}
