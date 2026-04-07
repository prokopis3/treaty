interface Env {
  ORIGIN_URL: string;
}

type WorkerRequestInit = RequestInit & {
  cf?: {
    cacheEverything?: boolean;
  };
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = new URL(env.ORIGIN_URL);
    const incomingUrl = new URL(request.url);
    const upstreamUrl = new URL(incomingUrl.pathname + incomingUrl.search, origin);

    const headers = new Headers(request.headers);
    headers.set('x-forwarded-host', incomingUrl.host);
    headers.set('x-forwarded-proto', incomingUrl.protocol.replace(':', ''));

    const upstreamInit: WorkerRequestInit = {
      method: request.method,
      headers,
      body: request.body,
      redirect: 'manual',
      cf: {
        cacheEverything: false,
      },
    };

    const upstreamRequest = new Request(upstreamUrl, upstreamInit);

    const isDocumentRequest =
      request.method === 'GET' &&
      (request.headers.get('accept')?.includes('text/html') ?? false);

    const hasFileExtension = /\.[a-z0-9]+$/i.test(incomingUrl.pathname);

    const shouldDisableCaching = isDocumentRequest && !hasFileExtension;

    const upstreamResponse = await fetch(upstreamRequest);

    if (!shouldDisableCaching) {
      return upstreamResponse;
    }

    const responseHeaders = new Headers(upstreamResponse.headers);
    responseHeaders.set(
      'cache-control',
      'no-store, no-cache, must-revalidate, max-age=0'
    );
    responseHeaders.set('pragma', 'no-cache');
    responseHeaders.set('expires', '0');

    return new Response(upstreamResponse.body, {
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText,
      headers: responseHeaders,
    });
  },
};
