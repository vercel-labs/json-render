export default function PlaygroundLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="h-[calc(100dvh-4rem)] flex flex-col overflow-hidden">
      {children}
    </main>
  );
}
