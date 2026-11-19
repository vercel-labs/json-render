#if canImport(SwiftUI)
import SwiftUI

/// The visual appearance of the native catalog.
public enum NativeCatalogAppearance: Equatable, Sendable {
    /// The default catalog appearance.
    case standard
    /// System Liquid Glass controls on iOS 26 and macOS 26 and later.
    case liquidGlass

    var usesLiquidGlass: Bool {
        #if compiler(>=6.2)
        if #available(iOS 26, macOS 26, *) {
            return self == .liquidGlass
        }
        #endif
        return false
    }
}

private struct CatalogAppearanceKey: EnvironmentKey {
    static let defaultValue: NativeCatalogAppearance = .standard
}

extension EnvironmentValues {
    var jsonRenderCatalogAppearance: NativeCatalogAppearance {
        get { self[CatalogAppearanceKey.self] }
        set { self[CatalogAppearanceKey.self] = newValue }
    }
}

extension View {
    /// Sets the native catalog appearance for this view and its descendants.
    /// Change the value to switch appearances without recreating the renderer.
    public func jsonRenderCatalogAppearance(_ appearance: NativeCatalogAppearance) -> some View {
        environment(\.jsonRenderCatalogAppearance, appearance)
    }
}

struct CatalogButtonStyle: ViewModifier {
    let variant: String
    @Environment(\.jsonRenderCatalogAppearance) private var appearance
    @Environment(\.isAccessory) private var isAccessory

    @ViewBuilder
    func body(content: Content) -> some View {
        if variant == "danger" {
            styled(content).tint(.red)
        } else {
            styled(content)
        }
    }

    @ViewBuilder
    private func styled(_ content: Content) -> some View {
        #if compiler(>=6.2)
        if #available(iOS 26, macOS 26, *), appearance.usesLiquidGlass {
            if variant == "primary" {
                #if os(macOS)
                // The prominent macOS style uses the system's default-button bezel.
                // Use tinted system glass here to keep the pill shape.
                content.buttonStyle(.glass(.regular.tint(.accentColor)))
                    .buttonBorderShape(.capsule)
                    .controlSize(isAccessory ? .regular : .large)
                #else
                content.buttonStyle(.glassProminent)
                    .buttonBorderShape(.capsule)
                    .controlSize(isAccessory ? .regular : .large)
                #endif
            } else {
                content.buttonStyle(.glass)
                    .buttonBorderShape(.capsule)
                    .controlSize(isAccessory ? .regular : .large)
            }
        } else {
            bordered(content)
        }
        #else
        bordered(content)
        #endif
    }

    @ViewBuilder
    private func bordered(_ content: Content) -> some View {
        if variant == "primary" {
            content.buttonStyle(.borderedProminent)
        } else {
            content.buttonStyle(.bordered)
        }
    }
}
#endif
