import { Nav } from "@/components/nav";
import { DemoSessionProvider } from "@/components/demo-session-provider";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DemoSessionProvider>
      <div className="flex min-h-screen flex-col">
        <Nav />
        <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
          {children}
        </main>
      </div>
    </DemoSessionProvider>
  );
}
