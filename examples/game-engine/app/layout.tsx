import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Game Engine | json-render",
  description:
    "Build 3D worlds with AI. A scene editor and game runtime powered by json-render specs and React Three Fiber.",
  icons: { icon: "/icon.svg" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
