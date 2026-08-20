import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import {defineConfig} from 'vite';

const andreaniTokenCache = new Map<string, { token: string, expires: number }>();

async function getAndreaniToken(hash: string): Promise<string> {
  const now = Date.now();
  const cached = andreaniTokenCache.get(hash);
  if (cached && cached.expires > now) {
    return cached.token;
  }
  
  const res = await fetch('https://woocommerce-api-acom.andreani.com/api/v1/Login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': hash
    }
  });
  
  if (!res.ok) {
    throw new Error(`Andreani authentication failed: ${res.statusText}`);
  }
  
  const contentType = res.headers.get('content-type') || '';
  let token = '';
  if (contentType.includes('application/json')) {
    const data: any = await res.json();
    token = data.response?.accessToken || data.token || data.sessionToken || data.XAuthToken || data.key || Object.values(data)[0] as string;
  } else {
    token = (await res.text()).trim();
  }
  
  andreaniTokenCache.set(hash, {
    token,
    expires: now + 55 * 60 * 1000 // Cache for 55 minutes
  });
  return token;
}

function normalizeAndreaniShipment(data: any) {
  const trackingNumber = data.trackingNumber || data.numeroSeguimiento || '';
  const status = data.trackingStatus || data.estado || 'Desconocido';
  const events = data.events || data.eventos || [];
  return {
    tracking_number: trackingNumber,
    status: status,
    events: events,
    updated_at: new Date().toISOString()
  };
}

function normalizeAndreaniBulk(data: any) {
  const shipments = Array.isArray(data) ? data : (data.shipments || data.data || []);
  return shipments.map((s: any) => normalizeAndreaniShipment(s));
}

function logAndreaniError(e: any) {
  try {
    fs.appendFileSync('andreani_error.log', `${new Date().toISOString()} - [ERROR] ${e.message}\n${e.stack || ''}\n\n`);
  } catch (err) {
    console.error('Failed to write to andreani_error.log', err);
  }
}

async function fetchWithAuth(urlStr: string, hash: string): Promise<any> {
  let activeToken = await getAndreaniToken(hash);
  let trackingRes = await fetch(urlStr, {
    method: 'GET',
    headers: {
      'X-Auth-Token': activeToken
    }
  });

  if (trackingRes.status === 401) {
    andreaniTokenCache.delete(hash);
    activeToken = await getAndreaniToken(hash);
    trackingRes = await fetch(urlStr, {
      method: 'GET',
      headers: {
        'X-Auth-Token': activeToken
      }
    });
  }
  return trackingRes;
}


const backupApiPlugin = () => ({
  name: 'backup-api',
  configureServer(server: any) {
    server.middlewares.use(async (req: any, res: any, next: any) => {
      const url = req.url || '';
      
      if (url.startsWith('/api/backup') && req.method === 'POST') {
        if (url === '/api/backup/restore') {
          // Restore a specific backup
          let body = '';
          req.on('data', (chunk: any) => body += chunk);
          req.on('end', () => {
            try {
              const { filename } = JSON.parse(body);
              const backupsDir = path.resolve(__dirname, 'backups');
              const filePath = path.join(backupsDir, filename);
              if (fs.existsSync(filePath)) {
                const data = fs.readFileSync(filePath, 'utf-8');
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(data);
              } else {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Archivo no encontrado' }));
              }
            } catch (e: any) {
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: e.message }));
            }
          });
          return;
        }

        // Standard save backup
        let body = '';
        req.on('data', (chunk: any) => body += chunk);
        req.on('end', () => {
          try {
            const data = JSON.parse(body);
            const backupsDir = path.resolve(__dirname, 'backups');
            if (!fs.existsSync(backupsDir)) {
              fs.mkdirSync(backupsDir);
            }
            const dateStr = new Date().toISOString().split('T')[0];
            const timeStr = new Date().toTimeString().split(' ')[0].replace(/:/g, '-');
            const filename = `backup-${dateStr}-${timeStr}.json`;
            fs.writeFileSync(path.join(backupsDir, filename), JSON.stringify(data, null, 2), 'utf-8');
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, filename, timestamp: new Date().toISOString() }));
          } catch (e: any) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: e.message }));
          }
        });
        return;
      }
      
      if (url === '/api/backup/list' && req.method === 'GET') {
        try {
          const backupsDir = path.resolve(__dirname, 'backups');
          if (!fs.existsSync(backupsDir)) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify([]));
            return;
          }
          const files = fs.readdirSync(backupsDir)
            .filter(f => f.startsWith('backup-') && f.endsWith('.json'))
            .map(filename => {
              const filePath = path.join(backupsDir, filename);
              const stats = fs.statSync(filePath);
              return {
                filename,
                date: stats.mtime.toISOString(),
                size: stats.size
              };
            })
            .sort((a, b) => b.date.localeCompare(a.date));
            
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(files));
        } catch (e: any) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: e.message }));
        }
      }

      // 1. Andreani Bulk Tracking
      if (url === '/api/tracking/andreani/bulk' && req.method === 'POST') {
        const hash = req.headers['x-andreani-hash'] || '';
        if (!hash) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Falta HASH_ANDREANI' }));
          return;
        }

        let body = '';
        req.on('data', (chunk: any) => body += chunk);
        req.on('end', async () => {
          try {
            const { trackingNumbers } = JSON.parse(body);
            if (!Array.isArray(trackingNumbers) || trackingNumbers.length === 0) {
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify([]));
              return;
            }

            // Query in parallel using search endpoint for tracking numbers
            const fetchPromises = trackingNumbers.map(async (num: string) => {
              try {
                const searchRes = await fetchWithAuth(`https://woocommerce-api-acom.andreani.com/api/v1/Shipments?search=${encodeURIComponent(num.trim())}&page=1&pageSize=1`, hash);
                if (!searchRes.ok) {
                  return null;
                }
                const data: any = await searchRes.json();
                const items = data.response?.items || data.items || [];
                return items[0] || null;
              } catch (err) {
                return null;
              }
            });

            const rawShipments = (await Promise.all(fetchPromises)).filter(Boolean);

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(normalizeAndreaniBulk(rawShipments)));
          } catch (e: any) {
            logAndreaniError(e);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: e.message }));
          }
        });
        return;
      }

      // 2. Andreani Single Tracking
      if (url.startsWith('/api/tracking/andreani/') && req.method === 'GET') {
        const parts = url.split('/');
        const trackingNumber = parts[parts.length - 1];
        if (trackingNumber && trackingNumber !== 'bulk') {
          const hash = req.headers['x-andreani-hash'] || '';
          if (!hash) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Falta HASH_ANDREANI' }));
            return;
          }

          try {
            const searchRes = await fetchWithAuth(`https://woocommerce-api-acom.andreani.com/api/v1/Shipments?search=${encodeURIComponent(trackingNumber.trim())}&page=1&pageSize=1`, hash);
            if (!searchRes.ok) {
              const errBody = await searchRes.text();
              throw new Error(`Andreani tracking failed with status ${searchRes.status}: ${errBody}`);
            }
            const data = await searchRes.json();
            const items = data.response?.items || data.items || [];
            const shipment = items[0];
            if (!shipment) {
              res.writeHead(404, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Guía no encontrada en Andreani' }));
              return;
            }
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(normalizeAndreaniShipment(shipment)));
          } catch (e: any) {
            logAndreaniError(e);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: e.message }));
          }
          return;
        }
      }
      
      next();
    });
  }
});

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), backupApiPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify: file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
