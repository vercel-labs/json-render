import { createRoot } from "solid-js";
import { testCompactStream } from "../../core/tests/stream-transport";
import { useUIStream } from "../src/hooks";

testCompactStream("Solid", (options) =>
  createRoot((dispose) => {
    const stream = useUIStream(options);
    return { send: stream.send, spec: () => stream.spec, dispose };
  }),
);
