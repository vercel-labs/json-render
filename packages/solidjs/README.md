# @json-render/react

**Predictable. Guardrailed. Fast.** React renderer for user-prompted dashboards, widgets, apps, and data visualizations.

## Features

- **Visibility Filtering**: Components automatically show/hide based on visibility conditions
- **Action Handling**: Built-in action execution with confirmation dialogs
- **Validation**: Field validation with error display
- **Data Binding**: Two-way data binding between UI and data model
- **Streaming**: Progressive rendering from streamed UI trees

## Installation

```bash
npm install @json-render/react @json-render/core
# or
pnpm add @json-render/react @json-render/core
```

## Quick Start

### Basic Setup

```tsx
import { JSONUIProvider, Renderer, useUIStream } from '@json-render/react';

// Define your component registry
const registry = {
  Card: ({ element, children }) => (
    <div className="card">
      <h3>{element.props.title}</h3>
      {children}
    </div>
  ),
  Button: ({ element, onAction }) => (
    <button onClick={() => onAction?.(element.props.action)}>
      {element.props.label}
    </button>
  ),
};

// Action handlers
const actionHandlers = {
  submit: async (params) => {
    await api.submit(params);
  },
  export: (params) => {
    download(params.format);
  },
};

function App() {
  const { tree, isStreaming, send, clear } = useUIStream({
    api: '/api/generate',
  });

  return (
    <JSONUIProvider
      registry={registry}
      initialData={{ user: { name: 'John' } }}
      authState={{ isSignedIn: true }}
      actionHandlers={actionHandlers}
    >
      <input
        placeholder="Describe the UI..."
        onKeyDown={(e) => e.key === 'Enter' && send(e.target.value)}
      />
      <Renderer tree={tree} registry={registry} loading={isStreaming} />
    </JSONUIProvider>
  );
}
```

### Using Contexts Directly

```tsx
import {
  DataProvider,
  VisibilityProvider,
  ActionProvider,
  ValidationProvider,
  useData,
  useVisibility,
  useActions,
  useFieldValidation,
} from '@json-render/react';

// Data context
function MyComponent() {
  const { data, get, set } = useData();
  const value = get('/user/name');
  
  return (
    <input
      value={value}
      onChange={(e) => set('/user/name', e.target.value)}
    />
  );
}

// Visibility context
function ConditionalComponent({ visible }) {
  const { isVisible } = useVisibility();
  
  if (!isVisible(visible)) {
    return null;
  }
  
  return <div>Visible content</div>;
}

// Action context
function ActionButton({ action }) {
  const { execute, loadingActions } = useActions();
  
  return (
    <button
      onClick={() => execute(action)}
      disabled={loadingActions.has(action.name)}
    >
      {action.name}
    </button>
  );
}

// Validation context
function ValidatedInput({ path, checks }) {
  const { errors, validate, touch } = useFieldValidation(path, { checks });
  const [value, setValue] = useDataBinding(path);
  
  return (
    <div>
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => { touch(); validate(); }}
      />
      {errors.map((err) => <span key={err}>{err}</span>)}
    </div>
  );
}
```

### Streaming UI

```tsx
import { useUIStream } from '@json-render/react';

function StreamingDemo() {
  const {
    tree,        // Current UI tree
    isStreaming, // Whether currently streaming
    error,       // Error if any
    send,        // Send a prompt
    clear,       // Clear the tree
  } = useUIStream({
    api: '/api/generate',
    onComplete: (tree) => console.log('Done:', tree),
    onError: (err) => console.error('Error:', err),
  });

  return (
    <div>
      <button onClick={() => send('Create a dashboard')}>
        Generate
      </button>
      {isStreaming && <span>Generating...</span>}
      {tree && <Renderer tree={tree} registry={registry} />}
    </div>
  );
}
```

## API Reference

### Providers

- `JSONUIProvider` - Combined provider for all contexts
- `DataProvider` - Data model context
- `VisibilityProvider` - Visibility evaluation context
- `ActionProvider` - Action execution context
- `ValidationProvider` - Validation context

### Hooks

- `useData()` - Access data model
- `useDataValue(path)` - Get a single value
- `useDataBinding(path)` - Two-way binding like useState
- `useVisibility()` - Access visibility evaluation
- `useIsVisible(condition)` - Check if condition is visible
- `useActions()` - Access action execution
- `useAction(action)` - Execute a specific action
- `useValidation()` - Access validation context
- `useFieldValidation(path, config)` - Field-level validation

### Components

- `Renderer` - Render a UI tree
- `ConfirmDialog` - Default confirmation dialog

### Utilities

- `useUIStream(options)` - Hook for streaming UI generation
- `flatToTree(elements)` - Convert flat list to tree

## Component Props

Components in your registry receive these props:

```typescript
interface ComponentRenderProps<P = Record<string, unknown>> {
  element: UIElement<string, P>;  // The element definition
  children?: ReactNode;           // Rendered children
  onAction?: (action: Action) => void;  // Action callback
  loading?: boolean;              // Streaming in progress
}
```

## Example Component

```tsx
function MetricComponent({ element }: ComponentRenderProps) {
  const { label, valuePath, format } = element.props;
  const value = useDataValue(valuePath);
  
  const formatted = format === 'currency'
    ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
    : String(value);
  
  return (
    <div className="metric">
      <span className="label">{label}</span>
      <span className="value">{formatted}</span>
    </div>
  );
}
```
