import { defineConfig, type Plugin, type ViteDevServer } from 'vite';
import react from '@vitejs/plugin-react';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { join, normalize } from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';

// En local, sert l'API (api/index.ts) et les fichiers envoyés (.data/files),
// comme Vercel le fait en ligne.
function devApi(): Plugin {
  const mount = (server: { middlewares: ViteDevServer['middlewares'] }, load: () => Promise<{ handle: (r: Request) => Promise<Response> }>) => {
    server.middlewares.use(async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
      const url = req.url || '/';
      if (url.startsWith('/files/')) {
        const file = normalize(join('.data/files', decodeURIComponent(url.slice(7).split('?')[0])));
        if (!file.startsWith(join('.data/files')) || !existsSync(file)) return next();
        const size = statSync(file).size;
        const range = /bytes=(\d*)-(\d*)/.exec(req.headers.range || '');
        const type = file.endsWith('.jpg') ? 'image/jpeg' : 'video/mp4';
        if (range) {
          const start = Number(range[1] || 0), end = range[2] ? Number(range[2]) : size - 1;
          res.writeHead(206, { 'content-type': type, 'content-range': `bytes ${start}-${end}/${size}`, 'accept-ranges': 'bytes', 'content-length': end - start + 1 });
          return createReadStream(file, { start, end }).pipe(res);
        }
        res.writeHead(200, { 'content-type': type, 'content-length': size, 'accept-ranges': 'bytes' });
        return createReadStream(file).pipe(res);
      }
      if (!url.startsWith('/api/')) return next();
      const chunks: Buffer[] = [];
      for await (const c of req) chunks.push(c as Buffer);
      const headers = new Headers();
      for (const [k, v] of Object.entries(req.headers)) if (typeof v === 'string') headers.set(k, v);
      const body = req.method === 'GET' || req.method === 'HEAD' ? undefined : Buffer.concat(chunks);
      const { handle } = await load();
      const r = await handle(new Request('http://localhost' + url, { method: req.method, headers, body }));
      res.statusCode = r.status;
      r.headers.forEach((v, k) => res.setHeader(k, v));
      res.end(Buffer.from(await r.arrayBuffer()));
    });
  };
  return {
    name: 'rush-dev-api',
    configureServer(server) {
      mount(server, () => server.ssrLoadModule('/api/index.ts') as never);
    },
  };
}

export default defineConfig({ plugins: [react(), devApi()] });
