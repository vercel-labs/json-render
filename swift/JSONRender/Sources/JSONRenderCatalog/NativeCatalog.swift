#if canImport(SwiftUI)
import SwiftUI
import JSONRenderCore
import JSONRenderSwiftUI

/// A native catalog of layout, content, control, and chart components.
///
/// The component names and props follow the catalogs used with the React
/// renderer (for example `@json-render/shadcn`), so a spec generated for the
/// matching catalog definition renders on both. `Scripts/record-demo-streams.mjs`
/// has the matching catalog definition for prompt generation.
///
/// ```swift
/// JSONRenderView(spec: spec, registry: NativeCatalog.registry())
/// ```
public enum NativeCatalog {
    /// The catalog's component renderers keyed by name.
    public static var components: [String: ComponentDefinition<AnyView>] {
        [
            "Card": ComponentDefinition { AnyView(CardView(context: $0)) },
            "Stack": ComponentDefinition { AnyView(StackView(context: $0)) },
            "Grid": ComponentDefinition { AnyView(GridView(context: $0)) },
            "Heading": ComponentDefinition { AnyView(HeadingView(props: $0.props)) },
            "Text": ComponentDefinition { AnyView(TextView(props: $0.props)) },
            "Metric": ComponentDefinition { AnyView(MetricView(props: $0.props)) },
            "Badge": ComponentDefinition { AnyView(BadgeView(props: $0.props)) },
            "Alert": ComponentDefinition { AnyView(AlertView(props: $0.props)) },
            "List": ComponentDefinition { AnyView(ListView(context: $0)) },
            "ListItem": ComponentDefinition { AnyView(ListItemView(context: $0)) },
            "Image": ComponentDefinition { AnyView(ImageView(props: $0.props)) },
            "Progress": ComponentDefinition { AnyView(ProgressBarView(props: $0.props)) },
            "Button": ComponentDefinition { AnyView(CatalogButton(context: $0)) },
            "Switch": ComponentDefinition { AnyView(SwitchView(context: $0)) },
            "BarChart": ComponentDefinition { AnyView(ChartView(kind: .bar, props: $0.props)) },
            "LineChart": ComponentDefinition { AnyView(ChartView(kind: .line, props: $0.props)) },
            "Separator": ComponentDefinition { _ in AnyView(Divider().padding(.vertical, 2)) },
        ]
    }

    /// A registry with the catalog components plus app components and actions.
    ///
    /// - Parameters:
    ///   - extraComponents: App components. They replace catalog components
    ///     with the same name.
    ///   - actions: Action handlers keyed by action name.
    ///   - animatesAppearance: Fades and slides each element in the first time
    ///     it appears, so a streamed spec builds up smoothly.
    public static func registry(
        extraComponents: [String: ComponentDefinition<AnyView>] = [:],
        actions: [String: ActionHandler] = [:],
        functions: [String: ComputedFunction] = [:],
        animatesAppearance: Bool = true
    ) -> RendererRegistry<AnyView> {
        var all = components.merging(extraComponents) { _, app in app }
        // Common aliases from other catalogs.
        all["Divider"] = all["Divider"] ?? all["Separator"]
        all["Toggle"] = all["Toggle"] ?? all["Switch"]
        all["Row"] = all["Row"] ?? ComponentDefinition { AnyView(StackView(context: $0, forcedDirection: .horizontal)) }
        all["Column"] = all["Column"] ?? ComponentDefinition { AnyView(StackView(context: $0, forcedDirection: .vertical)) }

        if animatesAppearance {
            all = all.mapValues { definition in
                ComponentDefinition { context in
                    AnyView(definition.render(context).modifier(AppearTransition()))
                }
            }
        }
        return RendererRegistry(components: all, actions: actions, functions: functions)
    }
}

// MARK: - Appearance

final class AppearState: ObservableObject {
    @Published var shown = false
}

/// Fades and lifts a view in the first time it appears.
///
/// The state lives with the view's identity, so later rebuilds of the tree
/// leave elements that are already on screen alone.
struct AppearTransition: ViewModifier {
    @StateObject private var state = AppearState()

    func body(content: Content) -> some View {
        content
            .opacity(state.shown ? 1 : 0)
            .offset(y: state.shown ? 0 : 8)
            .scaleEffect(state.shown ? 1 : 0.985, anchor: .top)
            .onAppear {
                guard !state.shown else { return }
                withAnimation(.spring(response: 0.42, dampingFraction: 0.9)) {
                    state.shown = true
                }
            }
    }
}

// MARK: - Layout

struct CardView: View {
    let context: ComponentRenderContext<AnyView>
    @Environment(\.fillsHeight) private var fillsHeight

    var body: some View {
        let title = context.props.string("title")
        let description = context.props.string("description")
        let icon = context.props.string("icon")
        let tint = CatalogTheme.tint(context.props.string("tint"))

        VStack(alignment: .leading, spacing: 14) {
            if title != nil || description != nil {
                HStack(alignment: .center, spacing: 10) {
                    if let icon, !icon.isEmpty {
                        SymbolTile(symbol: icon, tint: tint, size: 26)
                    }
                    VStack(alignment: .leading, spacing: 1) {
                        if let title {
                            Text(title)
                                .catalogFont(.headline)
                        }
                        if let description, !description.isEmpty {
                            Text(description)
                                .catalogFont(.subheadline)
                                .foregroundStyle(.secondary)
                        }
                    }
                }
            }
            VStack(alignment: .leading, spacing: 12) {
                ChildList(children: context.keyedChildren, fill: true)
            }
            .environment(\.fillsHeight, false)
        }
        .frame(maxWidth: .infinity, maxHeight: fillsHeight ? .infinity : nil, alignment: .topLeading)
        .modifier(AdaptiveSurface())
    }
}

struct StackView: View {
    enum Direction { case horizontal, vertical }

    let context: ComponentRenderContext<AnyView>
    var forcedDirection: Direction?
    @Environment(\.hugsContent) private var hugsContent

    var body: some View {
        let direction: Direction = forcedDirection
            ?? (context.props.string("direction") == "horizontal" ? .horizontal : .vertical)
        let spacing = CatalogTheme.gap(context.props["gap"] ?? context.props["spacing"], fallback: 12)
        let align = context.props.string("align")
        let justify = context.props.string("justify")

        if direction == .horizontal {
            if justify == "between" {
                HStack(alignment: verticalAlignment(align), spacing: spacing) {
                    ForEach(context.keyedChildren) { child in
                        if child.index > 0 { Spacer(minLength: spacing) }
                        child.view
                    }
                }
                .environment(\.hugsContent, true)
                // A single child starts at the leading edge, as with CSS
                // `justify-content: space-between`.
                .frame(maxWidth: hugsContent ? nil : .infinity, alignment: .leading)
            } else {
                // Children keep their natural width and wrap to a new row when
                // they do not fit, like a wrapping flex row.
                FlowLayout(
                    spacing: spacing,
                    justify: justify,
                    alignment: verticalAlignment(align)
                ) {
                    ForEach(context.keyedChildren) { child in
                        child.view
                    }
                }
                .environment(\.hugsContent, true)
                .frame(maxWidth: hugsContent ? nil : .infinity, alignment: .leading)
            }
        } else {
            VStack(alignment: horizontalAlignment(align), spacing: spacing) {
                ChildList(
                    children: context.keyedChildren,
                    fill: !hugsContent && (align == nil || align == "stretch" || align == "start")
                )
            }
            .environment(\.hugsContent, false)
            .frame(maxWidth: hugsContent ? nil : .infinity, alignment: frameAlignment(align))
            .fixedSize(horizontal: hugsContent, vertical: false)
        }
    }

    private func verticalAlignment(_ align: String?) -> VerticalAlignment {
        switch align {
        case "start": return .top
        case "end": return .bottom
        default: return .center
        }
    }

    private func horizontalAlignment(_ align: String?) -> HorizontalAlignment {
        switch align {
        case "center": return .center
        case "end": return .trailing
        default: return .leading
        }
    }

    private func frameAlignment(_ align: String?) -> Alignment {
        switch align {
        case "center": return .center
        case "end": return .trailing
        default: return .leading
        }
    }
}

struct GridView: View {
    let context: ComponentRenderContext<AnyView>
    @Environment(\.jsonRenderTextScale) private var textScale

    var body: some View {
        let columns = max(1, min(6, context.props.number("columns").map { Int($0) } ?? 2))
        let spacing = CatalogTheme.gap(context.props["gap"], fallback: 12)

        ColumnsLayout(columns: columns, spacing: spacing, minColumnWidth: 140 * textScale) {
            ForEach(context.keyedChildren) { child in
                child.view
                    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
                    .environment(\.fillsHeight, true)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

/// Equal-width columns where every cell in a row gets the row's height.
///
/// When the requested columns would be narrower than `minColumnWidth`, the
/// layout uses fewer columns, preferring a count that fills every row.
struct ColumnsLayout: Layout {
    var columns: Int
    var spacing: CGFloat
    var minColumnWidth: CGFloat

    private func columnCount(width: CGFloat, count: Int) -> Int {
        guard width.isFinite, count > 0 else { return max(1, columns) }
        let fit = max(1, min(columns, Int((width + spacing) / (minColumnWidth + spacing))))
        guard fit < columns, count > fit else { return fit }
        for candidate in stride(from: fit, to: 1, by: -1) where count % candidate == 0 {
            return candidate
        }
        return fit
    }

    private func rows(_ subviews: Subviews, width: CGFloat) -> (columnWidth: CGFloat, columns: Int, heights: [CGFloat]) {
        let count = columnCount(width: width, count: subviews.count)
        let columnWidth = max(0, (width - spacing * CGFloat(count - 1)) / CGFloat(count))
        var heights: [CGFloat] = []
        for start in stride(from: 0, to: subviews.count, by: count) {
            let end = min(start + count, subviews.count)
            let height = (start..<end).map {
                subviews[$0].sizeThatFits(ProposedViewSize(width: columnWidth, height: nil)).height
            }.max() ?? 0
            heights.append(height)
        }
        return (columnWidth, count, heights)
    }

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let width: CGFloat
        if let proposed = proposal.width, proposed.isFinite {
            width = proposed
        } else {
            let ideal = subviews.map { $0.sizeThatFits(.unspecified).width }.max() ?? 0
            width = ideal * CGFloat(columns) + spacing * CGFloat(columns - 1)
        }
        let layout = rows(subviews, width: width)
        let height = layout.heights.reduce(0, +) + spacing * CGFloat(max(layout.heights.count - 1, 0))
        return CGSize(width: width, height: height)
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        let layout = rows(subviews, width: bounds.width)
        var y = bounds.minY
        for (row, height) in layout.heights.enumerated() {
            for column in 0..<layout.columns {
                let index = row * layout.columns + column
                guard index < subviews.count else { break }
                subviews[index].place(
                    at: CGPoint(x: bounds.minX + CGFloat(column) * (layout.columnWidth + spacing), y: y),
                    anchor: .topLeading,
                    proposal: ProposedViewSize(width: layout.columnWidth, height: height)
                )
            }
            y += height + spacing
        }
    }
}

// MARK: - Text

struct HeadingView: View {
    let props: [String: JSONValue]

    var body: some View {
        let text = props.string("text") ?? ""
        switch props.string("level") {
        case "h1":
            Text(text)
                .catalogFont(size: 26, weight: .bold)
                .padding(.bottom, -4)
        case "h3":
            Text(text).catalogFont(.headline)
        case "h4":
            Text(text.uppercased())
                .catalogFont(.caption, weight: .semibold)
                .tracking(0.6)
                .foregroundStyle(.secondary)
        default:
            Text(text)
                .catalogFont(.title3, weight: .semibold)
                .padding(.top, 4)
        }
    }
}

struct TextView: View {
    let props: [String: JSONValue]

    var body: some View {
        let text = props.string("text") ?? ""
        Group {
            switch props.string("variant") {
            case "lead":
                Text(text).catalogFont(.title3).foregroundStyle(.secondary)
            case "caption":
                Text(text).catalogFont(.caption).foregroundStyle(.secondary)
            case "muted":
                Text(text).catalogFont(.callout).foregroundStyle(.secondary)
            case "code":
                Text(text)
                    .catalogFont(.callout, design: .monospaced)
                    .padding(.horizontal, 6)
                    .padding(.vertical, 3)
                    .background(CatalogTheme.well, in: RoundedRectangle(cornerRadius: 5))
            default:
                Text(text).catalogFont(.body)
            }
        }
        .fixedSize(horizontal: false, vertical: true)
    }
}

// MARK: - Data display

struct MetricView: View {
    let props: [String: JSONValue]
    @Environment(\.fillsHeight) private var fillsHeight
    @Environment(\.jsonRenderTextScale) private var textScale

    var body: some View {
        let trend = props.string("trend")
        let tint = CatalogTheme.tint(props.string("tint"), fallback: .accentColor)
        let value = props["value"].map { $0.displayString } ?? ""

        VStack(alignment: .leading, spacing: 6) {
            HStack(spacing: 6) {
                if let icon = props.string("icon"), !icon.isEmpty {
                    Image(systemName: icon)
                        .catalogFont(size: 12, weight: .semibold)
                        .foregroundStyle(tint)
                }
                Text(props.string("label") ?? "")
                    .catalogFont(.subheadline)
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
            }
            Text(value.isEmpty ? " " : value)
                .catalogFont(size: 24, weight: .semibold, design: .rounded)
                .monospacedDigit()
                .lineLimit(1)
                .minimumScaleFactor(0.7)
                .fixedSize(horizontal: false, vertical: true)
                .contentTransition(.numericText())
                .overlay(alignment: .leading) {
                    // A value bound to state that has not streamed in yet.
                    if value.isEmpty {
                        RoundedRectangle(cornerRadius: 5, style: .continuous)
                            .fill(Color.primary.opacity(0.07))
                            .frame(width: 72 * textScale, height: 20 * textScale)
                    }
                }
                .animation(.easeOut(duration: 0.25), value: value.isEmpty)
            if let detail = props.string("detail"), !detail.isEmpty {
                HStack(alignment: .firstTextBaseline, spacing: 3) {
                    if let symbol = trendSymbol(trend) {
                        Image(systemName: symbol)
                            .catalogFont(size: 10, weight: .bold)
                    }
                    Text(detail)
                        .lineLimit(1)
                        .truncationMode(.tail)
                        .minimumScaleFactor(0.85)
                }
                .catalogFont(.caption, weight: .medium)
                .foregroundStyle(trendColor(trend))
            }
        }
        .frame(maxWidth: .infinity, maxHeight: fillsHeight ? .infinity : nil, alignment: .topLeading)
        .modifier(AdaptiveSurface())
    }

    private func trendSymbol(_ trend: String?) -> String? {
        switch trend {
        case "up": return "arrow.up.right"
        case "down": return "arrow.down.right"
        default: return nil
        }
    }

    private func trendColor(_ trend: String?) -> Color {
        switch trend {
        case "up": return .green
        case "down": return .red
        default: return .secondary
        }
    }
}

struct BadgeView: View {
    let props: [String: JSONValue]

    var body: some View {
        let variant = props.string("variant") ?? "default"
        let color = color(for: variant)

        Text(props.string("text") ?? "")
            .catalogFont(.caption, weight: .semibold)
            .lineLimit(1)
            .padding(.horizontal, 8)
            .padding(.vertical, 3)
            .foregroundStyle(variant == "secondary" || variant == "outline" ? Color.secondary : color)
            .background {
                if variant == "outline" {
                    Capsule().strokeBorder(CatalogTheme.hairline, lineWidth: 1)
                } else {
                    Capsule().fill(color.opacity(variant == "secondary" ? 0.12 : 0.15))
                }
            }
            .fixedSize()
            // The text and color change together without a cross-fade, so
            // the old and new text never draw over each other.
            .transaction { $0.animation = nil }
    }

    private func color(for variant: String) -> Color {
        switch variant {
        case "success": return .green
        case "warning": return .orange
        case "destructive": return .red
        case "secondary", "outline": return .gray
        default: return .accentColor
        }
    }
}

struct AlertView: View {
    let props: [String: JSONValue]

    var body: some View {
        let type = props.string("type") ?? "info"
        let color = color(for: type)

        HStack(alignment: .top, spacing: 10) {
            Image(systemName: symbol(for: type))
                .catalogFont(size: 15, weight: .semibold)
                .foregroundStyle(color)
                .frame(width: 18)
            VStack(alignment: .leading, spacing: 2) {
                Text(props.string("title") ?? "")
                    .catalogFont(.subheadline, weight: .semibold)
                if let message = props.string("message"), !message.isEmpty {
                    Text(message)
                        .catalogFont(.subheadline)
                        .foregroundStyle(.secondary)
                        .fixedSize(horizontal: false, vertical: true)
                }
            }
            Spacer(minLength: 0)
        }
        .padding(12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            RoundedRectangle(cornerRadius: 10, style: .continuous)
                .fill(color.opacity(0.08))
        )
        .overlay(
            RoundedRectangle(cornerRadius: 10, style: .continuous)
                .strokeBorder(color.opacity(0.2), lineWidth: 1)
        )
    }

    private func color(for type: String) -> Color {
        switch type {
        case "success": return .green
        case "warning": return .orange
        case "error": return .red
        default: return .blue
        }
    }

    private func symbol(for type: String) -> String {
        switch type {
        case "success": return "checkmark.circle.fill"
        case "warning": return "exclamationmark.triangle.fill"
        case "error": return "xmark.octagon.fill"
        default: return "info.circle.fill"
        }
    }
}

struct ListView: View {
    let context: ComponentRenderContext<AnyView>
    @Environment(\.surfaceDepth) private var depth
    @Environment(\.jsonRenderTextScale) private var textScale

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            if let title = context.props.string("title"), !title.isEmpty {
                Text(title)
                    .catalogFont(.subheadline, weight: .semibold)
                    .foregroundStyle(.secondary)
            }
            VStack(alignment: .leading, spacing: 0) {
                ForEach(context.keyedChildren) { child in
                    if child.index > 0 {
                        Divider().padding(.leading, 38 * textScale)
                    }
                    child.view
                        .frame(maxWidth: .infinity, alignment: .leading)
                }
            }
            .padding(.horizontal, depth == 0 ? 12 : 0)
            .padding(.vertical, depth == 0 ? 4 : 0)
            .background {
                if depth == 0 {
                    RoundedRectangle(cornerRadius: CatalogTheme.cornerRadius, style: .continuous)
                        .fill(CatalogTheme.surface)
                        .overlay(
                            RoundedRectangle(cornerRadius: CatalogTheme.cornerRadius, style: .continuous)
                                .strokeBorder(CatalogTheme.hairline, lineWidth: 1)
                        )
                }
            }
        }
    }
}

struct ListItemView: View {
    let context: ComponentRenderContext<AnyView>

    var body: some View {
        // Accessories keep their full size and stay on the row; the title
        // and subtitle truncate when space is short.
        HStack(spacing: 12) {
            leading
                .layoutPriority(-1)
            Spacer(minLength: 8)
            trailingText
            HStack(spacing: 8) {
                accessories
            }
        }
        .padding(.vertical, 8)
        .contentShape(Rectangle())
    }

    private var leading: some View {
        HStack(spacing: 12) {
            if let icon = context.props.string("icon"), !icon.isEmpty {
                SymbolTile(symbol: icon, tint: CatalogTheme.tint(context.props.string("tint")), size: 26)
            }
            VStack(alignment: .leading, spacing: 1) {
                Text(context.props.string("title") ?? "")
                    .catalogFont(.body)
                    .lineLimit(1)
                if let subtitle = context.props.string("subtitle"), !subtitle.isEmpty {
                    Text(subtitle)
                        .catalogFont(.caption)
                        .foregroundStyle(.secondary)
                        .lineLimit(2)
                }
            }
        }
    }

    @ViewBuilder
    private var trailingText: some View {
        if let trailing = context.props.string("trailing"), !trailing.isEmpty {
            Text(trailing)
                .catalogFont(.body)
                .monospacedDigit()
                .foregroundStyle(.secondary)
                .lineLimit(1)
                .fixedSize()
        }
    }

    private var accessories: some View {
        ForEach(context.keyedChildren) { child in
            child.view
                .fixedSize()
        }
        .environment(\.isAccessory, true)
    }
}

struct ImageView: View {
    let props: [String: JSONValue]

    var body: some View {
        let height = CGFloat(props.number("height") ?? 160)
        let shape = RoundedRectangle(cornerRadius: CatalogTheme.cornerRadius - 2, style: .continuous)

        AsyncImage(url: props.string("src").flatMap(URL.init(string:))) { phase in
            switch phase {
            case .success(let image):
                image.resizable().scaledToFill()
            default:
                ZStack {
                    LinearGradient(
                        colors: [Color.accentColor.opacity(0.18), Color.accentColor.opacity(0.06)],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                    Image(systemName: "photo")
                        .catalogFont(size: 28, weight: .light)
                        .foregroundStyle(.secondary)
                }
            }
        }
        .frame(maxWidth: .infinity)
        .frame(height: height)
        .clipShape(shape)
        .accessibilityLabel(props.string("alt") ?? "")
    }
}

struct ProgressBarView: View {
    let props: [String: JSONValue]

    var body: some View {
        let maximum = max(props.number("max") ?? 100, 0.0001)
        let value = min(max(props.number("value") ?? 0, 0), maximum)
        let fraction = value / maximum
        let tint = CatalogTheme.tint(props.string("tint"))

        VStack(alignment: .leading, spacing: 6) {
            if let label = props.string("label"), !label.isEmpty {
                HStack {
                    Text(label)
                        .catalogFont(.subheadline)
                    Spacer()
                    Text("\(Int((fraction * 100).rounded()))%")
                        .catalogFont(.subheadline)
                        .monospacedDigit()
                        .foregroundStyle(.secondary)
                }
            }
            GeometryReader { proxy in
                ZStack(alignment: .leading) {
                    Capsule().fill(Color.primary.opacity(0.08))
                    Capsule()
                        .fill(tint.gradient)
                        .frame(width: max(6, proxy.size.width * fraction))
                }
            }
            .frame(height: 6)
            .animation(.spring(response: 0.5, dampingFraction: 0.85), value: fraction)
        }
    }
}

// MARK: - Controls

/// Wraps children onto new rows when they do not fit, keeping each child at
/// its natural size.
struct FlowLayout: Layout {
    var spacing: CGFloat
    var justify: String?
    var alignment: VerticalAlignment

    private struct Row {
        var indices: [Int] = []
        var sizes: [CGSize] = []
        var width: CGFloat = 0
        var height: CGFloat = 0
    }

    private func rows(for subviews: Subviews, maxWidth: CGFloat) -> [Row] {
        var rows: [Row] = []
        var current = Row()
        for index in subviews.indices {
            var size = subviews[index].sizeThatFits(.unspecified)
            if size.width > maxWidth {
                size = subviews[index].sizeThatFits(ProposedViewSize(width: maxWidth, height: nil))
            }
            let needed = current.indices.isEmpty ? size.width : current.width + spacing + size.width
            if needed > maxWidth, !current.indices.isEmpty {
                rows.append(current)
                current = Row()
            }
            current.width = current.indices.isEmpty ? size.width : current.width + spacing + size.width
            current.height = max(current.height, size.height)
            current.indices.append(index)
            current.sizes.append(size)
        }
        if !current.indices.isEmpty { rows.append(current) }
        return rows
    }

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let maxWidth = proposal.width ?? .infinity
        let rows = rows(for: subviews, maxWidth: maxWidth)
        let width = rows.map(\.width).max() ?? 0
        let height = rows.map(\.height).reduce(0, +) + spacing * CGFloat(max(rows.count - 1, 0))
        return CGSize(width: proposal.width.map { min($0, width) } ?? width, height: height)
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        let rows = rows(for: subviews, maxWidth: bounds.width)
        var y = bounds.minY
        for row in rows {
            let free = max(0, bounds.width - row.width)
            var x = bounds.minX
            switch justify {
            case "center": x += free / 2
            case "end": x += free
            default: break
            }
            for (offset, index) in row.indices.enumerated() {
                let size = row.sizes[offset]
                let dy: CGFloat
                switch alignment {
                case .top: dy = 0
                case .bottom: dy = row.height - size.height
                default: dy = (row.height - size.height) / 2
                }
                subviews[index].place(
                    at: CGPoint(x: x, y: y + dy),
                    anchor: .topLeading,
                    proposal: ProposedViewSize(size)
                )
                x += size.width + spacing
            }
            y += row.height + spacing
        }
    }
}

struct CatalogButton: View {
    let context: ComponentRenderContext<AnyView>
    @Environment(\.isAccessory) private var isAccessory
    @Environment(\.jsonRenderTextScale) private var textScale

    var body: some View {
        let label = context.props.string("label") ?? context.props.string("text") ?? ""
        let variant = context.props.string("variant") ?? "secondary"
        let icon = context.props.string("icon")

        let button = Button {
            Task { await context.emit("press") }
        } label: {
            Group {
                if let icon, !icon.isEmpty {
                    Label(label, systemImage: icon)
                } else {
                    Text(label)
                }
            }
            .padding(.horizontal, 2)
        }
        .catalogFont(isAccessory ? .callout : .body)
        .controlSize(CatalogTheme.controlSize(scale: textScale, compact: isAccessory))
        .disabled(context.props.bool("disabled") ?? false)

        switch variant {
        case "primary":
            button.buttonStyle(.borderedProminent)
        case "danger":
            button.buttonStyle(.bordered).tint(.red)
        default:
            button.buttonStyle(.bordered)
        }
    }
}

final class LocalToggleState: ObservableObject {
    @Published var value: Bool?
}

struct SwitchView: View {
    let context: ComponentRenderContext<AnyView>
    @StateObject private var local = LocalToggleState()
    @Environment(\.isAccessory) private var isAccessory
    @Environment(\.jsonRenderTextScale) private var textScale

    var body: some View {
        let path = context.binding("checked")
        let isOn = Binding<Bool>(
            get: {
                if let path { return context.stateValue(at: path)?.boolValue ?? false }
                return local.value ?? context.props.bool("checked") ?? false
            },
            set: { newValue in
                if let path {
                    context.setState(at: path, to: .bool(newValue))
                } else {
                    local.value = newValue
                }
                Task { await context.emit("change") }
            }
        )

        if isAccessory {
            Toggle(context.props.string("label") ?? "", isOn: isOn)
                .toggleStyle(.switch)
                .labelsHidden()
                .controlSize(CatalogTheme.controlSize(scale: textScale, compact: true))
        } else {
            switchRow(isOn: isOn)
        }
    }

    private func switchRow(isOn: Binding<Bool>) -> some View {
        HStack(alignment: .center, spacing: 12) {
            VStack(alignment: .leading, spacing: 1) {
                Text(context.props.string("label") ?? "")
                    .catalogFont(.body)
                if let description = context.props.string("description"), !description.isEmpty {
                    Text(description)
                        .catalogFont(.caption)
                        .foregroundStyle(.secondary)
                }
            }
            Spacer(minLength: 8)
            Toggle("", isOn: isOn)
                .toggleStyle(.switch)
                .labelsHidden()
                .controlSize(CatalogTheme.controlSize(scale: textScale, compact: true))
        }
    }
}
#endif
