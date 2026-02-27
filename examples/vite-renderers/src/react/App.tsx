import { useMemo } from "react";
import type { Spec } from "@json-render/core";
import {
  StateProvider,
  ActionProvider,
  VisibilityProvider,
  ValidationProvider,
  Renderer,
  defineRegistry,
  useStateStore,
} from "@json-render/react";
import { catalog } from "./catalog";
import { components } from "./registry";
import { actionStubs, makeHandlers } from "../shared/handlers";

const { registry } = defineRegistry(catalog, {
  components,
  actions: actionStubs,
});

function DemoRenderer({ spec }: { spec: Spec }) {
  const { get, set } = useStateStore();
  const handlers = useMemo(() => makeHandlers(get, set), [get, set]);
  return (
    <ActionProvider handlers={handlers}>
      <VisibilityProvider>
        <ValidationProvider>
          <Renderer spec={spec} registry={registry} />
        </ValidationProvider>
      </VisibilityProvider>
    </ActionProvider>
  );
}

export default function App({
  initialRenderer = "vue",
  spec,
}: {
  initialRenderer?: string;
  spec: Spec;
}) {
  return (
    <div className={`renderer-${initialRenderer}`}>
      <StateProvider
        initialState={{ ...spec.state, renderer: initialRenderer }}
      >
        <DemoRenderer spec={spec} />
      </StateProvider>
    </div>
  );
}
