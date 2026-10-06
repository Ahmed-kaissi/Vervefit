import { useAuth } from "@/hooks/use-auth";
import { AppHeader } from "@/components/vervefit/AppHeader";

function userName(user: unknown): string | null {
  if (typeof user !== "object" || user === null) return null;
  return "name" in user ? (user as { name?: string }).name ?? null : null;
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const name = userName(user);

  return (
    <div className="flex min-h-dvh flex-col bg-[#0B0B0B] text-[#E8E8E8]">
      <AppHeader user={user} />

      <main className="mx-auto w-full max-w-md flex-1 space-y-4 px-4 pb-28 pt-5 md:px-6">
        <header className="text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#CEFF00]">
            Admin
          </p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-[#E8E8E8]">
            {name ? `Dashboard, ${name}` : "Admin dashboard"}
          </h1>
        </header>

      </main>
    </div>
  );
}
