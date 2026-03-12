import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "json-render React Three Fiber Example",
  description: "3D scenes from JSON specs with @json-render/react-three-fiber",
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
