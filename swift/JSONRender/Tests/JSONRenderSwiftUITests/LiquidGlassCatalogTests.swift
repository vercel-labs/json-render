#if canImport(SwiftUI)
import JSONRenderCore
import SwiftUI
import XCTest
@testable import JSONRenderCatalog

final class LiquidGlassCatalogTests: XCTestCase {
    func testAppearanceDefaultsToStandardAndChecksPlatformAvailability() {
        XCTAssertEqual(EnvironmentValues().jsonRenderCatalogAppearance, .standard)
        XCTAssertFalse(NativeCatalogAppearance.standard.usesLiquidGlass)

        #if compiler(>=6.2)
        if #available(iOS 26, macOS 26, *) {
            XCTAssertTrue(NativeCatalogAppearance.liquidGlass.usesLiquidGlass)
            return
        }
        #endif
        XCTAssertFalse(NativeCatalogAppearance.liquidGlass.usesLiquidGlass)
    }

    func testFullNativeCatalogRendersWithSharedComponentNamesAndBindings() throws {
        let props: [String: [String: JSONValue]] = [
            "Input": ["value": .object(["$bindState": .string("/query")])],
            "SegmentedPicker": ["value": .object(["$bindState": .string("/period")])],
            "Switch": ["checked": .object(["$bindState": .string("/alerts")])],
            "Toggle": ["checked": .object(["$bindState": .string("/alerts")])],
        ]
        let components = [
            "Alert", "Badge", "BarChart", "Button", "Card", "Column", "Divider", "Grid",
            "Heading", "Image", "Input", "LineChart", "List", "ListItem", "Menu", "Metric",
            "Progress", "Row", "SegmentedPicker", "Separator", "Stack", "Switch", "Text",
            "Toggle", "Toolbar",
        ]
        var elements = Dictionary(uniqueKeysWithValues: components.map {
            ($0, UIElement(type: $0, props: props[$0] ?? [:]))
        })
        elements["root"] = UIElement(type: "Stack", props: [:], children: components)
        let spec = Spec(
            root: "root",
            elements: elements,
            state: ["query": .string("winter"), "period": .string("week"), "alerts": .bool(true)]
        )
        let registry = NativeCatalog.registry(animatesAppearance: false)
        let tree = try XCTUnwrap(
            buildRenderTree(spec: spec, registry: registry, store: StateStore(spec: spec))
        )
        XCTAssertEqual(Set(registry.components.keys), Set(components))
        XCTAssertEqual(tree.children.map(\.component), components)
        for (component, bindings) in [
            "Input": ["value": "/query"],
            "SegmentedPicker": ["value": "/period"],
            "Switch": ["checked": "/alerts"],
            "Toggle": ["checked": "/alerts"],
        ] {
            XCTAssertEqual(tree.children.first { $0.component == component }?.bindings, bindings)
        }
    }

    func testToolbarAndMenuPreserveChildOrder() throws {
        let spec = try XCTUnwrap(Spec.decodePartial(
            """
            {
              "root": "toolbar",
              "elements": {
                "toolbar": {
                  "type": "Toolbar", "props": { "label": "Map actions" }, "children": ["save", "menu"]
                },
                "save": { "type": "Button", "props": { "label": "Save" } },
                "menu": { "type": "Menu", "props": { "label": "More" }, "children": ["share"] },
                "share": {
                  "type": "Button", "props": { "label": "Share" }, "on": { "press": { "action": "share" } }
                }
              }
            }
            """
        ))
        let tree = try XCTUnwrap(buildRenderTree(
            spec: spec,
            registry: NativeCatalog.registry(),
            store: StateStore(spec: spec)
        ))
        XCTAssertEqual(tree.children.map(\.key), ["save", "menu"])
        XCTAssertEqual(tree.children.last?.children.map(\.key), ["share"])
    }

    func testSegmentedPickerUsesOrderedUniqueOptions() {
        let options = JSONValue.decode(
            #"[{"label":"Week","value":"week"},{"label":"Repeated","value":"week"},{"value":"invalid"},{"label":"Month","value":"month"}]"#
        )
        let parsed = CatalogSegmentedPicker.options(from: options)
        XCTAssertEqual(parsed.map(\.value), ["week", "month"])
        XCTAssertEqual(parsed.map(\.label), ["Week", "Month"])
    }
}
#endif
