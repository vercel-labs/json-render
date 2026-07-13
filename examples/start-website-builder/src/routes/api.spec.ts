import { createFileRoute } from "@tanstack/react-router";
import type { StartAppSpec } from "@json-render/start";
import { getSpec, setSpec } from "@/lib/spec-store";

export const Route = createFileRoute("/api/spec")({
  server: {
    handlers: {
      GET: () => Response.json(getSpec()),
      PUT: async ({ request }) => {
        setSpec((await request.json()) as StartAppSpec);
        return Response.json({ ok: true });
      },
    },
  },
});
