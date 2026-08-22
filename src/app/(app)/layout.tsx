import { Nav } from "@/components/nav";
import { SessionProvider } from "@/components/demo-session-provider";
import { AdminActionsProvider } from "@/components/admin-actions-provider";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider>
      <AdminActionsProvider>
        <div className="flex min-h-screen flex-col">
          <Nav />
          <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
            {children}
          </main>
        </div>
      </AdminActionsProvider>
    </SessionProvider>
  );
}
