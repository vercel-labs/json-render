import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { testCompactStream } from "../../core/tests/stream-transport";
import { useUIStream } from "../src/hooks";
import { useUIStream as useNativeStream } from "../../react-native/src/hooks";
import { useUIStream as useInkStream } from "../../ink/src/hooks";

for (const [name, useStream] of [
  ["React", useUIStream],
  ["React Native", useNativeStream],
  ["Ink", useInkStream],
] as const) {
  testCompactStream(name, (options) => {
    let stream!: ReturnType<typeof useStream>;
    function Harness() {
      stream = useStream(options);
      return null;
    }
    const root = createRoot(document.createElement("div"));
    flushSync(() => root.render(createElement(Harness)));
    return {
      send: (...args) => stream.send(...args),
      spec: () => stream.spec,
      dispose: () => flushSync(() => root.unmount()),
    };
  });
}
