import type { StartAppSpec } from "@json-render/start";
import { defaultSpec } from "./default-spec";

let currentSpec: StartAppSpec = defaultSpec;

export function getSpec(): StartAppSpec {
  return currentSpec;
}

export function setSpec(spec: StartAppSpec): void {
  currentSpec = spec;
}
