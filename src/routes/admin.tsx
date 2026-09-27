import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import {
  BarChart3,
  Users,
  Plane,
  Gavel,
  FileDown,
  Loader2,
  Check,
  X,
  Plus,
  Clock,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { createEmployee, deleteEmployee } from "@/lib/admin.functions";
import { RoleGuard } from "@/components/RoleGuard";
import { DashboardShell, type MenuItem } from "@/components/DashboardShell";
import {
  fmtJam,
  fmtTanggal,
  fmtDurasi,
  statusLabel,
  statusVariant,
  cutiLabel,
  todayStr,
} from "@/lib/format";
import { buatLaporanPDF } from "@/lib/pdf";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/admin")({
  ssr: false,
  head: () => ({ meta: [{ title: "Dashboard Admin/HR — Kitongbisa" }] }),
  component: () => (
    <RoleGuard allow="admin">
      <AdminDashboard />
    </RoleGuard>
  ),
});

interface Profile {
  id: string;
  nama: string;
  jabatan: string | null;
  tanggal_masuk: string | null;
  jatah_cuti: number;
  jadwal_id: string | null;
}
interface Jadwal {
  id: string;
  nama: string;
  jam_masuk: string;
  jam_pulang: string;
  toleransi_menit: number;
}
interface AbsRow {
  id: string;
  user_id: string;
  tanggal: string;
  jam_masuk: string | null;
  jam_pulang: string | null;
  status: string;
  durasi_menit: number | null;
  catatan_terlambat: string | null;
}
interface CutiRow {
  id: string;
  user_id: string;
  jenis: string;
  tanggal_mulai: string;
  tanggal_selesai: string;
  jumlah_hari: number;
  status: string;
}
interface SanksiRow {
  id: string;
  user_id: string;
  jenis: string;
  deskripsi: string | null;
  tanggal: string;
}

function AdminDashboard() {
  const [pegawai, setPegawai] = useState<Profile[]>([]);
  const [jadwal, setJadwal] = useState<Jadwal[]>([]);
  const [absHariIni, setAbsHariIni] = useState<AbsRow[]>([]);
  const [semuaAbs, setSemuaAbs] = useState<AbsRow[]>([]);
  const [cuti, setCuti] = useState<CutiRow[]>([]);
  const [sanksi, setSanksi] = useState<SanksiRow[]>([]);
  const [tab, setTab] = useState("statistik");

  const menu: MenuItem[] = [
    { value: "statistik", label: "Beranda", icon: BarChart3 },
    { value: "pegawai", label: "Data Pegawai", icon: Users },
    { value: "cuti", label: "Hak Cuti", icon: Plane },
    { value: "keterlambatan", label: "Keterlambatan", icon: Clock },
    { value: "sanksi", label: "Sanksi", icon: Gavel },
    { value: "laporan", label: "Laporan", icon: FileDown },
  ];

  const nama = useCallback(
    (id: string) => pegawai.find((p) => p.id === id)?.nama ?? "—",
    [pegawai],
  );

  const load = useCallback(async () => {
    const [p, j, a, c, s] = await Promise.all([
      supabase.from("profiles").select("*").order("nama"),
      supabase.from("jadwal").select("*").order("jam_masuk"),
      supabase
        .from("absensi")
        .select("*")
        .order("tanggal", { ascending: false })
        .limit(300),
      supabase.from("cuti").select("*").order("created_at", { ascending: false }),
      supabase.from("sanksi").select("*").order("tanggal", { ascending: false }),
    ]);
    const all = (a.data ?? []) as AbsRow[];
    setPegawai((p.data ?? []) as Profile[]);
    setJadwal((j.data ?? []) as Jadwal[]);
    setSemuaAbs(all);
    setAbsHariIni(all.filter((r) => r.tanggal === todayStr()));
    setCuti((c.data ?? []) as CutiRow[]);
    setSanksi((s.data ?? []) as SanksiRow[]);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const hadir = absHariIni.filter((r) => r.status === "hadir").length;
  const telat = absHariIni.filter((r) => r.status === "terlambat").length;
  const tidakHadir = pegawai.length - absHariIni.length;
  const terlambatSemua = semuaAbs.filter((r) => r.status === "terlambat");

  const setStatusCuti = async (id: string, status: "disetujui" | "ditolak") => {
    const { error } = await supabase.from("cuti").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(`Cuti ${cutiLabel[status].toLowerCase()}.`);
    load();
  };

  const cetakLaporan = () => {
    const baris = semuaAbs.map((r) => ({
      nama: nama(r.user_id),
      tanggal: fmtTanggal(r.tanggal),
      jamMasuk: fmtJam(r.jam_masuk),
      jamPulang: fmtJam(r.jam_pulang),
      status: statusLabel[r.status],
      durasi: fmtDurasi(r.durasi_menit),
    }));
    if (baris.length === 0) return toast.info("Tidak ada data absensi.");
    buatLaporanPDF("Laporan Absensi", "Semua Periode", baris);
    toast.success("Laporan PDF berhasil dibuat.");
  };

  return (
    <DashboardShell title="Dashboard Admin / HR" menu={menu} active={tab} onChange={setTab}>
      <Tabs value={tab} onValueChange={setTab}>
        <p className="mb-4 text-sm text-muted-foreground capitalize">
          {new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </p>

        <TabsContent value="statistik" className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Total Pegawai" value={pegawai.length} />
            <Stat label="Hadir" value={hadir} tone="success" />
            <Stat label="Terlambat" value={telat} tone="warning" />
            <Stat label="Belum Absen" value={Math.max(0, tidakHadir)} tone="destructive" />
          </div>
          <Card className="shadow-card">
            <CardHeader><CardTitle className="text-base">Aktivitas Masuk Hari Ini</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {absHariIni.length === 0 && (
                <p className="text-sm text-muted-foreground">Belum ada absensi hari ini.</p>
              )}
              {absHariIni.map((r) => (
                <div key={r.id} className="flex items-center justify-between border-b border-border pb-2 last:border-0">
                  <div>
                    <p className="text-sm font-medium">{nama(r.user_id)}</p>
                    <p className="text-xs text-muted-foreground">Masuk {fmtJam(r.jam_masuk)}</p>
                  </div>
                  <Badge variant={statusVariant[r.status]}>{statusLabel[r.status]}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pegawai" className="space-y-3">
          <TambahPegawai onDone={load} />
          {pegawai.map((p) => (
            <Card key={p.id} className="shadow-card">
              <CardContent className="flex items-center justify-between gap-2 p-3.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{p.nama}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {p.jabatan ?? "—"} · masuk {fmtTanggal(p.tanggal_masuk)}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    Jatah cuti {p.jatah_cuti} hari ·{" "}
                    {jadwal.find((j) => j.id === p.jadwal_id)?.nama ?? "Tanpa jadwal"}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <EditPegawai profile={p} jadwal={jadwal} onDone={load} />
                  <HapusPegawai profile={p} onDone={load} />
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>



        <TabsContent value="cuti" className="space-y-3">
          {cuti.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">Belum ada pengajuan cuti.</p>
          )}
          {cuti.map((c) => (
            <Card key={c.id} className="shadow-card">
              <CardContent className="flex items-center justify-between p-3.5">
                <div>
                  <p className="text-sm font-medium">{nama(c.user_id)}</p>
                  <p className="text-xs text-muted-foreground">
                    {c.jenis} · {fmtTanggal(c.tanggal_mulai)} – {fmtTanggal(c.tanggal_selesai)} · {c.jumlah_hari} hari
                  </p>
                </div>
                {c.status === "pending" ? (
                  <div className="flex gap-2">
                    <Button size="icon" variant="secondary" onClick={() => setStatusCuti(c.id, "disetujui")}>
                      <Check className="size-4" />
                    </Button>
                    <Button size="icon" variant="destructive" onClick={() => setStatusCuti(c.id, "ditolak")}>
                      <X className="size-4" />
                    </Button>
                  </div>
                ) : (
                  <Badge variant={c.status === "disetujui" ? "default" : "destructive"}>
                    {cutiLabel[c.status]}
                  </Badge>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="keterlambatan" className="space-y-3">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <AlertTriangle className="size-4 text-warning" /> Rekam Jejak Keterlambatan
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {terlambatSemua.length === 0 && (
                <p className="text-sm text-muted-foreground">Tidak ada catatan keterlambatan.</p>
              )}
              {terlambatSemua.map((r) => (
                <div key={r.id} className="flex items-center justify-between gap-2 border-b border-border pb-2 last:border-0">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{nama(r.user_id)}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {fmtTanggal(r.tanggal)} · masuk {fmtJam(r.jam_masuk)}
                      {r.catatan_terlambat ? ` · ${r.catatan_terlambat}` : ""}
                    </p>
                  </div>
                  <TambahSanksi
                    pegawai={pegawai}
                    onDone={load}
                    presetUser={r.user_id}
                    presetJenis="Teguran"
                    presetDeskripsi={`Terlambat pada ${fmtTanggal(r.tanggal)}`}
                    trigger={<Button size="sm" variant="outline"><Gavel className="size-4" /> Sanksi</Button>}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sanksi" className="space-y-3">
          <TambahSanksi pegawai={pegawai} onDone={load} />
          {sanksi.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">Belum ada catatan sanksi.</p>
          )}
          {sanksi.map((s) => (
            <Card key={s.id} className="shadow-card">
              <CardContent className="p-3.5">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{nama(s.user_id)}</p>
                  <Badge variant="destructive">{s.jenis}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {fmtTanggal(s.tanggal)} · {s.deskripsi ?? "—"}
                </p>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="laporan" className="space-y-3">
          <Card className="shadow-card">
            <CardHeader><CardTitle className="text-base">Laporan Absensi PDF</CardTitle></CardHeader>
            <CardContent>
              <p className="mb-4 text-sm text-muted-foreground">
                Unduh rekap seluruh data absensi pegawai dalam format PDF.
              </p>
              <Button onClick={cetakLaporan} className="w-full">
                <FileDown className="size-4" /> Generate Laporan PDF
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </DashboardShell>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "success" | "warning" | "destructive";
}) {
  const color =
    tone === "success"
      ? "text-success"
      : tone === "warning"
        ? "text-warning"
        : tone === "destructive"
          ? "text-destructive"
          : "text-primary";
  return (
    <Card className="shadow-card">
      <CardContent className="p-4 text-center">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`text-3xl font-bold ${color}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

function TambahPegawai({ onDone }: { onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [nama, setNama] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [jabatan, setJabatan] = useState("");
  const [role, setRole] = useState<"pegawai" | "admin" | "pimpinan">("pegawai");
  const [busy, setBusy] = useState(false);
  const create = useServerFn(createEmployee);

  const submit = async () => {
    if (!nama.trim() || !email.trim() || password.length < 6)
      return toast.error("Isi nama, email, dan kata sandi (min 6 karakter).");
    setBusy(true);
    try {
      await create({
        data: {
          nama: nama.trim(),
          email: email.trim(),
          password,
          jabatan: jabatan.trim() || undefined,
          role,
        },
      });
      toast.success("Pegawai baru berhasil ditambahkan.");
      setOpen(false);
      setNama("");
      setEmail("");
      setPassword("");
      setJabatan("");
      setRole("pegawai");
      onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menambah pegawai.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full"><Plus className="size-4" /> Tambah Pegawai</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Tambah Pegawai Baru</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Nama Lengkap</Label>
            <Input value={nama} onChange={(e) => setNama(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Kata Sandi</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Jabatan</Label>
            <Input value={jabatan} onChange={(e) => setJabatan(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Peran</Label>
            <Select value={role} onValueChange={(v) => setRole(v as typeof role)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pegawai">Pegawai</SelectItem>
                <SelectItem value="admin">Admin/HR</SelectItem>
                <SelectItem value="pimpinan">Pimpinan</SelectItem>
              </SelectContent>
            </Select>
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

function EditPegawai({
  profile,
  jadwal,
  onDone,
}: {
  profile: Profile;
  jadwal: Jadwal[];
  onDone: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [jabatan, setJabatan] = useState(profile.jabatan ?? "");
  const [jatah, setJatah] = useState(String(profile.jatah_cuti));
  const [jadwalId, setJadwalId] = useState(profile.jadwal_id ?? "none");
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        jabatan: jabatan.trim() || null,
        jatah_cuti: Number(jatah) || 0,
        jadwal_id: jadwalId === "none" ? null : jadwalId,
      })
      .eq("id", profile.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Data pegawai diperbarui.");
    setOpen(false);
    onDone();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">Edit</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Edit {profile.nama}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Jabatan</Label>
            <Input value={jabatan} onChange={(e) => setJabatan(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Jatah Cuti (hari)</Label>
            <Input type="number" value={jatah} onChange={(e) => setJatah(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Jadwal Kerja</Label>
            <Select value={jadwalId} onValueChange={setJadwalId}>
              <SelectTrigger><SelectValue placeholder="Pilih jadwal" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Tanpa jadwal</SelectItem>
                {jadwal.map((j) => (
                  <SelectItem key={j.id} value={j.id}>
                    {j.nama} ({j.jam_masuk.slice(0, 5)}–{j.jam_pulang.slice(0, 5)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={save} disabled={busy}>
            {busy && <Loader2 className="size-4 animate-spin" />} Simpan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function HapusPegawai({ profile, onDone }: { profile: Profile; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  const del = useServerFn(deleteEmployee);

  const hapus = async () => {
    setBusy(true);
    try {
      await del({ data: { userId: profile.id } });
      toast.success("Pegawai dihapus.");
      onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menghapus.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size="icon" variant="ghost" className="text-destructive hover:bg-destructive/10">
          <Trash2 className="size-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Hapus {profile.nama}?</AlertDialogTitle>
          <AlertDialogDescription>
            Akun dan seluruh data absensi terkait akan dihapus permanen.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Batal</AlertDialogCancel>
          <AlertDialogAction onClick={hapus} disabled={busy}>
            {busy && <Loader2 className="size-4 animate-spin" />} Hapus
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}


function TambahSanksi({
  pegawai,
  onDone,
  presetUser,
  presetJenis,
  presetDeskripsi,
  trigger,
}: {
  pegawai: Profile[];
  onDone: () => void;
  presetUser?: string;
  presetJenis?: string;
  presetDeskripsi?: string;
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [userId, setUserId] = useState(presetUser ?? "");
  const [jenis, setJenis] = useState(presetJenis ?? "Teguran");
  const [deskripsi, setDeskripsi] = useState(presetDeskripsi ?? "");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!userId) return toast.error("Pilih pegawai.");
    setBusy(true);
    const { data: auth } = await supabase.auth.getUser();
    const { error } = await supabase.from("sanksi").insert({
      user_id: userId,
      jenis,
      deskripsi: deskripsi.trim() || null,
      dibuat_oleh: auth.user?.id,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Sanksi dicatat.");
    setOpen(false);
    setDeskripsi("");
    onDone();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button className="w-full"><Plus className="size-4" /> Catat Sanksi / Keterlambatan</Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Catat Sanksi</DialogTitle></DialogHeader>
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
          <div className="space-y-1.5">
            <Label>Jenis</Label>
            <Select value={jenis} onValueChange={setJenis}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Teguran">Teguran</SelectItem>
                <SelectItem value="Peringatan Tertulis">Peringatan Tertulis</SelectItem>
                <SelectItem value="Potongan">Potongan</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Deskripsi</Label>
            <Textarea value={deskripsi} onChange={(e) => setDeskripsi(e.target.value)} />
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
