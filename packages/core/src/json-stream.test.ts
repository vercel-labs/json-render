import { expect, it } from "vitest";
import { createJSONStream } from "./json-stream";

it("matches JSON.parse across arbitrary boundaries without publishing incomplete values", () => {
  const values = [
    null,
    true,
    false,
    -0.25e20,
    '雪\n"\\😀',
    [],
    {},
    { nested: [{ a: [1, false, null] }], empty: "" },
    JSON.parse('{"__proto__":{"safe":true},"constructor":1}'),
  ];
  for (const value of values)
    for (const size of [1, 2, 7, 1000]) {
      const source = JSON.stringify(value),
        completed: unknown[] = [];
      const parser = createJSONStream((_path, value, complete) => {
        if (complete) completed.push(value);
      });
      for (let i = 0; i < source.length; i += size)
        parser.push(source.slice(i, i + size));
      expect(parser.getResult()).toEqual(JSON.parse(source));
      expect(completed.length).toBeGreaterThan(0);
    }
});

it.each([
  '{"a":1,}',
  "[1,]",
  '{"a":1 "b":2}',
  "[1 2]",
  "{a:1}",
  '{"a":01}',
  '{"a":truee}',
  '{"a":"\\x"}',
  '{"a":1,"a":2}',
  "{}{}",
  "\u00a0{}",
  "[1\u00a0,2]",
  "[]x",
  '{"a":',
  '"unfinished',
])("rejects invalid JSON without recovery: %s", (source) => {
  const parser = createJSONStream(() => {});
  expect(() => {
    for (const char of source) parser.push(char);
    parser.getResult();
  }).toThrow();
});
