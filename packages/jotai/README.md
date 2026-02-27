# @json-render/jotai

Jotai adapter for json-render's `StateStore` interface. Wire a Jotai atom as the state backend for json-render.

## Installation

```bash
npm install @json-render/jotai @json-render/core @json-render/react jotai
```

## Usage

```ts
import { atom } from "jotai";
import { jotaiStateStore } from "@json-render/jotai";
import { StateProvider } from "@json-render/react";

// 1. Create an atom that holds the json-render state
const uiAtom = atom<Record<string, unknown>>({ count: 0 });

// 2. Create the json-render StateStore adapter
const store = jotaiStateStore({ atom: uiAtom });

// 3. Use it
<StateProvider store={store}>
  {/* json-render reads/writes go through Jotai */}
</StateProvider>
```

### With a shared Jotai store

If your app already uses a Jotai `<Provider>` with a custom store, pass it so both json-render and your components share the same state:

```ts
import { atom, createStore } from "jotai";
import { Provider as JotaiProvider } from "jotai/react";
import { jotaiStateStore } from "@json-render/jotai";
import { StateProvider } from "@json-render/react";

const jStore = createStore();
const uiAtom = atom<Record<string, unknown>>({ count: 0 });

const store = jotaiStateStore({ atom: uiAtom, store: jStore });

<JotaiProvider store={jStore}>
  <StateProvider store={store}>
    {/* Both json-render and useAtom() see the same state */}
  </StateProvider>
</JotaiProvider>
```

## API

### `jotaiStateStore(options)`

Creates a `StateStore` backed by a Jotai atom.

#### Options

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `atom` | `WritableAtom<StateModel, [StateModel], void>` | Yes | A writable atom holding the state model |
| `store` | Jotai `Store` | No | The Jotai store instance. Defaults to a new store created internally. Pass your own to share state with `<Provider>`. |
