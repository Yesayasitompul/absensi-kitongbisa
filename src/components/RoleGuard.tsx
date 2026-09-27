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
  const { loading, session, role } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!session) {
      navigate({ to: "/auth" });
    } else if (role && role !== allow) {
      navigate({ to: roleHome[role] });
    }
  }, [loading, session, role, allow, navigate]);

  if (loading || !session || role !== allow) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="size-7 animate-spin text-primary" />
      </div>
    );
  }
  return <>{children}</>;
}
