#if canImport(SwiftUI) && os(macOS)
import JSONRenderCatalog
import JSONRenderCore
import JSONRenderSwiftUI
import SwiftUI

struct MacLiquidGlassShowcaseApp: App {
    @NSApplicationDelegateAdaptor(DemoAppDelegate.self) private var delegate

    var body: some Scene {
        WindowGroup("Trail Planner") {
            LiquidGlassShowcase()
        }
        .windowToolbarStyle(.unified)
        .defaultSize(width: 1100, height: 760)
    }
}

struct LiquidGlassShowcase: View {
    private enum Section: String, CaseIterable {
        case overview, settings

        var title: String { self == .overview ? "Overview" : "Controls" }
        var icon: String { self == .overview ? "map" : "slider.horizontal.3" }
    }

    private enum MapLayer {
        case terrain, satellite
    }

    @State private var mapLayer = MapLayer.terrain
    @State private var section: Section? = .overview
    @State private var appearance: NativeCatalogAppearance = .liquidGlass
    @State private var search = ""
    @State private var mapExpanded = false
    @State private var mapScale = 1.0

    private static let spec: Spec? = {
        guard let url = Bundle.module.url(
            forResource: "liquid-glass-showcase", withExtension: "json", subdirectory: "Resources"
        ), let source = try? String(contentsOf: url, encoding: .utf8) else {
            return nil
        }
        return Spec.decodePartial(source)
    }()

    var body: some View {
        NavigationSplitView {
            List(Section.allCases, id: \.self, selection: $section) { section in
                Label(section.title, systemImage: section.icon)
                    .tag(section)
            }
            .listStyle(.sidebar)
            .navigationSplitViewColumnWidth(min: 160, ideal: 190, max: 260)
        } detail: {
            scrollContent
                .navigationTitle(section?.title ?? "Trail Planner")
                .toolbar {
                    ToolbarItem(placement: .principal) {
                        Picker("Map layer", selection: $mapLayer) {
                            Text("Terrain").tag(MapLayer.terrain)
                            Text("Satellite").tag(MapLayer.satellite)
                        }
                        .pickerStyle(.segmented)
                        .help("Map layer")
                    }

                    ToolbarItem(placement: .primaryAction) {
                        Button {
                            withAnimation(.spring(response: 0.35, dampingFraction: 0.86)) { mapExpanded.toggle() }
                        } label: {
                            Label("Map tools", systemImage: "map")
                        }
                    }

                    #if compiler(>=6.2)
                    if #available(macOS 26, *) {
                        ToolbarSpacer(.fixed, placement: .primaryAction)
                    }
                    #endif

                    ToolbarItem(placement: .primaryAction) {
                        Menu {
                            Picker("Catalog appearance", selection: $appearance) {
                                Text("Liquid Glass").tag(NativeCatalogAppearance.liquidGlass)
                                Text("Standard").tag(NativeCatalogAppearance.standard)
                            }
                        } label: {
                            Label("Appearance", systemImage: "circle.lefthalf.filled")
                        }
                    }
                }
        }
        .searchable(text: $search, prompt: "Find a trail")
    }

    private var activeSpec: Spec? {
        guard var spec = Self.spec else { return nil }
        spec.elements[spec.root]?.children = ["hero", (section ?? .overview).rawValue, "sheet"]
        return spec
    }

    private var registry: RendererRegistry<AnyView> {
        NativeCatalog.registry(actions: [
            "selectSection": { params in
                guard let value = params["section"]?.stringValue, let next = Section(rawValue: value) else { return }
                await MainActor.run { section = next }
            },
        ], animatesAppearance: false)
    }

    @ViewBuilder
    private var scrollContent: some View {
        let content = ScrollView {
            if !search.isEmpty && !"Juniper Ridge".localizedCaseInsensitiveContains(search) {
                Label("No matching trails", systemImage: "magnifyingglass")
                    .foregroundStyle(.secondary)
                    .padding(32)
            } else if let spec = activeSpec {
                JSONRenderView(spec: spec, registry: registry)
                    .jsonRenderCatalogAppearance(appearance)
                    .jsonRenderTextScale(1.12)
                    .padding(.horizontal, 32)
                    .padding(.vertical, 28)
                    .background(alignment: .top) { terrainBackground }
            } else {
                Text("The showcase spec could not be loaded.")
                    .padding()
            }
        }

        #if compiler(>=6.2)
        if #available(macOS 26, *) {
            content.safeAreaBar(edge: .bottom, alignment: .trailing, spacing: 0) {
                Group {
                    if appearance == .liquidGlass {
                        floatingTools
                    } else {
                        standardMapTools
                    }
                }
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
        HStack(spacing: 10) {
            if mapExpanded {
                Group {
                    Button("Zoom out", systemImage: "minus") { zoom(by: -0.2) }
                    Button("Zoom in", systemImage: "plus") { zoom(by: 0.2) }
                    Button("Reset zoom", systemImage: "location") { mapScale = 1 }
                }
                .buttonStyle(.glass)
                .buttonBorderShape(.circle)
            }
            Button(
                mapExpanded ? "Collapse map tools" : "Expand map tools",
                systemImage: mapExpanded ? "xmark" : "map"
            ) {
                withAnimation(.spring(response: 0.35, dampingFraction: 0.86)) { mapExpanded.toggle() }
            }
            .buttonStyle(.glassProminent)
            .buttonBorderShape(.circle)
        }
        .labelStyle(.iconOnly)
        .controlSize(.large)
    }
    #endif

    private func zoom(by amount: Double) {
        mapScale = min(max(mapScale + amount, 0.8), 2.2)
    }

    @ViewBuilder
    private var terrainBackground: some View {
        #if compiler(>=6.2)
        if #available(macOS 26, *) {
            terrain.backgroundExtensionEffect()
        } else {
            terrain
        }
        #else
        terrain
        #endif
    }

    private var terrain: some View {
        let base = mapLayer == .terrain
            ? Color(red: 0.09, green: 0.28, blue: 0.27)
            : Color(red: 0.16, green: 0.23, blue: 0.37)
        return LinearGradient(
            colors: [base, .clear],
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
                    context.stroke(contour, with: .color((mapLayer == .terrain ? Color.mint : Color.cyan).opacity(0.30)), lineWidth: 1)
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
