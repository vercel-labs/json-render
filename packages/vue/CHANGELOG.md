# @json-render/vue

## 0.11.0

### Patch Changes

- Updated dependencies [3f1e71e]
  - @json-render/core@0.11.0

## 0.10.0

### Minor Changes

- 9cef4e9: Dynamic forms, Vue renderer, XState Store adapter, and computed values.

  ### New: `@json-render/vue` Package

  Vue 3 renderer for json-render. Full feature parity with `@json-render/react` including data binding, visibility conditions, actions, validation, repeat scopes, and streaming.
  - `defineRegistry` — create type-safe component registries from catalogs
  - `Renderer` — render specs as Vue component trees
  - Providers: `StateProvider`, `ActionProvider`, `VisibilityProvider`, `ValidationProvider`
  - Composables: `useStateStore`, `useStateValue`, `useStateBinding`, `useActions`, `useAction`, `useIsVisible`, `useFieldValidation`
  - Streaming: `useUIStream`, `useChatUI`
  - External store support via `StateStore` interface

  ### New: `@json-render/xstate` Package

  XState Store (atom) adapter for json-render's `StateStore` interface. Wire an `@xstate/store` atom as the state backend.
  - `xstateStoreStateStore({ atom })` — creates a `StateStore` from an `@xstate/store` atom
  - Requires `@xstate/store` v3+

  ### New: `$computed` Expressions

  Call registered functions from prop expressions:
  - `{ "$computed": "functionName", "args": { "key": <expression> } }` — calls a named function with resolved args
  - Functions registered via catalog and provided at runtime through `functions` prop on `JSONUIProvider` / `createRenderer`
  - `ComputedFunction` type exported from `@json-render/core`

  ### New: `$template` Expressions

  Interpolate state values into strings:
  - `{ "$template": "Hello, ${/user/name}!" }` — replaces `${/path}` references with state values
  - Missing paths resolve to empty string

  ### New: State Watchers

  React to state changes by triggering actions:
  - `watch` field on elements maps state paths to action bindings
  - Fires when watched values change (not on initial render)
  - Supports cascading dependencies (e.g. country → city loading)
  - `watch` is a top-level field on elements (sibling of type/props/children), not inside props
  - Spec validator detects and auto-fixes `watch` placed inside props

  ### New: Cross-Field Validation Functions

  New built-in validation functions for cross-field comparisons:
  - `equalTo` — alias for `matches` with clearer semantics
  - `lessThan` — value must be less than another field (numbers, strings, coerced)
  - `greaterThan` — value must be greater than another field
  - `requiredIf` — required only when a condition field is truthy
  - Validation args now resolve through `resolvePropValue` for consistent `$state` expression handling

  ### New: `validateForm` Action (React)

  Built-in action that validates all registered form fields at once:
  - Runs `validateAll()` synchronously and writes `{ valid, errors }` to state
  - Default state path: `/formValidation` (configurable via `statePath` param)
  - Added to React schema's built-in actions list

  ### Improved: shadcn/ui Validation

  All form components now support validation:
  - Checkbox, Radio, Switch — added `checks` and `validateOn` props
  - Input, Textarea, Select — added `validateOn` prop (controls timing: change/blur/submit)
  - Shared validation schemas reduce catalog definition duplication

  ### Improved: React Provider Tree

  Reordered provider nesting so `ValidationProvider` wraps `ActionProvider`, enabling `validateForm` to access validation state. Added `useOptionalValidation` hook for non-throwing access.

### Patch Changes

- Updated dependencies [9cef4e9]
  - @json-render/core@0.10.0
