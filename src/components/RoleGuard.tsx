import { useEffect, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth, roleHome, type AppRole } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

export function RoleGuard({
  allow,
  children,
}: {
  allow: AppRole;
  children: ReactNode;
}) {
  const { loading, session, role, error } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (error) return;
    if (!session) {
      navigate({ to: "/auth" });
    } else if (role && role !== allow) {
      navigate({ to: roleHome[role] });
    }
  }, [loading, error, session, role, allow, navigate]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="max-w-md rounded-lg border p-6 text-center">
          <h1 className="text-lg font-bold">Konfigurasi belum lengkap</h1>
          <p className="mt-2 text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  if (loading || !session || role !== allow) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="size-7 animate-spin text-primary" />
      </div>
    );
  }
  return <>{children}</>;
}
