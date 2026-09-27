export const fmtJam = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "-";

export const fmtTanggal = (d: string | null) =>
  d
    ? new Date(d).toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "-";

export const fmtTanggalPendek = (d: string | null) =>
  d
    ? new Date(d).toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
      })
    : "-";

export const fmtDurasi = (menit: number | null) => {
  if (menit == null) return "-";
  const j = Math.floor(menit / 60);
  const m = menit % 60;
  return `${j}j ${m}m`;
};

export const statusLabel: Record<string, string> = {
  hadir: "Hadir",
  terlambat: "Terlambat",
  izin: "Izin",
  sakit: "Sakit",
  alpha: "Tidak Hadir",
};

export const statusVariant: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  hadir: "default",
  terlambat: "secondary",
  izin: "outline",
  sakit: "outline",
  alpha: "destructive",
};

export const cutiLabel: Record<string, string> = {
  pending: "Menunggu",
  disetujui: "Disetujui",
  ditolak: "Ditolak",
};

export const todayStr = () => new Date().toISOString().slice(0, 10);
