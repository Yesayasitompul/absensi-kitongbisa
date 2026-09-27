import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  BarChart3, Trophy, ClipboardList, FileDown, Loader2, Plus,
  Users, TrendingUp, AlertTriangle, Award,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { RoleGuard } from "@/components/RoleGuard";
import { DashboardShell, type MenuItem } from "@/components/DashboardShell";
import { fmtJam, fmtTanggal, fmtDurasi, statusLabel } from "@/lib/format";
import { buatLaporanPDF } from "@/lib/pdf";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/pimpinan")({
  ssr: false,
  head: () => ({ meta: [{ title: "Dashboard Pimpinan — Kitongbisa" }] }),
  component: () => (
    <RoleGuard allow="pimpinan">
      <PimpinanDashboard />
    </RoleGuard>
  ),
});

interface Profile {
  id: string;
  nama: string;
  jabatan: string | null;
}
interface AbsRow {
  id: string;
  user_id: string;
  tanggal: string;
  jam_masuk: string | null;
  jam_pulang: string | null;
  status: string;
  durasi_menit: number | null;
}
interface EvalRow {
  id: string;
  user_id: string;
  periode: string;
  rating: number;
  catatan: string | null;
}

function PimpinanDashboard() {
  const [pegawai, setPegawai] = useState<Profile[]>([]);
  const [abs, setAbs] = useState<AbsRow[]>([]);
  const [evaluasi, setEvaluasi] = useState<EvalRow[]>([]);
  const [tab, setTab] = useState("statistik");

  const menu: MenuItem[] = [
    { value: "statistik", label: "Beranda", icon: BarChart3 },
    { value: "rekap", label: "Rekap", icon: ClipboardList },
    { value: "evaluasi", label: "Evaluasi", icon: Trophy },
    { value: "laporan", label: "Laporan", icon: FileDown },
  ];

  const nama = useCallback(
    (id: string) => pegawai.find((p) => p.id === id)?.nama ?? "—",
    [pegawai],
  );

  const load = useCallback(async () => {
    const [p, a, e] = await Promise.all([
      supabase.from("profiles").select("id,nama,jabatan").order("nama"),
      supabase.from("absensi").select("*").order("tanggal", { ascending: false }).limit(500),
      supabase.from("evaluasi").select("*").order("created_at", { ascending: false }),
    ]);
    setPegawai((p.data ?? []) as Profile[]);
    setAbs((a.data ?? []) as AbsRow[]);
    setEvaluasi((e.data ?? []) as EvalRow[]);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const rekap = useMemo(() => {
    return pegawai
      .map((p) => {
        const rows = abs.filter((r) => r.user_id === p.id);
        const hadir = rows.filter((r) => r.status === "hadir").length;
        const telat = rows.filter((r) => r.status === "terlambat").length;
        const total = rows.length;
        const skor = total === 0 ? 0 : Math.round((hadir / total) * 100);
        return { ...p, hadir, telat, total, skor };
      })
      .sort((a, b) => b.skor - a.skor);
  }, [pegawai, abs]);

  const totalHadir = abs.filter((r) => r.status === "hadir").length;
  const totalTelat = abs.filter((r) => r.status === "terlambat").length;
  const totalAbs = abs.length;

  const kehadiranPct = totalAbs === 0 ? 0 : Math.round((totalHadir / totalAbs) * 100);
  const keterlambatanPct = totalAbs === 0 ? 0 : Math.round((totalTelat / totalAbs) * 100);
  const hadirPlusTelat = totalHadir + totalTelat;
  const kedisiplinanPct = hadirPlusTelat === 0 ? 0 : Math.round((totalHadir / hadirPlusTelat) * 100);
  const avgSkor = rekap.length === 0 ? 0 : Math.round(rekap.reduce((s, r) => s + r.skor, 0) / rekap.length);

  const cetakLaporan = () => {
    const baris = abs.map((r) => ({
      nama: nama(r.user_id),
      tanggal: fmtTanggal(r.tanggal),
      jamMasuk: fmtJam(r.jam_masuk),
      jamPulang: fmtJam(r.jam_pulang),
      status: statusLabel[r.status],
      durasi: fmtDurasi(r.durasi_menit),
    }));
    if (baris.length === 0) return toast.info("Tidak ada data absensi.");
    buatLaporanPDF("Laporan Absensi (Pimpinan)", "Semua Periode", baris);
  };

  return (
    <DashboardShell title="Dashboard Pimpinan" menu={menu} active={tab} onChange={setTab}>
      <Tabs value={tab} onValueChange={setTab}>
        <p className="mb-4 text-sm text-muted-foreground capitalize">
          {new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </p>

        <TabsContent value="statistik" className="space-y-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight">Dashboard Pimpinan</h2>
            <p className="text-sm text-muted-foreground capitalize">
              {new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatCard label="Total Pegawai" value={pegawai.length} icon={Users} tone="primary" />
            <StatCard label="Kehadiran" value={kehadiranPct} suffix="%" icon={TrendingUp} tone="success" />
            <StatCard label="Keterlambatan" value={keterlambatanPct} suffix="%" icon={AlertTriangle} tone="warning" />
            <StatCard label="Kedisiplinan" value={avgSkor} suffix="%" icon={Award} tone="accent" />
          </div>

          <Card className="shadow-card transition-all hover:shadow-lg">
            <CardHeader className="bg-gradient-primary rounded-t-xl pb-4 pt-4">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold text-primary-foreground">
                <Trophy className="size-4" />
                Top 5 Pegawai Terdisiplin
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 p-4">
              {rekap.slice(0, 5).map((p, i) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between rounded-lg border border-border p-3 transition-all hover:bg-accent/30"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex size-8 items-center justify-center rounded-full bg-gradient-primary text-xs font-bold text-primary-foreground shadow-sm">
                      {i + 1}
                    </span>
                    <div>
                      <p className="text-sm font-semibold">{p.nama}</p>
                      <p className="text-xs text-muted-foreground">{p.jabatan ?? "—"}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-primary">{p.skor}%</p>
                    <p className="text-[10px] text-muted-foreground">{p.hadir} hadir · {p.telat} telat</p>
                  </div>
                </div>
              ))}
              {rekap.length === 0 && (
                <p className="py-6 text-center text-sm text-muted-foreground">Belum ada data absensi.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rekap" className="space-y-3">
          {rekap.map((p) => (
            <Card key={p.id} className="shadow-card">
              <CardContent className="p-3.5">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{p.nama}</p>
                  <Badge variant="secondary">Skor {p.skor}%</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {p.jabatan ?? "—"} · Hadir {p.hadir} · Terlambat {p.telat} · Total {p.total}
                </p>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="evaluasi" className="space-y-3">
          <TambahEvaluasi pegawai={pegawai} onDone={load} />
          {evaluasi.map((ev) => (
            <Card key={ev.id} className="shadow-card">
              <CardContent className="p-3.5">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{nama(ev.user_id)}</p>
                  <Badge>{"★".repeat(ev.rating)}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {ev.periode} · {ev.catatan ?? "—"}
                </p>
              </CardContent>
            </Card>
          ))}
          {evaluasi.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">Belum ada evaluasi.</p>
          )}
        </TabsContent>

        <TabsContent value="laporan" className="space-y-3">
          <Card className="shadow-card">
            <CardHeader><CardTitle className="text-base">Laporan Absensi PDF</CardTitle></CardHeader>
            <CardContent>
              <p className="mb-4 text-sm text-muted-foreground">
                Tinjau dan unduh laporan absensi seluruh pegawai.
              </p>
              <Button onClick={cetakLaporan} className="w-full">
                <FileDown className="size-4" /> Unduh Laporan PDF
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </DashboardShell>
  );
}

function StatCard({
  label,
  value,
  suffix,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  suffix?: string;
  icon: React.ElementType;
  tone?: "primary" | "success" | "warning" | "accent";
}) {
  const colorMap = {
    primary: "text-primary",
    success: "text-success",
    warning: "text-warning",
    accent: "text-primary",
  };
  const bgMap = {
    primary: "bg-primary/10",
    success: "bg-success/10",
    warning: "bg-warning/10",
    accent: "bg-accent/30",
  };
  const color = colorMap[tone ?? "primary"];
  const bg = bgMap[tone ?? "primary"];
  return (
    <Card className="shadow-card transition-all hover:shadow-lg">
      <CardContent className="flex flex-col items-center justify-center gap-1 p-4 text-center">
        <div className={`flex size-9 items-center justify-center rounded-full ${bg}`}>
          <Icon className={`size-4 ${color}`} />
        </div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`text-xl font-bold ${color}`}>
          {value}{suffix ?? ""}
        </p>
      </CardContent>
    </Card>
  );
}

function TambahEvaluasi({ pegawai, onDone }: { pegawai: Profile[]; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [userId, setUserId] = useState("");
  const [periode, setPeriode] = useState("");
  const [rating, setRating] = useState("4");
  const [catatan, setCatatan] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!userId) return toast.error("Pilih pegawai.");
    if (!periode.trim()) return toast.error("Periode wajib diisi.");
    setBusy(true);
    const { data: auth } = await supabase.auth.getUser();
    const { error } = await supabase.from("evaluasi").insert({
      user_id: userId,
      periode: periode.trim(),
      rating: Number(rating),
      catatan: catatan.trim() || null,
      dibuat_oleh: auth.user?.id,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Evaluasi tersimpan.");
    setOpen(false);
    setCatatan("");
    onDone();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full"><Plus className="size-4" /> Tambah Evaluasi</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Evaluasi Pegawai</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Pegawai</Label>
            <Select value={userId} onValueChange={setUserId}>
              <SelectTrigger><SelectValue placeholder="Pilih pegawai" /></SelectTrigger>
              <SelectContent>
                {pegawai.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.nama}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Periode</Label>
              <Input value={periode} onChange={(e) => setPeriode(e.target.value)} placeholder="cth: Jun 2026" />
            </div>
            <div className="space-y-1.5">
              <Label>Rating</Label>
              <Select value={rating} onValueChange={setRating}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <SelectItem key={n} value={String(n)}>{n} ★</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Catatan</Label>
            <Textarea value={catatan} onChange={(e) => setCatatan(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={busy}>
            {busy && <Loader2 className="size-4 animate-spin" />} Simpan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
