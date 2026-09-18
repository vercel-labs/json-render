import type { ReactNode } from "react";
import { pageMetadata } from "@/lib/page-metadata";

export const metadata = pageMetadata("examples");

export default function ExamplesLayout({ children }: { children: ReactNode }) {
  return children;
}
