#!/usr/bin/env node
// Renders each spec fixture with the React renderer and records the component
// tree it produces. The Swift conformance tests build the same tree from the
// same spec and compare it with these recordings.
//
// The React renderer needs real components, so every known catalog name gets a
// stub that renders a `div` carrying its resolved props as JSON. Slots render
// into `data-slot` wrappers. jsdom turns the resulting markup back into a tree.
//
// Usage, from the repo root:
//   node swift/JSONRender/Tools/conformance/render-fixtures.mjs          # write
//   node swift/JSONRender/Tools/conformance/render-fixtures.mjs --check  # fail if stale
//
// Requires the workspace dependencies (react, react-dom, jsdom) and a built
// `@json-render/react` package (`pnpm build --filter @json-render/react`).

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { JSDOM } from "jsdom";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../../../..");

// The workspace does not link @json-render/react at the repo root, so import
// the built package directly. Its own dependencies resolve from its package
// directory.
const reactRendererURL = pathToFileURL(
  path.join(repoRoot, "packages/react/dist/index.mjs"),
);
const { JSONUIProvider, Renderer } = await import(reactRendererURL.href);
const fixturesDir = path.resolve(here, "../../Tests/JSONRenderCoreTests/Fixtures");
const specsDir = path.join(fixturesDir, "specs");
const expectedDir = path.join(fixturesDir, "expected");

// Every component name the fixtures use except "Mystery", which is
// deliberately absent so the unknown-component fixture exercises the fallback.
const KNOWN_COMPONENTS = [
  "Card",
  "Heading",
  "Text",
  "Badge",
  "Stack",
  "Separator",
  "Progress",
  "Button",
  "Input",
  "Select",
  "Switch",
  "Image",
  "List",
  "Row",
  "Column",
];

function stubFor(name) {
  return function Stub({ element, slots, children }) {
    const slotNodes = slots
      ? Object.entries(slots).map(([slotName, content]) =>
          React.createElement(
            "div",
            { key: `slot-${slotName}`, "data-slot": slotName },
            content,
          ),
        )
      : [];
    return React.createElement(
      "div",
      {
        "data-component": name,
        "data-props": JSON.stringify(element.props ?? {}),
      },
      ...slotNodes,
      children,
    );
  };
}

const registry = Object.fromEntries(
  KNOWN_COMPONENTS.map((name) => [name, stubFor(name)]),
);

function isComponent(node) {
  return node.nodeType === 1 && node.hasAttribute("data-component");
}

function record(node) {
  const result = {
    component: node.getAttribute("data-component"),
    props: JSON.parse(node.getAttribute("data-props") || "{}"),
  };

  const children = [];
  const slots = {};

  for (const child of Array.from(node.children)) {
    if (child.hasAttribute("data-slot")) {
      slots[child.getAttribute("data-slot")] = Array.from(child.children)
        .filter(isComponent)
        .map(record);
    } else if (isComponent(child)) {
      children.push(record(child));
    }
  }

  if (children.length > 0) result.children = children;
  if (Object.keys(slots).length > 0) result.slots = slots;
  return result;
}

function renderFixture(spec) {
  const markup = renderToStaticMarkup(
    React.createElement(
      JSONUIProvider,
      { initialState: spec.state ?? {}, handlers: {} },
      React.createElement(Renderer, { spec, registry }),
    ),
  );

  const dom = new JSDOM(`<body>${markup}</body>`);
  const root = Array.from(dom.window.document.body.children).find(isComponent);
  if (!root) return null;
  return record(root);
}

const check = process.argv.includes("--check");
const fixtureFiles = fs
  .readdirSync(specsDir)
  .filter((name) => name.endsWith(".json"))
  .sort();

if (fixtureFiles.length === 0) {
  console.error(`No fixtures found in ${specsDir}`);
  process.exit(1);
}

let stale = 0;

for (const file of fixtureFiles) {
  const spec = JSON.parse(fs.readFileSync(path.join(specsDir, file), "utf8"));
  const tree = renderFixture(spec);
  const outputFile = path.join(expectedDir, file);
  const output = JSON.stringify(tree, null, 2) + "\n";

  if (check) {
    const existing = fs.existsSync(outputFile)
      ? fs.readFileSync(outputFile, "utf8")
      : "";
    if (existing !== output) {
      stale += 1;
      console.error(
        `render-fixtures: ${path.relative(process.cwd(), outputFile)} is out of date. ` +
          "Run `node swift/JSONRender/Tools/conformance/render-fixtures.mjs` to update it.",
      );
    }
    continue;
  }

  fs.mkdirSync(expectedDir, { recursive: true });
  fs.writeFileSync(outputFile, output);
  console.log(`render-fixtures: wrote ${path.relative(process.cwd(), outputFile)}`);
}

if (check) {
  if (stale > 0) process.exit(1);
  console.log("render-fixtures: expected trees are up to date.");
}
