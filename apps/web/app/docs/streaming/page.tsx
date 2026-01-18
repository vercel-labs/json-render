import { Code } from "@/components/code";

export const metadata = {
  title: "Streaming | json-render",
};

export default function StreamingPage() {
  return (
    <article>
      <h1 className="text-3xl font-bold mb-4">Streaming</h1>
      <p className="text-muted-foreground mb-8">
        Progressively render UI as AI generates it.
      </p>

      <h2 className="text-xl font-semibold mt-12 mb-4">How Streaming Works</h2>
      <p className="text-sm text-muted-foreground mb-4">
        json-render uses JSONL (JSON Lines) streaming. As AI generates, each
        line represents a patch operation:
      </p>
      <Code lang="json">{`{"op":"set","path":"/root","value":"dashboard"}
{"op":"set","path":"/elements/dashboard","value":{"key":"dashboard","type":"Card","props":{"title":"Dashboard"},"children":["metric-1","metric-2"]}}
{"op":"set","path":"/elements/metric-1","value":{"key":"metric-1","type":"Metric","props":{"label":"Revenue"}}}
{"op":"set","path":"/elements/metric-2","value":{"key":"metric-2","type":"Metric","props":{"label":"Users"}}}`}</Code>

      <h2 className="text-xl font-semibold mt-12 mb-4">useUIStream Hook</h2>
      <p className="text-sm text-muted-foreground mb-4">
        The hook handles parsing and state management:
      </p>
      <Code lang="tsx">{`import { useUIStream } from '@json-render/react';

function App() {
  const {
    tree,        // Current UI tree state
    isLoading,   // True while streaming
    error,       // Any error that occurred
    generate,    // Function to start generation
    abort,       // Function to cancel streaming
  } = useUIStream({
    endpoint: '/api/generate',
  });
}`}</Code>

      <h2 className="text-xl font-semibold mt-12 mb-4">Patch Operations</h2>
      <p className="text-sm text-muted-foreground mb-4">
        Supported operations:
      </p>
      <ul className="list-disc list-inside text-sm text-muted-foreground space-y-2 mb-4">
        <li>
          <code className="text-foreground">set</code> — Set the value at a path
          (creates if needed)
        </li>
        <li>
          <code className="text-foreground">add</code> — Add to an array at a
          path
        </li>
        <li>
          <code className="text-foreground">replace</code> — Replace value at a
          path
        </li>
        <li>
          <code className="text-foreground">remove</code> — Remove value at a
          path
        </li>
      </ul>

      <h2 className="text-xl font-semibold mt-12 mb-4">Path Format</h2>
      <p className="text-sm text-muted-foreground mb-4">
        Paths use a key-based format for elements:
      </p>
      <Code lang="bash">{`/root              -> Root element
/root/children     -> Children of root
/elements/card-1   -> Element with key "card-1"
/elements/card-1/children -> Children of card-1`}</Code>

      <h2 className="text-xl font-semibold mt-12 mb-4">Server-Side Setup</h2>
      <p className="text-sm text-muted-foreground mb-4">
        Ensure your API route streams properly:
      </p>
      <Code lang="typescript">{`export async function POST(req: Request) {
  const { prompt } = await req.json();
  
  const result = streamText({
    model: 'anthropic/claude-haiku-4.5',
    system: generateCatalogPrompt(catalog),
    prompt,
  });

  // Return as a streaming response
  return new Response(result.textStream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked',
      'Cache-Control': 'no-cache',
    },
  });
}`}</Code>

      <h2 className="text-xl font-semibold mt-12 mb-4">
        Progressive Rendering
      </h2>
      <p className="text-sm text-muted-foreground mb-4">
        The Renderer automatically updates as the tree changes:
      </p>
      <Code lang="tsx">{`function App() {
  const { tree, isLoading } = useUIStream({ endpoint: '/api/generate' });

  return (
    <div>
      {isLoading && <LoadingIndicator />}
      <Renderer tree={tree} registry={registry} />
    </div>
  );
}`}</Code>

      <h2 className="text-xl font-semibold mt-12 mb-4">Aborting Streams</h2>
      <Code lang="tsx">{`function App() {
  const { isLoading, generate, abort } = useUIStream({
    endpoint: '/api/generate',
  });

  return (
    <div>
      <button onClick={() => generate('Create dashboard')}>
        Generate
      </button>
      {isLoading && (
        <button onClick={abort}>Cancel</button>
      )}
    </div>
  );
}`}</Code>
    </article>
  );
}
