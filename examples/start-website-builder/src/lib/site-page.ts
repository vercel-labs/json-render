import { createServerFn } from "@tanstack/react-start";
import type { HeadDescriptors, PageData } from "@json-render/start/server";
import { getPageData, getHead } from "./app";

/** Resolved payload for a site page: page data + head descriptors. */
export type SitePage = PageData & { head: HeadDescriptors };

/**
 * JSON-safe wire alias. TanStack Start's server-fn serialization check
 * rejects `Record<string, unknown>` (used by `Spec` element props), even
 * though the payload is plain JSON at runtime. The handler is therefore
 * typed against `JsonValue`, and the exported signature restores the
 * precise `SitePage` type for the route loader.
 */
type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

const fetchSitePageFn = createServerFn({ method: "GET" })
  .inputValidator((data: { pathname: string }) => data)
  .handler(async ({ data }): Promise<JsonValue> => {
    const page = await getPageData({ pathname: data.pathname });
    if (!page) return null;
    const head = await getHead({ pathname: data.pathname });
    return { ...page, head } as unknown as JsonValue;
  });

/**
 * Server function that resolves page data + head descriptors for a
 * pathname. Always runs on the server so it reads the live spec store
 * (client-side navigations would otherwise see a stale module copy).
 */
export const fetchSitePage = fetchSitePageFn as unknown as (opts: {
  data: { pathname: string };
}) => Promise<SitePage | null>;
