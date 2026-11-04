import type { Metadata } from "next";
import { Inter, Lato } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });
const lato = Lato({
  subsets: ["latin"],
  weight: ["400", "700", "900"],
  variable: "--font-lato",
});

export const metadata: Metadata = {
  title: "json-render Chat SDK Example",
  description:
    "Generate native Slack, Teams and Discord cards from JSON specs with @json-render/chat",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} ${lato.variable}`}>{children}</body>
    </html>
  );
}
