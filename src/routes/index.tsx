import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useAuth, roleHome } from "@/hooks/useAuth";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Absensi Yayasan Kitongbisa" },
      {
        name: "description",
        content:
          "Sistem absensi kepegawaian digital berbasis GPS untuk Yayasan Kitongbisa.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const { loading, session, role, error } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (error) return;
    if (!session) navigate({ to: "/auth" });
    else if (role) navigate({ to: roleHome[role] });
  }, [loading, error, session, role, navigate]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-hero px-4">
        <div className="max-w-md rounded-lg bg-white p-6 text-center shadow-card">
          <h1 className="text-lg font-bold">Konfigurasi belum lengkap</h1>
          <p className="mt-2 text-sm text-muted-foreground">{error}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            Set VITE_SUPABASE_URL dan VITE_SUPABASE_PUBLISHABLE_KEY di Vercel Dashboard
            lalu redeploy.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-hero">
      <Loader2 className="size-8 animate-spin text-primary-foreground" />
    </div>
  );
}
