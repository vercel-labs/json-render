import { createFileRoute, notFound } from "@tanstack/react-router";
import { PageRenderer } from "@json-render/start";
import { fetchSitePage } from "@/lib/site-page";

export const Route = createFileRoute("/")({
  loader: async () => {
    const data = await fetchSitePage({ data: { pathname: "/" } });
    if (!data) throw notFound();
    return data;
  },
  head: ({ loaderData }) => loaderData?.head ?? {},
  component: HomePage,
});

function HomePage() {
  const { spec, initialState, layoutSpec } = Route.useLoaderData();
  return (
    <PageRenderer
      spec={spec}
      initialState={initialState}
      layoutSpec={layoutSpec}
    />
  );
}
