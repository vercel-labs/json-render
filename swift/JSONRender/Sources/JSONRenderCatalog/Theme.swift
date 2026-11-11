#if canImport(SwiftUI)
import SwiftUI
import JSONRenderCore

/// Colors, spacing, and surfaces shared by the native catalog views.
enum CatalogTheme {
    static let cornerRadius: CGFloat = 12

    /// The control size that matches the text scale. Compact controls sit in
    /// list rows and next to labels.
    static func controlSize(scale: CGFloat, compact: Bool) -> ControlSize {
        switch (scale >= 1.2, compact) {
        case (true, true): return .regular
        case (true, false): return .large
        case (false, true): return .small
        case (false, false): return .regular
        }
    }

    /// The named tints from the catalog's `tint` prop.
    static func tint(_ name: String?, fallback: Color = .accentColor) -> Color {
        switch name {
        case "blue": return .blue
        case "green": return .green
        case "orange": return .orange
        case "red": return .red
        case "purple": return .purple
        case "pink": return .pink
        case "teal": return .teal
        case "indigo": return .indigo
        case "yellow": return .yellow
        case "brown": return .brown
        case "gray", "grey": return .gray
        case "mint": return .mint
        case "cyan": return .cyan
        default: return fallback
        }
    }

    /// Spacing tokens from the catalog's `gap` prop.
    static func gap(_ value: JSONValue?, fallback: CGFloat) -> CGFloat {
        if let number = value?.doubleValue { return CGFloat(number) }
        switch value?.stringValue {
        case "none": return 0
        case "xs": return 4
        case "sm": return 8
        case "md": return 12
        case "lg": return 20
        case "xl": return 28
        default: return fallback
        }
    }

    /// The raised surface behind cards and standalone tiles.
    static var surface: Color {
        #if os(macOS)
        Color(nsColor: .controlBackgroundColor)
        #else
        Color(uiColor: .secondarySystemGroupedBackground)
        #endif
    }

    /// A recessed fill for wells such as list groups inside a card.
    static var well: Color {
        Color.primary.opacity(0.04)
    }

    static var hairline: Color {
        Color.primary.opacity(0.09)
    }
}

// MARK: - Text size

/// Scales the catalog's text and icons.
struct TextScaleKey: EnvironmentKey {
    static let defaultValue: CGFloat = 1
}

extension EnvironmentValues {
    /// A multiplier for the native catalog's text and icon sizes. The default
    /// is 1, the platform's standard sizes.
    public var jsonRenderTextScale: CGFloat {
        get { self[TextScaleKey.self] }
        set { self[TextScaleKey.self] = newValue }
    }
}

extension View {
    /// Scales the native catalog's text and icons, for example `1.25` for a
    /// presentation or a large display.
    public func jsonRenderTextScale(_ scale: CGFloat) -> some View {
        environment(\.jsonRenderTextScale, scale)
    }

    func catalogFont(
        _ style: CatalogFont.Style,
        weight: Font.Weight? = nil,
        design: Font.Design = .default
    ) -> some View {
        modifier(CatalogFont(size: CatalogFont.size(style), weight: weight ?? CatalogFont.weight(style), design: design))
    }

    func catalogFont(size: CGFloat, weight: Font.Weight = .regular, design: Font.Design = .default) -> some View {
        modifier(CatalogFont(size: size, weight: weight, design: design))
    }
}

/// A system font at a text style's platform size, multiplied by the text scale.
struct CatalogFont: ViewModifier {
    enum Style {
        case title2, title3, headline, body, callout, subheadline, caption, caption2
    }

    let size: CGFloat
    let weight: Font.Weight
    let design: Font.Design
    @Environment(\.jsonRenderTextScale) private var textScale

    func body(content: Content) -> some View {
        content.font(.system(size: size * textScale, weight: weight, design: design))
    }

    static func size(_ style: Style) -> CGFloat {
        #if os(macOS)
        switch style {
        case .title2: return 17
        case .title3: return 15
        case .headline, .body: return 13
        case .callout: return 12
        case .subheadline: return 11
        case .caption, .caption2: return 10
        }
        #else
        switch style {
        case .title2: return 22
        case .title3: return 20
        case .headline, .body: return 17
        case .callout: return 16
        case .subheadline: return 15
        case .caption: return 12
        case .caption2: return 11
        }
        #endif
    }

    static func weight(_ style: Style) -> Font.Weight {
        style == .headline ? .semibold : .regular
    }
}

/// How deep the view is in raised surfaces. Cards set it so nested tiles and
/// lists draw a lighter treatment instead of a second card.
struct SurfaceDepthKey: EnvironmentKey {
    static let defaultValue = 0
}

/// Set by horizontal stacks that distribute space with spacers, so nested
/// vertical stacks size to their content instead of taking the free space.
struct HugsContentKey: EnvironmentKey {
    static let defaultValue = false
}

/// Set on grid cells so cards and tiles in a row stretch to the same height.
struct FillsHeightKey: EnvironmentKey {
    static let defaultValue = false
}

struct IsAccessoryKey: EnvironmentKey {
    static let defaultValue = false
}

extension EnvironmentValues {
    var surfaceDepth: Int {
        get { self[SurfaceDepthKey.self] }
        set { self[SurfaceDepthKey.self] = newValue }
    }

    /// True for trailing accessories in a list row, which draw compactly.
    var isAccessory: Bool {
        get { self[IsAccessoryKey.self] }
        set { self[IsAccessoryKey.self] = newValue }
    }

    var fillsHeight: Bool {
        get { self[FillsHeightKey.self] }
        set { self[FillsHeightKey.self] = newValue }
    }

    var hugsContent: Bool {
        get { self[HugsContentKey.self] }
        set { self[HugsContentKey.self] = newValue }
    }
}

/// A rounded raised surface with a hairline border and a soft shadow.
struct CardSurface: ViewModifier {
    var padding: CGFloat = 16

    func body(content: Content) -> some View {
        content
            .padding(padding)
            .frame(maxWidth: .infinity, alignment: .topLeading)
            .background(
                RoundedRectangle(cornerRadius: CatalogTheme.cornerRadius, style: .continuous)
                    .fill(CatalogTheme.surface)
                    .shadow(color: .black.opacity(0.05), radius: 1.5, y: 1)
            )
            .overlay(
                RoundedRectangle(cornerRadius: CatalogTheme.cornerRadius, style: .continuous)
                    .strokeBorder(CatalogTheme.hairline, lineWidth: 1)
            )
            .environment(\.surfaceDepth, 1)
    }
}

/// A recessed rounded well, used for tiles inside a card.
struct WellSurface: ViewModifier {
    var padding: CGFloat = 12

    func body(content: Content) -> some View {
        content
            .padding(padding)
            .frame(maxWidth: .infinity, alignment: .topLeading)
            .background(
                RoundedRectangle(cornerRadius: CatalogTheme.cornerRadius - 3, style: .continuous)
                    .fill(CatalogTheme.well)
            )
    }
}

/// Draws a card at the top level and a well inside a card.
struct AdaptiveSurface: ViewModifier {
    @Environment(\.surfaceDepth) private var depth

    func body(content: Content) -> some View {
        if depth == 0 {
            content.modifier(CardSurface())
        } else {
            content.modifier(WellSurface())
        }
    }
}

/// An SF Symbol on a tinted rounded square, like the icons in System Settings.
struct SymbolTile: View {
    let symbol: String
    let tint: Color
    var baseSize: CGFloat = 26
    @Environment(\.jsonRenderTextScale) private var textScale

    init(symbol: String, tint: Color, size: CGFloat = 26) {
        self.symbol = symbol
        self.tint = tint
        self.baseSize = size
    }

    var body: some View {
        let size = baseSize * textScale
        Image(systemName: symbol)
            .font(.system(size: size * 0.52, weight: .semibold))
            .foregroundStyle(.white)
            .frame(width: size, height: size)
            .background(
                RoundedRectangle(cornerRadius: size * 0.27, style: .continuous)
                    .fill(tint.gradient)
            )
    }
}

/// A rendered child with a stable identity.
struct KeyedChild: Identifiable {
    let id: String
    let index: Int
    let view: AnyView
}

extension ComponentRenderContext where Render == AnyView {
    /// The children paired with their element identities, so a child that a
    /// visibility condition hides does not shift the identity of the others.
    var keyedChildren: [KeyedChild] {
        var seen: [String: Int] = [:]
        return children.indices.map { index in
            let base = index < childIDs.count ? childIDs[index] : "#\(index)"
            let count = seen[base, default: 0]
            seen[base] = count + 1
            return KeyedChild(
                id: count == 0 ? base : "\(base)#\(count)",
                index: index,
                view: children[index]
            )
        }
    }
}

/// Renders children in order with their stable identities.
struct ChildList: View {
    let children: [KeyedChild]
    let fill: Bool

    var body: some View {
        ForEach(children) { child in
            if fill {
                child.view.frame(maxWidth: .infinity, alignment: .leading)
            } else {
                child.view
            }
        }
    }
}
#endif
