import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export function exportToExcel<T extends Record<string, unknown>>(
  data: T[],
  filename: string
) {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Dados');

  // Generate file
  XLSX.writeFile(workbook, `${filename}_${formatDate()}.xlsx`);
}

export function exportToPDF<T extends Record<string, unknown>>(
  data: T[],
  filename: string,
  title: string
) {
  const doc = new jsPDF();

  // Title
  doc.setFontSize(18);
  doc.text(title, 14, 22);

  // Date
  doc.setFontSize(10);
  doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, 30);

  // Table
  if (data.length > 0) {
    const headers = Object.keys(data[0]);
    const rows = data.map((item) => headers.map((h) => String(item[h] ?? '')));

    autoTable(doc, {
      head: [headers],
      body: rows,
      startY: 40,
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246] },
    });
  }

  doc.save(`${filename}_${formatDate()}.pdf`);
}

function formatDate(): string {
  const now = new Date();
  return now.toISOString().split('T')[0];
}
