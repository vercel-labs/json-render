---
name: json-render-zustand
description: Zustand adapter for json-render's StateStore interface. Use when integrating json-render with Zustand for state management via @json-render/zustand.
---

# @json-render/zustand

Zustand adapter for json-render's `StateStore` interface. Wire a Zustand vanilla store as the state backend for json-render.

## Installation

```bash
npm install @json-render/zustand @json-render/core @json-render/react zustand
```

Requires Zustand v5+. Zustand v4 is not supported due to breaking API changes in the vanilla store interface.

## Usage

```tsx
import { createStore } from "zustand/vanilla";
import { zustandStateStore } from "@json-render/zustand";
import { StateProvider } from "@json-render/react";

// 1. Create a Zustand vanilla store
const bearStore = createStore(() => ({
  count: 0,
  name: "Bear",
}));

// 2. Create the json-render StateStore adapter
const store = zustandStateStore({ store: bearStore });

// 3. Use it
<StateProvider store={store}>
  {/* json-render reads/writes go through Zustand */}
</StateProvider>
```

### With a Nested Slice

```tsx
const appStore = createStore(() => ({
  ui: { count: 0 },
  auth: { token: null },
}));

const store = zustandStateStore({
  store: appStore,
  selector: (s) => s.ui,
  updater: (next, s) => s.setState({ ui: next }),
});
```

## API

### `zustandStateStore(options)`

Creates a `StateStore` backed by a Zustand store.

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `store` | `StoreApi<S>` | Yes | Zustand vanilla store (from `createStore` in `zustand/vanilla`) |
| `selector` | `(state) => StateModel` | No | Select the json-render slice. Defaults to entire state. |
| `updater` | `(nextState, store) => void` | No | Apply next state to the store. Defaults to shallow merge. Override for nested slices, or use `(next, s) => s.setState(next, true)` for full replacement. |
