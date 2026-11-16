#if canImport(SwiftUI) && os(macOS)
import JSONRenderCatalog
import JSONRenderCore
import JSONRenderSwiftUI
import SwiftUI

struct LiquidGlassShowcase: View {
    @State private var appearance: NativeCatalogAppearance = .liquidGlass
    @State private var search = ""
    @State private var mapExpanded = false
    @State private var mapScale = 1.0
    @Namespace private var mapTools

    private static let spec: Spec? = {
        guard let url = Bundle.module.url(
            forResource: "liquid-glass-showcase", withExtension: "json", subdirectory: "Resources"
        ), let source = try? String(contentsOf: url, encoding: .utf8) else {
            return nil
        }
        return Spec.decodePartial(source)
    }()

    var body: some View {
        NavigationStack {
            scrollContent
                .navigationTitle("Trail Planner")
                .searchable(text: $search, prompt: "Find a trail")
                .toolbar {
                    ToolbarItemGroup(placement: .primaryAction) {
                        Menu {
                            Picker("Catalog appearance", selection: $appearance) {
                                Text("Liquid Glass").tag(NativeCatalogAppearance.liquidGlass)
                                Text("Standard").tag(NativeCatalogAppearance.standard)
                            }
                        } label: {
                            Label("Appearance", systemImage: "circle.lefthalf.filled")
                        }
                        Button {
                            withAnimation(.spring(response: 0.35, dampingFraction: 0.86)) { mapExpanded.toggle() }
                        } label: {
                            Label("Map tools", systemImage: "map")
                        }
                    }
                }
        }
        .preferredColorScheme(.dark)
    }

    @ViewBuilder
    private var scrollContent: some View {
        let content = ScrollView {
            if !search.isEmpty && !"Juniper Ridge".localizedCaseInsensitiveContains(search) {
                Label("No matching trails", systemImage: "magnifyingglass")
                    .foregroundStyle(.secondary)
                    .padding(32)
            } else if let spec = Self.spec {
                JSONRenderView(spec: spec, registry: NativeCatalog.registry(animatesAppearance: false))
                    .jsonRenderCatalogAppearance(appearance)
                    .jsonRenderTextScale(1.12)
                    .padding(.horizontal, 32)
                    .padding(.vertical, 28)
                    .background(alignment: .top) { terrain }
            } else {
                Text("The showcase spec could not be loaded.")
                    .padding()
            }
        }

        #if compiler(>=6.2)
        if #available(macOS 26, *) {
            content.safeAreaBar(edge: .bottom, alignment: .trailing, spacing: 0) {
                floatingTools
                    .padding(.trailing, 30)
                    .padding(.bottom, 14)
            }
        } else {
            content.safeAreaInset(edge: .bottom, alignment: .trailing) {
                standardMapTools.padding(18)
            }
        }
        #else
        content.safeAreaInset(edge: .bottom, alignment: .trailing) {
            standardMapTools.padding(18)
        }
        #endif
    }

    private var standardMapTools: some View {
        HStack(spacing: 12) {
            Button("Zoom out", systemImage: "minus") { zoom(by: -0.2) }
            Button("Zoom in", systemImage: "plus") { zoom(by: 0.2) }
        }
    }

    #if compiler(>=6.2)
    @available(macOS 26, *)
    private var floatingTools: some View {
        GlassEffectContainer(spacing: 12) {
            HStack(spacing: 10) {
                if mapExpanded {
                    mapTool("Zoom out", symbol: "minus") { zoom(by: -0.2) }
                    mapTool("Zoom in", symbol: "plus") { zoom(by: 0.2) }
                    mapTool("Reset zoom", symbol: "location") { mapScale = 1 }
                }
                mapTool(
                    mapExpanded ? "Collapse map tools" : "Expand map tools",
                    symbol: mapExpanded ? "xmark" : "map",
                    prominent: true
                ) {
                    withAnimation(.spring(response: 0.35, dampingFraction: 0.86)) { mapExpanded.toggle() }
                }
            }
        }
    }

    @available(macOS 26, *)
    private func mapTool(
        _ label: String,
        symbol: String,
        prominent: Bool = false,
        action: @escaping () -> Void
    ) -> some View {
        Button(action: action) {
            Image(systemName: symbol)
                .font(.system(size: 16, weight: .semibold))
                .frame(width: 44, height: 44)
                .contentShape(Circle())
        }
        .buttonStyle(.plain)
        .background(appearance == .standard ? Color.gray.opacity(0.22) : .clear, in: Circle())
        .glassEffect(
            appearance == .liquidGlass ? .regular.tint(prominent ? .mint.opacity(0.30) : nil).interactive() : .identity,
            in: Circle()
        )
        .glassEffectID(prominent ? "map-tools" : symbol, in: mapTools)
        .accessibilityLabel(label)
        .help(label)
    }
    #endif

    private func zoom(by amount: Double) {
        mapScale = min(max(mapScale + amount, 0.8), 2.2)
    }

    private var terrain: some View {
        LinearGradient(
            colors: [Color(red: 0.09, green: 0.28, blue: 0.27), .clear],
            startPoint: .top,
            endPoint: .bottom
        )
        .overlay {
            Canvas { context, size in
                for ring in 0..<21 {
                    var contour = Path()
                    let radius = (28 + Double(ring) * 15) * mapScale
                    for step in 0...120 {
                        let angle = Double(step) * .pi / 60
                        let wave = 1 + 0.18 * sin(3 * angle) + 0.09 * cos(5 * angle)
                        let point = CGPoint(
                            x: size.width * 0.67 + cos(angle) * radius * wave,
                            y: size.height * 0.31 + sin(angle) * radius * wave * 0.67
                        )
                        if step == 0 { contour.move(to: point) } else { contour.addLine(to: point) }
                    }
                    context.stroke(contour, with: .color(.mint.opacity(0.30)), lineWidth: 1)
                }
            }
            .mask(LinearGradient(colors: [.black, .clear], startPoint: .top, endPoint: .bottom))
        }
        .frame(height: 290)
        .clipped()
        .accessibilityHidden(true)
    }
}
#endif
