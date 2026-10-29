import { CompanyConfig, Sale } from '../types';
import { formatDate } from './formatters';
import { ESTADO_PAGO_LABEL, getEstadoPago, getSaldo, getTotalCobrado } from './salePayments';
import { CuentaCorrienteResumen, PagoConContexto } from './cuentaCorriente';

const MARGIN = 10;
const PAGE_W = 210;
const PAGE_H = 297;
const BOTTOM = PAGE_H - 20;

const money = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 2 }).format(
    Number(n) || 0
  );

/**
 * Extracto de cuenta corriente (BR-PAY-020): vectorial con `jspdf`, paginado.
 * NO incluye teléfono ni otros datos de contacto (BR-PAY-019).
 */
export async function exportarCuentaCorrientePDF(
  resumen: CuentaCorrienteResumen,
  pagos: PagoConContexto[],
  empresa?: Partial<CompanyConfig>
): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  let y = 0;

  const header = (conTitulo: boolean) => {
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(13);
    pdf.text(empresa?.nombre || 'Mi Empresa', MARGIN, 16);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    const fiscal = [empresa?.cuit ? `CUIT: ${empresa.cuit}` : '', empresa?.domicilio || '']
      .filter(Boolean)
      .join('  ·  ');
    if (fiscal) pdf.text(fiscal, MARGIN, 21);

    pdf.text(`Emitido: ${formatDate(new Date().toISOString().slice(0, 10))}`, PAGE_W - MARGIN, 16, {
      align: 'right',
    });

    if (conTitulo) {
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(11);
      pdf.text('CUENTA CORRIENTE', MARGIN, 31);
      pdf.setFontSize(9);
      pdf.text(resumen.clienteNombre, MARGIN, 37);
      if (resumen.clienteId) {
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(7.5);
        pdf.text(`Cliente: ${resumen.clienteId}`, MARGIN, 41.5);
      }
      y = 47;
    } else {
      y = 35;
    }
  };

  const saltoSiHaceFalta = (alto = 8) => {
    if (y > BOTTOM - alto) {
      pdf.addPage();
      header(false);
    }
  };

  const tituloSeccion = (texto: string) => {
    saltoSiHaceFalta(12);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8.5);
    pdf.text(texto, MARGIN, y);
    y += 2;
    pdf.setDrawColor(180);
    pdf.line(MARGIN, y, PAGE_W - MARGIN, y);
    y += 5;
  };

  header(true);

  // Totales del cliente
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8.5);
  pdf.text(`Facturado: ${money(resumen.totalFacturado)}`, MARGIN, y);
  pdf.text(`Cobrado: ${money(resumen.totalCobrado)}`, MARGIN + 62, y);
  pdf.text(`Antigüedad: ${resumen.antiguedadDias} días`, MARGIN + 124, y);
  y += 6;
  pdf.setFontSize(10);
  pdf.text(`SALDO PENDIENTE: ${money(resumen.saldo)}`, PAGE_W - MARGIN, y, { align: 'right' });
  y += 10;

  // Detalle de ventas con saldo
  tituloSeccion('Ventas con saldo');
  pdf.setFontSize(7.5);
  resumen.ventas.forEach((s: Sale) => {
    saltoSiHaceFalta();
    pdf.setFont('helvetica', 'normal');
    pdf.text(formatDate(s.fecha), MARGIN, y);
    pdf.text((s.numeroFactura || s.id).slice(0, 30), MARGIN + 20, y);
    pdf.text(money(s.montoTotal), MARGIN + 92, y, { align: 'right' });
    pdf.text(money(getTotalCobrado(s)), MARGIN + 122, y, { align: 'right' });
    pdf.text(money(getSaldo(s)), MARGIN + 152, y, { align: 'right' });
    pdf.text(ESTADO_PAGO_LABEL[getEstadoPago(s)], MARGIN + 158, y);
    y += 4.5;
  });

  if (resumen.ventas.length === 0) {
    pdf.setFont('helvetica', 'italic');
    pdf.text('Sin ventas con saldo pendiente.', MARGIN, y);
    y += 5;
  }

  // Pagos recibidos
  y += 4;
  tituloSeccion('Pagos recibidos');
  pdf.setFontSize(7.5);
  if (pagos.length === 0) {
    pdf.setFont('helvetica', 'italic');
    pdf.text('Sin pagos registrados.', MARGIN, y);
    y += 5;
  } else {
    pagos.forEach(({ pago, venta }) => {
      saltoSiHaceFalta();
      pdf.setFont('helvetica', 'normal');
      pdf.text(formatDate(pago.fecha), MARGIN, y);
      pdf.text((venta.numeroFactura || venta.id).slice(0, 30), MARGIN + 20, y);
      pdf.text(pago.medio || '', MARGIN + 60, y);
      pdf.text(money(pago.monto), PAGE_W - MARGIN, y, { align: 'right' });
      y += 4.5;
    });
  }

  // Saldo final
  saltoSiHaceFalta(16);
  y += 3;
  pdf.setDrawColor(120);
  pdf.line(MARGIN, y, PAGE_W - MARGIN, y);
  y += 7;
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.text(`TOTAL ADEUDADO: ${money(resumen.saldo)}`, PAGE_W - MARGIN, y, { align: 'right' });

  const stamp = new Date().toISOString().slice(0, 10);
  const slug = resumen.clienteNombre.replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase();
  pdf.save(`cuenta-corriente-${slug}-${stamp}.pdf`);
}
