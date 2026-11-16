#if canImport(SwiftUI)
import JSONRenderCore
import SwiftUI

/// Opt-in SwiftUI controls that use the system Liquid Glass button styles.
public enum LiquidGlassCatalog {
    /// Pass these definitions to a SwiftUI registry's `extraComponents`.
    public static var components: [String: ComponentDefinition<AnyView>] {
        [
            "GlassButton": ComponentDefinition { AnyView(GlassActionButton(context: $0)) },
            "GlassButtonGroup": ComponentDefinition { AnyView(GlassButtonGroup(context: $0)) },
        ]
    }
}

private struct GlassActionButton: View {
    let context: ComponentRenderContext<AnyView>

    private var prominent: Bool {
        context.props.bool("prominent") ?? false
    }

    var body: some View {
        let label = context.props.string("label") ?? ""
        let button = Button {
            Task { await context.emit("press") }
        } label: {
            if let icon = context.props.string("icon"), !icon.isEmpty {
                Label(label, systemImage: icon)
            } else {
                Text(label)
            }
        }
        .disabled(context.props.bool("disabled") ?? false)

        #if compiler(>=6.2)
        if #available(iOS 26, macOS 26, *) {
            if prominent {
                button.buttonStyle(.glassProminent)
            } else {
                button.buttonStyle(.glass)
            }
        } else {
            fallback(button)
        }
        #else
        fallback(button)
        #endif
    }

    @ViewBuilder
    private func fallback(_ button: some View) -> some View {
        if prominent {
            button.buttonStyle(.borderedProminent)
        } else {
            button.buttonStyle(.bordered)
        }
    }
}

private struct GlassButtonGroup: View {
    let context: ComponentRenderContext<AnyView>

    private var buttons: some View {
        HStack {
            ForEach(context.identifiedChildren) { child in
                child.content
            }
        }
    }

    var body: some View {
        #if compiler(>=6.2)
        if #available(iOS 26, macOS 26, *) {
            GlassEffectContainer {
                buttons
            }
        } else {
            buttons
        }
        #else
        buttons
        #endif
    }
}
#endif
