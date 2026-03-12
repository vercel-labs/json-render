import type { Spec } from "@json-render/core";
import { StateProvider } from "@json-render/solid";
import { DemoRenderer } from "./DemoRenderer";

export function App(props: { initialRenderer?: string; spec: Spec }) {
  const renderer = props.initialRenderer ?? "solid";
  const initialState = {
    ...props.spec.state,
    renderer,
  };

  return (
    <div class={`renderer-${renderer}`}>
      <StateProvider initialState={initialState}>
        <DemoRenderer spec={props.spec} />
      </StateProvider>
    </div>
  );
}
