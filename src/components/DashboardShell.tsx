import { useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import { LogOut, Menu } from "lucide-react";
import kbfLogo from "@/assets/kbf-logo.png.asset.json";
import { useAuth, type AppRole } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export interface MenuItem {
  value: string;
  label: string;
  icon: LucideIcon;
}

const entityLabel: Record<AppRole, string> = {
  pegawai: "Kitongbisa Pegawai",
  admin: "Kitongbisa Admin/HR",
  pimpinan: "Kitongbisa Pimpinan",
};

const roleLabel: Record<AppRole, string> = {
  pegawai: "Pegawai",
  admin: "Admin/HR",
  pimpinan: "Pimpinan",
};

function SidebarBody({
  menu,
  active,
  onSelect,
  onLogout,
}: {
  menu: MenuItem[];
  active: string;
  onSelect: (v: string) => void;
  onLogout: () => void;
}) {
  const { profile, role } = useAuth();
  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      {/* Brand */}
      <div className="flex items-center gap-3 border-b border-sidebar-border px-5 py-5">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-white p-1 shadow-sm">
          <img
            src={kbfLogo.url}
            alt="Logo KBF Indonesia"
            className="size-full object-contain"
          />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold leading-tight">
            Yayasan Kitongbisa
          </p>
          <p className="truncate text-xs text-sidebar-foreground/60">
            {role ? entityLabel[role] : "Absensi Digital"}
          </p>
        </div>
      </div>

      {/* Profile */}
      <div className="flex items-center gap-3 border-b border-sidebar-border px-5 py-4">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-sidebar-accent text-sm font-bold text-sidebar-accent-foreground">
          {(profile?.nama ?? "?").slice(0, 1).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold leading-tight">
            {profile?.nama ?? "Pengguna"}
          </p>
          <p className="truncate text-xs text-sidebar-foreground/60">
            {role ? roleLabel[role] : ""}
          </p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {menu.map((item) => {
          const Icon = item.icon;
          const isActive = item.value === active;
          return (
            <button
              key={item.value}
              onClick={() => onSelect(item.value)}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              )}
            >
              <Icon className="size-4 shrink-0" />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="border-t border-sidebar-border p-3">
        <Button
          variant="ghost"
          onClick={onLogout}
          className="w-full justify-start gap-3 text-sidebar-foreground/80 hover:bg-destructive/10 hover:text-destructive"
        >
          <LogOut className="size-4" />
          Keluar
        </Button>
      </div>
    </div>
  );
}

export function DashboardShell({
  title,
  menu,
  active,
  onChange,
  children,
}: {
  title: string;
  menu: MenuItem[];
  active: string;
  onChange: (v: string) => void;
  children: ReactNode;
}) {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);

  const handleLogout = async () => {
    await signOut();
    navigate({ to: "/auth" });
  };

  const handleSelect = (v: string) => {
    onChange(v);
    setOpen(false);
  };

  const activeLabel = menu.find((m) => m.value === active)?.label ?? title;

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Desktop sidebar */}
      {!isMobile && (
        <aside className="sticky top-0 h-screen w-64 shrink-0 border-r border-sidebar-border">
          <SidebarBody
            menu={menu}
            active={active}
            onSelect={handleSelect}
            onLogout={handleLogout}
          />
        </aside>
      )}

      {/* Mobile drawer */}
      {isMobile && (
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent side="left" className="w-72 p-0">
            <SidebarBody
              menu={menu}
              active={active}
              onSelect={handleSelect}
              onLogout={handleLogout}
            />
          </SheetContent>
        </Sheet>
      )}

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-border bg-card/80 px-4 py-3 backdrop-blur md:px-6">
          {isMobile && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setOpen(true)}
              aria-label="Buka menu"
            >
              <Menu className="size-5" />
            </Button>
          )}
          <h1 className="truncate text-base font-semibold md:text-lg">
            {activeLabel}
          </h1>
        </header>
        <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-5 md:px-6 md:py-6">
          {children}
        </main>
      </div>
    </div>
  );
}
