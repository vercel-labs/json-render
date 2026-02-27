# @json-render/redux

Redux adapter for json-render's `StateStore` interface. Wire a Redux store (or Redux Toolkit slice) as the state backend for json-render.

## Installation

```bash
npm install @json-render/redux @json-render/core @json-render/react redux
# or with Redux Toolkit (recommended):
npm install @json-render/redux @json-render/core @json-render/react @reduxjs/toolkit
```

## Usage

```ts
import { configureStore, createSlice } from "@reduxjs/toolkit";
import { reduxStateStore } from "@json-render/redux";
import { StateProvider } from "@json-render/react";

// 1. Define a slice for json-render state
const uiSlice = createSlice({
  name: "ui",
  initialState: { count: 0 } as Record<string, unknown>,
  reducers: {
    replaceUiState: (_state, action) => action.payload,
  },
});

// 2. Create the Redux store
const reduxStore = configureStore({
  reducer: { ui: uiSlice.reducer },
});

// 3. Create the json-render StateStore adapter
const store = reduxStateStore({
  store: reduxStore,
  selector: (state) => state.ui,
  dispatch: (next, s) => s.dispatch(uiSlice.actions.replaceUiState(next)),
});

// 4. Use it
<StateProvider store={store}>
  {/* json-render reads/writes go through Redux */}
</StateProvider>
```

## API

### `reduxStateStore(options)`

Creates a `StateStore` backed by a Redux store.

#### Options

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `store` | `Store` | Yes | The Redux store instance |
| `selector` | `(state) => StateModel` | Yes | Select the json-render slice from the Redux state tree. For a simple store where the entire state is the model, use `(s) => s`. |
| `dispatch` | `(nextState, store) => void` | Yes | Dispatch an action that replaces the selected slice with the next state |

The `dispatch` callback receives the full next state model and the Redux store, so you can dispatch any action shape your reducers expect.
