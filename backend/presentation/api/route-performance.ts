import { env } from '../../../config/env';
import { scopedLogger } from '../../infrastructure/logging/logger';

type RouteKind = 'read' | 'write';

class RouteOverloadedError extends Error {
  constructor(readonly routeName: string, readonly kind: RouteKind) {
    super(`Route overloaded: ${routeName}`);
    this.name = 'RouteOverloadedError';
  }
}

class RouteTimeoutError extends Error {
  constructor(readonly routeName: string, readonly kind: RouteKind, readonly timeoutMs: number) {
    super(`Route timeout: ${routeName} (${timeoutMs}ms)`);
    this.name = 'RouteTimeoutError';
  }
}

class ConcurrencyGate {
  private active = 0;

  private readonly queue: Array<() => void> = [];

  constructor(
    private readonly limit: number,
    private readonly maxQueueSize: number
  ) {}

  tryAcquire(): Promise<() => void> {
    if (this.active < this.limit) {
      this.active += 1;
      return Promise.resolve(() => this.release());
    }

    if (this.queue.length >= this.maxQueueSize) {
      return Promise.reject(new Error('QUEUE_FULL'));
    }

    return new Promise((resolve) => {
      this.queue.push(() => {
        this.active += 1;
        resolve(() => this.release());
      });
    });
  }

  private release(): void {
    this.active = Math.max(0, this.active - 1);
    const next = this.queue.shift();
    if (next) {
      next();
    }
  }
}

type RouteContext = {
  set?: {
    status?: number;
  };
};

type RouteHandler<Context extends RouteContext, Result> = (
  context: Context
) => Promise<Result> | Result;

const logger = scopedLogger('api-performance');

const readGate = new ConcurrencyGate(
  Math.max(1, env.API_READ_CONCURRENCY_LIMIT),
  Math.max(1, env.API_READ_QUEUE_LIMIT)
);

const writeGate = new ConcurrencyGate(
  Math.max(1, env.API_WRITE_CONCURRENCY_LIMIT),
  Math.max(1, env.API_WRITE_QUEUE_LIMIT)
);

function resolveTimeout(kind: RouteKind): number {
  return kind === 'read'
    ? Math.max(1, env.API_READ_TIMEOUT_MS)
    : Math.max(1, env.API_WRITE_TIMEOUT_MS);
}

function resolveGate(kind: RouteKind): ConcurrencyGate {
  return kind === 'read' ? readGate : writeGate;
}

function jsonErrorResponse(status: number, code: string, message: string): Response {
  return new Response(
    JSON.stringify({
      data: null,
      error: {
        code,
        message,
      },
    }),
    {
      status,
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
}

async function withTimeout<Result>(
  routeName: string,
  kind: RouteKind,
  operation: Promise<Result>,
  timeoutMs: number
): Promise<Result> {
  let timeoutHandle: ReturnType<typeof setTimeout> | null = null;

  const timeoutPromise = new Promise<Result>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(new RouteTimeoutError(routeName, kind, timeoutMs));
    }, timeoutMs);
  });

  try {
    return await Promise.race([operation, timeoutPromise]);
  } finally {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
  }
}

function withPolicy<Context extends RouteContext, Result>(
  kind: RouteKind,
  routeName: string,
  handler: RouteHandler<Context, Result>
): RouteHandler<Context, Result | Response> {
  return async (context: Context): Promise<Result | Response> => {
    const gate = resolveGate(kind);
    const timeoutMs = resolveTimeout(kind);

    let release: (() => void) | null = null;

    try {
      try {
        release = await gate.tryAcquire();
      } catch {
        throw new RouteOverloadedError(routeName, kind);
      }

      return await withTimeout(routeName, kind, Promise.resolve(handler(context)), timeoutMs);
    } catch (error) {
      if (error instanceof RouteOverloadedError) {
        logger.warn(`Overload protection triggered on ${error.kind} route: ${error.routeName}`);
        context.set = context.set || {};
        context.set.status = 503;
        return jsonErrorResponse(503, 'ROUTE_OVERLOADED', 'Service is handling too many requests.');
      }

      if (error instanceof RouteTimeoutError) {
        logger.warn(
          `Timeout protection triggered on ${error.kind} route: ${error.routeName} (${error.timeoutMs}ms)`
        );
        context.set = context.set || {};
        context.set.status = 504;
        return jsonErrorResponse(504, 'ROUTE_TIMEOUT', 'Request timed out under current load.');
      }

      throw error;
    } finally {
      release?.();
    }
  };
}

export function withReadPolicy<Context extends RouteContext, Result>(
  routeName: string,
  handler: RouteHandler<Context, Result>
): RouteHandler<Context, Result | Response> {
  return withPolicy('read', routeName, handler);
}

export function withWritePolicy<Context extends RouteContext, Result>(
  routeName: string,
  handler: RouteHandler<Context, Result>
): RouteHandler<Context, Result | Response> {
  return withPolicy('write', routeName, handler);
}
