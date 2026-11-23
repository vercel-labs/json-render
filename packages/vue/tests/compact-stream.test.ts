import { createApp } from "vue";
import { testCompactStream } from "../../core/tests/stream-transport";
import { useUIStream } from "../src/hooks";

testCompactStream("Vue", (options) => {
  let stream!: ReturnType<typeof useUIStream>;
  const app = createApp({
    setup() {
      stream = useUIStream(options);
      return () => null;
    },
  });
  app.mount(document.createElement("div"));
  return {
    send: stream.send,
    spec: () => stream.spec.value,
    dispose: () => app.unmount(),
  };
});
