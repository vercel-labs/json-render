// Minimal process.env typing for dev-only warnings.
// Uses a namespaced interface so it merges cleanly with @types/node if present.
declare namespace NodeJS {
  interface ProcessEnv {
    readonly NODE_ENV?: string;
  }
}

declare const process: { readonly env: NodeJS.ProcessEnv };
