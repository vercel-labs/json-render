import type { BaseComponentProps } from "@json-render/solid";
import { useBoundProp } from "@json-render/solid";

interface InputProps {
  value?: string;
  placeholder?: string;
}

export function Input(renderProps: BaseComponentProps<InputProps>) {
  const [value, setValue] = useBoundProp<string>(
    renderProps.props.value,
    renderProps.bindings?.value,
  );

  return (
    <input
      value={String(value ?? "")}
      onInput={(e) => setValue(e.currentTarget.value)}
      placeholder={renderProps.props.placeholder ?? ""}
      style={{
        padding: "8px 12px",
        "border-radius": "8px",
        border: "1px solid #d1d5db",
        "font-size": "14px",
        outline: "none",
        width: "100%",
      }}
    />
  );
}
