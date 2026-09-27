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
  const { loading, session, role } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!session) navigate({ to: "/auth" });
    else if (role) navigate({ to: roleHome[role] });
  }, [loading, session, role, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-hero">
      <Loader2 className="size-8 animate-spin text-primary-foreground" />
    </div>
  );
}
