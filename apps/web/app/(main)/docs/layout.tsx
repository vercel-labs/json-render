import { DocsMobileNav } from "@/components/docs-mobile-nav";
import { DocsSidebar } from "@/components/docs-sidebar";
import { CopyPageButton } from "@/components/copy-page-button";
import { TableOfContents } from "@/components/table-of-contents";

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <DocsMobileNav />
      <div className="max-w-7xl mx-auto px-6 py-8 lg:py-12 flex gap-12">
        {/* Sidebar */}
        <aside className="w-48 shrink-0 hidden lg:block sticky top-28 h-[calc(100vh-7rem)] overflow-y-auto">
          <DocsSidebar />
        </aside>

        {/* Content */}
        <div className="flex-1 min-w-0 max-w-2xl pb-20">
          <div className="flex justify-end mb-4">
            <CopyPageButton />
          </div>
          <article>{children}</article>
        </div>

        {/* On this page */}
        <aside className="w-44 shrink-0 hidden xl:block sticky top-28 h-[calc(100vh-7rem)] overflow-y-auto">
          <TableOfContents />
        </aside>
      </div>
    </>
  );
}
