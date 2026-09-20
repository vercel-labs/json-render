"use client";

import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CopyButton } from "./copy-button";
import { ORCAROUTER_KEY_DASHBOARD_URL } from "@/lib/orcarouter/constants";
import {
  useOrcaConnect,
  type OrcaConnectFlow,
} from "@/lib/orcarouter/use-orca-connect";

export interface OrcaCredentialState {
  connected: boolean;
  needsReauth: boolean;
  method: string | null;
  maskedKey: string | null;
  reauthReason: string | null;
  notice: string | null;
}

export interface OrcaConnectPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  state: OrcaCredentialState | null;
  onChanged: () => void;
}

type Choice = "api_key" | "orcarouter-oauth";

/**
 * The OrcaRouter configuration surface. Both entry points are presented as
 * equal, explicit choices: paste an existing `sk-orca-…` key, or authorize with
 * an OrcaRouter account. Neither replaces the other.
 */
export function OrcaConnectPanel({
  open,
  onOpenChange,
  state,
  onChanged,
}: OrcaConnectPanelProps) {
  const [choice, setChoice] = useState<Choice>("api_key");
  const [apiKey, setApiKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [apiKeyError, setApiKeyError] = useState<string | null>(null);
  const [apiKeyNotice, setApiKeyNotice] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [clearing, setClearing] = useState(false);

  const connect = useOrcaConnect();
  const inputRef = useRef<HTMLInputElement>(null);

  // Switching authentication method releases any in-flight login.
  useEffect(() => {
    if (!open) connect.cancel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (connect.status === "connected") onChanged();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connect.status]);

  async function saveApiKey() {
    setSaving(true);
    setApiKeyError(null);
    setApiKeyNotice(null);
    try {
      const response = await fetch("/api/orcarouter/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method: "api_key", apiKey }),
      });
      const payload = (await response.json()) as {
        error?: string;
        notice?: string;
        persisted?: boolean;
      };
      if (!response.ok) {
        setApiKeyError(payload.error ?? "That key could not be saved.");
        return;
      }
      setApiKey("");
      setApiKeyNotice(
        payload.notice ??
          (payload.persisted
            ? "Saved. The key is used for inference and model discovery."
            : null),
      );
      onChanged();
    } catch {
      setApiKeyError("That key could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  async function clearCredential() {
    setClearing(true);
    try {
      await fetch("/api/orcarouter/credential", { method: "DELETE" });
      connect.reset();
      onChanged();
    } finally {
      setClearing(false);
    }
  }

  const busy = connect.busy || saving || clearing;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-lg"
        aria-describedby={undefined}
        data-testid="orca-connect-panel"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {/* Official OrcaRouter mark. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/orcarouter-mark.png"
              alt=""
              width={20}
              height={20}
              className="size-5 rounded-sm"
            />
            Connect OrcaRouter
          </DialogTitle>
          <DialogDescription>
            OrcaRouter is an OpenAI-compatible AI gateway that routes many
            providers behind one endpoint. Choose how to authenticate.
          </DialogDescription>
        </DialogHeader>

        {state?.connected && (
          <div className="rounded border border-border p-3 text-sm space-y-1">
            <p className="font-medium">
              Connected
              <span className="ml-2 text-xs font-mono text-muted-foreground">
                {state.maskedKey}
              </span>
            </p>
            <p className="text-xs text-muted-foreground">
              {state.method === "orcarouter-oauth"
                ? "Authorized with your OrcaRouter account."
                : "Using a pasted OrcaRouter API key."}
            </p>
            <button
              type="button"
              onClick={clearCredential}
              disabled={clearing}
              className="text-xs text-muted-foreground underline hover:text-foreground disabled:opacity-50"
            >
              Disconnect
            </button>
          </div>
        )}

        {state?.needsReauth && (
          <p className="rounded border border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive">
            {state.reauthReason ??
              "The OrcaRouter key is no longer accepted. Connect again to issue a new one."}
          </p>
        )}

        <div
          role="radiogroup"
          aria-label="Authentication method"
          className="grid gap-2"
        >
          <label
            className={`flex cursor-pointer items-start gap-2 rounded border p-3 text-sm ${
              choice === "api_key"
                ? "border-foreground/40 bg-muted/40"
                : "border-border"
            }`}
          >
            <input
              type="radio"
              name="orca-auth-method"
              value="api_key"
              checked={choice === "api_key"}
              onChange={() => setChoice("api_key")}
              className="mt-0.5"
              data-testid="orca-choice-api-key"
            />
            <span>
              <span className="font-medium">OrcaRouter - API</span>
              <span className="block text-xs text-muted-foreground">
                Paste an existing <code>sk-orca-…</code> key from your
                OrcaRouter console.
              </span>
            </span>
          </label>

          <label
            className={`flex cursor-pointer items-start gap-2 rounded border p-3 text-sm ${
              choice === "orcarouter-oauth"
                ? "border-foreground/40 bg-muted/40"
                : "border-border"
            }`}
          >
            <input
              type="radio"
              name="orca-auth-method"
              value="orcarouter-oauth"
              checked={choice === "orcarouter-oauth"}
              onChange={() => {
                setChoice("orcarouter-oauth");
                connect.cancel();
              }}
              className="mt-0.5"
              data-testid="orca-choice-oauth"
            />
            <span>
              <span className="font-medium">OrcaRouter - Auth</span>
              <span className="block text-xs text-muted-foreground">
                Sign in with your OrcaRouter account. No client secret, no
                pre-registered redirect URI.
              </span>
            </span>
          </label>
        </div>

        {choice === "api_key" ? (
          <div className="space-y-2">
            <label
              className="block text-xs text-muted-foreground"
              htmlFor="orca-api-key"
            >
              API key
            </label>
            <input
              id="orca-api-key"
              ref={inputRef}
              type="password"
              autoComplete="off"
              spellCheck={false}
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
              placeholder="sk-orca-..."
              disabled={saving}
              data-testid="orca-api-key-input"
              className="w-full rounded border border-border bg-background px-2 py-1.5 font-mono text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            />
            {apiKeyError && (
              <p className="text-xs text-destructive" role="alert">
                {apiKeyError}
              </p>
            )}
            {apiKeyNotice && (
              <p className="text-xs text-muted-foreground">{apiKeyNotice}</p>
            )}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={saveApiKey}
                disabled={busy || !apiKey.trim()}
                data-testid="orca-save-api-key"
                className="rounded border border-border px-2 py-1 text-xs hover:bg-muted disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save key"}
              </button>
              <a
                href={ORCAROUTER_KEY_DASHBOARD_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-muted-foreground underline hover:text-foreground"
              >
                Manage keys
              </a>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              {(["loopback", "oob"] as const).map((option: OrcaConnectFlow) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => connect.setFlow(option)}
                  aria-pressed={connect.flow === option}
                  className={`rounded border px-2 py-1 text-xs ${
                    connect.flow === option
                      ? "border-foreground/40 bg-muted"
                      : "border-border text-muted-foreground"
                  }`}
                >
                  {option === "loopback" ? "Open browser" : "Show a code"}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => void connect.start()}
              disabled={busy}
              data-testid="orca-start-connect"
              className="rounded border border-border px-2 py-1 text-xs hover:bg-muted disabled:opacity-50"
            >
              {connect.busy
                ? "Waiting for approval..."
                : "Connect with OrcaRouter"}
            </button>

            {connect.authorizeUrl && (
              <div className="rounded border border-border p-2">
                <p className="text-xs text-muted-foreground">
                  If your browser did not open, visit:
                </p>
                <div className="mt-1 flex items-start gap-2">
                  <code
                    className="min-w-0 flex-1 break-all font-mono text-[10px]"
                    data-testid="orca-authorize-url"
                  >
                    {connect.authorizeUrl}
                  </code>
                  <CopyButton
                    text={connect.authorizeUrl}
                    className="shrink-0"
                  />
                </div>
              </div>
            )}

            {connect.status === "awaiting_code" && connect.sessionId && (
              <div className="space-y-2">
                <label
                  className="block text-xs text-muted-foreground"
                  htmlFor="orca-code"
                >
                  Code shown on the OrcaRouter page
                </label>
                <input
                  id="orca-code"
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  spellCheck={false}
                  data-testid="orca-code-input"
                  className="w-full rounded border border-border bg-background px-2 py-1.5 font-mono text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                <button
                  type="button"
                  onClick={() => void connect.submitCode(code)}
                  disabled={busy || !code.trim()}
                  data-testid="orca-submit-code"
                  className="rounded border border-border px-2 py-1 text-xs hover:bg-muted disabled:opacity-50"
                >
                  Finish connecting
                </button>
              </div>
            )}

            {connect.busy && (
              <button
                type="button"
                onClick={() => connect.cancel()}
                data-testid="orca-cancel-connect"
                className="text-xs text-muted-foreground underline hover:text-foreground"
              >
                Cancel
              </button>
            )}

            {connect.error && (
              <p className="text-xs text-destructive" role="alert">
                {connect.error}
              </p>
            )}
            {connect.status === "connected" && (
              <p className="text-xs text-muted-foreground">
                Connected{connect.maskedKey ? ` (${connect.maskedKey})` : ""}.
              </p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
