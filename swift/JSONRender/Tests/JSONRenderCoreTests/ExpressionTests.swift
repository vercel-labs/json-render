import XCTest
@testable import JSONRenderCore

final class ExpressionTests: XCTestCase {
    private let state = JSONValue.decode(
        #"{"user":{"name":"Ada","tags":["math"]},"count":3,"theme":"dark","items":[{"title":"A"},{"title":"B"}]}"#
    )!

    private func context(
        item: JSONValue? = nil,
        index: Int? = nil,
        basePath: String? = nil,
        functions: [String: ComputedFunction] = [:],
        directives: [String: Directive] = [:]
    ) -> PropResolutionContext {
        PropResolutionContext(
            stateModel: state,
            repeatItem: item,
            repeatIndex: index,
            repeatBasePath: basePath,
            functions: functions,
            directives: directives
        )
    }

    func testStateExpression() {
        let value = resolvePropValue(.object(["$state": "/user/name"]), context())
        XCTAssertEqual(value, .string("Ada"))

        let missing = resolvePropValue(.object(["$state": "/nope"]), context())
        XCTAssertNil(missing)
    }

    func testItemAndIndexExpressions() {
        let item = JSONValue.decode(#"{"title":"Write tests","done":false}"#)!
        let value = resolvePropValue(.object(["$item": "title"]), context(item: item, index: 2))
        XCTAssertEqual(value, .string("Write tests"))

        let whole = resolvePropValue(.object(["$item": ""]), context(item: item, index: 2))
        XCTAssertEqual(whole, item)

        let index = resolvePropValue(.object(["$index": true]), context(item: item, index: 2))
        XCTAssertEqual(index, .number(2))

        XCTAssertNil(resolvePropValue(.object(["$item": "title"]), context()))
        XCTAssertNil(resolvePropValue(.object(["$index": true]), context()))
    }

    func testBindStateAndBindItem() {
        XCTAssertEqual(
            resolvePropValue(.object(["$bindState": "/theme"]), context()),
            .string("dark")
        )

        let itemContext = context(item: .object(["title": "A"]), index: 0, basePath: "/items/0")
        XCTAssertEqual(
            resolvePropValue(.object(["$bindItem": "title"]), itemContext),
            .string("A")
        )
        XCTAssertEqual(
            resolveBindings(["title": .object(["$bindItem": "title"])], itemContext),
            ["title": "/items/0/title"]
        )
        XCTAssertEqual(
            resolveBindings(
                ["theme": .object(["$bindState": "/theme"]), "literal": .string("x")],
                context()
            ),
            ["theme": "/theme"]
        )
        XCTAssertNil(resolveBindings(["literal": .string("x")], context()))
    }

    func testBindItemOutsideRepeatWarnsAndDrops() {
        let recorder = WarningRecorder()
        let resolved = resolvePropValue(.object(["$bindItem": "title"]), context())
        XCTAssertNil(resolved)
        XCTAssertTrue(recorder.messages.contains { $0.contains("$bindItem used outside repeat scope") })
    }

    func testConditionalExpression() {
        let expression = JSONValue.decode(
            #"{"$cond":{"$state":"/count","gt":1},"$then":"many","$else":"one"}"#
        )!
        XCTAssertEqual(resolvePropValue(expression, context()), .string("many"))

        let falseExpression = JSONValue.decode(
            #"{"$cond":{"$state":"/theme","eq":"light"},"$then":{"$state":"/user/name"},"$else":"fallback"}"#
        )!
        XCTAssertEqual(resolvePropValue(falseExpression, context()), .string("fallback"))
    }

    func testTemplateExpression() {
        let absolute = JSONValue.decode(#"{"$template":"Hi ${/user/name} (#${count})"}"#)!
        XCTAssertEqual(resolvePropValue(absolute, context()), .string("Hi Ada (#3)"))

        let item = JSONValue.decode(#"{"title":"A"}"#)!
        let bare = JSONValue.decode(#"{"$template":"${title} by ${/user/name}"}"#)!
        XCTAssertEqual(
            resolvePropValue(bare, context(item: item, index: 0)),
            .string("A by Ada")
        )

        let missing = JSONValue.decode(#"{"$template":"[${/nope}]"}"#)!
        XCTAssertEqual(resolvePropValue(missing, context()), .string("[]"))
    }

    func testTemplateWithAnEmptyReferenceStaysLiteral() {
        // Core's `${...}` pattern needs at least one character, so `${}` is
        // not a reference and must not print the whole state model.
        let empty = JSONValue.decode(#"{"$template":"a ${} b ${/theme}"}"#)!
        XCTAssertEqual(resolvePropValue(empty, context()), .string("a ${} b dark"))

        let onlyEmpty = JSONValue.decode(#"{"$template":"${}"}"#)!
        XCTAssertEqual(resolvePropValue(onlyEmpty, context()), .string("${}"))

        let unterminated = JSONValue.decode(#"{"$template":"x ${/theme"}"#)!
        XCTAssertEqual(resolvePropValue(unterminated, context()), .string("x ${/theme"))
    }

    func testTemplateOutputStopsAtTheLimit() {
        let recorder = WarningRecorder()
        XCTAssertEqual(
            interpolatePaths("ab${/x}cd", limit: 4) { _ in "WV" },
            "abWV",
            "The output fills up and the rest is dropped"
        )
        XCTAssertTrue(recorder.messages.contains { $0.contains("Template output stopped") })

        let limited = PropResolutionContext(stateModel: state, templateOutputLimit: 8)
        XCTAssertEqual(
            resolvePropValue(
                .object(["$template": "${/theme}${/theme}${/theme}"]),
                limited
            ),
            .string("darkdark"),
            "A context limit bounds the resolved template"
        )
    }

    func testComputedExpression() {
        let functions: [String: ComputedFunction] = [
            "concat": { args in
                .string((args["a"]?.stringValue ?? "") + " " + (args["b"]?.stringValue ?? ""))
            },
        ]
        let expression = JSONValue.decode(
            #"{"$computed":"concat","args":{"a":{"$state":"/user/name"},"b":"Lovelace"}}"#
        )!
        XCTAssertEqual(
            resolvePropValue(expression, context(functions: functions)),
            .string("Ada Lovelace")
        )

        let recorder = WarningRecorder()
        XCTAssertNil(resolvePropValue(.object(["$computed": "missing"]), context()))
        XCTAssertTrue(recorder.messages.contains { $0.contains("Unknown $computed function") })
    }

    func testCustomDirective() {
        let upper = Directive(name: "$upper") { value, _ in
            guard let text = value["text"]?.stringValue else { return .string("") }
            return .string(text.uppercased())
        }
        let expression = JSONValue.decode(#"{"$upper":true,"text":"hello"}"#)!
        XCTAssertEqual(
            resolvePropValue(expression, context(directives: ["$upper": upper])),
            .string("HELLO")
        )
    }

    func testNestedObjectsAndArraysResolve() {
        let value = JSONValue.decode(
            #"{"meta":{"name":{"$state":"/user/name"},"index":{"$index":true}},"list":[{"$state":"/count"},"x"]}"#
        )!
        let resolved = resolvePropValue(value, context(item: .object([:]), index: 4))
        XCTAssertEqual(
            resolved,
            .object([
                "meta": .object(["name": .string("Ada"), "index": .number(4)]),
                "list": .array([.number(3), .string("x")]),
            ])
        )
    }

    func testResolveElementPropsKeepsNullAndDropsUndefined() {
        let props: [String: JSONValue] = [
            "text": .object(["$state": "/user/name"]),
            "missing": .object(["$state": "/nope"]),
            "explicit": .null,
        ]
        let resolved = resolveElementProps(props, context())
        XCTAssertEqual(resolved, ["text": .string("Ada"), "explicit": .null])
    }

    func testActionParamsUseAbsolutePaths() {
        let itemContext = context(item: .object(["title": "A"]), index: 1, basePath: "/items/1")
        XCTAssertEqual(
            resolveActionParam(.object(["$item": "title"]), itemContext),
            .string("/items/1/title")
        )
        XCTAssertEqual(resolveActionParam(.object(["$index": true]), itemContext), .number(1))
        XCTAssertEqual(resolveActionParam(.object(["$state": "/theme"]), itemContext), .string("dark"))
    }
}
