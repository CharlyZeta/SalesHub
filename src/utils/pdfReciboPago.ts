import { addSystemLog } from './logger';

/**
 * Exporta el recibo a PDF con el mismo mecanismo que el remito y el presupuesto:
 * se clona la hoja en un contenedor de impresión a ancho A4, se rasteriza con
 * `html-to-image` y se pagina con `jsPDF`. Sin dependencias nuevas.
 */
export async function exportarReciboPagoPDF(numeroRecibo: string): Promise<void> {
  const contenido = document.getElementById('recibo-pdf-content');
  if (!contenido) {
    throw new Error('No se encontró el contenido del recibo para generar el PDF.');
  }

  const { toPng } = await import('html-to-image');
  const { jsPDF } = await import('jspdf');

  let area = document.getElementById('print-area-recibo');
  if (!area) {
    area = document.createElement('div');
    area.id = 'print-area-recibo';
    document.body.appendChild(area);
  }

  area.innerHTML = '';
  area.appendChild(contenido.cloneNode(true));

  let dataUrl = '';
  try {
    dataUrl = await toPng(area, {
      cacheBust: true,
      backgroundColor: '#ffffff',
      pixelRatio: 2,
      width: 794,
    });
  } finally {
    area.innerHTML = '';
  }

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const imgProps = pdf.getImageProperties(dataUrl);
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const imgHeight = (imgProps.height * pageWidth) / imgProps.width;

  let restante = imgHeight;
  let posicion = 0;
  pdf.addImage(dataUrl, 'PNG', 0, posicion, pageWidth, imgHeight);
  restante -= pageHeight;

  while (restante > 0) {
    posicion -= pageHeight;
    pdf.addPage();
    pdf.addImage(dataUrl, 'PNG', 0, posicion, pageWidth, imgHeight);
    restante -= pageHeight;
  }

  pdf.save(`Recibo_${numeroRecibo}.pdf`);
  addSystemLog('INFO', 'Pagos', `Recibo ${numeroRecibo} exportado a PDF`);
}
