import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "json-render shadcn Catalog Example",
  description:
    "One page rendering a small shadcn catalog with a single custom Metric component",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
