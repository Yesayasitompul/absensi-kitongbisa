
-- ENUMS
CREATE TYPE public.app_role AS ENUM ('pegawai', 'admin', 'pimpinan');
CREATE TYPE public.status_kehadiran AS ENUM ('hadir', 'terlambat', 'izin', 'sakit', 'alpha');
CREATE TYPE public.status_cuti AS ENUM ('pending', 'disetujui', 'ditolak');

-- UPDATED_AT HELPER
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

-- JADWAL
CREATE TABLE public.jadwal (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nama TEXT NOT NULL,
  jam_masuk TIME NOT NULL DEFAULT '08:00',
  jam_pulang TIME NOT NULL DEFAULT '17:00',
  toleransi_menit INT NOT NULL DEFAULT 10,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.jadwal TO authenticated;
GRANT ALL ON public.jadwal TO service_role;
ALTER TABLE public.jadwal ENABLE ROW LEVEL SECURITY;

-- KANTOR (geofence)
CREATE TABLE public.kantor (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nama TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  radius_meter INT NOT NULL DEFAULT 150,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.kantor TO authenticated;
GRANT ALL ON public.kantor TO service_role;
ALTER TABLE public.kantor ENABLE ROW LEVEL SECURITY;

-- PROFILES (Pegawai)
CREATE TABLE public.profiles (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  nama TEXT NOT NULL,
  jabatan TEXT,
  tanggal_masuk DATE,
  jadwal_id UUID REFERENCES public.jadwal(id) ON DELETE SET NULL,
  jatah_cuti INT NOT NULL DEFAULT 12,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- USER ROLES
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- HAS_ROLE FUNCTION
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

-- ABSENSI
CREATE TABLE public.absensi (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
  jam_masuk TIMESTAMPTZ,
  jam_pulang TIMESTAMPTZ,
  lat_masuk DOUBLE PRECISION,
  lng_masuk DOUBLE PRECISION,
  lat_pulang DOUBLE PRECISION,
  lng_pulang DOUBLE PRECISION,
  status status_kehadiran NOT NULL DEFAULT 'hadir',
  durasi_menit INT,
  catatan_terlambat TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, tanggal)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.absensi TO authenticated;
GRANT ALL ON public.absensi TO service_role;
ALTER TABLE public.absensi ENABLE ROW LEVEL SECURITY;

-- CUTI
CREATE TABLE public.cuti (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  jenis TEXT NOT NULL DEFAULT 'Cuti Tahunan',
  tanggal_mulai DATE NOT NULL,
  tanggal_selesai DATE NOT NULL,
  jumlah_hari INT NOT NULL DEFAULT 1,
  keterangan TEXT,
  status status_cuti NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cuti TO authenticated;
GRANT ALL ON public.cuti TO service_role;
ALTER TABLE public.cuti ENABLE ROW LEVEL SECURITY;

-- SANKSI
CREATE TABLE public.sanksi (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  jenis TEXT NOT NULL,
  deskripsi TEXT,
  tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
  dibuat_oleh UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sanksi TO authenticated;
GRANT ALL ON public.sanksi TO service_role;
ALTER TABLE public.sanksi ENABLE ROW LEVEL SECURITY;

-- EVALUASI
CREATE TABLE public.evaluasi (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  periode TEXT NOT NULL,
  rating INT NOT NULL DEFAULT 3,
  catatan TEXT,
  dibuat_oleh UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.evaluasi TO authenticated;
GRANT ALL ON public.evaluasi TO service_role;
ALTER TABLE public.evaluasi ENABLE ROW LEVEL SECURITY;

-- UPDATED_AT TRIGGERS
CREATE TRIGGER trg_jadwal_updated BEFORE UPDATE ON public.jadwal FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_kantor_updated BEFORE UPDATE ON public.kantor FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_absensi_updated BEFORE UPDATE ON public.absensi FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_cuti_updated BEFORE UPDATE ON public.cuti FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- NEW USER HANDLER
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _role app_role;
BEGIN
  INSERT INTO public.profiles (id, nama, jabatan, tanggal_masuk)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nama', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'jabatan',
    CURRENT_DATE
  );
  _role := COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'pegawai');
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, _role)
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS POLICIES
-- user_roles
CREATE POLICY "lihat role sendiri/admin/pimpinan" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'pimpinan'));
CREATE POLICY "admin kelola role" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- profiles
CREATE POLICY "lihat profil" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'pimpinan'));
CREATE POLICY "update profil sendiri" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "admin kelola profil" ON public.profiles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- jadwal
CREATE POLICY "semua lihat jadwal" ON public.jadwal FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin kelola jadwal" ON public.jadwal FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- kantor
CREATE POLICY "semua lihat kantor" ON public.kantor FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin kelola kantor" ON public.kantor FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- absensi
CREATE POLICY "lihat absensi" ON public.absensi FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'pimpinan'));
CREATE POLICY "pegawai input absensi sendiri" ON public.absensi FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "update absensi sendiri/admin" ON public.absensi FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin hapus absensi" ON public.absensi FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

-- cuti
CREATE POLICY "lihat cuti" ON public.cuti FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'pimpinan'));
CREATE POLICY "pegawai ajukan cuti" ON public.cuti FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "update cuti sendiri/admin" ON public.cuti FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin hapus cuti" ON public.cuti FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

-- sanksi
CREATE POLICY "lihat sanksi" ON public.sanksi FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'pimpinan'));
CREATE POLICY "admin kelola sanksi" ON public.sanksi FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- evaluasi
CREATE POLICY "lihat evaluasi" ON public.evaluasi FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'pimpinan'));
CREATE POLICY "pimpinan kelola evaluasi" ON public.evaluasi FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'pimpinan')) WITH CHECK (public.has_role(auth.uid(),'pimpinan'));

-- DEFAULT KANTOR & JADWAL
INSERT INTO public.kantor (nama, latitude, longitude, radius_meter)
VALUES ('Yayasan Kitongbisa', -2.533300, 140.717400, 200);
INSERT INTO public.jadwal (nama, jam_masuk, jam_pulang, toleransi_menit)
VALUES ('Jadwal Reguler', '08:00', '17:00', 15);
