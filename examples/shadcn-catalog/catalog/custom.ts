import { z } from "zod";

export const metricProps = z.object({
  label: z.string(),
  value: z.string(),
  trend: z.enum(["up", "down", "neutral"]).nullable(),
});

export type MetricProps = z.infer<typeof metricProps>;

export const trackMetricParams = z.object({
  metric: z.string(),
  value: z.string(),
});

export type TrackMetricParams = z.infer<typeof trackMetricParams>;

export const trackMetricAction = {
  description:
    "Record a Metric card interaction for analytics. Typed params keep the LLM prompt honest about what the handler receives.",
  params: trackMetricParams,
};
