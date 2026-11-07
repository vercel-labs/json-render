// @vitest-environment node
import { describe, expect, it } from "vitest";
import { playgroundCatalog } from "./catalog";
import { mapPropsSchema } from "./map-schema";

const baseProps = {
  style: null,
  center: { lng: -122.4075, lat: 37.788 },
  zoom: 13,
  pitch: null,
  bearing: null,
  height: null,
  fitToContent: true,
  markers: [
    {
      position: { lng: -122.4075, lat: 37.788 },
      label: "Union Square",
      popup: "Shopping and cafes",
      color: null,
    },
  ],
  layers: null,
  route: {
    waypoints: [
      { lng: -122.4194, lat: 37.7749 },
      { lng: -120.0324, lat: 39.0968 },
    ],
    profile: "driving",
    color: null,
  },
  isochrone: {
    origin: { lng: -122.3937, lat: 37.7955 },
    minutes: [5, 15],
    profile: "walking",
  },
};

function mapSpec(props: unknown) {
  return {
    root: "map",
    elements: { map: { type: "Map", props, children: [] } },
  };
}

describe("Map catalog entry", () => {
  it("accepts a complete map spec", () => {
    expect(playgroundCatalog.validate(mapSpec(baseProps)).success).toBe(true);
  });

  it("rejects coordinates out of range (lat/lng swapped)", () => {
    const props = { ...baseProps, center: { lng: 37.788, lat: -122.4075 } };
    expect(mapPropsSchema.safeParse(props).success).toBe(false);
  });

  it("rejects a route with a single waypoint", () => {
    const props = {
      ...baseProps,
      route: { ...baseProps.route, waypoints: [baseProps.route.waypoints[0]] },
    };
    expect(mapPropsSchema.safeParse(props).success).toBe(false);
  });

  it("accepts GeoJSON layers", () => {
    const props = {
      ...baseProps,
      layers: [
        {
          kind: "line",
          data: {
            type: "FeatureCollection",
            features: [
              {
                type: "Feature",
                properties: {},
                geometry: {
                  type: "LineString",
                  coordinates: [
                    [-122.42, 37.77],
                    [-122.4, 37.79],
                  ],
                },
              },
            ],
          },
          color: "#ef4444",
          opacity: null,
        },
      ],
    };
    expect(mapPropsSchema.safeParse(props).success).toBe(true);
  });

  it("is described in the system prompt", () => {
    const prompt = playgroundCatalog.prompt();
    expect(prompt).toContain("Map");
    expect(prompt).toContain("isochrone");
  });
});
