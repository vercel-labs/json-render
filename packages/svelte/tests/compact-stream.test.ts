import { testCompactStream } from "../../core/tests/stream-transport";
import { createUIStream } from "../src/streaming.svelte";

testCompactStream("Svelte", (options) => {
  const stream = createUIStream(options);
  return { send: stream.send, spec: () => stream.spec, dispose: stream.clear };
});
