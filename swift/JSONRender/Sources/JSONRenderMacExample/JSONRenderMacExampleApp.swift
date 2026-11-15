#if canImport(SwiftUI)
import SwiftUI
import JSONRenderCore
import JSONRenderSwiftUI

@main
struct JSONRenderMacExampleApp: App {
    var body: some Scene {
        WindowGroup {
            ContentView()
        }
        .defaultSize(width: 720, height: 760)
    }
}

/// Renders two specs from `examples/no-ai`: the settings form, which exercises
/// state bindings, and the confetti button, which exercises action dispatch.
struct ContentView: View {
    enum Example: String, CaseIterable, Identifiable {
        case settingsForm = "Settings Form"
        case confetti = "Confetti"

        var id: String { rawValue }

        var spec: Spec {
            switch self {
            case .settingsForm: return ExampleSpecs.settingsForm
            case .confetti: return ExampleSpecs.confetti
            }
        }
    }

    // An observable object instead of `@State`: on newer SDKs `@State` is a
    // macro whose plugin ships with Xcode but not the Command Line Tools.
    @StateObject private var selection = ExampleSelection()
    @StateObject private var celebration = Celebration()

    private var example: Example { selection.example }

    private var registry: RendererRegistry<AnyView> {
        BuiltInComponents.registry(
            extraComponents: ExampleComponents.all,
            actions: [
                "confetti": { _ in
                    await MainActor.run { celebration.fire() }
                },
            ]
        )
    }

    var body: some View {
        VStack(spacing: 0) {
            Picker("Example", selection: $selection.example) {
                ForEach(Example.allCases) { example in
                    Text(example.rawValue).tag(example)
                }
            }
            .pickerStyle(.segmented)
            .labelsHidden()
            .padding()

            Divider()

            ScrollView {
                // JSONRenderView applies a changed spec to its existing model,
                // so switching examples does not need a new view identity.
                JSONRenderView(spec: example.spec, registry: registry)
                    .padding(24)
                    .frame(maxWidth: 560)
                    .frame(maxWidth: .infinity)
            }
        }
        .overlay(alignment: .bottom) {
            if celebration.count > 0 && example == .confetti {
                Text("Confetti fired \(celebration.count) time\(celebration.count == 1 ? "" : "s")")
                    .padding(.horizontal, 16)
                    .padding(.vertical, 10)
                    .background(.thinMaterial, in: Capsule())
                    .padding(.bottom, 24)
                    .transition(.move(edge: .bottom).combined(with: .opacity))
            }
        }
        .animation(.easeInOut(duration: 0.3), value: celebration.count)
    }
}

@MainActor
final class ExampleSelection: ObservableObject {
    @Published var example: ContentView.Example = .settingsForm
}

final class Celebration: ObservableObject {
    @Published private(set) var count = 0

    func fire() {
        count += 1
    }
}

/// Views for the component names used by the bundled specs that are not part
/// of the built-in catalog.
enum ExampleComponents {
    static var all: [String: ComponentDefinition<AnyView>] {
        [
            "Card": ComponentDefinition { context in
                AnyView(
                    GroupBox {
                        VStack(alignment: .leading, spacing: 12) {
                            if let description = context.props.string("description"), !description.isEmpty {
                                Text(description)
                                    .font(.callout)
                                    .foregroundStyle(.secondary)
                            }
                            ForEach(context.identifiedChildren) { child in
                                child.content
                            }
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(8)
                    } label: {
                        Text(context.props.string("title") ?? "").font(.headline)
                    }
                )
            },

            "Heading": ComponentDefinition { context in
                AnyView(
                    Text(context.props.string("text") ?? "")
                        .font(font(for: context.props.string("level")))
                        .bold()
                        .frame(maxWidth: .infinity, alignment: .leading)
                )
            },

            "Badge": ComponentDefinition { context in
                let variant = context.props.string("variant") ?? "default"
                return AnyView(
                    Text(context.props.string("text") ?? "")
                        .font(.caption)
                        .padding(.horizontal, 10)
                        .padding(.vertical, 4)
                        .background(badgeBackground(variant), in: Capsule())
                        .overlay(Capsule().strokeBorder(badgeBorder(variant)))
                )
            },

            "Separator": ComponentDefinition { _ in
                AnyView(Divider())
            },

            "Progress": ComponentDefinition { context in
                let value = context.props.number("value") ?? 0
                let total = context.props.number("max") ?? 100
                return AnyView(
                    VStack(alignment: .leading, spacing: 6) {
                        if let label = context.props.string("label") {
                            Text(label).font(.caption).foregroundStyle(.secondary)
                        }
                        ProgressView(value: value, total: total)
                    }
                )
            },

            "Select": ComponentDefinition { context in
                let options = context.props.strings("options")
                let label = context.props.string("label") ?? ""
                if let path = context.binding("value") {
                    return AnyView(
                        VStack(alignment: .leading, spacing: 4) {
                            Text(label).font(.caption).foregroundStyle(.secondary)
                            Picker(label, selection: Binding(
                                get: { context.stateValue(at: path)?.stringValue ?? "" },
                                set: { context.setState(at: path, to: .string($0)) }
                            )) {
                                ForEach(options, id: \.self) { option in
                                    Text(option).tag(option)
                                }
                            }
                            .labelsHidden()
                            .pickerStyle(.menu)
                        }
                    )
                }
                return AnyView(EmptyView())
            },

            "Switch": ComponentDefinition { context in
                let label = context.props.string("label") ?? ""
                if let path = context.binding("checked") {
                    return AnyView(
                        Toggle(label, isOn: Binding(
                            get: { context.stateValue(at: path)?.boolValue ?? false },
                            set: { context.setState(at: path, to: .bool($0)) }
                        ))
                        .toggleStyle(.switch)
                    )
                }
                return AnyView(EmptyView())
            },
        ]
    }

    private static func font(for level: String?) -> Font {
        switch level {
        case "h1": return .largeTitle
        case "h2": return .title
        case "h3": return .title2
        default: return .title3
        }
    }

    private static func badgeBackground(_ variant: String) -> Color {
        switch variant {
        case "secondary": return Color.secondary.opacity(0.15)
        case "outline": return .clear
        default: return Color.accentColor.opacity(0.15)
        }
    }

    private static func badgeBorder(_ variant: String) -> Color {
        variant == "outline" ? Color.secondary.opacity(0.4) : .clear
    }
}

/// Specs copied from `examples/no-ai/lib/examples.ts`.
enum ExampleSpecs {
    static let confetti: Spec = spec(from: confettiJSON)

    static let settingsForm: Spec = spec(from: settingsFormJSON)

    private static func spec(from json: String) -> Spec {
        guard let spec = Spec.decodePartial(json) else {
            fatalError("Bundled example spec is not valid JSON")
        }
        return spec
    }

    private static let confettiJSON = """
    {
      "root": "btn",
      "elements": {
        "btn": {
          "type": "Button",
          "props": { "label": "Click me", "variant": "primary" },
          "on": { "press": { "action": "confetti" } }
        }
      }
    }
    """

    private static let settingsFormJSON = """
    {
      "root": "card",
      "state": {
        "name": "Ada Lovelace",
        "email": "ada@example.com",
        "role": "Engineer",
        "notifications": true,
        "darkMode": false
      },
      "elements": {
        "card": {
          "type": "Card",
          "props": {
            "title": "Account Settings",
            "description": "Manage your preferences",
            "maxWidth": "md",
            "centered": null
          },
          "children": ["form"]
        },
        "form": {
          "type": "Stack",
          "props": { "direction": "vertical", "gap": "md", "align": null, "justify": null },
          "children": ["nameInput", "emailInput", "roleSelect", "sep", "notifSwitch", "darkSwitch", "sep2", "actions"]
        },
        "nameInput": {
          "type": "Input",
          "props": {
            "label": "Full Name",
            "name": "name",
            "type": "text",
            "placeholder": "Your name",
            "value": { "$bindState": "/name" },
            "checks": null
          }
        },
        "emailInput": {
          "type": "Input",
          "props": {
            "label": "Email",
            "name": "email",
            "type": "email",
            "placeholder": "you@example.com",
            "value": { "$bindState": "/email" },
            "checks": null
          }
        },
        "roleSelect": {
          "type": "Select",
          "props": {
            "label": "Role",
            "name": "role",
            "options": ["Engineer", "Designer", "Product Manager", "Data Scientist"],
            "placeholder": "Choose a role",
            "value": { "$bindState": "/role" },
            "checks": null
          }
        },
        "sep": { "type": "Separator", "props": { "orientation": null } },
        "notifSwitch": {
          "type": "Switch",
          "props": { "label": "Email notifications", "name": "notifications", "checked": { "$bindState": "/notifications" } }
        },
        "darkSwitch": {
          "type": "Switch",
          "props": { "label": "Dark mode", "name": "darkMode", "checked": { "$bindState": "/darkMode" } }
        },
        "sep2": { "type": "Separator", "props": { "orientation": null } },
        "actions": {
          "type": "Stack",
          "props": { "direction": "horizontal", "gap": "sm", "align": null, "justify": "end" },
          "children": ["cancelBtn", "saveBtn"]
        },
        "cancelBtn": {
          "type": "Button",
          "props": { "label": "Cancel", "variant": "secondary", "disabled": null }
        },
        "saveBtn": {
          "type": "Button",
          "props": { "label": "Save Changes", "variant": "primary", "disabled": null }
        }
      }
    }
    """
}
#else
@main
struct JSONRenderMacExampleApp {
    static func main() {
        print("The example app requires SwiftUI. Build and run it on macOS.")
    }
}
#endif
