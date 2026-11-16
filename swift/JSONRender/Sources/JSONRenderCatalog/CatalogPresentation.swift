#if canImport(SwiftUI)
import JSONRenderCore
import SwiftUI

struct CatalogTabs: View {
    let context: ComponentRenderContext<AnyView>
    @State private var localSelection: String?

    var body: some View {
        let options = CatalogOption.parse(context.props["options"])
        let selection = catalogSelection(context, options: options, local: $localSelection)
        let height = context.props.number("height").map {
            CGFloat($0.clampedFinite(to: 80...960, fallback: 360))
        }
        if !options.isEmpty {
            TabView(selection: selection) {
                ForEach(options) { option in
                    VStack(alignment: .leading, spacing: 12) {
                        ForEach(Array((context.slots[option.value] ?? []).enumerated()), id: \.offset) { child in
                            child.element
                        }
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
                    .tabItem {
                        if let icon = option.icon {
                            Label(option.label, systemImage: icon)
                        } else {
                            Text(option.label)
                        }
                    }
                    .tag(option.value)
                }
            }
            .frame(height: height)
        }
    }
}

struct CatalogSheet: View {
    let context: ComponentRenderContext<AnyView>
    @State private var localPresentation: Bool?

    var body: some View {
        let path = context.binding("presented")
        let isPresented = Binding(
            get: {
                if let path { return context.stateValue(at: path)?.boolValue ?? false }
                return localPresentation ?? context.props.bool("presented") ?? false
            },
            set: { presented in
                if let path {
                    context.setState(at: path, to: .bool(presented))
                } else {
                    localPresentation = presented
                }
            }
        )

        Color.clear
            .frame(width: 0, height: 0)
            .accessibilityHidden(true)
            .sheet(isPresented: isPresented, onDismiss: {
                Task { await context.emit("dismiss") }
            }) {
                VStack(alignment: .leading, spacing: 14) {
                    if let title = context.props.string("title") {
                        Text(title).font(.headline)
                    }
                    ForEach(context.identifiedChildren) { child in
                        child.content
                    }
                }
                .padding(24)
                #if os(macOS)
                .frame(minWidth: 340)
                #endif
            }
    }
}

struct CatalogSlider: View {
    let context: ComponentRenderContext<AnyView>
    @State private var localValue: Double?

    var body: some View {
        let range = Self.range(
            minimum: context.props.number("min"),
            maximum: context.props.number("max")
        )
        let path = context.binding("value")
        let value = Binding(
            get: {
                let raw = path.map { context.stateValue(at: $0)?.doubleValue }
                    ?? (localValue ?? context.props.number("value"))
                return (raw ?? range.lowerBound).clampedFinite(to: range, fallback: range.lowerBound)
            },
            set: { newValue in
                if let path {
                    context.setState(at: path, to: .number(newValue))
                } else {
                    localValue = newValue
                }
                Task { await context.emit("change") }
            }
        )

        let label = context.props.string("label") ?? ""
        let width = range.upperBound - range.lowerBound
        Group {
            if let step = context.props.number("step"), step.isFinite, step > 0, step <= width {
                Slider(value: value, in: range, step: step) { Text(label) }
            } else {
                Slider(value: value, in: range) { Text(label) }
            }
        }
        .disabled(context.props.bool("disabled") ?? false)
        .tint(CatalogTheme.tint(context.props.string("tint")))
    }

    static func range(minimum: Double?, maximum: Double?) -> ClosedRange<Double> {
        let lower = minimum ?? 0
        let upper = maximum ?? 100
        guard lower < upper, (upper - lower).isFinite else { return 0...100 }
        return lower...upper
    }
}
#endif
