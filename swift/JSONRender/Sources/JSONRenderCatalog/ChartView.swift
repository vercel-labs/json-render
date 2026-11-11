#if canImport(SwiftUI)
import SwiftUI
import JSONRenderCore
#if canImport(Charts)
import Charts
#endif

/// A bar or line chart over an array of objects, keyed by `xKey` and `yKey`.
struct ChartView: View {
    enum Kind { case bar, line }

    struct Point: Identifiable {
        let id: Int
        let label: String
        let value: Double
    }

    let kind: Kind
    let props: [String: JSONValue]
    @Environment(\.jsonRenderTextScale) private var textScale
    @Environment(\.colorScheme) private var colorScheme

    var body: some View {
        let height = CGFloat(props.number("height") ?? 180)
        let tint = CatalogTheme.tint(props.string("tint"))
        let points = points()

        VStack(alignment: .leading, spacing: 10) {
            if let title = props.string("title"), !title.isEmpty {
                Text(title)
                    .catalogFont(.subheadline, weight: .semibold)
                    .foregroundStyle(.secondary)
            }
            Group {
                if points.isEmpty {
                    ChartPlaceholder(kind: kind)
                } else {
                    chart(points: points, tint: tint)
                }
            }
            .frame(height: height)
            .animation(.easeInOut(duration: 0.3), value: points.isEmpty)
        }
    }

    @ViewBuilder
    private func chart(points: [Point], tint: Color) -> some View {
        #if canImport(Charts)
        Chart(points) { point in
            switch kind {
            case .bar:
                BarMark(
                    x: .value("Label", point.label),
                    y: .value("Value", point.value),
                    width: .ratio(points.count <= 4 ? 0.45 : 0.6)
                )
                .foregroundStyle(tint.gradient)
                .cornerRadius(5)
            case .line:
                AreaMark(
                    x: .value("Label", point.label),
                    y: .value("Value", point.value)
                )
                .interpolationMethod(.catmullRom)
                .foregroundStyle(
                    LinearGradient(
                        // A stronger top stop in dark mode keeps the fill
                        // saturated instead of graying out over a dark card.
                        colors: colorScheme == .dark
                            ? [tint.opacity(0.42), tint.opacity(0.14), tint.opacity(0)]
                            : [tint.opacity(0.28), tint.opacity(0.08), tint.opacity(0)],
                        startPoint: .top,
                        endPoint: .bottom
                    )
                )
                LineMark(
                    x: .value("Label", point.label),
                    y: .value("Value", point.value)
                )
                .interpolationMethod(.catmullRom)
                .foregroundStyle(tint)
                .lineStyle(StrokeStyle(lineWidth: 2.5, lineCap: .round, lineJoin: .round))
            }
        }
        .chartYAxis {
            AxisMarks(position: .leading, values: .automatic(desiredCount: 4)) { _ in
                AxisGridLine(stroke: StrokeStyle(lineWidth: 0.5, dash: [3, 3]))
                    .foregroundStyle(Color.primary.opacity(0.12))
                AxisValueLabel()
                    .font(.system(size: CatalogFont.size(.caption2) * textScale))
                    .foregroundStyle(Color.secondary)
            }
        }
        .chartXAxis {
            AxisMarks { value in
                AxisValueLabel(centered: kind == .bar) {
                    Text(axisLabel(value.as(String.self) ?? "", count: points.count))
                        .multilineTextAlignment(.center)
                }
                .font(.system(size: CatalogFont.size(.caption2) * textScale))
                .foregroundStyle(Color.secondary)
            }
        }
        .animation(.spring(response: 0.5, dampingFraction: 0.85), value: points.map(\.value))
        #else
        Text("Charts are not available on this platform.")
            .catalogFont(.caption)
            .foregroundStyle(.secondary)
        #endif
    }

    /// Breaks multi-word category labels onto two lines when there are enough
    /// bars that single-line labels would run into each other.
    private func axisLabel(_ label: String, count: Int) -> String {
        guard count >= 4, label.count > 6, let space = label.firstIndex(of: " ") else { return label }
        return label.replacingCharacters(in: space...space, with: "\n")
    }

    func points() -> [Point] {
        let xKey = props.string("xKey") ?? "x"
        let yKey = props.string("yKey") ?? "y"
        let rows = props["data"]?.arrayValue ?? []
        return rows.enumerated().compactMap { index, row in
            guard let object = row.objectValue else { return nil }
            let label = object[xKey]?.displayString ?? "\(index + 1)"
            let value = object[yKey]?.doubleValue
                ?? object[yKey]?.stringValue.flatMap { Double($0.filter { "0123456789.-".contains($0) }) }
            guard let value else { return nil }
            return Point(id: index, label: label, value: value)
        }
    }
}
/// Faint bars shown while a chart's data has not streamed in yet.
struct ChartPlaceholder: View {
    let kind: ChartView.Kind
    private let heights: [CGFloat] = [0.45, 0.7, 0.55, 0.85, 0.6, 0.75]

    var body: some View {
        GeometryReader { proxy in
            HStack(alignment: .bottom, spacing: proxy.size.width * 0.06) {
                ForEach(heights.indices, id: \.self) { index in
                    RoundedRectangle(cornerRadius: 4, style: .continuous)
                        .fill(Color.primary.opacity(0.06))
                        .frame(height: proxy.size.height * heights[index])
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottom)
        }
        .padding(.leading, 28)
        .padding(.bottom, 18)
    }
}
#endif
