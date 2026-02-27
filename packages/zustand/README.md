# @json-render/zustand

Zustand adapter for json-render's `StateStore` interface. Wire a Zustand vanilla store as the state backend for json-render.

## Installation

```bash
npm install @json-render/zustand @json-render/core @json-render/react zustand
```

> **Note:** This adapter requires Zustand v5+. Zustand v4 is not supported due to
> breaking API changes in the vanilla store interface (`createStore`, `StoreApi`).

## Usage

```ts
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

### With a nested slice

```ts
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

#### Options

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `store` | `StoreApi<S>` | Yes | A Zustand vanilla store (from `createStore` in `zustand/vanilla`) |
| `selector` | `(state) => StateModel` | No | Select the json-render slice from the store state. Defaults to the entire state. |
| `updater` | `(nextState, store) => void` | No | Apply the next state back to the Zustand store. Defaults to a shallow merge so that keys outside the json-render model are preserved. Override for nested slices, or pass `(next, s) => s.setState(next, true)` for full replacement. |
