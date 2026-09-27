// Geofencing utilities

/** Jarak antar dua koordinat dalam meter (rumus Haversine). */
export function jarakMeter(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export interface Koordinat {
  latitude: number;
  longitude: number;
  accuracy: number;
}

/** Membaca posisi GPS perangkat. */
export function bacaLokasi(): Promise<Koordinat> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("Perangkat tidak mendukung GPS."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        }),
      (err) => {
        const pesan: Record<number, string> = {
          1: "Izin lokasi ditolak. Aktifkan akses lokasi di browser Anda.",
          2: "Lokasi tidak tersedia. Pastikan GPS aktif.",
          3: "Waktu pembacaan lokasi habis. Coba lagi.",
        };
        reject(new Error(pesan[err.code] ?? "Gagal membaca lokasi."));
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  });
}
