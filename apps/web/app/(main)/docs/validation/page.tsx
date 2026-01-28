import Link from 'next/link';
import { Code } from '@/components/code';

export const metadata = {
  title: 'Validation | json-render',
};

export default function ValidationPage() {
  return (
    <article>
      <h1 className="mb-4 text-3xl font-bold">Validation</h1>
      <p className="text-muted-foreground mb-8">
        Validate form inputs with built-in and custom functions.
      </p>

      <h2 className="mt-12 mb-4 text-xl font-semibold">Built-in Validators</h2>
      <p className="text-muted-foreground mb-4 text-sm">
        json-render includes common validation functions:
      </p>
      <ul className="text-muted-foreground mb-4 list-inside list-disc space-y-1 text-sm">
        <li>
          <code className="text-foreground">required</code> — Value must be
          non-empty
        </li>
        <li>
          <code className="text-foreground">email</code> — Valid email format
        </li>
        <li>
          <code className="text-foreground">minLength</code> — Minimum string
          length
        </li>
        <li>
          <code className="text-foreground">maxLength</code> — Maximum string
          length
        </li>
        <li>
          <code className="text-foreground">pattern</code> — Match a regex
          pattern
        </li>
        <li>
          <code className="text-foreground">min</code> — Minimum numeric value
        </li>
        <li>
          <code className="text-foreground">max</code> — Maximum numeric value
        </li>
        <li>
          <code className="text-foreground">numeric</code> — Numeric value
        </li>
        <li>
          <code className="text-foreground">url</code> — Valid url format
        </li>
        <li>
          <code className="text-foreground">matches</code> — Matches a value
        </li>
      </ul>

      <h2 className="mt-12 mb-4 text-xl font-semibold">
        Using Validation in JSON
      </h2>
      <Code lang="json">{`{
  "type": "TextField",
  "props": {
    "label": "Email",
    "valuePath": "/form/email",
    "checks": [
      { "fn": "required", "message": "Email is required" },
      { "fn": "email", "message": "Invalid email format" }
    ],
    "validateOn": "blur"
  }
}`}</Code>

      <h2 className="mt-12 mb-4 text-xl font-semibold">
        Validation with Parameters
      </h2>
      <Code lang="json">{`{
  "type": "TextField",
  "props": {
    "label": "Password",
    "valuePath": "/form/password",
    "checks": [
      { "fn": "required", "message": "Password is required" },
      {
        "fn": "minLength",
        "args": { "length": 8 },
        "message": "Password must be at least 8 characters"
      },
      {
        "fn": "pattern",
        "args": { "pattern": "[A-Z]" },
        "message": "Must contain at least one uppercase letter"
      }
    ]
  }
}`}</Code>

      <h2 className="mt-12 mb-4 text-xl font-semibold">
        Custom Validation Functions
      </h2>
      <p className="text-muted-foreground mb-4 text-sm">
        Define custom validators in your catalog:
      </p>
      <Code lang="typescript">{`const catalog = createCatalog({
  components: { /* ... */ },
  validationFunctions: {
    isValidPhone: {
      description: 'Validates phone number format',
    },
    isUniqueEmail: {
      description: 'Checks if email is not already registered',
    },
  },
});`}</Code>

      <p className="text-muted-foreground mb-4 text-sm">
        Then implement them in your ValidationProvider:
      </p>
      <Code lang="tsx">{`import { ValidationProvider } from '@json-render/react';

function App() {
  const customValidators = {
    isValidPhone: (value) => {
      const phoneRegex = /^\\+?[1-9]\\d{1,14}$/;
      return phoneRegex.test(value);
    },
    isUniqueEmail: async (value) => {
      const response = await fetch(\`/api/check-email?email=\${value}\`);
      const { available } = await response.json();
      return available;
    },
  };

  return (
    <ValidationProvider functions={customValidators}>
      {/* Your UI */}
    </ValidationProvider>
  );
}`}</Code>

      <h2 className="mt-12 mb-4 text-xl font-semibold">Using in Components</h2>
      <Code lang="tsx">{`import { useFieldValidation } from '@json-render/react';

function TextField({ element }) {
  const { value, setValue, errors, validate } = useFieldValidation(
    element.props.valuePath,
    element.props.checks
  );

  return (
    <div>
      <label>{element.props.label}</label>
      <input
        value={value || ''}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => validate()}
      />
      {errors.map((error, i) => (
        <p key={i} className="text-red-500 text-sm">{error}</p>
      ))}
    </div>
  );
}`}</Code>

      <h2 className="mt-12 mb-4 text-xl font-semibold">Validation Timing</h2>
      <p className="text-muted-foreground mb-4 text-sm">
        Control when validation runs with{' '}
        <code className="text-foreground">validateOn</code>:
      </p>
      <ul className="text-muted-foreground list-inside list-disc space-y-1 text-sm">
        <li>
          <code className="text-foreground">change</code> — Validate on every
          input change
        </li>
        <li>
          <code className="text-foreground">blur</code> — Validate when field
          loses focus
        </li>
        <li>
          <code className="text-foreground">submit</code> — Validate only on
          form submission
        </li>
      </ul>

      <h2 className="mt-12 mb-4 text-xl font-semibold">Next</h2>
      <p className="text-muted-foreground text-sm">
        Learn about{' '}
        <Link href="/docs/ai-sdk" className="text-foreground hover:underline">
          AI SDK integration
        </Link>
        .
      </p>
    </article>
  );
}
