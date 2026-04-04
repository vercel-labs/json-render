import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "json-render Gaussian Splatting Example",
  description:
    "Gaussian splat rendering from JSON specs with @json-render/gsplat",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif" }}>
        {children}
      </body>
    </html>
  );
}
