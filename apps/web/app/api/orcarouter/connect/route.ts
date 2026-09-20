import { createOrcaApiKeySource, validateOrcaApiKey } from "@json-render/core";
import { saveOrcaCredential } from "@/lib/orcarouter/server-store";

export const maxDuration = 30;

interface ConnectRequestBody {
  method?: "api_key";
  apiKey?: string;
}

/**
 * The API-key entry point. The key is validated for shape, installed through
 * the same credential seam the PKCE adapter uses, and persisted with the
 * project's existing env-file mechanism. It is never echoed back.
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as ConnectRequestBody;
  if (body.method !== "api_key") {
    return Response.json(
      { error: "Unsupported authentication method." },
      { status: 400 },
    );
  }

  const validation = validateOrcaApiKey(body.apiKey ?? "");
  if (!validation.ok) {
    return Response.json({ error: validation.problem }, { status: 400 });
  }

  // The API-key choice goes through one adapter and produces one credential
  // shape, exactly like the PKCE choice does.
  const source = createOrcaApiKeySource(body.apiKey!);
  const result = await source.acquire();
  const persistence = await saveOrcaCredential(result);

  return Response.json({
    ok: true,
    method: result.method,
    maskedKey: `${result.apiKey.slice(0, 8)}••••${result.apiKey.slice(-4)}`,
    persisted: persistence.persisted,
    location: persistence.location,
    notice: persistence.problem,
  });
}
