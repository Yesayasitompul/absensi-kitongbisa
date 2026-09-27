# Sistem Absensi Kepegawaian — Yayasan Kitongbisa

Mobile website untuk mencatat kehadiran pegawai secara digital: absen masuk/pulang dengan
validasi lokasi (GPS/geofencing), jadwal kerja, hak cuti, monitoring kedisiplinan, sanksi,
evaluasi pegawai, dan laporan PDF.

Dibangun dengan **TanStack Start (React 19)** di frontend dan **Supabase** (PostgreSQL +
Auth + Row Level Security) sebagai backend.

## Aktor & Hak Akses

| Peran | Dashboard | Kemampuan utama |
| --- | --- | --- |
| Pegawai | `/pegawai` | Absen masuk & pulang (geofence + jadwal), riwayat absensi, jadwal kerja, hak cuti & pengajuan cuti |
| Admin / HR | `/admin` | Kelola data pegawai, statistik harian, persetujuan cuti, catatan keterlambatan & sanksi, laporan PDF |
| Pimpinan | `/pimpinan` | Dashboard statistik, peringkat pegawai terdisiplin, rekap kedisiplinan, evaluasi pegawai, laporan PDF |

Saat login, sistem membaca peran pengguna dari tabel `user_roles` lalu otomatis mengarahkan ke
dashboard yang sesuai.

## Fitur Utama

- **Absensi Masuk** — membaca koordinat GPS perangkat, memvalidasi jarak ke titik kantor
  (Haversine, radius geofence), membandingkan waktu dengan jadwal kerja, lalu menyimpan status
  `hadir` atau `terlambat` beserta koordinatnya.
- **Absensi Pulang** — memvalidasi ulang lokasi, memastikan absensi masuk hari itu ada,
  lalu mengisi jam pulang dan menghitung durasi kerja.
- **Hak Cuti** — jatah cuti per pegawai, sisa cuti, pengajuan, dan status persetujuan.
- **Kedisiplinan** — rekam jejak keterlambatan dan pencatatan sanksi (teguran, peringatan
  tertulis, potongan) oleh Admin/HR.
- **Evaluasi** — catatan evaluasi per pegawai oleh Pimpinan beserta skor kedisiplinan.
- **Laporan PDF** — rekap absensi per periode yang dapat diunduh (jsPDF + autotable).
- **Keamanan data** — seluruh tabel memakai Row Level Security sehingga pegawai hanya dapat
  membaca/menulis datanya sendiri, sedangkan Admin/HR dan Pimpinan mendapat akses sesuai peran.

## Struktur Database

| Tabel | Isi |
| --- | --- |
| `profiles` | data pokok pegawai: nama, jabatan, tanggal masuk, jatah cuti, jadwal kerja |
| `user_roles` | peran setiap akun (`pegawai`, `admin`, `pimpinan`) — dipisah dari profil |
| `jadwal` | acuan jam kerja (jam masuk, jam pulang, toleransi keterlambatan) |
| `kantor` | titik lokasi & radius geofence |
| `absensi` | jam masuk, jam pulang, koordinat, status, durasi kerja, catatan keterlambatan |
| `cuti` | pengajuan cuti beserta statusnya |
| `sanksi` | catatan pelanggaran/sanksi dari Admin/HR |
| `evaluasi` | catatan dan skor evaluasi dari Pimpinan |

Skema lengkap — tabel, relasi, ENUM, trigger, seed awal, dan seluruh kebijakan Row Level
Security — tersimpan sebagai berkas migrasi di `supabase/migrations/`.

## Menjalankan Proyek

Prasyarat: [Bun](https://bun.sh) (atau Node 20+) dan akses ke proyek Supabase.

```bash
bun install
cp .env.example .env   # isi nilai kredensial Supabase Anda
bun run dev
```

Perintah lain:

```bash
bun run build      # build produksi
bun run lint       # ESLint
bun run format     # Prettier
```

Konfigurasi backend (URL & kunci publik Supabase) dibaca dari variabel lingkungan — lihat
`.env.example`. Nilai-nilai tersebut diambil dari halaman pengaturan project Supabase Anda.

## Catatan Penting

- Berkas `.env` **tidak** ikut dikumpulkan ke repository. Buat sendiri dari `.env.example`.
- Data aplikasi (absensi, cuti, sanksi) berada di backend Supabase Anda, bukan di dalam kode ini.
- Saat dipindahkan ke hosting di luar Lovable, gambar logo perlu diimpor sebagai berkas
  `src/assets/kbf-logo.png` dan path importnya di `src/routes/auth.tsx`, `src/components/PageShell.tsx`,
  serta `src/components/DashboardShell.tsx` disesuaikan.
- Radius dan titik kantor geofence diatur pada tabel `kantor`.

## Teknis

- React 19, TanStack Start v1 (SSR + server functions), TanStack Router & Query
- Tailwind CSS v4, komponen UI berbasis Radix (shadcn/ui)
- Supabase JS: autentikasi email, PostgreSQL, Row Level Security
- jsPDF + jspdf-autotable untuk generator laporan
- Geolocation API browser untuk pengambilan koordinat absensi
