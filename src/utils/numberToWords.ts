// Convert numbers to Spanish currency text (e.g. 310900 -> "trescientos diez mil novecientos con 00/100.-")

const UNIDADES = ['', 'un', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve'];
const DECENAS = ['', 'diez', 'veinte', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'];
const DIEZ_A_DIECINUEVE = ['diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve'];
const VEINTE_A_VEINTINUEVE = ['veinte', 'veintiuno', 'veintidós', 'veintitrés', 'veinticuatro', 'veinticinco', 'veintiséis', 'veintisiete', 'veintiocho', 'veintinueve'];
const CENTENAS = ['', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos', 'seiscientos', 'setecientos', 'ochocientos', 'novecientos'];

function convertirDecenas(num: number): string {
  if (num < 10) return UNIDADES[num];
  if (num >= 10 && num <= 19) return DIEZ_A_DIECINUEVE[num - 10];
  if (num >= 20 && num <= 29) return VEINTE_A_VEINTINUEVE[num - 20];
  
  const decena = Math.floor(num / 10);
  const unidad = num % 10;
  return unidad === 0 ? DECENAS[decena] : `${DECENAS[decena]} y ${UNIDADES[unidad]}`;
}

function convertirCentenas(num: number): string {
  if (num === 100) return 'cien';
  if (num < 100) return convertirDecenas(num);
  
  const centena = Math.floor(num / 100);
  const resto = num % 100;
  return resto === 0 ? CENTENAS[centena] : `${CENTENAS[centena]} ${convertirDecenas(resto)}`;
}

function convertirMiles(num: number): string {
  if (num < 1000) return convertirCentenas(num);
  
  const miles = Math.floor(num / 1000);
  const resto = num % 1000;
  
  let milesTexto = '';
  if (miles === 1) {
    milesTexto = 'mil';
  } else {
    milesTexto = `${convertirCentenas(miles)} mil`;
  }
  
  return resto === 0 ? milesTexto : `${milesTexto} ${convertirCentenas(resto)}`;
}

function convertirMillones(num: number): string {
  if (num < 1000000) return convertirMiles(num);
  
  const millones = Math.floor(num / 1000000);
  const resto = num % 1000000;
  
  let millonesTexto = '';
  if (millones === 1) {
    millonesTexto = 'un millón';
  } else {
    millonesTexto = `${convertirMiles(millones)} millones`;
  }
  
  return resto === 0 ? millonesTexto : `${millonesTexto} ${convertirMiles(resto)}`;
}

export function numberToWordsSpanish(amount: number): string {
  if (isNaN(amount) || amount === 0) return 'cero con 00/100.-';
  
  const entero = Math.floor(Math.abs(amount));
  const decimales = Math.round((Math.abs(amount) - entero) * 100);
  
  const textoEntero = convertirMillones(entero);
  const decimalesStr = decimales < 10 ? `0${decimales}` : `${decimales}`;
  
  return `${textoEntero} con ${decimalesStr}/100.-`;
}
