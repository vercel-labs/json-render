"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type * as MapboxGL from "mapbox-gl";
import type { z } from "zod";
import type { FeatureCollection, Geometry } from "geojson";
import "mapbox-gl/dist/mapbox-gl.css";

import { cn } from "@/lib/utils";
import {
  lngLatSchema,
  mapIsochroneSchema,
  mapLayerSchema,
  mapMarkerSchema,
  mapRouteSchema,
  type LngLat,
  type MapIsochrone,
  type MapLayer,
  type MapMarker,
  type MapRoute,
} from "@/lib/render/map-schema";

type Mapbox = typeof MapboxGL.default;

const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

const STYLE_URLS = {
  standard: "mapbox://styles/mapbox/standard",
  satellite: "mapbox://styles/mapbox/standard-satellite",
} as const;

// Mapbox Standard renders with its night light preset.
// Overlays use emissive-strength 1 so the night lighting does not dim them.
const STANDARD_CONFIG = { basemap: { lightPreset: "night" } };

const HEIGHTS = { sm: "h-56", md: "h-80", lg: "h-[28rem]" } as const;

const ROUTE_COLOR = "#3b82f6";
const ISOCHRONE_COLORS = ["#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b"];
const LAYER_COLOR = "#0ea5e9";

// Models often omit nullable props instead of sending null, so the component
// accepts missing optional fields that the catalog schema requires.
const markerInput = mapMarkerSchema.partial({
  label: true,
  popup: true,
  color: true,
});
const layerInput = mapLayerSchema.partial({ color: true, opacity: true });
const routeInput = mapRouteSchema.partial({ profile: true, color: true });
const isochroneInput = mapIsochroneSchema.partial({ profile: true });

type MarkerInput = z.infer<typeof markerInput>;
type LayerInput = z.infer<typeof layerInput>;

const EMPTY_FC: FeatureCollection = { type: "FeatureCollection", features: [] };

export interface MapboxMapProps {
  style?: keyof typeof STYLE_URLS | null;
  center?: LngLat | null;
  zoom?: number | null;
  pitch?: number | null;
  bearing?: number | null;
  height?: keyof typeof HEIGHTS | null;
  fitToContent?: boolean | null;
  markers?: MapMarker[] | null;
  layers?: MapLayer[] | null;
  route?: MapRoute | null;
  isochrone?: MapIsochrone | null;
  onMarkerPress?: (index: number) => void;
}

// ── Mapbox API fetching ──────────────────────────────────────────────────

// Specs stream in and re-render often; cache by URL so each request is made once.
const responseCache = new Map<string, Promise<unknown>>();

function fetchCached<T>(url: string): Promise<T> {
  let pending = responseCache.get(url);
  if (!pending) {
    pending = fetch(url).then((res) => {
      if (!res.ok) throw new Error(`Mapbox API ${res.status}`);
      return res.json();
    });
    pending.catch(() => responseCache.delete(url));
    responseCache.set(url, pending);
  }
  return pending as Promise<T>;
}

/** Debounced, cached JSON fetch. Pass null to skip. */
function useMapboxJson<T>(url: string | null, delay = 300): T | null {
  const [result, setResult] = useState<{ url: string; data: T } | null>(null);

  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      fetchCached<T>(url)
        .then((data) => {
          if (!cancelled) setResult({ url, data });
        })
        .catch(() => {});
    }, delay);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [url, delay]);

  return url && result?.url === url ? result.data : null;
}

function coordString(points: LngLat[]): string {
  return points.map((p) => `${p.lng.toFixed(5)},${p.lat.toFixed(5)}`).join(";");
}

interface DirectionsResponse {
  routes?: { geometry: Geometry; distance: number; duration: number }[];
}

// ── Geometry helpers ─────────────────────────────────────────────────────

type Bounds = [number, number, number, number];

function extendBounds(bounds: Bounds | null, coords: unknown): Bounds | null {
  if (!Array.isArray(coords)) return bounds;
  if (typeof coords[0] === "number" && typeof coords[1] === "number") {
    const [lng, lat] = coords as [number, number];
    if (!bounds) return [lng, lat, lng, lat];
    return [
      Math.min(bounds[0], lng),
      Math.min(bounds[1], lat),
      Math.max(bounds[2], lng),
      Math.max(bounds[3], lat),
    ];
  }
  return coords.reduce<Bounds | null>((b, c) => extendBounds(b, c), bounds);
}

function geometryCoords(fc: FeatureCollection): unknown[] {
  return fc.features.map((f) =>
    f.geometry && "coordinates" in f.geometry ? f.geometry.coordinates : null,
  );
}

function formatDistance(meters: number): string {
  const imperial =
    typeof navigator !== "undefined" && navigator.language === "en-US";
  return imperial
    ? `${(meters / 1609.344).toFixed(1)} mi`
    : `${(meters / 1000).toFixed(1)} km`;
}

function formatDuration(seconds: number): string {
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)} h ${minutes % 60} min`;
}

function popupContent(marker: MarkerInput): HTMLElement | null {
  if (!marker.label && !marker.popup) return null;
  const el = document.createElement("div");
  el.className = "text-xs text-neutral-900";
  if (marker.label) {
    const title = document.createElement("div");
    title.className = "font-semibold";
    title.textContent = marker.label;
    el.appendChild(title);
  }
  if (marker.popup) {
    const body = document.createElement("div");
    body.textContent = marker.popup;
    el.appendChild(body);
  }
  return el;
}

// ── Style layer sync ─────────────────────────────────────────────────────

function setGeoJSON(
  map: MapboxGL.Map,
  id: string,
  data: FeatureCollection,
  layers: MapboxGL.LayerSpecification[],
) {
  const source = map.getSource(id) as MapboxGL.GeoJSONSource | undefined;
  if (source) {
    source.setData(data);
  } else {
    map.addSource(id, { type: "geojson", data });
  }
  for (const layer of layers) {
    if (!map.getLayer(layer.id)) map.addLayer(layer);
  }
}

function removeGeoJSON(map: MapboxGL.Map, id: string, layerIds: string[]) {
  for (const layerId of layerIds) {
    if (map.getLayer(layerId)) map.removeLayer(layerId);
  }
  if (map.getSource(id)) map.removeSource(id);
}

function overlayLayers(
  id: string,
  layer: LayerInput,
): MapboxGL.LayerSpecification[] {
  const color = layer.color ?? LAYER_COLOR;
  if (layer.kind === "circle") {
    return [
      {
        id,
        type: "circle",
        source: id,
        paint: {
          "circle-emissive-strength": 1,
          "circle-color": color,
          "circle-radius": 6,
          "circle-opacity": layer.opacity ?? 0.9,
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 1.5,
        },
      },
    ];
  }
  if (layer.kind === "line") {
    return [
      {
        id,
        type: "line",
        source: id,
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-emissive-strength": 1,
          "line-color": color,
          "line-width": 3,
          "line-opacity": layer.opacity ?? 0.9,
        },
      },
    ];
  }
  return [
    {
      id,
      type: "fill",
      source: id,
      paint: {
        "fill-emissive-strength": 1,
        "fill-color": color,
        "fill-opacity": layer.opacity ?? 0.35,
      },
    },
    {
      id: `${id}-outline`,
      type: "line",
      source: id,
      paint: {
        "line-emissive-strength": 1,
        "line-color": color,
        "line-width": 1.5,
      },
    },
  ];
}

// ── Component ────────────────────────────────────────────────────────────

export function MapboxMap(props: MapboxMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapboxGL.Map | null>(null);
  const mapboxRef = useRef<Mapbox | null>(null);
  const markersRef = useRef<MapboxGL.Marker[]>([]);
  const layerIdsRef = useRef<Map<string, string[]>>(new Map());
  const onMarkerPressRef = useRef(props.onMarkerPress);
  onMarkerPressRef.current = props.onMarkerPress;

  const appliedStyleRef = useRef<string | null>(null);

  // Bumped on map load and on every style change so overlays get re-added.
  const [styleVersion, setStyleVersion] = useState(0);

  // Validate each piece separately so a half-streamed spec still renders
  // whatever is already complete.
  const center = lngLatSchema.safeParse(props.center).data ?? null;
  const zoom = typeof props.zoom === "number" ? props.zoom : null;
  const styleUrl = STYLE_URLS[props.style ?? "standard"] ?? STYLE_URLS.standard;

  const markersKey = JSON.stringify(props.markers ?? []);
  const markers = useMemo(
    () =>
      (JSON.parse(markersKey) as unknown[]).flatMap((m) => {
        const parsed = markerInput.safeParse(m);
        return parsed.success ? [parsed.data] : [];
      }),
    [markersKey],
  );

  const layersKey = JSON.stringify(props.layers ?? []);
  const layers = useMemo(
    () =>
      (JSON.parse(layersKey) as unknown[]).flatMap((l) => {
        const parsed = layerInput.safeParse(l);
        return parsed.success ? [parsed.data] : [];
      }),
    [layersKey],
  );

  const route = routeInput.safeParse(props.route).data ?? null;
  const routeUrl =
    route && TOKEN
      ? `https://api.mapbox.com/directions/v5/mapbox/${route.profile ?? "driving"}/${coordString(route.waypoints)}?geometries=geojson&overview=full&access_token=${TOKEN}`
      : null;
  const directions = useMapboxJson<DirectionsResponse>(routeUrl);
  const routeResult = directions?.routes?.[0] ?? null;
  const routeColor = route?.color ?? ROUTE_COLOR;

  const isochrone = isochroneInput.safeParse(props.isochrone).data ?? null;
  const sortedMinutes = isochrone
    ? [...new Set(isochrone.minutes)].sort((a, b) => a - b)
    : [];
  const isochroneUrl =
    isochrone && TOKEN
      ? `https://api.mapbox.com/isochrone/v1/mapbox/${isochrone.profile ?? "walking"}/${coordString([isochrone.origin])}?contours_minutes=${sortedMinutes.join(",")}&polygons=true&access_token=${TOKEN}`
      : null;
  const isochroneData = useMapboxJson<FeatureCollection>(isochroneUrl);

  // ── Create the map once a valid center has streamed in ──
  const canCreate = center !== null;
  useEffect(() => {
    if (!TOKEN || !canCreate || !containerRef.current || mapRef.current) return;
    let cancelled = false;

    import("mapbox-gl").then(({ default: mapboxgl }) => {
      if (cancelled || !containerRef.current) return;
      mapboxgl.accessToken = TOKEN;
      mapboxRef.current = mapboxgl;
      appliedStyleRef.current = styleUrl;
      const map = new mapboxgl.Map({
        container: containerRef.current,
        style: styleUrl,
        center: center ? [center.lng, center.lat] : [0, 20],
        zoom: zoom ?? 12,
        pitch: props.pitch ?? 0,
        bearing: props.bearing ?? 0,
        attributionControl: true,
        config: styleUrl === STYLE_URLS.standard ? STANDARD_CONFIG : undefined,
      });
      map.addControl(
        new mapboxgl.NavigationControl({ showCompass: false }),
        "top-right",
      );
      map.on("style.load", () => {
        if (appliedStyleRef.current === STYLE_URLS.standard) {
          map.setConfigProperty("basemap", "lightPreset", "night");
        }
        layerIdsRef.current.clear();
        setStyleVersion((v) => v + 1);
      });
      mapRef.current = map;
    });

    return () => {
      cancelled = true;
    };
    // Initial camera/style only; later changes are applied below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canCreate]);

  // Tear down on unmount.
  useEffect(() => {
    return () => {
      for (const marker of markersRef.current) marker.remove();
      markersRef.current = [];
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  // Keep the map sized to its container (the demo pane resizes).
  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => mapRef.current?.resize());
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // ── Style ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map || appliedStyleRef.current === styleUrl) return;
    appliedStyleRef.current = styleUrl;
    map.setStyle(styleUrl);
  }, [styleUrl, styleVersion]);

  // ── Markers ──
  useEffect(() => {
    const map = mapRef.current;
    const mapboxgl = mapboxRef.current;
    if (!map || !mapboxgl) return;

    for (const marker of markersRef.current) marker.remove();
    markersRef.current = markers.map((m, index) => {
      const marker = new mapboxgl.Marker({ color: m.color ?? undefined })
        .setLngLat([m.position.lng, m.position.lat])
        .addTo(map);
      const content = popupContent(m);
      if (content) {
        marker.setPopup(
          new mapboxgl.Popup({ offset: 24, closeButton: false }).setDOMContent(
            content,
          ),
        );
      }
      const el = marker.getElement();
      el.style.cursor = "pointer";
      if (m.label) el.setAttribute("aria-label", m.label);
      el.addEventListener("click", () => onMarkerPressRef.current?.(index));
      return marker;
    });
  }, [markers, styleVersion]);

  // ── GeoJSON overlays (layers, route, isochrone) ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map || styleVersion === 0) return;

    const wanted = new Map<string, MapboxGL.LayerSpecification[]>();
    const data = new Map<string, FeatureCollection>();

    // Isochrone first so the route and custom layers draw above it.
    if (isochroneData) {
      const id = "jr-isochrone";
      const colored: FeatureCollection = {
        type: "FeatureCollection",
        features: isochroneData.features.map((f) => {
          const index = sortedMinutes.indexOf(
            Number(f.properties?.contour ?? 0),
          );
          return {
            ...f,
            properties: {
              ...f.properties,
              color: ISOCHRONE_COLORS[Math.max(index, 0) % 4],
            },
          };
        }),
      };
      data.set(id, colored);
      wanted.set(id, [
        {
          id,
          type: "fill",
          source: id,
          paint: {
            "fill-emissive-strength": 1,
            "fill-color": ["get", "color"],
            "fill-opacity": 0.2,
          },
        },
        {
          id: `${id}-outline`,
          type: "line",
          source: id,
          paint: {
            "line-emissive-strength": 1,
            "line-color": ["get", "color"],
            "line-width": 1.5,
          },
        },
      ]);
    }

    layers.forEach((layer, i) => {
      const id = `jr-layer-${i}`;
      data.set(id, layer.data as FeatureCollection);
      wanted.set(id, overlayLayers(id, layer));
    });

    if (routeResult) {
      const id = "jr-route";
      data.set(id, {
        type: "FeatureCollection",
        features: [
          { type: "Feature", properties: {}, geometry: routeResult.geometry },
        ],
      });
      wanted.set(id, [
        {
          id: `${id}-casing`,
          type: "line",
          source: id,
          layout: { "line-join": "round", "line-cap": "round" },
          paint: {
            "line-emissive-strength": 1,
            "line-color": "#ffffff",
            "line-width": 7,
          },
        },
        {
          id,
          type: "line",
          source: id,
          layout: { "line-join": "round", "line-cap": "round" },
          paint: {
            "line-emissive-strength": 1,
            "line-color": routeColor,
            "line-width": 4,
          },
        },
      ]);
    }

    for (const [id, layerIds] of layerIdsRef.current) {
      const next = wanted.get(id);
      const same =
        next &&
        next.length === layerIds.length &&
        next.every((l, i) => l.id === layerIds[i]);
      if (!same) {
        removeGeoJSON(map, id, layerIds);
        layerIdsRef.current.delete(id);
      }
    }
    for (const [id, specs] of wanted) {
      setGeoJSON(map, id, data.get(id) ?? EMPTY_FC, specs);
      // Paint (e.g. color) may have changed while the layer ids stayed the same.
      for (const spec of specs) {
        for (const [prop, value] of Object.entries(spec.paint ?? {})) {
          map.setPaintProperty(spec.id, prop as never, value as never);
        }
      }
      layerIdsRef.current.set(
        id,
        specs.map((s) => s.id),
      );
    }
    // sortedMinutes is derived from isochroneData's request URL.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [styleVersion, layers, routeResult, routeColor, isochroneData]);

  // ── Camera ──
  const fitBounds = useMemo(() => {
    if (!props.fitToContent) return null;
    let bounds: Bounds | null = null;
    for (const m of markers) {
      bounds = extendBounds(bounds, [m.position.lng, m.position.lat]);
    }
    for (const layer of layers) {
      bounds = extendBounds(
        bounds,
        geometryCoords(layer.data as FeatureCollection),
      );
    }
    if (routeResult && "coordinates" in routeResult.geometry) {
      bounds = extendBounds(bounds, routeResult.geometry.coordinates);
    } else if (route) {
      bounds = extendBounds(
        bounds,
        route.waypoints.map((w) => [w.lng, w.lat]),
      );
    }
    if (isochroneData) {
      bounds = extendBounds(bounds, geometryCoords(isochroneData));
    } else if (isochrone) {
      bounds = extendBounds(bounds, [
        isochrone.origin.lng,
        isochrone.origin.lat,
      ]);
    }
    return bounds;
  }, [
    props.fitToContent,
    markers,
    layers,
    route,
    routeResult,
    isochrone,
    isochroneData,
  ]);
  const fitKey = fitBounds ? fitBounds.map((n) => n.toFixed(5)).join(",") : "";

  const cameraKey = JSON.stringify([
    center,
    zoom,
    props.pitch ?? 0,
    props.bearing ?? 0,
  ]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || styleVersion === 0) return;

    // Debounce so streaming markers produce one smooth move, not many.
    const timer = setTimeout(() => {
      const pitch = props.pitch ?? 0;
      const bearing = props.bearing ?? 0;
      if (fitBounds) {
        const [w, s, e, n] = fitBounds;
        if (w === e && s === n) {
          map.easeTo({ center: [w, s], zoom: zoom ?? 14, pitch, bearing });
        } else {
          map.fitBounds(
            [
              [w, s],
              [e, n],
            ],
            { padding: 48, maxZoom: 16, pitch, bearing },
          );
        }
      } else if (center) {
        map.easeTo({
          center: [center.lng, center.lat],
          zoom: zoom ?? map.getZoom(),
          pitch,
          bearing,
        });
      }
    }, 400);
    return () => clearTimeout(timer);
    // Keys capture the values that matter; avoid refiring on identity changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitKey, cameraKey, styleVersion === 0]);

  const heightClass = HEIGHTS[props.height ?? "md"] ?? HEIGHTS.md;

  if (!TOKEN) {
    return (
      <div
        className={cn(
          "w-full rounded-lg border border-dashed flex items-center justify-center p-4 text-center text-sm text-muted-foreground",
          heightClass,
        )}
      >
        Map unavailable: set NEXT_PUBLIC_MAPBOX_TOKEN to render Mapbox maps.
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden rounded-lg border bg-muted",
        heightClass,
      )}
    >
      <div ref={containerRef} className="h-full w-full" />
      {routeResult && (
        <div className="absolute left-2 top-2 rounded-md bg-background/90 px-2 py-1 text-xs font-medium shadow-sm">
          {formatDistance(routeResult.distance)} ·{" "}
          {formatDuration(routeResult.duration)}
        </div>
      )}
    </div>
  );
}
