/**
 * Servidor falso que imita la API REST de WooCommerce (solo para probar el merge).
 * Se levanta con: node scripts/mock-woo-server.mjs  (puerto 4141)
 * No forma parte de la app: es una herramienta de verificación manual.
 */
import http from 'node:http';

const products = [
  { id: 10, sku: 'SKU-10', name: 'Producto de tienda', price: '2500', stock_quantity: 7, status: 'publish', categories: [{ name: 'Comercial' }] },
  { id: 11, sku: 'SKU-11', name: 'Producto nuevo', price: '500', stock_quantity: 1, status: 'publish', categories: [{ name: 'Accesorios' }] },
];

const customers = [
  { id: 5, email: 'ana@x.com', first_name: 'Ana', last_name: 'Pérez', billing: { first_name: 'Ana', last_name: 'Pérez', city: 'Santa Fe', phone: '3425551234' } },
  { id: 6, email: 'luis@x.com', first_name: 'Luis', last_name: 'Gómez', billing: { first_name: 'Luis', last_name: 'Gómez' } },
];

const server = http.createServer((req, res) => {
  const url = new URL(req.url || '/', 'http://localhost');
  const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };

  if (url.pathname.includes('/products')) {
    res.writeHead(200, headers);
    res.end(JSON.stringify(url.searchParams.get('page') === '2' ? [] : products));
    return;
  }
  if (url.pathname.includes('/customers')) {
    res.writeHead(200, headers);
    res.end(JSON.stringify(url.searchParams.get('page') === '2' ? [] : customers));
    return;
  }
  res.writeHead(404, headers);
  res.end(JSON.stringify({ message: 'not found' }));
});

server.listen(4141, '127.0.0.1', () => console.log('[mock-woo] escuchando en http://127.0.0.1:4141'));
