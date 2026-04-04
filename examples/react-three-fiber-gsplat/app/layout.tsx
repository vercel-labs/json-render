import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "json-render R3F + Gaussian Splatting Example",
  description:
    "Gaussian splats composed with 3D primitives using @json-render/react-three-fiber",
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
