# json-render Python (experimental)

Author the existing flat UI spec format from a Python backend and send its JSON
to a TypeScript renderer. This first slice provides `Spec`, `Element`,
`ActionBinding`, and validation against an exported TypeScript catalog schema.
The API and distribution name are proposed for [#7](https://github.com/vercel-labs/json-render/issues/7)
and may change. This package is not published to PyPI; install it from a checkout.

## Installation

Requires Python 3.10 or newer. From the repository root:

```sh
python -m pip install ./packages/python
```

## Author a spec

```python
from json_render import ActionBinding, Element, Spec

spec = Spec(
    root="card",
    state={"count": 2},
    elements={
        "card": Element("Card", props={"title": "Hello"}, children=["save"]),
        "save": Element(
            "Button",
            props={"label": "Save"},
            on={"press": ActionBinding("save", params={"count": {"$state": "/count"}})},
        ),
    },
)
print(spec.to_json())
```

The frontend must supply matching components and a `save` action handler. Render
the original JSON with the existing renderer and registry. The Python package
does not run actions, resolve expressions, render UI, generate prompts, or stream
JSON Patch. Custom non-flat schemas can be validated as dictionaries with `Catalog`.

`Spec.to_dict()` checks that the root, children, and named-slot references exist.
`Spec.to_json()` also rejects NaN and infinity. It preserves Unicode, empty lists
and objects, false values, and null values inside props/state. Optional fields are
omitted when `None`; `Element.visible` is omitted only when left unset. Event and
watch bindings accept one `ActionBinding` or a list. The fields `on_success`,
`on_error`, and `prevent_default` serialize as `onSuccess`, `onError`, and
`preventDefault`. `on`, `watch`, `visible`, `slots`, and `repeat` belong on the
element, not inside `props`. Values passed in props, state, and configuration must
be JSON serializable. Serialization does not validate graph cycles, component
props, expression semantics, or action names/parameters.

## Validate with one catalog source of truth

Export the application's existing TypeScript catalog:

```typescript
import { writeFileSync } from "node:fs";

writeFileSync("catalog.schema.json", JSON.stringify(catalog.jsonSchema()));
```

Then load that schema in Python:

```python
from jsonschema.exceptions import ValidationError
from json_render import Catalog, Element, Spec

catalog = Catalog.from_file("catalog.schema.json")
spec = Spec("text", {"text": Element("Text", props={"text": "Hello"})})
try:
    document = catalog.validate(spec)
except ValidationError as error:
    print(error.json_path, error.message)
else:
    print(document)
```

The supplied export must describe the `Text` component and its `text` prop.
`Catalog` also accepts a schema dictionary or `Catalog.from_json(schema_json)`.
`validate` returns a detached JSON dictionary. It applies the exported schema
exactly, including `additionalProperties`, and never silently strips fields.
In-schema references work; external references are not fetched. Validation is
backed by `jsonschema` and `referencing`, not a Python recreation of Zod.

**Export limitations:** validation is only as complete as the supplied JSON Schema.
The current React schema export omits the runtime fields `on`, `watch`, and `state`
and rejects those as additional properties. Its component props are also lenient
when more than one component is present. Zod transforms/refinements and dynamic
expressions do not automatically have equivalent JSON Schema validation. Do not
strip fields to bypass validation or treat a successful schema check as runtime
authorization. Use an application schema that declares the fields you need and
retain frontend prop/action validation. Python catalog definitions and Pydantic
adapters are deferred until the shared catalog contract is agreed.

## Development

From the repository root, install the package and run:

```sh
python -m unittest discover -s packages/python/tests -v
python -I -c 'from json_render import Spec, Element; print(Spec("root", {"root": Element("Text")}).to_json())'
pnpm exec tsc -p packages/python/tsconfig.json
pnpm exec vitest run --config packages/python/vitest.config.ts
```

Set `JSON_RENDER_PYTHON` to the installed package's Python executable for the
interop suite if `python` refers to a different environment. The tests generate
JSON in Python, validate spec/prop/action fields with the existing TypeScript
implementation, resolve state-bound action parameters, and pass a real TypeScript
JSON Schema export back into Python with invalid-spec controls. CI installs the
wheel on Python 3.10 and 3.14. Python publishing is intentionally not wired into
the npm release workflow.
