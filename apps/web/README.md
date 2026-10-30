This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://json-render.localhost:1355](http://json-render.localhost:1355) with your browser to see the result.

The playground's default model is `openai/gpt-6-luna-fast` through AI Gateway, with OpenAI reasoning effort set to `none`. Set `AI_GATEWAY_API_KEY` to enable generation, and use `AI_GATEWAY_MODEL` to override the model.

Choose **compact** to generate a complete nested JSON document with the catalog's response schema. The browser compiles that JSON as it arrives: JSON, visual, nested, code, and preview use the compiled spec, while stream shows the original model output. Follow-ups receive the selected version as context and generate a fresh complete spec; patch, merge, and diff controls apply only to JSONL and YAML. Invalid or interrupted compact output is marked partial or failed rather than complete.

In every mode, grids reduce their column count to fit their available width, and cards shrink within their columns. The requested grid column count is the maximum.

Component props with renderer defaults may be omitted or set to `null`. Required content props, allowed values, and unknown-property checks still apply to compact generation.

## Jev composition experiment

The **default / jev** toggle in `/playground` includes an experimental Jev option; hover or focus its info icon segment for details. It is a reference consumer of core's reusable `experimental_composeSpec` and `experimental_createEvaluator` APIs. It lets Jev compose and edit UI trees from the playground's component catalog and allowed action bindings through Vercel AI Gateway. Set `JEV_AI_GATEWAY_API_KEY` on the server for Jev; the default model uses `AI_GATEWAY_API_KEY`. Follow-ups use the selected version as `initialSpec` and can add, replace, remove, or move elements; earlier versions remain unchanged. It uses the same prompt input, version history, spec/stream inspectors, and functional preview as the default model. The shared `/api/generate` endpoint streams spec patches and decision metadata. See [setup, architecture, and limits](lib/jev/README.md).

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load Inter, a custom Google Font.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
