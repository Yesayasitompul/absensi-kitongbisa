import { type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LogOut } from "lucide-react";


const roleLabel: Record<string, string> = {
  pegawai: "Pegawai",
  admin: "Admin / HR",
  pimpinan: "Pimpinan",
};

export function PageShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  const { profile, role, signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate({ to: "/auth" });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 bg-gradient-hero text-primary-foreground shadow-card">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-white p-1">
              <img
                src="/favicon.png"
                alt="Logo KBF Indonesia"
                className="size-full object-contain"
              />
            </div>
            <div>
              <p className="text-sm font-semibold leading-tight">{title}</p>
              <p className="text-xs text-primary-foreground/80">
                {subtitle ?? "Yayasan Kitongbisa"}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            className="text-primary-foreground hover:bg-primary-foreground/15 hover:text-primary-foreground"
            aria-label="Keluar"
          >
            <LogOut className="size-5" />
          </Button>
        </div>
        <div className="mx-auto flex max-w-3xl items-center gap-2 px-4 pb-3">
          <Badge className="bg-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/20">
            {role ? roleLabel[role] : ""}
          </Badge>
          <span className="text-sm font-medium">{profile?.nama}</span>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-5 pb-20">{children}</main>
    </div>
  );
}
