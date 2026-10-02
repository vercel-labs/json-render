# Python authoring design spike

Related to [Python bindings #7](https://github.com/vercel-labs/json-render/issues/7).
This is an executable proposal, not a released package or agreed public API.
The first slice lets a Python backend author the existing flat `Spec` wire format;
the frontend continues to own its catalog, component registry, and renderer.

## Scope

The dependency-free prototype contains `Spec`, `Element`, and `ActionBinding`
dataclasses. It emits the TypeScript field names, preserves false/empty/null values,
checks root, child, and named-slot references, and rejects non-finite JSON numbers.
Dynamic props, visibility expressions, repeat configuration, state, and action
parameters are passed through. Their runtime/catalog validation stays in TypeScript.
It does not implement rendering, prompts, streaming, JSON Patch, or catalog-specific
prop validation.

```python
from json_render import Element, Spec

spec = Spec(root="greeting", elements={
    "greeting": Element(type="Text", props={"text": "Hello from Python"})
})
print(spec.to_json())
```

## Proposed next decision

Before creating a public package, agree on the package/import name, Python support
range, dependency policy, and API ownership. This spike runs on Python 3.10+ and
has no runtime dependencies. A Pydantic adapter is a possible later addition.

For catalog authoring, choose one source of truth first. A small first package could
consume the JSON Schema exported by the existing TypeScript catalog, without
reimplementing catalog validation or prompt generation. Native Python catalog
definition from Pydantic models would be a separate extension: it needs a shared
JSON Schema contract, dynamic-prop rules, reference handling, and fixtures against
the TypeScript implementation. Neither API is implemented or claimed here.

## Verification

Run from the repository root:

```sh
python -m unittest discover -s proposals/python-bindings -v
pnpm exec vitest run --config proposals/python-bindings/vitest.config.ts
```

Set `JSON_RENDER_PYTHON` to an executable path if `python` is not on PATH.
The interop test generates JSON with Python and passes it through the current
React catalog's Zod spec schema, its component prop schemas, and the current
TypeScript action schema and resolver.
It checks slots, false visibility, event placement, state references, and watch
arrays; a negative prop example must fail catalog validation.

The current React catalog schema omits `on` and `state` and is lenient about
catalog-specific props; the fixture checks component props separately. It can accept a spec while
stripping those fields. The fixture therefore uses the original serialized spec
for action resolution and validates event bindings separately. This spike does
not depend on the separate event-schema repair in PR #370 and does not claim full
schema parity or browser-rendering coverage.
