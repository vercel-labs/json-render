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
