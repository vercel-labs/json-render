#if os(iOS) && canImport(SwiftUI)
import JSONRenderCatalog
import JSONRenderCore
import JSONRenderSwiftUI
import SwiftUI

@main
struct TrailPlannerPhoneApp: App {
    private static let spec = Spec.decodePartial(
        #"""
        {
          "root": "tabs",
          "elements": {
            "tabs": {
              "type": "Tabs",
              "props": {
                "value": { "$bindState": "/tab" },
                "options": [
                  { "label": "Controls", "value": "controls", "icon": "slider.horizontal.3" },
                  { "label": "Overview", "value": "overview", "icon": "map" }
                ]
              },
              "slots": { "controls": ["controls"], "overview": ["overview"] }
            },
            "controls": {
              "type": "Stack",
              "props": { "gap": 20 },
              "children": ["title", "switch", "picker", "slider", "button", "status"]
            },
            "title": { "type": "Heading", "props": { "text": "Trail controls", "level": "h1" } },
            "switch": {
              "type": "Switch",
              "props": { "label": "Trail alerts", "checked": { "$bindState": "/alerts" } }
            },
            "picker": {
              "type": "SegmentedPicker",
              "props": {
                "label": "Map layer",
                "value": { "$bindState": "/layer" },
                "options": [
                  { "label": "Terrain", "value": "terrain" },
                  { "label": "Satellite", "value": "satellite" }
                ]
              }
            },
            "slider": {
              "type": "Slider",
              "props": { "label": "Search radius", "min": 1, "max": 15, "step": 1, "value": { "$bindState": "/radius" } }
            },
            "button": {
              "type": "Button",
              "props": { "label": "Save trail", "icon": "bookmark", "variant": "primary" },
              "on": { "press": { "action": "setState", "params": { "statePath": "/saved", "value": true } } }
            },
            "status": {
              "type": "Text",
              "props": { "text": "Trail saved", "variant": "muted" },
              "visible": { "$state": "/saved" }
            },
            "overview": {
              "type": "Card",
              "props": { "title": "Juniper Ridge", "description": "Barton Creek Preserve" },
              "children": ["distance", "gain"]
            },
            "distance": { "type": "Metric", "props": { "label": "Distance", "value": "6.2 km", "icon": "map" } },
            "gain": { "type": "Metric", "props": { "label": "Elevation gain", "value": "280 m", "icon": "mountain.2" } }
          },
          "state": { "tab": "controls", "alerts": false, "layer": "terrain", "radius": 8, "saved": false }
        }
        """#
    )

    var body: some Scene {
        WindowGroup {
            if let spec = Self.spec {
                JSONRenderView(spec: spec, registry: NativeCatalog.registry(animatesAppearance: false))
                    .jsonRenderCatalogAppearance(.liquidGlass)
                    .padding(.horizontal, 20)
                    .padding(.top, 16)
            }
        }
    }
}
#endif
