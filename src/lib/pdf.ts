import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export interface BarisLaporan {
  nama: string;
  tanggal: string;
  jamMasuk: string;
  jamPulang: string;
  status: string;
  durasi: string;
}

export function buatLaporanPDF(
  judul: string,
  periode: string,
  baris: BarisLaporan[],
) {
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text("Yayasan Kitongbisa", 14, 18);
  doc.setFontSize(12);
  doc.text(judul, 14, 26);
  doc.setFontSize(10);
  doc.setTextColor(110);
  doc.text(`Periode: ${periode}`, 14, 33);
  doc.text(`Dicetak: ${new Date().toLocaleString("id-ID")}`, 14, 38);

  autoTable(doc, {
    startY: 44,
    head: [["Nama", "Tanggal", "Masuk", "Pulang", "Status", "Durasi"]],
    body: baris.map((b) => [
      b.nama,
      b.tanggal,
      b.jamMasuk,
      b.jamPulang,
      b.status,
      b.durasi,
    ]),
    styles: { fontSize: 9, cellPadding: 2.5 },
    headStyles: { fillColor: [21, 128, 130], textColor: 255 },
    alternateRowStyles: { fillColor: [240, 248, 248] },
  });

  doc.save(`${judul.replace(/\s+/g, "_")}_${periode}.pdf`);
}
