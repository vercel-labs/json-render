import { Component } from '@angular/core';
import { createStateStore, defineCatalog, type Spec } from '@json-render/core';
import { JSONUIProvider, Renderer, defineRegistry, element, text } from '@json-render/angular';
import { schema } from '@json-render/angular/schema';
import { z } from 'zod';

const initialState = {
  count: 0,
  name: '',
  todos: [
    { id: 1, title: 'Learn Angular signals', completed: true },
    { id: 2, title: 'Try @json-render/angular', completed: false },
    { id: 3, title: 'Ship a polished demo', completed: false },
  ],
};

const appStore = createStateStore(initialState);

const catalog = defineCatalog(schema, {
  components: {
    Stack: {
      props: z.object({
        gap: z.number().optional(),
        padding: z.number().optional(),
        direction: z.enum(['vertical', 'horizontal']).optional(),
        align: z.enum(['start', 'center', 'end']).optional(),
      }),
      description: 'Layout container for vertical or horizontal stacks',
    },
    Card: {
      props: z.object({
        title: z.string().optional(),
        subtitle: z.string().optional(),
      }),
      description: 'Card container with title and subtitle',
    },
    Text: {
      props: z.object({
        content: z.union([z.string(), z.number()]),
        size: z.enum(['sm', 'md', 'lg', 'xl']).optional(),
        weight: z.enum(['normal', 'medium', 'bold']).optional(),
        color: z.string().optional(),
      }),
      description: 'Text display',
    },
    Button: {
      props: z.object({
        label: z.string(),
        variant: z.enum(['primary', 'secondary', 'danger']).optional(),
        disabled: z.boolean().optional(),
      }),
      description: 'Clickable button',
    },
    Badge: {
      props: z.object({
        label: z.string(),
        color: z.string().optional(),
      }),
      description: 'Badge label',
    },
    ListItem: {
      props: z.object({
        title: z.string(),
        completed: z.boolean().optional(),
      }),
      description: 'Todo list item',
    },
    Input: {
      props: z.object({
        value: z.string().optional(),
        placeholder: z.string().optional(),
      }),
      description: 'Text input with optional binding',
    },
  },
  actions: {
    increment: {
      params: z.object({}),
      description: 'Increment counter',
    },
    decrement: {
      params: z.object({}),
      description: 'Decrement counter',
    },
    reset: {
      params: z.object({}),
      description: 'Reset counter',
    },
    toggleItem: {
      params: z.object({
        index: z.number(),
      }),
      description: 'Toggle todo completion by index',
    },
  },
});

function getFontSize(size: string | undefined): string {
  switch (size) {
    case 'sm':
      return '12px';
    case 'lg':
      return '16px';
    case 'xl':
      return '24px';
    default:
      return '14px';
  }
}

function getFontWeight(weight: string | undefined): string {
  switch (weight) {
    case 'medium':
      return '500';
    case 'bold':
      return '700';
    default:
      return '400';
  }
}

function getButtonClass(variant: string | undefined): string {
  switch (variant) {
    case 'danger':
      return 'button button-danger';
    case 'secondary':
      return 'button button-secondary';
    default:
      return 'button button-primary';
  }
}

const { registry } = defineRegistry(catalog, {
  components: {
    Stack: ({ props, children }) => {
      const direction = props.direction === 'horizontal' ? 'row' : 'column';
      const alignMap: Record<string, string> = {
        start: 'flex-start',
        center: 'center',
        end: 'flex-end',
      };

      return element(
        'div',
        {
          class: 'stack',
          style: {
            display: 'flex',
            flexDirection: direction,
            gap: props.gap !== undefined ? `${props.gap}px` : undefined,
            padding: props.padding !== undefined ? `${props.padding}px` : undefined,
            alignItems:
              alignMap[(props.align as string | undefined) ?? ''] ??
              (direction === 'row' ? 'center' : 'stretch'),
          },
        },
        children ?? [],
      );
    },
    Card: ({ props, children }) =>
      element('section', { class: 'card' }, [
        props.title ? element('h2', { class: 'card-title' }, [text(props.title)]) : null,
        props.subtitle ? element('p', { class: 'card-subtitle' }, [text(props.subtitle)]) : null,
        ...(children ?? []),
      ]),
    Text: ({ props }) =>
      element(
        'span',
        {
          class: 'text',
          style: {
            fontSize: getFontSize(props.size),
            fontWeight: getFontWeight(props.weight),
            color: props.color ?? '#111827',
          },
        },
        [text(String(props.content ?? ''))],
      ),
    Button: ({ props, emit }) =>
      element(
        'button',
        {
          type: 'button',
          class: getButtonClass(props.variant),
          disabled: props.disabled ?? false,
          onclick: () => emit('press'),
        },
        [text(props.label)],
      ),
    Badge: ({ props }) =>
      element('span', { class: 'badge', style: { color: props.color ?? '#0369a1' } }, [
        text(props.label),
      ]),
    ListItem: ({ props, emit }) =>
      element(
        'div',
        {
          class: props.completed ? 'list-item list-item-completed' : 'list-item',
          onclick: () => emit('press'),
        },
        [
          element(
            'span',
            props.completed
              ? { class: 'list-item-icon list-item-icon-completed' }
              : { class: 'list-item-icon' },
            [text(props.completed ? '✓' : '')],
          ),
          element(
            'span',
            props.completed
              ? { class: 'list-item-title list-item-title-completed' }
              : { class: 'list-item-title' },
            [text(props.title)],
          ),
        ],
      ),
    Input: ({ props, bindings }) =>
      element('input', {
        class: 'input',
        value: props.value ?? '',
        placeholder: props.placeholder,
        oninput: (event: Event) => {
          const path = bindings?.value;
          if (!path) return;
          const value = (event.target as HTMLInputElement | null)?.value ?? '';
          appStore.set(path, value);
        },
      }),
  },
  actions: {
    increment: async () => {
      const value = Number(appStore.get('/count') ?? 0);
      appStore.set('/count', value + 1);
    },
    decrement: async () => {
      const value = Number(appStore.get('/count') ?? 0);
      appStore.set('/count', Math.max(0, value - 1));
    },
    reset: async () => {
      appStore.set('/count', 0);
    },
    toggleItem: async (params) => {
      const index = Number(params?.index ?? -1);
      const todos = appStore.get('/todos');
      if (!Array.isArray(todos) || index < 0 || index >= todos.length) {
        return;
      }
      const nextTodos = todos.slice();
      const item = nextTodos[index] as
        | { id: number; title: string; completed: boolean }
        | undefined;
      if (!item) return;
      nextTodos[index] = { ...item, completed: !item.completed };
      appStore.set('/todos', nextTodos);
    },
  },
});

const handlers = {
  increment: async (): Promise<void> => {
    const value = Number(appStore.get('/count') ?? 0);
    appStore.set('/count', value + 1);
  },
  decrement: async (): Promise<void> => {
    const value = Number(appStore.get('/count') ?? 0);
    appStore.set('/count', Math.max(0, value - 1));
  },
  reset: async (): Promise<void> => {
    appStore.set('/count', 0);
  },
  toggleItem: async (params: Record<string, unknown>): Promise<void> => {
    const index = Number(params.index ?? -1);
    const todos = appStore.get('/todos');
    if (!Array.isArray(todos) || index < 0 || index >= todos.length) {
      return;
    }
    const nextTodos = todos.slice();
    const item = nextTodos[index] as { id: number; title: string; completed: boolean } | undefined;
    if (!item) return;
    nextTodos[index] = { ...item, completed: !item.completed };
    appStore.set('/todos', nextTodos);
  },
};

@Component({
  selector: 'app-root',
  imports: [JSONUIProvider, Renderer],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly registry = registry;
  protected readonly handlers = handlers;
  protected readonly store = appStore;

  protected readonly spec: Spec = {
    root: 'card-1',
    state: initialState,
    elements: {
      'card-1': {
        type: 'Stack',
        props: {
          gap: 24,
          padding: 24,
          direction: 'vertical',
        },
        children: ['header', 'counter-card', 'milestone-badge', 'todos-card', 'input-card'],
      },
      header: {
        type: 'Text',
        props: {
          content: '@json-render/angular demo',
          size: 'xl',
          weight: 'bold',
        },
        children: [],
      },

      'counter-card': {
        type: 'Card',
        props: {
          title: 'Counter',
          subtitle: 'Click the buttons to change the count',
        },
        children: ['counter-body'],
      },
      'counter-body': {
        type: 'Stack',
        props: { gap: 12, direction: 'horizontal', align: 'center' },
        children: ['decrement-btn', 'counter-value', 'increment-btn', 'reset-btn'],
      },
      'decrement-btn': {
        type: 'Button',
        props: { label: '-', variant: 'secondary' },
        on: { press: { action: 'decrement' } },
        children: [],
      },
      'counter-value': {
        type: 'Text',
        props: {
          content: { $state: '/count' },
          size: 'xl',
          weight: 'bold',
        },
        children: [],
      },
      'increment-btn': {
        type: 'Button',
        props: { label: '+', variant: 'primary' },
        on: { press: { action: 'increment' } },
        children: [],
      },
      'reset-btn': {
        type: 'Button',
        props: { label: 'Reset', variant: 'danger' },
        on: { press: { action: 'reset' } },
        children: [],
      },

      'milestone-badge': {
        type: 'Badge',
        props: { label: 'Milestone reached: 10!', color: '#10b981' },
        visible: {
          $state: '/count',
          gte: 10,
        },
        children: [],
      },

      'todos-card': {
        type: 'Card',
        props: {
          title: 'Todo List',
          subtitle: 'Your tasks',
        },
        children: ['todos-list'],
      },
      'todos-list': {
        type: 'Stack',
        props: { gap: 8, direction: 'vertical' },
        repeat: { statePath: '/todos', key: 'id' },
        children: ['todo-item'],
      },
      'todo-item': {
        type: 'ListItem',
        props: {
          title: { $item: 'title' },
          completed: { $item: 'completed' },
        },
        on: {
          press: {
            action: 'toggleItem',
            params: { index: { $index: true } },
          },
        },
        children: [],
      },

      'input-card': {
        type: 'Card',
        props: {
          title: 'Bound Input',
          subtitle: 'Type to update state in real-time',
        },
        children: ['input-body'],
      },
      'input-body': {
        type: 'Stack',
        props: { gap: 12, direction: 'vertical' },
        children: ['name-input', 'name-display'],
      },
      'name-input': {
        type: 'Input',
        props: {
          value: { $bindState: '/name' },
          placeholder: 'Enter your name...',
        },
        children: [],
      },
      'name-display': {
        type: 'Text',
        props: {
          content: { $state: '/name' },
          size: 'md',
          color: '#6b7280',
        },
        children: [],
      },
    },
  };
}
