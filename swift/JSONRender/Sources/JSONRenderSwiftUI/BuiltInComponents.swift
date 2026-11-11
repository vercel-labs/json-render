#if canImport(SwiftUI)
import SwiftUI
import JSONRenderCore

/// The SwiftUI views for the built-in catalog: Text, Stack, Row, Column,
/// Button, Image, List, and Input.
///
/// Register them alongside app components with
/// `BuiltInComponents.registry(extraComponents:actions:)`.
public enum BuiltInComponents {
    /// A string or numeric spacing token from a prop.
    public static func spacing(_ value: JSONValue?, fallback: CGFloat = 0) -> CGFloat {
        if let number = value?.doubleValue {
            return CGFloat(number)
        }
        switch value?.stringValue {
        case "none": return 0
        case "xs": return 4
        case "sm": return 8
        case "md": return 16
        case "lg": return 24
        case "xl": return 32
        case "2xl": return 40
        default: return fallback
        }
    }

    /// The built-in component renderers keyed by catalog name.
    public static var components: [String: ComponentDefinition<AnyView>] {
        [
            "Text": ComponentDefinition { context in
                let text = context.props.string("text") ?? ""
                let muted = context.props.string("variant") == "muted"
                return AnyView(
                    Text(text)
                        .foregroundStyle(muted ? .secondary : .primary)
                        .fixedSize(horizontal: false, vertical: true)
                )
            },

            "Stack": ComponentDefinition { context in
                let isHorizontal = context.props.string("direction") == "horizontal"
                return AnyView(
                    StackLayout(
                        horizontal: isHorizontal,
                        spacing: spacing(context.props["gap"] ?? context.props["spacing"], fallback: 8),
                        children: context.children
                    )
                )
            },

            "Row": ComponentDefinition { context in
                AnyView(
                    HStack(alignment: .center, spacing: spacing(context.props["gap"] ?? context.props["spacing"], fallback: 8)) {
                        ForEach(context.children.indices, id: \.self) { index in
                            context.children[index]
                        }
                    }
                )
            },

            "Column": ComponentDefinition { context in
                AnyView(
                    VStack(alignment: .leading, spacing: spacing(context.props["gap"] ?? context.props["spacing"], fallback: 8)) {
                        ChildViews(children: context.children)
                    }
                )
            },

            "Button": ComponentDefinition { context in
                let label = context.props.string("label") ?? context.props.string("text") ?? ""
                let disabled = context.props.bool("disabled") ?? false
                let prominent = context.props.string("variant") == "primary"
                let fullWidth = context.props.bool("fullWidth") ?? false
                return AnyView(
                    ButtonView(
                        label: label,
                        prominent: prominent,
                        disabled: disabled,
                        fullWidth: fullWidth,
                        context: context
                    )
                )
            },

            "Image": ComponentDefinition { context in
                let source = context.props.string("src") ?? ""
                let width = context.props.number("width")
                let height = context.props.number("height")
                return AnyView(
                    AsyncImage(url: URL(string: source)) { image in
                        image.resizable().scaledToFit()
                    } placeholder: {
                        ProgressView()
                    }
                    .frame(
                        width: width.map { CGFloat($0) },
                        height: height.map { CGFloat($0) }
                    )
                    .accessibilityLabel(context.props.string("alt") ?? "")
                )
            },

            "List": ComponentDefinition { context in
                AnyView(
                    VStack(alignment: .leading, spacing: spacing(context.props["spacing"], fallback: 8)) {
                        ChildViews(children: context.children)
                    }
                )
            },

            "Input": ComponentDefinition { context in
                AnyView(InputView(context: context))
            },
        ]
    }

    /// A registry with the built-in components plus app components.
    ///
    /// App components replace built-ins with the same name.
    public static func registry(
        extraComponents: [String: ComponentDefinition<AnyView>] = [:],
        actions: [String: ActionHandler] = [:],
        functions: [String: ComputedFunction] = [:],
        directives: [String: Directive] = [:]
    ) -> RendererRegistry<AnyView> {
        RendererRegistry(
            components: components.merging(extraComponents) { _, app in app },
            actions: actions,
            functions: functions,
            directives: directives
        )
    }
}

/// Renders an array of already-rendered children in a vertical stack.
public struct ChildViews: View {
    public let children: [AnyView]
    public let spacing: CGFloat

    public init(children: [AnyView], spacing: CGFloat = 0) {
        self.children = children
        self.spacing = spacing
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: spacing) {
            ForEach(children.indices, id: \.self) { index in
                children[index]
            }
        }
    }
}

private struct StackLayout: View {
    let horizontal: Bool
    let spacing: CGFloat
    let children: [AnyView]

    var body: some View {
        if horizontal {
            HStack(alignment: .center, spacing: spacing) {
                ForEach(children.indices, id: \.self) { index in
                    children[index]
                }
            }
        } else {
            VStack(alignment: .leading, spacing: spacing) {
                ForEach(children.indices, id: \.self) { index in
                    children[index]
                }
            }
        }
    }
}

private struct ButtonView: View {
    let label: String
    let prominent: Bool
    let disabled: Bool
    let fullWidth: Bool
    let context: ComponentRenderContext<AnyView>

    var body: some View {
        Button {
            Task { await context.emit("press") }
        } label: {
            // A button hugs its label unless the spec sets `fullWidth`, which
            // matches the React renderer's intrinsic button width.
            Text(label)
                .frame(maxWidth: fullWidth ? .infinity : nil)
        }
        .modifier(ProminentButtonStyle(enabled: prominent))
        .disabled(disabled)
    }
}

private struct ProminentButtonStyle: ViewModifier {
    let enabled: Bool

    func body(content: Content) -> some View {
        if enabled {
            content.buttonStyle(.borderedProminent)
        } else {
            content.buttonStyle(.bordered)
        }
    }
}

private struct InputView: View {
    let context: ComponentRenderContext<AnyView>

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            if let label = context.props.string("label") {
                Text(label).font(.caption).foregroundStyle(.secondary)
            }
            if let path = context.binding("value") {
                TextField(
                    context.props.string("placeholder") ?? "",
                    text: Binding(
                        get: { context.stateValue(at: path)?.stringValue ?? "" },
                        set: { newValue in
                            context.setState(at: path, to: .string(newValue))
                            Task { await context.emit("change") }
                        }
                    )
                )
                .textFieldStyle(.roundedBorder)
            } else {
                Text(context.props.string("value") ?? "")
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(6)
                    .background(.quaternary, in: RoundedRectangle(cornerRadius: 6))
            }
        }
    }
}
#endif
