import type { Spec } from "@json-render/core";
import {
  ActionProvider,
  ValidationProvider,
  VisibilityProvider,
  Renderer,
  defineRegistry,
  useStateStore,
} from "@json-render/solid";
import { catalog } from "./catalog";
import { components } from "./registry";
import { actionStubs, makeHandlers } from "../shared/handlers";

const { registry } = defineRegistry(catalog, {
  components,
  actions: actionStubs,
});

export function DemoRenderer(props: { spec: Spec }) {
  const stateStore = useStateStore();
  const handlers = makeHandlers(stateStore.get, stateStore.set);

  return (
    <ActionProvider handlers={handlers}>
      <VisibilityProvider>
        <ValidationProvider>
          <Renderer spec={props.spec} registry={registry} />
        </ValidationProvider>
      </VisibilityProvider>
    </ActionProvider>
  );
}
