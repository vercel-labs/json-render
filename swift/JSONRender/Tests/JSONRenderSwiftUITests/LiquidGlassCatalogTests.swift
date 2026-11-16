#if canImport(SwiftUI)
import JSONRenderCatalog
import JSONRenderCore
import JSONRenderLiquidGlass
import XCTest

final class LiquidGlassCatalogTests: XCTestCase {
    func testGlassControlsRenderAlongsideNativeComponents() throws {
        let spec = try XCTUnwrap(Spec.decodePartial(
            """
            {
              "root": "stack",
              "elements": {
                "stack": { "type": "Stack", "props": {}, "children": ["heading", "controls"] },
                "heading": { "type": "Heading", "props": { "text": "Settings" } },
                "controls": {
                  "type": "GlassButtonGroup",
                  "props": {},
                  "children": ["cancel", "save"]
                },
                "cancel": { "type": "GlassButton", "props": { "label": "Cancel" } },
                "save": {
                  "type": "GlassButton",
                  "props": { "label": { "$state": "/saveLabel" }, "prominent": true },
                  "on": { "press": { "action": "save" } }
                }
              },
              "state": { "saveLabel": "Save changes" }
            }
            """
        ))
        let registry = NativeCatalog.registry(
            extraComponents: LiquidGlassCatalog.components,
            animatesAppearance: false
        )
        let tree = try XCTUnwrap(
            buildRenderTree(spec: spec, registry: registry, store: StateStore(spec: spec))
        )
        XCTAssertEqual(tree.children.map(\.component), ["Heading", "GlassButtonGroup"])

        let controls = try XCTUnwrap(tree.children.last)
        XCTAssertEqual(controls.children.map(\.key), ["cancel", "save"])
        XCTAssertEqual(controls.children.last?.props["label"], .string("Save changes"))
    }
}
#endif
