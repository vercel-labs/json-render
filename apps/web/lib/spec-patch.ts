import type { Spec, JsonPatch } from "@json-render/core";
import { setByPath, getByPath, removeByPath } from "@json-render/core";

export function setSpecValue(
  newSpec: Spec,
  path: string,
  value: unknown,
): void {
  if (path === "/root") {
    newSpec.root = value as string;
    return;
  }
  if (path === "/state") {
    newSpec.state = value as Record<string, unknown>;
    return;
  }
  if (path.startsWith("/state/")) {
    if (!newSpec.state) newSpec.state = {};
    setByPath(
      newSpec.state as Record<string, unknown>,
      path.slice("/state".length),
      value,
    );
    return;
  }
  if (path.startsWith("/elements/")) {
    const pathParts = path.slice("/elements/".length).split("/");
    const elementKey = pathParts[0];
    if (!elementKey) return;
    if (pathParts.length === 1) {
      if (value == null || typeof value !== "object") return;
      const el = value as Record<string, unknown>;
      newSpec.elements[elementKey] = {
        ...el,
        type: typeof el.type === "string" ? el.type : "",
        props: el.props != null && typeof el.props === "object" ? el.props : {},
        children: Array.isArray(el.children) ? el.children : [],
      } as Spec["elements"][string];
    } else {
      const element = newSpec.elements[elementKey];
      if (element) {
        const newElement = { ...element };
        setByPath(
          newElement as unknown as Record<string, unknown>,
          "/" + pathParts.slice(1).join("/"),
          value,
        );
        newSpec.elements[elementKey] = newElement;
      }
    }
  }
}

export function removeSpecValue(newSpec: Spec, path: string): void {
  if (path === "/state") {
    delete newSpec.state;
    return;
  }
  if (path.startsWith("/state/") && newSpec.state) {
    removeByPath(
      newSpec.state as Record<string, unknown>,
      path.slice("/state".length),
    );
    return;
  }
  if (path.startsWith("/elements/")) {
    const pathParts = path.slice("/elements/".length).split("/");
    const elementKey = pathParts[0];
    if (!elementKey) return;
    if (pathParts.length === 1) {
      delete newSpec.elements[elementKey];
    } else {
      const element = newSpec.elements[elementKey];
      if (element) {
        const newElement = { ...element };
        removeByPath(
          newElement as unknown as Record<string, unknown>,
          "/" + pathParts.slice(1).join("/"),
        );
        newSpec.elements[elementKey] = newElement;
      }
    }
  }
}

export function getSpecValue(spec: Spec, path: string): unknown {
  if (path === "/root") return spec.root;
  if (path === "/state") return spec.state;
  if (path.startsWith("/state/") && spec.state) {
    return getByPath(
      spec.state as Record<string, unknown>,
      path.slice("/state".length),
    );
  }
  return getByPath(spec as unknown as Record<string, unknown>, path);
}

export function normalizeSpec(spec: Spec): void {
  if (
    spec.state === null ||
    (spec.state !== undefined && typeof spec.state !== "object")
  ) {
    spec.state = undefined;
  }

  for (const key of Object.keys(spec.elements)) {
    const el = spec.elements[key];
    if (!el || typeof el !== "object") {
      delete spec.elements[key];
      continue;
    }
    if (el.props == null || typeof el.props !== "object") {
      spec.elements[key] = { ...el, props: {} } as Spec["elements"][string];
    }
    if (!Array.isArray(spec.elements[key]!.children)) {
      spec.elements[key] = {
        ...spec.elements[key]!,
        children: [],
      } as Spec["elements"][string];
    }
  }
}

export function applySpecPatch(spec: Spec, patch: JsonPatch): Spec {
  const newSpec = {
    ...spec,
    elements: { ...spec.elements },
    ...(spec.state ? { state: { ...spec.state } } : {}),
  };
  switch (patch.op) {
    case "add":
    case "replace":
      setSpecValue(newSpec, patch.path, patch.value);
      break;
    case "remove":
      removeSpecValue(newSpec, patch.path);
      break;
    case "move":
      if (patch.from) {
        const moveValue = getSpecValue(newSpec, patch.from);
        removeSpecValue(newSpec, patch.from);
        setSpecValue(newSpec, patch.path, moveValue);
      }
      break;
    case "copy":
      if (patch.from) {
        setSpecValue(newSpec, patch.path, getSpecValue(newSpec, patch.from));
      }
      break;
    case "test":
      break;
  }
  normalizeSpec(newSpec);
  return newSpec;
}
