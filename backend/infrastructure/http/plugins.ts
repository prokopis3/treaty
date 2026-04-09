import { Elysia } from 'elysia';
import { env, isDevelopment, isProduction } from '../../../config/env';
import { scopedLogger } from '../logging/logger';

type AnyElysia = Elysia<any, any, any, any, any, any, any>;

const logger = scopedLogger('plugins');

const dynamicImport = <T>(specifier: string): Promise<T> => {
  const importer = new Function('modulePath', 'return import(modulePath)') as (
    modulePath: string
  ) => Promise<T>;
  return importer(specifier);
};

async function applyServerTiming<T extends AnyElysia>(instance: T): Promise<T> {
  if (!env.SERVER_TIMING_ENABLED) return instance;

  try {
    const { serverTiming } = await dynamicImport<any>('@elysiajs/' + 'server-timing');
    return instance.use(
      serverTiming({
        enabled: true,
        allow: ({ request }: { request: Request }) => !new URL(request.url).pathname.includes('.'),
        trace: { handle: true, total: true },
      }) as any
    ) as T;
  } catch (error) {
    logger.warn('Server Timing plugin disabled due to runtime incompatibility', error);
    return instance;
  }
}

async function applyDevelopmentTelemetry<T extends AnyElysia>(instance: T): Promise<T> {
  if ((isDevelopment && !env.OTEL_ENABLED_DEV) || (isProduction && !env.OTEL_ENABLED_PROD)) {
    return instance;
  }

  try {
    const { opentelemetry } = await dynamicImport<any>('@elysiajs/' + 'opentelemetry');

    if (isProduction && env.OTEL_ENABLED_PROD) {
      const { BatchSpanProcessor } = await dynamicImport<any>('@opentelemetry/' + 'sdk-trace-node');
      const { OTLPTraceExporter } = await dynamicImport<any>(
        '@opentelemetry/' + 'exporter-trace-otlp-proto'
      );
      const otlpUrl =
        env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT ||
        env.OTEL_EXPORTER_OTLP_ENDPOINT;

      return instance.use(
        opentelemetry({
          serviceName: 'treaty-server',
          spanProcessors: [
            new BatchSpanProcessor(
              new OTLPTraceExporter(otlpUrl ? { url: otlpUrl } : undefined)
            ),
          ],
        }) as any
      ) as T;
    }

    return instance.use(opentelemetry({ serviceName: 'treaty-server' }) as any) as T;
  } catch (error) {
    logger.warn('OpenTelemetry plugin disabled due to runtime incompatibility', error);
    return instance;
  }
}

export async function applyServerPlugins<T extends AnyElysia>(instance: T): Promise<T> {
  return applyDevelopmentTelemetry(await applyServerTiming(instance));
}
