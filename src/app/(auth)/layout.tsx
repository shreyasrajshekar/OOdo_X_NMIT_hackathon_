export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-10">
      <div className="w-full max-w-md rounded-card border border-line bg-paper p-8 shadow-[0_1px_2px_rgba(32,26,30,0.05)]">
        {children}
      </div>
    </div>
  );
}
