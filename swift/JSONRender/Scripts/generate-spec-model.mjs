#!/usr/bin/env node
// Generates Sources/JSONRenderCore/SpecModel.swift from the spec types that
// @json-render/core declares in TypeScript.
//
// The renderer contract lives in packages/core/src/types.ts and
// packages/core/src/actions.ts: the spec envelope, visibility conditions,
// dynamic values, action bindings, and JSON patch operations. This script
// parses those declarations with the TypeScript compiler and emits Swift
// value types, so the Swift model follows core instead of a copy of it.
//
// Usage:
//   node Scripts/generate-spec-model.mjs          # write SpecModel.swift
//   node Scripts/generate-spec-model.mjs --check  # fail if the file is stale

import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const ts = require("typescript");

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../../..");
const coreSrc = path.join(repoRoot, "packages/core/src");
const outputFile = path.join(here, "../Sources/JSONRenderCore/SpecModel.swift");

// Declarations to translate. Dependencies are emitted before dependents.
const ROOTS = [
  "DynamicValue",
  "RepeatStatePath",
  "UIElement",
  "Spec",
  "StateCondition",
  "ItemCondition",
  "IndexCondition",
  "SingleCondition",
  "AndCondition",
  "OrCondition",
  "VisibilityCondition",
  "PatchOp",
  "JsonPatch",
  "ActionBinding",
  "ActionConfirm",
  "ActionOnSuccess",
  "ActionOnError",
];

// Inline types become standalone Swift types. These names keep the generated
// API readable where the TypeScript source inlines an object or union.
const INLINE_NAMES = new Map([
  ["UIElement.repeat", "Repeat"],
  ["UIElement.on", "ActionBindingList"],
  ["UIElement.watch", "ActionBindingList"],
  ["StateCondition.gt", "ComparisonValue"],
  ["StateCondition.gte", "ComparisonValue"],
  ["StateCondition.lt", "ComparisonValue"],
  ["StateCondition.lte", "ComparisonValue"],
  ["ItemCondition.gt", "ComparisonValue"],
  ["ItemCondition.gte", "ComparisonValue"],
  ["ItemCondition.lt", "ComparisonValue"],
  ["ItemCondition.lte", "ComparisonValue"],
  ["IndexCondition.gt", "ComparisonValue"],
  ["IndexCondition.gte", "ComparisonValue"],
  ["IndexCondition.lt", "ComparisonValue"],
  ["IndexCondition.lte", "ComparisonValue"],
]);

// Properties that decode to an empty value when the key is absent. Core's
// renderers treat a missing `props` object as `{}`.
const DECODE_DEFAULTS = new Map([["UIElement.props", "[:]"]]);

const SWIFT_KEYWORDS = new Set([
  "associatedtype",
  "class",
  "deinit",
  "enum",
  "extension",
  "fileprivate",
  "func",
  "import",
  "init",
  "inout",
  "internal",
  "let",
  "open",
  "operator",
  "protocol",
  "public",
  "repeat",
  "rethrows",
  "static",
  "struct",
  "subscript",
  "typealias",
  "var",
  "break",
  "case",
  "continue",
  "default",
  "defer",
  "do",
  "else",
  "fallthrough",
  "for",
  "guard",
  "if",
  "in",
  "return",
  "switch",
  "where",
  "while",
  "as",
  "catch",
  "false",
  "is",
  "nil",
  "super",
  "self",
  "throw",
  "throws",
  "true",
  "try",
]);

const SOURCE_FILES = ["types.ts", "actions.ts"];

/** @type {Map<string, {decl: import("typescript").Declaration, file: string}>} */
const declarations = new Map();

for (const file of SOURCE_FILES) {
  const fullPath = path.join(coreSrc, file);
  const source = fs.readFileSync(fullPath, "utf8");
  const sourceFile = ts.createSourceFile(fullPath, source, ts.ScriptTarget.Latest, true);
  for (const statement of sourceFile.statements) {
    if (
      (ts.isInterfaceDeclaration(statement) || ts.isTypeAliasDeclaration(statement)) &&
      statement.name &&
      !declarations.has(statement.name.text)
    ) {
      declarations.set(statement.name.text, { decl: statement, file });
    }
  }
}

const missing = ROOTS.filter((name) => !declarations.has(name));
if (missing.length > 0) {
  console.error(
    `generate-spec-model: core no longer declares ${missing.join(", ")}. ` +
      `Update the ROOTS list in Scripts/generate-spec-model.mjs.`,
  );
  process.exit(1);
}

class Emitter {
  constructor() {
    this.declarations = [];
    this.emitted = new Set();
    this.active = new Set();
  }

  emitRoots() {
    for (const name of ROOTS) this.emitNamed(name);
  }

  emitNamed(name) {
    const entry = declarations.get(name);
    if (!entry) {
      throw new Error(`Unknown core type referenced from the spec model: ${name}`);
    }
    if (this.emitted.has(name) || this.active.has(name)) return name;
    this.active.add(name);
    try {
      if (ts.isInterfaceDeclaration(entry.decl)) {
        const typeParams = genericDefaults(entry.decl);
        this.emitStruct(name, entry.decl.members, typeParams, `packages/core/src/${entry.file}`);
      } else {
        this.emitAlias(name, entry.decl.type, entry.decl, `packages/core/src/${entry.file}`);
      }
    } finally {
      this.active.delete(name);
    }
    this.emitted.add(name);
    return name;
  }

  emitAlias(swiftName, node, decl, origin) {
    const typeParams = genericDefaults(decl);
    const resolved = this.resolve(node, typeParams, swiftName);
    if (resolved.kind === "inline") return;
    this.declarations.push(
      `/// Generated from ${origin}.\npublic typealias ${swiftName} = ${resolved.text}`,
    );
  }

  emitStruct(swiftName, members, typeParams, origin) {
    const properties = this.collectProperties(members, typeParams, swiftName);
    if (this.emitted.has(swiftName)) return;
    const lines = [];
    lines.push(`/// Generated from ${origin}.`);
    lines.push(`public struct ${swiftName}: Codable, Equatable, Sendable {`);
    for (const property of properties) {
      const type = property.optional ? `${property.type}?` : property.type;
      lines.push(`    public var ${property.name}: ${type}`);
    }
    const parameters = properties.map((property) =>
      property.optional
        ? `${property.name}: ${property.type}? = nil`
        : `${property.name}: ${property.type}`,
    );
    lines.push("");
    lines.push(`    public init(${parameters.join(", ")}) {`);
    for (const property of properties) {
      lines.push(`        self.${property.name} = ${property.name}`);
    }
    lines.push("    }");
    lines.push("");
    lines.push("    private enum CodingKeys: String, CodingKey {");
    for (const property of properties) {
      if (property.jsonKey === property.name) {
        lines.push(`        case ${property.name}`);
      } else {
        lines.push(`        case ${property.name} = "${property.jsonKey}"`);
      }
    }
    lines.push("    }");
    lines.push("");
    lines.push("    public init(from decoder: Decoder) throws {");
    lines.push("        let container = try decoder.container(keyedBy: CodingKeys.self)");
    for (const property of properties) {
      const fallback = DECODE_DEFAULTS.get(`${swiftName}.${property.name}`);
      if (fallback) {
        lines.push(
          `        self.${property.name} = try container.decodeIfPresent(${property.type}.self, forKey: .${property.name}) ?? ${fallback}`,
        );
      } else if (property.optional && property.type === "JSONValue") {
        // Preserve an explicit JSON null (for example `{ "eq": null }`).
        // decodeIfPresent would fold it into nil, which core distinguishes
        // from an absent key.
        lines.push(`        if container.contains(.${property.name}) {`);
        lines.push(
          `            self.${property.name} = try container.decode(JSONValue.self, forKey: .${property.name})`,
        );
        lines.push("        } else {");
        lines.push(`            self.${property.name} = nil`);
        lines.push("        }");
      } else if (property.optional) {
        lines.push(
          `        self.${property.name} = try container.decodeIfPresent(${property.type}.self, forKey: .${property.name})`,
        );
      } else {
        lines.push(
          `        self.${property.name} = try container.decode(${property.type}.self, forKey: .${property.name})`,
        );
      }
    }
    lines.push("    }");
    lines.push("");
    lines.push("    public func encode(to encoder: Encoder) throws {");
    lines.push("        var container = encoder.container(keyedBy: CodingKeys.self)");
    for (const property of properties) {
      if (property.optional) {
        lines.push(`        try container.encodeIfPresent(${property.name}, forKey: .${property.name})`);
      } else {
        lines.push(`        try container.encode(${property.name}, forKey: .${property.name})`);
      }
    }
    lines.push("    }");
    lines.push("}");
    this.declarations.push(lines.join("\n"));
  }

  collectProperties(members, typeParams, ownerName) {
    const properties = [];
    for (const member of members) {
      if (!ts.isPropertySignature(member) || !member.name) continue;
      const jsonKey = nameOf(member.name);
      const swiftName = swiftPropertyName(jsonKey);
      if (properties.some((property) => property.name === swiftName)) continue;
      const optional = Boolean(member.questionToken);
      const type = this.typeText(
        member.type ?? { kind: ts.SyntaxKind.UnknownKeyword },
        typeParams,
        `${ownerName}.${jsonKey}`,
      );
      properties.push({ name: swiftName, jsonKey, type, optional });
    }
    return properties;
  }

  typeText(node, typeParams, contextName) {
    return this.resolve(node, typeParams, contextName).text;
  }

  resolve(node, typeParams, contextName) {
    switch (node.kind) {
      case ts.SyntaxKind.StringKeyword:
        return { text: "String" };
      case ts.SyntaxKind.NumberKeyword:
        return { text: "Double" };
      case ts.SyntaxKind.BooleanKeyword:
        return { text: "Bool" };
      case ts.SyntaxKind.UnknownKeyword:
      case ts.SyntaxKind.AnyKeyword:
      case ts.SyntaxKind.NullKeyword:
        return { text: "JSONValue" };
      case ts.SyntaxKind.TrueKeyword:
      case ts.SyntaxKind.FalseKeyword:
        return { text: "Bool" };
      case ts.SyntaxKind.ParenthesizedType:
        return this.resolve(node.type, typeParams, contextName);
      case ts.SyntaxKind.LiteralType:
        def: break;
      default:
        break;
    }
    if (node.kind === ts.SyntaxKind.LiteralType) {
      if (node.literal.kind === ts.SyntaxKind.StringLiteral) return { text: "String" };
      if (node.literal.kind === ts.SyntaxKind.NumericLiteral) return { text: "Double" };
      return { text: "Bool" };
    }
    if (ts.isArrayTypeNode(node)) {
      return { text: `[${this.typeText(node.elementType, typeParams, `${contextName}Element`)}]` };
    }
    if (ts.isTypeOperatorNode(node)) return this.resolve(node.type, typeParams, contextName);
    if (ts.isUnionTypeNode(node)) return this.emitUnion(contextName, node.types, typeParams);
    if (ts.isIntersectionTypeNode(node)) {
      return this.emitStructFromMembers(contextName, intersectionMembers(node), typeParams);
    }
    if (ts.isTypeLiteralNode(node)) {
      return this.emitStructFromMembers(contextName, node.members, typeParams);
    }
    if (ts.isTypeReferenceNode(node)) return this.resolveReference(node, typeParams, contextName);
    throw new Error(`Unsupported TypeScript node in the spec model: ${node.getText()}`);
  }

  resolveReference(node, typeParams, contextName) {
    const name = node.typeName.getText();
    if (typeParams.has(name)) {
      return this.resolve(typeParams.get(name), typeParams, contextName);
    }
    if (name === "Array" && node.typeArguments?.length === 1) {
      return {
        text: `[${this.typeText(node.typeArguments[0], typeParams, `${contextName}Element`)}]`,
      };
    }
    if (name === "Record" && node.typeArguments?.length === 2) {
      // The map value keeps the property's context name so inline types such
      // as `Record<string, ActionBinding | ActionBinding[]>` resolve through
      // INLINE_NAMES.
      const value = this.typeText(node.typeArguments[1], typeParams, contextName);
      return { text: `[String: ${value}]` };
    }
    return { text: this.emitNamed(name) };
  }

  emitStructFromMembers(contextName, members, typeParams) {
    const swiftName = inlineName(contextName);
    if (this.emitted.has(swiftName)) return { text: swiftName };
    this.active.add(swiftName);
    this.emitStruct(swiftName, members, typeParams, "packages/core (inline object type)");
    this.active.delete(swiftName);
    this.emitted.add(swiftName);
    return { text: swiftName, kind: "inline" };
  }

  emitStringEnum(contextName, branches) {
    const swiftName = inlineName(contextName);
    if (this.emitted.has(swiftName)) return { text: swiftName };
    const lines = [];
    lines.push("/// Generated from packages/core (string literal union).");
    lines.push(`public enum ${swiftName}: String, Codable, CaseIterable, Sendable {`);
    for (const branch of branches) {
      const value = branch.literal.text;
      lines.push(`    case ${enumCaseFor(value)} = "${value}"`);
    }
    lines.push("}");
    this.declarations.push(lines.join("\n"));
    this.emitted.add(swiftName);
    return { text: swiftName, kind: "inline" };
  }

  emitUnion(contextName, branches, typeParams) {
    if (branches.every((branch) => ts.isLiteralTypeNode(branch))) {
      return this.emitStringEnum(contextName, branches);
    }
    const swiftName = inlineName(contextName);
    if (this.emitted.has(swiftName)) return { text: swiftName };
    this.active.add(swiftName);

    const cases = branches.map((branch, index) =>
      this.describeUnionBranch(branch, typeParams, swiftName, index),
    );
    // Object-shaped cases are tested first so a catch-all JSON value case
    // cannot swallow `{"$state": "/path"}` style expressions.
    const ordered = [
      ...cases.filter((item) => item.key !== null),
      ...cases.filter((item) => item.key === null && item.associated !== "JSONValue"),
      ...cases.filter((item) => item.key === null && item.associated === "JSONValue"),
    ];

    const lines = [];
    lines.push("/// Generated from packages/core (union type).");
    lines.push(`public indirect enum ${swiftName}: Codable, Equatable, Sendable {`);
    for (const item of cases) {
      lines.push(`    case ${item.caseName}${item.associated ? `(${item.associated})` : ""}`);
    }
    lines.push("");
    lines.push("    public init(from decoder: Decoder) throws {");
    const objectCases = ordered.filter((item) => item.key !== null);
    if (objectCases.length > 0) {
      lines.push("        if let container = try? decoder.container(keyedBy: DynamicCodingKey.self) {");
      for (const item of objectCases) {
        const key = new DynamicCodingKeyExpression(item.key);
        lines.push(`            if container.contains(${key.expression}) {`);
        if (item.whole) {
          // A multi-property object branch is keyed by its first property,
          // but the payload is the object itself, not the value under that key.
          lines.push(`                self = .${item.caseName}(try ${item.associated}(from: decoder))`);
        } else {
          lines.push(
            `                self = .${item.caseName}(try container.decode(${item.associated}.self, forKey: ${key.expression}))`,
          );
        }
        lines.push("                return");
        lines.push("            }");
      }
      lines.push("        }");
    }
    lines.push("        let single = try decoder.singleValueContainer()");
    for (const item of ordered.filter((item) => item.key === null)) {
      lines.push(`        if let value = try? single.decode(${item.associated}.self) {`);
      lines.push(`            self = .${item.caseName}(value)`);
      lines.push("            return");
      lines.push("        }");
    }
    lines.push("        throw DecodingError.dataCorruptedError(");
    lines.push("            in: single,");
    lines.push(`            debugDescription: "${swiftName} does not match any known shape"`);
    lines.push("        )");
    lines.push("    }");
    lines.push("");
    lines.push("    public func encode(to encoder: Encoder) throws {");
    lines.push("        switch self {");
    for (const item of cases) {
      if (item.key !== null) {
        const key = new DynamicCodingKeyExpression(item.key);
        lines.push(`        case .${item.caseName}(let value):`);
        if (item.whole) {
          lines.push("            try value.encode(to: encoder)");
        } else if (item.associated) {
          lines.push("            var container = encoder.container(keyedBy: DynamicCodingKey.self)");
          lines.push(`            try container.encode(value, forKey: ${key.expression})`);
        } else {
          lines.push("            var container = encoder.singleValueContainer()");
          lines.push("            try container.encode(true)");
        }
      } else {
        lines.push(`        case .${item.caseName}(let value):`);
        lines.push("            var container = encoder.singleValueContainer()");
        lines.push("            try container.encode(value)");
      }
    }
    lines.push("        }");
    lines.push("    }");
    lines.push("}");
    this.declarations.push(lines.join("\n"));
    this.active.delete(swiftName);
    this.emitted.add(swiftName);
    return { text: swiftName, kind: "inline" };
  }

  describeUnionBranch(branch, typeParams, owner, index) {
    const node = branch.kind === ts.SyntaxKind.ParenthesizedType ? branch.type : branch;
    if (node.kind === ts.SyntaxKind.StringKeyword) {
      return { caseName: "string", associated: "String", key: null };
    }
    if (node.kind === ts.SyntaxKind.NumberKeyword) {
      return { caseName: "number", associated: "Double", key: null };
    }
    if (node.kind === ts.SyntaxKind.BooleanKeyword) {
      return { caseName: "bool", associated: "Bool", key: null };
    }
    if (node.kind === ts.SyntaxKind.NullKeyword) {
      return { caseName: "null", associated: null, key: null };
    }
    if (ts.isLiteralTypeNode(node)) {
      return { caseName: `literal${index}`, associated: "String", key: null };
    }
    if (ts.isArrayTypeNode(node)) {
      return {
        caseName: "array",
        associated: `[${this.typeText(node.elementType, typeParams, `${owner}Element`)}]`,
        key: null,
      };
    }
    if (ts.isTypeReferenceNode(node)) {
      const raw = node.typeName.getText();
      if (typeParams.has(raw)) {
        return {
          caseName: "value",
          associated: this.typeText(typeParams.get(raw), typeParams, `${owner}Value`),
          key: null,
        };
      }
      return {
        caseName: lowerFirst(raw),
        associated: this.resolveReference(node, typeParams, `${owner}${capitalize(raw)}`).text,
        key: null,
      };
    }
    if (ts.isTypeLiteralNode(node)) {
      return this.describeObjectBranch(node.members, typeParams, owner);
    }
    if (ts.isIntersectionTypeNode(node)) {
      return this.describeObjectBranch(intersectionMembers(node), typeParams, owner);
    }
    throw new Error(`${owner}: unsupported union branch ${node.getText()}`);
  }

  describeObjectBranch(members, typeParams, owner) {
    const properties = members.filter(ts.isPropertySignature);
    if (properties.length === 0) {
      throw new Error(`${owner}: object union branch without properties`);
    }
    const first = properties[0];
    const jsonKey = nameOf(first.name);
    const caseName = caseNameFor(jsonKey);
    if (properties.length === 1) {
      const typeNode = first.type ?? { kind: ts.SyntaxKind.UnknownKeyword };
      const associated = ts.isLiteralTypeNode(typeNode)
        ? "Bool"
        : this.typeText(typeNode, typeParams, `${owner}${capitalize(caseName)}`);
      return { caseName, associated, key: jsonKey };
    }
    const structName = `${owner}${capitalize(caseName)}`;
    if (!this.emitted.has(structName)) {
      this.emitStruct(structName, members, typeParams, "packages/core (inline object type)");
      this.emitted.add(structName);
    }
    return { caseName, associated: structName, key: jsonKey, whole: true };
  }

  text() {
    return [
      "// Generated by swift/JSONRender/Scripts/generate-spec-model.mjs.",
      "// Do not edit by hand. Change the source declarations in packages/core",
      "// (types.ts and actions.ts) and run the script to regenerate this file.",
      "",
      "import Foundation",
      "",
      this.declarations.join("\n\n"),
      "",
    ].join("\n");
  }
}

class DynamicCodingKeyExpression {
  constructor(key) {
    this.expression = `DynamicCodingKey("${key.replace(/"/g, '\\"')}")`;
  }
}

function genericDefaults(decl) {
  const params = new Map();
  if (decl.typeParameters) {
    for (const param of decl.typeParameters) {
      params.set(param.name.text, param.default ?? { kind: ts.SyntaxKind.UnknownKeyword });
    }
  }
  return params;
}

function intersectionMembers(node) {
  const members = [];
  for (const part of node.types) {
    const inner = part.kind === ts.SyntaxKind.ParenthesizedType ? part.type : part;
    if (ts.isTypeLiteralNode(inner)) {
      members.push(...inner.members);
      continue;
    }
    if (ts.isTypeReferenceNode(inner)) {
      const entry = declarations.get(inner.typeName.getText());
      if (entry && ts.isTypeAliasDeclaration(entry.decl)) {
        const aliasType = entry.decl.type;
        if (ts.isTypeLiteralNode(aliasType)) {
          members.push(...aliasType.members);
          continue;
        }
        if (ts.isIntersectionTypeNode(aliasType)) {
          members.push(...intersectionMembers(aliasType));
          continue;
        }
      }
    }
    throw new Error(`Cannot intersect ${part.getText()} in the spec model`);
  }
  return members;
}

function nameOf(nameNode) {
  if (ts.isStringLiteral(nameNode) || ts.isIdentifier(nameNode)) return nameNode.text;
  return nameNode.getText();
}

function swiftPropertyName(jsonKey) {
  const cleaned = jsonKey.replace(/^\$/, "");
  return SWIFT_KEYWORDS.has(cleaned) ? `\`${cleaned}\`` : cleaned;
}

function caseNameFor(jsonKey) {
  const cleaned = jsonKey.replace(/^\$/, "");
  return lowerFirst(cleaned);
}

function enumCaseFor(value) {
  return SWIFT_KEYWORDS.has(value) ? `\`${value}\`` : value;
}

function inlineName(contextName) {
  const override = INLINE_NAMES.get(contextName);
  if (override) return override;
  return contextName
    .split(".")
    .map((part) => capitalize(part.replace(/^\$/, "")))
    .join("");
}

function capitalize(value) {
  return value.length === 0 ? value : value[0].toUpperCase() + value.slice(1);
}

function lowerFirst(value) {
  return value.length === 0 ? value : value[0].toLowerCase() + value.slice(1);
}

const emitter = new Emitter();
emitter.emitRoots();
const output = emitter.text();

if (process.argv.includes("--check")) {
  const existing = fs.existsSync(outputFile) ? fs.readFileSync(outputFile, "utf8") : "";
  if (existing !== output) {
    console.error(
      "generate-spec-model: SpecModel.swift is out of date. " +
        "Run `node swift/JSONRender/Scripts/generate-spec-model.mjs`.",
    );
    process.exit(1);
  }
  console.log("generate-spec-model: SpecModel.swift is up to date.");
} else {
  fs.mkdirSync(path.dirname(outputFile), { recursive: true });
  fs.writeFileSync(outputFile, output);
  console.log(`generate-spec-model: wrote ${path.relative(repoRoot, outputFile)}`);
}
