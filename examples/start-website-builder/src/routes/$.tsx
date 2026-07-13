import { createFileRoute, notFound } from "@tanstack/react-router";
import { PageRenderer } from "@json-render/start";
import { fetchSitePage } from "@/lib/site-page";

export const Route = createFileRoute("/$")({
  loader: async ({ location }) => {
    const data = await fetchSitePage({
      data: { pathname: location.pathname },
    });
    if (!data) throw notFound();
    return data;
  },
  head: ({ loaderData }) => loaderData?.head ?? {},
  component: SitePage,
});

function SitePage() {
  const { spec, initialState, layoutSpec } = Route.useLoaderData();
  return (
    <PageRenderer
      spec={spec}
      initialState={initialState}
      layoutSpec={layoutSpec}
    />
  );
}
