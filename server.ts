import '@angular/compiler';
import './treaty-utilities/mock-create-histogram';
import './treaty-utilities/mock-zone';

import { Elysia, t } from 'elysia';
import { join } from 'path';

import { Surreal } from 'surrealdb.node';

import { APP_BASE_HREF } from '@angular/common';
import { CommonEngine } from '@angular/ssr/node';
import bootstrap from './src/main.server';

const db = new Surreal();
await db.connect('memory');
await db.use({ ns: 'test', db: 'test' });

const port = process.env['PORT'] || 4201;
const serverDistFolder = import.meta.dirname;

const browserDistFolder = join(serverDistFolder, 'dist/treaty/browser');
const indexHtml = join(serverDistFolder, 'dist/treaty/browser/index.html');
const commonEngine = new CommonEngine({
  allowedHosts: ['localhost', '127.0.0.1', 'gadgetify.io', 'origin.gadgetify.io', 'treaty.prokopis123.workers.dev'],
  enablePerformanceProfiler: true,
});

const VITE_DEV_ENTRY = '<script type="module" src="/main.ts"></script>';

function toProductionHtml(html: string): string {
  return html.replaceAll(VITE_DEV_ENTRY, '');
}

const app = new Elysia()
  .derive(({ request: { url } }) => {
    const _url = new URL(url);

    return {
      protocol: _url.protocol.split(':')[0],
      originalUrl: _url.pathname + _url.search,
      baseUrl: '',
    };
  })
  .group('/api', (api) => {
    return api
      .get('/id/:id', ({ params: { id } }) => ({ data: `Post with id: ${id}` }))
      .get('/example', () => `just an example`)
      .post('/form', ({ body }) => body, {
        body: t.Object({
          strField: t.String(),
          numbField: t.Number(),
        }),
      });
  })
  .get('*.*', async ({ originalUrl }) => {
    const file = Bun.file(`${browserDistFolder}${originalUrl}`);

    if (!(await file.exists())) {
      return new Response('Not Found', { status: 404 });
    }

    return new Response(await file.arrayBuffer(), {
      headers: {
        'Content-Type': file.type,
      },
    });
  })
  .get('*', async ({ originalUrl, baseUrl, protocol, headers }) => {
    if (originalUrl.includes('.')) {
      const file = Bun.file(`${browserDistFolder}${originalUrl}`);

      if (!(await file.exists())) {
        return new Response('Not Found', { status: 404 });
      }

      return new Response(await file.arrayBuffer(), {
        headers: {
          'Content-Type': file.type,
        },
      });
    }

    const cacheHit = await db.select(`url:\`${originalUrl}\``);

    if (cacheHit) {
      return new Response(cacheHit.content, {
        headers: {
          'Content-Type': 'text/html',
        },
      });
    }

    try {
      const forwardedProto = headers['x-forwarded-proto'] || protocol;
      const forwardedHost = headers['x-forwarded-host'] || headers['host'];

      console.log(`${forwardedProto}://${forwardedHost}${originalUrl}`);

      const _html = await commonEngine.render({
        bootstrap,
        documentFilePath: indexHtml,
        url: `${forwardedProto}://${forwardedHost}${originalUrl}`,
        publicPath: browserDistFolder,
        providers: [{ provide: APP_BASE_HREF, useValue: '' }],
      });

      const productionHtml = toProductionHtml(_html);

      console.log(productionHtml);

      await db.create(`url:\`${originalUrl}\``, {
        content: productionHtml,
      });

      return new Response(productionHtml, {
        headers: {
          'Content-Type': 'text/html',
        },
      });
    } catch (error) {
      console.log(error);

      return 'Missing page';
    }
  })
  .listen(port);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);

export const reqHandler = app.handle
export type App = typeof app;
