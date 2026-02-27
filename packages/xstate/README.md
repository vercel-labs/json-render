# @json-render/xstate

[XState Store](https://stately.ai/docs/xstate-store) adapter for json-render's `StateStore` interface. Wire an `@xstate/store` atom as the state backend for json-render.

## Installation

```bash
npm install @json-render/xstate @json-render/core @json-render/react @xstate/store
```

> [!NOTE]
> This adapter requires `@xstate/store` v3+.

## Usage

```ts
import { createAtom } from "@xstate/store";
import { xstateStoreStateStore } from "@json-render/xstate";
import { StateProvider } from "@json-render/react";

// 1. Create an atom
const uiAtom = createAtom({ count: 0 });

// 2. Create the json-render StateStore adapter
const store = xstateStoreStateStore({ atom: uiAtom });

// 3. Use it
<StateProvider store={store}>
  {/* json-render reads/writes go through @xstate/store */}
</StateProvider>
```

## API

### `xstateStoreStateStore(options)`

Creates a `StateStore` backed by an `@xstate/store` atom.

#### Options

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `atom` | `Atom<StateModel>` | Yes | An `@xstate/store` atom (from `createAtom`) holding the json-render state model |
