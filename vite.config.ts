import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import {defineConfig} from 'vite';

const backupApiPlugin = () => ({
  name: 'backup-api',
  configureServer(server: any) {
    server.middlewares.use((req: any, res: any, next: any) => {
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
        return;
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
