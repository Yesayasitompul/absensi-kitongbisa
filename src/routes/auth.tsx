import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

import { useAuth, roleHome, type AppRole } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Masuk — Absensi Yayasan Kitongbisa" },
      {
        name: "description",
        content: "Masuk atau daftar ke sistem absensi Yayasan Kitongbisa.",
      },
    ],
  }),
  component: AuthPage,
});

const emailSchema = z.string().trim().email("Format email tidak valid").max(255);
const passSchema = z.string().min(6, "Kata sandi minimal 6 karakter").max(72);

function AuthPage() {
  const navigate = useNavigate();
  const { session, role, loading } = useAuth();
  const [busy, setBusy] = useState(false);

  // login
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // register
  const [rNama, setRNama] = useState("");
  const [rJabatan, setRJabatan] = useState("");
  const [rEmail, setREmail] = useState("");
  const [rPass, setRPass] = useState("");
  const [rRole, setRRole] = useState<AppRole>("pegawai");

  useEffect(() => {
    if (!loading && session && role) navigate({ to: roleHome[role] });
  }, [loading, session, role, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const ev = emailSchema.safeParse(email);
    const pv = passSchema.safeParse(password);
    if (!ev.success) return toast.error(ev.error.issues[0].message);
    if (!pv.success) return toast.error(pv.error.issues[0].message);
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: ev.data,
      password: pv.data,
    });
    setBusy(false);
    if (error) {
      toast.error(
        error.message.includes("Invalid")
          ? "Email atau kata sandi salah."
          : error.message,
      );
      return;
    }
    toast.success("Berhasil masuk.");
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rNama.trim()) return toast.error("Nama wajib diisi.");
    const ev = emailSchema.safeParse(rEmail);
    const pv = passSchema.safeParse(rPass);
    if (!ev.success) return toast.error(ev.error.issues[0].message);
    if (!pv.success) return toast.error(pv.error.issues[0].message);
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email: ev.data,
      password: pv.data,
      options: {
        emailRedirectTo: window.location.origin,
        data: { nama: rNama.trim(), jabatan: rJabatan.trim(), role: rRole },
      },
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Akun dibuat. Anda akan diarahkan ke dashboard.");
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-hero px-4 py-8">
      <div className="mb-6 flex flex-col items-center text-center text-primary-foreground">
        <div className="mb-3 flex size-20 items-center justify-center rounded-2xl bg-white p-2 shadow-card">
          <img
            src="/favicon.png"
            alt="Logo KBF Indonesia"
            className="size-full object-contain"
          />
        </div>
        <h1 className="text-2xl font-bold">Absensi Digital Yayasan Kitongbisa</h1>
        <p className="mt-1 flex items-center gap-1 text-sm text-primary-foreground/80">
          <MapPin className="size-4" /> Sistem Absensi Kepegawaian
        </p>
      </div>

      <Card className="w-full max-w-md shadow-card">
        <CardHeader className="pb-2">
          <CardTitle>Masuk ke akun Anda</CardTitle>
          <CardDescription>
            Masuk untuk melakukan absensi atau mengelola data.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Masuk</TabsTrigger>
              <TabsTrigger value="register">Daftar</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nama@kitongbisa.org"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password">Kata Sandi</Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy && <Loader2 className="size-4 animate-spin" />}
                  Masuk
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="register">
              <form onSubmit={handleRegister} className="space-y-3 pt-2">
                <div className="space-y-1.5">
                  <Label htmlFor="rnama">Nama Lengkap</Label>
                  <Input
                    id="rnama"
                    value={rNama}
                    onChange={(e) => setRNama(e.target.value)}
                    placeholder="Nama lengkap"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="rjabatan">Jabatan</Label>
                    <Input
                      id="rjabatan"
                      value={rJabatan}
                      onChange={(e) => setRJabatan(e.target.value)}
                      placeholder="cth: Staf"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="rrole">Peran</Label>
                    <Select
                      value={rRole}
                      onValueChange={(v) => setRRole(v as AppRole)}
                    >
                      <SelectTrigger id="rrole">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pegawai">Pegawai</SelectItem>
                        <SelectItem value="admin">Admin / HR</SelectItem>
                        <SelectItem value="pimpinan">Pimpinan</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="remail">Email</Label>
                  <Input
                    id="remail"
                    type="email"
                    value={rEmail}
                    onChange={(e) => setREmail(e.target.value)}
                    placeholder="nama@kitongbisa.org"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="rpass">Kata Sandi</Label>
                  <Input
                    id="rpass"
                    type="password"
                    value={rPass}
                    onChange={(e) => setRPass(e.target.value)}
                    placeholder="Minimal 6 karakter"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy && <Loader2 className="size-4 animate-spin" />}
                  Daftar
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
