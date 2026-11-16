#if canImport(SwiftUI)
import JSONRenderCore
import SwiftUI

/// A surface intended for a group of controls on the app's navigation layer.
struct CatalogToolbar: View {
    let context: ComponentRenderContext<AnyView>
    @Environment(\.jsonRenderCatalogAppearance) private var appearance

    var body: some View {
        let spacing = CatalogTheme.gap(context.props["gap"], fallback: 8)
        let controls = FlowLayout(spacing: spacing, justify: nil, alignment: .center) {
            ForEach(context.identifiedChildren) { child in
                child.content
            }
        }
        .environment(\.hugsContent, true)
        .environment(\.isCatalogControlGroup, true)
        .padding(.horizontal, 10)
        .padding(.vertical, 6)
        .accessibilityElement(children: .contain)
        .accessibilityLabel(context.props.string("label") ?? "")

        #if compiler(>=6.2)
        if #available(iOS 26, macOS 26, *) {
            GlassEffectContainer(spacing: spacing) {
                controls
                    .background(appearance.usesLiquidGlass ? Color.clear : CatalogTheme.surface, in: Capsule())
                    .glassEffect(appearance.usesLiquidGlass ? .regular : .identity, in: Capsule())
            }
        } else {
            controls.background(CatalogTheme.surface, in: Capsule())
        }
        #else
        controls.background(CatalogTheme.surface, in: Capsule())
        #endif
    }
}

struct CatalogMenu: View {
    let context: ComponentRenderContext<AnyView>

    var body: some View {
        let label = context.props.string("label") ?? ""
        Menu {
            ForEach(context.identifiedChildren) { child in
                child.content
            }
        } label: {
            if let icon = context.props.string("icon"), !icon.isEmpty {
                Label(label, systemImage: icon)
            } else {
                Text(label)
            }
        }
        .disabled(context.props.bool("disabled") ?? false)
    }
}

struct CatalogSegmentedPicker: View {
    let context: ComponentRenderContext<AnyView>
    @State private var localSelection: String?

    var body: some View {
        let options = CatalogOption.parse(context.props["options"])
        let selection = catalogSelection(context, options: options, local: $localSelection)
        Picker(context.props.string("label") ?? "", selection: selection) {
            ForEach(options) { option in
                Text(option.label).tag(option.value)
            }
        }
        .pickerStyle(.segmented)
        .disabled(options.isEmpty || context.props.bool("disabled") == true)
    }
}

struct CatalogOption: Identifiable {
    let label: String
    let value: String
    let icon: String?
    var id: String { value }

    static func parse(_ value: JSONValue?) -> [CatalogOption] {
        var seen: Set<String> = []
        return (value?.arrayValue ?? []).compactMap { option in
            guard let props = option.objectValue,
                  let label = props.string("label"),
                  let value = props.string("value"),
                  seen.insert(value).inserted else { return nil }
            return CatalogOption(label: label, value: value, icon: props.string("icon"))
        }
    }
}

func catalogSelection(
    _ context: ComponentRenderContext<AnyView>,
    options: [CatalogOption],
    local: Binding<String?>
) -> Binding<String> {
    let path = context.binding("value")
    return Binding(
        get: {
            let value: String?
            if let path {
                value = context.stateValue(at: path)?.stringValue
            } else {
                value = local.wrappedValue ?? context.props.string("value")
            }
            return options.first(where: { $0.value == value })?.value ?? options.first?.value ?? ""
        },
        set: { newValue in
            if let path {
                context.setState(at: path, to: .string(newValue))
            } else {
                local.wrappedValue = newValue
            }
            Task { await context.emit("change") }
        }
    )
}
#endif
