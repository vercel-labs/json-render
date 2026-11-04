import { createSpecStreamCompiler, type Spec } from "@json-render/core";
import type { CardElement } from "chat";
import { toCard, toPartialCard, type ToCardOptions } from "./render";

/** Anything with Chat SDK's post and edit shape, such as a Thread or Channel. */
export interface CardTarget {
  post(card: CardElement): Promise<CardMessage>;
}

export interface CardMessage {
  edit(card: CardElement): Promise<unknown>;
}

export interface StreamCardOptions extends ToCardOptions {
  /**
   * Minimum time between message edits while the spec streams. Defaults to
   * 500 ms, the same interval Chat SDK uses for post and edit streaming.
   */
  updateIntervalMs?: number;
}

export interface StreamCardResult {
  spec: Spec;
  card: CardElement;
  message: CardMessage;
}

/**
 * Stream a model's spec into a chat message. Posts the card as soon as its
 * root exists, edits it as elements arrive, and finishes with a validated
 * card. Throws CardSpecError if the final spec is invalid, after the partial
 * message is already visible, so callers can retry or edit it with an error.
 */
export async function streamCard(
  target: CardTarget,
  textStream: AsyncIterable<string>,
  options: StreamCardOptions = {},
): Promise<StreamCardResult> {
  const interval = options.updateIntervalMs ?? 500;
  const compiler = createSpecStreamCompiler<Spec>();
  let message: CardMessage | undefined;
  let lastUpdate = 0;
  let lastSent = "";

  const flush = async (card: CardElement) => {
    const serialized = JSON.stringify(card);
    if (serialized === lastSent) return;
    lastSent = serialized;
    if (message) await message.edit(card);
    else message = await target.post(card);
    lastUpdate = Date.now();
  };

  for await (const chunk of textStream) {
    const { result, newPatches } = compiler.push(chunk);
    if (!newPatches.length || Date.now() - lastUpdate < interval) continue;
    const partial = toPartialCard(result, options);
    // Platforms reject an empty message, so wait for visible content.
    if (
      partial &&
      (partial.title ||
        partial.subtitle ||
        partial.imageUrl ||
        partial.children.length)
    )
      await flush(partial);
  }

  const spec = compiler.getResult();
  const card = toCard(spec, options);
  await flush(card);
  return { spec, card, message: message! };
}
