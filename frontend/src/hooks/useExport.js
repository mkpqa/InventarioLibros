/**
 * useExport.js — Exportación a Excel y PDF
 * Usa SheetJS (xlsx) y jsPDF + autotable.
 * Exportaciones lazy-importadas para no inflar el bundle inicial.
 */

export async function exportarExcel(datos, nombreArchivo) {
  const XLSX = await import('xlsx');
  const ws   = XLSX.utils.json_to_sheet(datos);
  const wb   = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Reporte');
  XLSX.writeFile(wb, `${nombreArchivo}.xlsx`);
}

export async function exportarPDF(columnas, filas, titulo, nombreArchivo) {
  const { default: jsPDF }    = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');
  const doc = new jsPDF({ orientation: 'landscape' });
  doc.setFontSize(14);
  doc.text(titulo, 14, 16);
  autoTable(doc, {
    head:    [columnas],
    body:    filas,
    startY: 24,
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 249, 250] },
  });
  doc.save(`${nombreArchivo}.pdf`);
}
