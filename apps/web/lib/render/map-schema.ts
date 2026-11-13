import { z } from "zod";

/**
 * Zod schemas for the playground Map component.
 *
 * Shared by the catalog (prompt + validation) and the component, which
 * re-validates each overlay so half-streamed props are skipped instead of
 * sent to Mapbox.
 */

export const lngLatSchema = z.object({
  lng: z.number().min(-180).max(180),
  lat: z.number().min(-90).max(90),
});

export const mapProfileSchema = z.enum(["driving", "walking", "cycling"]);

export const mapMarkerSchema = z.object({
  position: lngLatSchema,
  label: z.string().nullable(),
  popup: z.string().nullable(),
  color: z.string().nullable(),
});

export const mapLayerSchema = z.object({
  kind: z.enum(["circle", "line", "fill"]),
  data: z.object({
    type: z.literal("FeatureCollection"),
    features: z.array(z.any()),
  }),
  color: z.string().nullable(),
  opacity: z.number().min(0).max(1).nullable(),
});

export const mapRouteSchema = z.object({
  waypoints: z.array(lngLatSchema).min(2).max(10),
  profile: mapProfileSchema.nullable(),
  color: z.string().nullable(),
});

export const mapIsochroneSchema = z.object({
  origin: lngLatSchema,
  minutes: z.array(z.number().int().min(1).max(60)).min(1).max(4),
  profile: mapProfileSchema.nullable(),
});

export const mapPropsSchema = z.object({
  style: z.enum(["standard", "satellite"]).nullable(),
  center: lngLatSchema,
  zoom: z.number().min(0).max(22),
  pitch: z.number().min(0).max(85).nullable(),
  bearing: z.number().min(-360).max(360).nullable(),
  height: z.enum(["sm", "md", "lg"]).nullable(),
  fitToContent: z.boolean().nullable(),
  markers: z.array(mapMarkerSchema).nullable(),
  layers: z.array(mapLayerSchema).nullable(),
  route: mapRouteSchema.nullable(),
  isochrone: mapIsochroneSchema.nullable(),
});

export type LngLat = z.infer<typeof lngLatSchema>;
export type MapMarker = z.infer<typeof mapMarkerSchema>;
export type MapLayer = z.infer<typeof mapLayerSchema>;
export type MapRoute = z.infer<typeof mapRouteSchema>;
export type MapIsochrone = z.infer<typeof mapIsochroneSchema>;
export type MapProps = z.infer<typeof mapPropsSchema>;
