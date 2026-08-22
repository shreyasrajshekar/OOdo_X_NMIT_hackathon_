export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-10">
      <div className="w-full max-w-md rounded-card p-8 shadow-2xl premium-card">
        {children}
      </div>
    </div>

  );
}
