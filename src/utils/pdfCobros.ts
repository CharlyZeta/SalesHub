import { CompanyConfig, Sale } from '../types';
import { formatDate } from './formatters';
import { getEstadoPago, getSaldo, ESTADO_PAGO_LABEL, getTotalCobrado } from './salePayments';
import { ResumenCobros } from './cobrosPendientes';

const money = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 2 }).format(
    Number(n) || 0
  );

const MARGIN = 10;
const PAGE_W = 210;
const PAGE_H = 297;
const BOTTOM = PAGE_H - 18;

/** Columnas del listado: ancho en mm (suma 190 = ancho útil de A4). */
const COLS = [
  { key: 'fecha', label: 'Fecha', w: 18, align: 'left' as const },
  { key: 'cliente', label: 'Cliente', w: 45, align: 'left' as const },
  { key: 'comprobante', label: 'Comprobante', w: 32, align: 'left' as const },
  { key: 'total', label: 'Total', w: 25, align: 'right' as const },
  { key: 'cobrado', label: 'Cobrado', w: 24, align: 'right' as const },
  { key: 'saldo', label: 'Saldo', w: 24, align: 'right' as const },
  { key: 'estado', label: 'Estado', w: 22, align: 'left' as const },
];

const rowValues = (s: Sale): string[] => [
  formatDate(s.fecha),
  `${s.clienteNombre} ${s.clienteApellido || ''}`.trim(),
  s.numeroFactura || s.id,
  money(s.montoTotal),
  money(getTotalCobrado(s)),
  money(getSaldo(s)),
  ESTADO_PAGO_LABEL[getEstadoPago(s)],
];

/**
 * Genera el PDF de cobros pendientes con `jspdf` en modo VECTORIAL
 * (BR-PAY-012): texto y líneas, sin captura de imagen. El resultado es liviano,
 * nítido y con texto seleccionable.
 */
export async function exportarCobrosPendientesPDF(
  ventas: Sale[],
  resumen: ResumenCobros,
  empresa?: Partial<CompanyConfig>
): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const drawHeader = (conTitulo: boolean) => {
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(13);
    pdf.text(empresa?.nombre || 'Mi Empresa', MARGIN, 16);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    const fiscal = [empresa?.cuit ? `CUIT: ${empresa.cuit}` : '', empresa?.domicilio || '', empresa?.telefono || '']
      .filter(Boolean)
      .join('  ·  ');
    if (fiscal) pdf.text(fiscal, MARGIN, 21);

    pdf.setFontSize(8);
    pdf.text(`Emitido: ${formatDate(new Date().toISOString().slice(0, 10))}`, PAGE_W - MARGIN, 16, { align: 'right' });

    if (conTitulo) {
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(11);
      pdf.text('COBROS PENDIENTES', MARGIN, 30);
    }
  };

  const drawTableHead = (y: number): number => {
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7.5);
    let x = MARGIN;
    COLS.forEach((c) => {
      const tx = c.align === 'right' ? x + c.w - 1 : x;
      pdf.text(c.label, tx, y, { align: c.align === 'right' ? 'right' : 'left' });
      x += c.w;
    });
    pdf.setDrawColor(180);
    pdf.line(MARGIN, y + 1.5, PAGE_W - MARGIN, y + 1.5);
    return y + 5;
  };

  drawHeader(true);
  let y = drawTableHead(35);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7.5);

  ventas.forEach((s) => {
    if (y > BOTTOM) {
      pdf.addPage();
      drawHeader(false);
      y = drawTableHead(35);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7.5);
    }
    const values = rowValues(s);
    let x = MARGIN;
    COLS.forEach((c, i) => {
      const valor = values[i] || '';
      const maxChars = Math.floor(c.w / 1.55);
      const texto = valor.length > maxChars ? `${valor.slice(0, maxChars - 1)}…` : valor;
      const tx = c.align === 'right' ? x + c.w - 1 : x;
      pdf.text(texto, tx, y, { align: c.align === 'right' ? 'right' : 'left' });
      x += c.w;
    });
    pdf.setDrawColor(230);
    pdf.line(MARGIN, y + 1.5, PAGE_W - MARGIN, y + 1.5);
    y += 5;
  });

  // Resumen final
  if (y > BOTTOM - 20) {
    pdf.addPage();
    drawHeader(false);
    y = 35;
  }
  pdf.setDrawColor(120);
  pdf.line(MARGIN, y + 1, PAGE_W - MARGIN, y + 1);
  y += 6;
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8.5);
  pdf.text(`Ventas pendientes: ${resumen.cantidad}`, MARGIN, y);
  pdf.text(`Clientes con deuda: ${resumen.clientesConDeuda}`, MARGIN, y + 5);
  pdf.text(`Total facturado: ${money(resumen.totalFacturado)}`, PAGE_W - MARGIN, y, { align: 'right' });
  pdf.text(`Total cobrado: ${money(resumen.totalCobrado)}`, PAGE_W - MARGIN, y + 5, { align: 'right' });

  pdf.setFontSize(10);
  pdf.text(`TOTAL A COBRAR: ${money(resumen.totalAdeudado)}`, PAGE_W - MARGIN, y + 12, { align: 'right' });

  const stamp = new Date().toISOString().slice(0, 10);
  pdf.save(`cobros-pendientes-${stamp}.pdf`);
}
