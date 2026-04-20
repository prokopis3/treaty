import { withReadPolicy, withWritePolicy } from './route-performance';

type RouteContext = {
  set?: {
    status?: number;
  };
};

type RouteHandler<Context extends RouteContext, Result> = (
  context: Context
) => Promise<Result> | Result;

export function createApiGroupPolicy(groupName: string) {
  const normalized = groupName.trim().toLowerCase();

  return {
    read<Context extends RouteContext, Result>(
      routeName: string,
      handler: RouteHandler<Context, Result>
    ) {
      return withReadPolicy(`${normalized}.${routeName}`, handler);
    },
    write<Context extends RouteContext, Result>(
      routeName: string,
      handler: RouteHandler<Context, Result>
    ) {
      return withWritePolicy(`${normalized}.${routeName}`, handler);
    },
  };
}
