type Path = (string | number)[];
type Container = {
  value: Record<string, unknown> | unknown[];
  path: Path;
  state: "keyOrEnd" | "key" | "colon" | "valueOrEnd" | "value" | "separator";
  key?: string;
};

export function createJSONStream(
  onValue: (path: Path, value: unknown, complete: boolean) => void,
) {
  const stack: Container[] = [];
  let token = "",
    string = false,
    escaped = false,
    key = false,
    done = false;
  let root: unknown;
  function attach(value: unknown): Path {
    const parent = stack.at(-1);
    if (!parent) {
      if (done) throw new Error("Trailing JSON content");
      root = value;
      done = true;
      return [];
    }
    if (parent.state !== "value" && parent.state !== "valueOrEnd")
      throw new Error("Expected JSON separator");
    const name = Array.isArray(parent.value)
      ? parent.value.length
      : parent.key!;
    Object.defineProperty(parent.value, name, {
      value,
      enumerable: true,
      configurable: true,
      writable: true,
    });
    parent.state = "separator";
    return [...parent.path, name];
  }
  function finishToken() {
    const value: unknown = JSON.parse(token);
    if (key) {
      const parent = stack.at(-1)!;
      if (Object.hasOwn(parent.value, value as string))
        throw new Error("Duplicate JSON key");
      parent.key = value as string;
      parent.state = "colon";
    } else onValue(attach(value), value, true);
    token = "";
  }
  return {
    push(chunk: string) {
      for (const char of chunk) {
        if (string) {
          token += char;
          if (escaped) escaped = false;
          else if (char === "\\") escaped = true;
          else if (char === '"') {
            string = false;
            finishToken();
          }
          continue;
        }
        if (token) {
          if (!/[ \t\r\n,\]}]/.test(char)) {
            token += char;
            continue;
          }
          finishToken();
        }
        if (/[ \t\r\n]/.test(char)) continue;
        const parent = stack.at(-1);
        if (char === '"') {
          key =
            !!parent && (parent.state === "key" || parent.state === "keyOrEnd");
          if (
            !key &&
            parent &&
            parent.state !== "value" &&
            parent.state !== "valueOrEnd"
          )
            throw new Error("Unexpected JSON string");
          string = true;
          token = char;
          continue;
        }
        if (char === ":") {
          if (parent?.state !== "colon")
            throw new Error("Unexpected JSON colon");
          parent.state = "value";
          continue;
        }
        if (char === ",") {
          if (parent?.state !== "separator")
            throw new Error("Unexpected JSON comma");
          parent.state = Array.isArray(parent.value) ? "value" : "key";
          continue;
        }
        if (char === "}" || char === "]") {
          if (
            !parent ||
            (char === "]") !== Array.isArray(parent.value) ||
            ![
              "separator",
              Array.isArray(parent.value) ? "valueOrEnd" : "keyOrEnd",
            ].includes(parent.state)
          )
            throw new Error("Invalid JSON closing delimiter");
          stack.pop();
          onValue(parent.path, parent.value, true);
          continue;
        }
        if (char === "{" || char === "[") {
          const value = char === "{" ? {} : [];
          const path = attach(value);
          stack.push({
            value,
            path,
            state: char === "{" ? "keyOrEnd" : "valueOrEnd",
          });
          onValue(path, value, false);
          continue;
        }
        if (
          !/[\d\-tfn]/.test(char) ||
          (parent && parent.state !== "value" && parent.state !== "valueOrEnd")
        )
          throw new Error("Invalid JSON value");
        key = false;
        token = char;
      }
    },
    getResult() {
      if (token && !string) finishToken();
      if (!done || string || stack.length)
        throw new Error("Incomplete JSON document");
      return root;
    },
  };
}
