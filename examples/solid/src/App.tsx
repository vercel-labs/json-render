import { StateProvider } from "@json-render/solid";
import { demoSpec } from "./lib/spec";
import { DemoRenderer } from "./DemoRenderer";

export function App() {
  const initialState = demoSpec.state ?? {};

  return (
    <StateProvider initialState={initialState}>
      <DemoRenderer />
    </StateProvider>
  );
}
