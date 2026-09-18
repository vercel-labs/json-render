export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <main className="min-h-[calc(100dvh-4rem)]">{children}</main>;
}
