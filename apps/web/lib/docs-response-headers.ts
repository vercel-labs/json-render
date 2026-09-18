const negotiationHeaders = [
  "Accept",
  "User-Agent",
  "Signature-Agent",
  "Sec-Fetch-Mode",
  "Sec-Fetch-Dest",
  "RSC",
  "Next-Router-Prefetch",
  "Next-Router-Segment-Prefetch",
  "Purpose",
  "Sec-Purpose",
];

export function applyDocsResponseHeaders(headers: Headers) {
  const tokens = new Map<string, string>();
  for (const token of [
    ...(headers.get("Vary") ?? "").split(/\s*,\s*/),
    ...negotiationHeaders,
  ]) {
    if (token) tokens.set(token.toLowerCase(), token);
  }
  headers.set("Vary", [...tokens.values()].join(", "));
  headers.set("Cache-Control", "private, no-store");
  headers.set("CDN-Cache-Control", "no-store");
  headers.set("Vercel-CDN-Cache-Control", "no-store");
}
