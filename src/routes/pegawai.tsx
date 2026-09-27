import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Clock,
  LogIn,
  LogOut as LogOutIcon,
  MapPin,
  Loader2,
  CalendarDays,
  History,
  Plane,
  Plus,
  Palmtree,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { RoleGuard } from "@/components/RoleGuard";
import { DashboardShell, type MenuItem } from "@/components/DashboardShell";
import { bacaLokasi, jarakMeter } from "@/lib/geo";
import {
  fmtJam,
  fmtTanggal,
  fmtDurasi,
  statusLabel,
  statusVariant,
  cutiLabel,
  todayStr,
} from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/pegawai")({
  ssr: false,
  head: () => ({ meta: [{ title: "Dashboard Pegawai — Kitongbisa" }] }),
  component: () => (
    <RoleGuard allow="pegawai">
      <PegawaiDashboard />
    </RoleGuard>
  ),
});

interface Absensi {
  id: string;
  tanggal: string;
  jam_masuk: string | null;
  jam_pulang: string | null;
  status: string;
  durasi_menit: number | null;
  catatan_terlambat: string | null;
}
interface Jadwal {
  id: string;
  nama: string;
  jam_masuk: string;
  jam_pulang: string;
  toleransi_menit: number;
}
interface Kantor {
  nama: string;
  latitude: number;
  longitude: number;
  radius_meter: number;
}
interface Cuti {
  id: string;
  jenis: string;
  tanggal_mulai: string;
  tanggal_selesai: string;
  jumlah_hari: number;
  status: string;
  keterangan: string | null;
}

function PegawaiDashboard() {
  const { user, profile } = useAuth();
  const [today, setToday] = useState<Absensi | null>(null);
  const [riwayat, setRiwayat] = useState<Absensi[]>([]);
  const [jadwal, setJadwal] = useState<Jadwal | null>(null);
  const [kantor, setKantor] = useState<Kantor | null>(null);
  const [cuti, setCuti] = useState<Cuti[]>([]);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState("absensi");
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const menu: MenuItem[] = [
    { value: "absensi", label: "Beranda", icon: Clock },
    { value: "riwayat", label: "Riwayat", icon: History },
    { value: "jadwal", label: "Jadwal", icon: CalendarDays },
    { value: "cuti", label: "Cuti", icon: Plane },
  ];

  const load = useCallback(async () => {
    if (!user) return;
    const [abs, jad, kan, ct] = await Promise.all([
      supabase
        .from("absensi")
        .select("*")
        .eq("user_id", user.id)
        .order("tanggal", { ascending: false })
        .limit(60),
      profile?.jadwal_id
        ? supabase.from("jadwal").select("*").eq("id", profile.jadwal_id).maybeSingle()
        : supabase.from("jadwal").select("*").order("created_at").limit(1).maybeSingle(),
      supabase.from("kantor").select("*").order("created_at").limit(1).maybeSingle(),
      supabase
        .from("cuti")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
    ]);
    const rows = (abs.data ?? []) as Absensi[];
    setRiwayat(rows);
    setToday(rows.find((r) => r.tanggal === todayStr()) ?? null);
    setJadwal((jad.data as Jadwal) ?? null);
    setKantor((kan.data as Kantor) ?? null);
    setCuti((ct.data ?? []) as Cuti[]);
  }, [user, profile?.jadwal_id]);

  useEffect(() => {
    load();
  }, [load]);

  const validasiLokasi = async () => {
    if (!kantor) throw new Error("Lokasi kantor belum diatur. Hubungi Admin.");
    const lok = await bacaLokasi();
    const jarak = jarakMeter(
      lok.latitude,
      lok.longitude,
      kantor.latitude,
      kantor.longitude,
    );
    if (jarak > kantor.radius_meter) {
      throw new Error(
        `Anda berada ${Math.round(jarak)} m dari kantor (maks ${kantor.radius_meter} m). Absensi ditolak.`,
      );
    }
    return lok;
  };

  const absenMasuk = async () => {
    if (!user) return;
    if (today?.jam_masuk) return toast.info("Anda sudah absen masuk hari ini.");
    setBusy(true);
    try {
      const lok = await validasiLokasi();
      const now = new Date();
      let status: "hadir" | "terlambat" = "hadir";
      let catatan: string | null = null;
      if (jadwal) {
        const [jh, jm] = jadwal.jam_masuk.split(":").map(Number);
        const batas = new Date(now);
        batas.setHours(jh, jm + jadwal.toleransi_menit, 0, 0);
        if (now > batas) {
          status = "terlambat";
          const telat = Math.round(
            (now.getTime() - new Date(now).setHours(jh, jm, 0, 0)) / 60000,
          );
          catatan = `Terlambat ${telat} menit`;
        }
      }
      const { error } = await supabase.from("absensi").upsert(
        {
          user_id: user.id,
          tanggal: todayStr(),
          jam_masuk: now.toISOString(),
          lat_masuk: lok.latitude,
          lng_masuk: lok.longitude,
          status: status,
          catatan_terlambat: catatan,
        },
        { onConflict: "user_id,tanggal" },
      );
      if (error) throw error;
      toast.success(
        status === "terlambat" ? "Absen masuk tercatat (Terlambat)." : "Absen masuk berhasil.",
      );
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal absen masuk.");
    } finally {
      setBusy(false);
    }
  };

  const absenPulang = async () => {
    if (!user) return;
    if (!today?.jam_masuk) return toast.error("Anda belum absen masuk hari ini.");
    if (today?.jam_pulang) return toast.info("Anda sudah absen pulang hari ini.");
    setBusy(true);
    try {
      const lok = await validasiLokasi();
      const now = new Date();
      const durasi = Math.round(
        (now.getTime() - new Date(today.jam_masuk).getTime()) / 60000,
      );
      const { error } = await supabase
        .from("absensi")
        .update({
          jam_pulang: now.toISOString(),
          lat_pulang: lok.latitude,
          lng_pulang: lok.longitude,
          durasi_menit: durasi,
        })
        .eq("id", today.id);
      if (error) throw error;
      toast.success(`Absen pulang berhasil. Durasi kerja ${fmtDurasi(durasi)}.`);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal absen pulang.");
    } finally {
      setBusy(false);
    }
  };

  const terpakaiCuti = cuti
    .filter((c) => c.status === "disetujui")
    .reduce((s, c) => s + c.jumlah_hari, 0);
  const sisaCuti = (profile?.jatah_cuti ?? 0) - terpakaiCuti;

  const metrik = riwayat.reduce(
    (acc, r) => {
      if (r.status === "terlambat") acc.terlambat += 1;
      else if (r.status === "alpha") acc.absen += 1;
      else acc.hadir += 1;
      return acc;
    },
    { hadir: 0, terlambat: 0, absen: 0 },
  );

  const jamDigital = now.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const tanggalPanjang = now.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const namaLokasi = kantor?.nama ?? "Kantor Yayasan Kitongbisa";

  return (
    <DashboardShell title="Dashboard Pegawai" menu={menu} active={tab} onChange={setTab}>
      <Tabs value={tab} onValueChange={setTab}>
        {/* Sapaan */}
        <div className="mb-4">
          <p className="text-xl font-bold text-foreground">
            Halo, {profile?.nama ?? "Pegawai"}!
          </p>
          <p className="text-sm capitalize text-muted-foreground">
            {tanggalPanjang}
          </p>
        </div>

        {/* ABSENSI */}
        <TabsContent value="absensi" className="space-y-4">
          {/* Card Jam Real-time */}
          <Card className="overflow-hidden shadow-card">
            <div className="flex flex-col items-center gap-2 bg-gradient-primary p-6 text-primary-foreground">
              <Clock className="size-10 opacity-90" />
              <p className="font-mono text-4xl font-bold tracking-widest tabular-nums">
                {jamDigital.replace(/\./g, ":")}
              </p>
              <p className="flex items-center gap-1 text-sm opacity-90">
                <MapPin className="size-4" /> {namaLokasi}
              </p>
            </div>
          </Card>

          {/* Card Jadwal Kerja Hari Ini */}
          <Card className="shadow-card">
            <CardContent className="p-4">
              <p className="mb-3 text-sm font-semibold text-foreground">
                Jadwal Kerja Hari Ini
              </p>
              <div className="flex items-center gap-3">
                <div className="flex flex-1 items-center gap-2 rounded-full bg-secondary px-4 py-2.5">
                  <LogIn className="size-4 text-primary" />
                  <div>
                    <p className="text-[11px] text-muted-foreground">Jam Masuk</p>
                    <p className="text-sm font-bold text-foreground">
                      {jadwal ? jadwal.jam_masuk.slice(0, 5) : "--:--"}
                    </p>
                  </div>
                </div>
                <div className="flex flex-1 items-center gap-2 rounded-full bg-secondary px-4 py-2.5">
                  <LogOutIcon className="size-4 text-primary" />
                  <div>
                    <p className="text-[11px] text-muted-foreground">Jam Pulang</p>
                    <p className="text-sm font-bold text-foreground">
                      {jadwal ? jadwal.jam_pulang.slice(0, 5) : "--:--"}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tombol Absensi */}
          <div className="flex gap-3">
            <Button
              className="h-14 flex-1 text-base transition-all"
              onClick={absenMasuk}
              disabled={busy || !!today?.jam_masuk}
            >
              {busy ? (
                <Loader2 className="size-5 animate-spin" />
              ) : (
                <LogIn className="size-5" />
              )}
              Absen Masuk
            </Button>
            <Button
              variant="secondary"
              className="h-14 flex-1 text-base transition-all"
              onClick={absenPulang}
              disabled={busy || !today?.jam_masuk || !!today?.jam_pulang}
            >
              {busy ? (
                <Loader2 className="size-5 animate-spin" />
              ) : (
                <LogOutIcon className="size-5" />
              )}
              Absen Pulang
            </Button>
          </div>

          {/* Status Hari Ini */}
          <Card className="shadow-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Status Hari Ini</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl bg-secondary p-3 text-center">
                  <p className="text-xs text-muted-foreground">Masuk</p>
                  <p className="text-xl font-bold text-foreground">
                    {today?.jam_masuk ? fmtJam(today.jam_masuk) : "--:--"}
                  </p>
                </div>
                <div className="rounded-xl bg-secondary p-3 text-center">
                  <p className="text-xs text-muted-foreground">Pulang</p>
                  <p className="text-xl font-bold text-foreground">
                    {today?.jam_pulang ? fmtJam(today.jam_pulang) : "--:--"}
                  </p>
                </div>
              </div>
              {today && (
                <div className="flex items-center justify-center gap-2">
                  <span className="text-sm text-muted-foreground">Status:</span>
                  <Badge variant={statusVariant[today.status]}>
                    {statusLabel[today.status]}
                  </Badge>
                  {today.catatan_terlambat && (
                    <span className="text-xs text-muted-foreground">
                      ({today.catatan_terlambat})
                    </span>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Ringkasan Metrik Kehadiran */}
          <div className="grid grid-cols-3 gap-3">
            <StatBox label="Hadir" value={metrik.hadir} accent unit="kali" />
            <StatBox label="Terlambat" value={metrik.terlambat} unit="kali" />
            <StatBox label="Absen" value={metrik.absen} unit="kali" />
          </div>
        </TabsContent>


        {/* RIWAYAT */}
        <TabsContent value="riwayat" className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground">
            Riwayat Absensi
          </h2>
          {riwayat.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Belum ada riwayat absensi.
            </p>
          )}
          {riwayat.map((r) => (
            <Card key={r.id} className="shadow-card">
              <CardContent className="flex items-center justify-between p-3.5">
                <div>
                  <p className="text-sm font-medium">{fmtTanggal(r.tanggal)}</p>
                  <p className="text-xs text-muted-foreground">
                    {fmtJam(r.jam_masuk)} – {fmtJam(r.jam_pulang)} ·{" "}
                    {fmtDurasi(r.durasi_menit)}
                  </p>
                </div>
                <Badge variant={statusVariant[r.status]}>
                  {statusLabel[r.status]}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* JADWAL */}
        <TabsContent value="jadwal" className="space-y-4">
          <JadwalKerja jadwal={jadwal} now={now} />

          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-base">Data Kepegawaian</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Row label="Nama" value={profile?.nama ?? "-"} />
              <Row label="Jabatan" value={profile?.jabatan ?? "-"} />
              <Row label="Tanggal Masuk" value={fmtTanggal(profile?.tanggal_masuk ?? null)} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* CUTI */}
        <TabsContent value="cuti" className="space-y-4">
          <h1 className="text-xl font-bold text-foreground transition-all">
            Hak Cuti
          </h1>

          {/* Card Sisa Hak Cuti */}
          <Card className="overflow-hidden shadow-card transition-all">
            <div className="bg-gradient-primary p-6 text-primary-foreground">
              <div className="flex items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-foreground/20">
                  <Palmtree className="size-5" />
                </div>
                <p className="text-sm font-semibold opacity-90">
                  Sisa hak cuti Tahun 2026
                </p>
              </div>

              <div className="mt-5 grid grid-cols-3 gap-3">
                <div className="rounded-xl bg-primary-foreground/10 p-3 text-center backdrop-blur-sm transition-all">
                  <p className="text-2xl font-bold tabular-nums">
                    {profile?.jatah_cuti ?? 0}
                  </p>
                  <p className="mt-1 text-[11px] font-medium opacity-80">
                    Total
                  </p>
                </div>
                <div className="rounded-xl bg-primary-foreground/10 p-3 text-center backdrop-blur-sm transition-all">
                  <p className="text-2xl font-bold tabular-nums">
                    {terpakaiCuti}
                  </p>
                  <p className="mt-1 text-[11px] font-medium opacity-80">
                    Terpakai
                  </p>
                </div>
                <div className="rounded-xl bg-primary-foreground/15 p-3 text-center backdrop-blur-sm transition-all">
                  <p className="text-2xl font-bold tabular-nums">
                    {sisaCuti}
                  </p>
                  <p className="mt-1 text-[11px] font-medium opacity-80">
                    Sisa
                  </p>
                </div>
              </div>
            </div>
          </Card>

          <AjukanCuti userId={user?.id} sisa={sisaCuti} onDone={load} />

          <h2 className="text-sm font-semibold text-muted-foreground">
            Riwayat Cuti
          </h2>
          {cuti.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Belum ada pengajuan cuti.
            </p>
          )}
          {cuti.map((c) => (
            <Card
              key={c.id}
              className="shadow-card transition-all hover:shadow-md"
            >
              <CardContent className="flex items-center justify-between p-3.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{c.jenis}</p>
                  <p className="text-xs text-muted-foreground">
                    {fmtTanggal(c.tanggal_mulai)} –{" "}
                    {fmtTanggal(c.tanggal_selesai)} · {c.jumlah_hari} hari
                  </p>
                </div>
                <Badge
                  variant={
                    c.status === "disetujui"
                      ? "default"
                      : c.status === "ditolak"
                        ? "destructive"
                        : "secondary"
                  }
                >
                  {cutiLabel[c.status]}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </DashboardShell>
  );
}

const NAMA_HARI = [
  "Senin",
  "Selasa",
  "Rabu",
  "Kamis",
  "Jumat",
  "Sabtu",
  "Minggu",
];

function JadwalKerja({ jadwal, now }: { jadwal: Jadwal | null; now: Date }) {
  // getDay(): 0=Minggu..6=Sabtu -> index Senin..Minggu (0..6)
  const idxHariIni = (now.getDay() + 6) % 7;

  // Rentang minggu ini (Senin s/d Minggu)
  const senin = new Date(now);
  senin.setDate(now.getDate() - idxHariIni);
  const minggu = new Date(senin);
  minggu.setDate(senin.getDate() + 6);
  const fmtRange = (d: Date) =>
    d.toLocaleDateString("id-ID", { day: "numeric", month: "short" });

  const jamMasuk = jadwal ? jadwal.jam_masuk.slice(0, 5) : null;
  const jamPulang = jadwal ? jadwal.jam_pulang.slice(0, 5) : null;
  const jamMulaiNum = jadwal ? Number(jadwal.jam_masuk.slice(0, 2)) : 8;

  const hariList = NAMA_HARI.map((nama, i) => {
    const libur = i >= 5; // Sabtu & Minggu
    const shift = libur ? "Libur" : jamMulaiNum < 12 ? "Pagi" : "Sore";
    return {
      nama,
      libur,
      shift,
      jam: libur || !jadwal ? null : `${jamMasuk} – ${jamPulang}`,
      isToday: i === idxHariIni,
    };
  });

  return (
    <>
      {/* Sorotan Minggu Ini */}
      <Card className="overflow-hidden shadow-card">
        <div className="bg-gradient-primary p-5 text-primary-foreground">
          <div className="flex items-center gap-2 text-sm opacity-90">
            <CalendarDays className="size-4" /> Minggu Ini
          </div>
          <p className="mt-1 text-xs opacity-80">
            {fmtRange(senin)} – {fmtRange(minggu)}
          </p>
          <div className="mt-4 flex items-end justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide opacity-80">
                Shift {jadwal?.nama ?? "Reguler"}
              </p>
              <p className="mt-0.5 text-2xl font-bold tabular-nums">
                {jadwal ? `${jamMasuk} – ${jamPulang}` : "--:-- – --:--"}
              </p>
            </div>
            <span className="rounded-full bg-primary-foreground/20 px-3 py-1 text-xs font-semibold">
              Senin – Jumat
            </span>
          </div>
        </div>
      </Card>

      {/* Daftar Harian */}
      <Card className="shadow-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Jadwal Harian</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {!jadwal && (
            <p className="py-2 text-sm text-muted-foreground">
              Jadwal belum diatur oleh Admin.
            </p>
          )}
          {hariList.map((h) => (
            <div
              key={h.nama}
              className={cn(
                "flex items-center justify-between rounded-xl border px-4 py-3 transition-colors",
                h.isToday
                  ? "border-primary bg-primary/5"
                  : "border-border bg-card",
              )}
            >
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold",
                    h.libur
                      ? "bg-muted text-muted-foreground"
                      : "bg-secondary text-primary",
                  )}
                >
                  {h.nama.slice(0, 3)}
                </span>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {h.nama}
                    {h.isToday && (
                      <span className="ml-2 text-[11px] font-medium text-primary">
                        Hari ini
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {h.jam ?? "Tidak ada jam kerja"}
                  </p>
                </div>
              </div>
              <Badge variant={h.libur ? "outline" : "secondary"}>
                {h.shift}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </>
  );
}



function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border pb-2 last:border-0 last:pb-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}

function StatBox({
  label,
  value,
  accent,
  unit = "hari",
}: {
  label: string;
  value: number;
  accent?: boolean;
  unit?: string;
}) {
  return (
    <Card className="shadow-card transition-all">
      <CardContent className="p-4 text-center">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p
          className={`text-3xl font-bold ${accent ? "text-primary" : "text-foreground"}`}
        >
          {value}
        </p>
        {unit && <p className="text-xs text-muted-foreground">{unit}</p>}
      </CardContent>
    </Card>
  );
}

function AjukanCuti({
  userId,
  sisa,
  onDone,
}: {
  userId?: string;
  sisa: number;
  onDone: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [mulai, setMulai] = useState("");
  const [selesai, setSelesai] = useState("");
  const [jenis, setJenis] = useState("Cuti Tahunan");
  const [ket, setKet] = useState("");
  const [busy, setBusy] = useState(false);

  const hari =
    mulai && selesai
      ? Math.max(
          1,
          Math.round(
            (new Date(selesai).getTime() - new Date(mulai).getTime()) /
              86400000,
          ) + 1,
        )
      : 0;

  const submit = async () => {
    if (!userId) return;
    if (!mulai || !selesai) return toast.error("Tanggal wajib diisi.");
    if (hari < 1) return toast.error("Rentang tanggal tidak valid.");
    if (hari > sisa) return toast.error("Jumlah hari melebihi sisa cuti.");
    setBusy(true);
    const { error } = await supabase.from("cuti").insert({
      user_id: userId,
      jenis,
      tanggal_mulai: mulai,
      tanggal_selesai: selesai,
      jumlah_hari: hari,
      keterangan: ket.trim() || null,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Pengajuan cuti terkirim.");
    setOpen(false);
    setMulai("");
    setSelesai("");
    setKet("");
    onDone();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full">
          <Plus className="size-4" /> Ajukan Cuti
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajukan Cuti</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Jenis</Label>
            <Input value={jenis} onChange={(e) => setJenis(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Mulai</Label>
              <Input
                type="date"
                value={mulai}
                onChange={(e) => setMulai(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Selesai</Label>
              <Input
                type="date"
                value={selesai}
                onChange={(e) => setSelesai(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Keterangan</Label>
            <Textarea value={ket} onChange={(e) => setKet(e.target.value)} />
          </div>
          {hari > 0 && (
            <p className="text-sm text-muted-foreground">
              Total: <span className="font-semibold">{hari} hari</span>
            </p>
          )}
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={busy}>
            {busy && <Loader2 className="size-4 animate-spin" />}
            Kirim
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
