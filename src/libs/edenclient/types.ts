/// <reference lib="dom" />
import type { Elysia } from 'elysia';
import { Observable } from 'rxjs';
import type { IsUnknown, UnionToIntersect } from './utils/typesafe';

type Files = File | FileList;

type Replace<RecordType, TargetType, GenericType> = {
  [K in keyof RecordType]: RecordType[K] extends TargetType
    ? GenericType
    : RecordType[K];
};

type AnySchema = {
  body: unknown;
  headers: unknown;
  query: unknown;
  params: unknown;
  response: any;
};

type HttpMethod =
  | 'get'
  | 'post'
  | 'put'
  | 'patch'
  | 'delete'
  | 'head'
  | 'options';

export namespace EdenClient {
  export type Create<App extends Elysia<any, any, any, any, any, any, any>> =
    App extends {
      '~Routes': infer Schema extends Record<string, any>;
    }
      ? UnionToIntersect<Sign<Schema>>
      : 'Please install Elysia before using EdenClient';

  export type DetailedResponse<T> = {
    data: T;
    error: any;
    status: number;
    headers: Record<string, string>;
  };

  export type ObservableResponse<T> = Observable<DetailedResponse<T>>;

  type MethodSignature<Node extends AnySchema> = (
    params?: (IsUnknown<Node['body']> extends false
      ? Replace<Node['body'], Blob | Blob[], Files>
      : {}) &
      (undefined extends Node['query']
        ? {
            $query?: Record<string, string>;
          }
        : {
            $query: Node['query'];
          }) &
      (undefined extends Node['headers']
        ? {
            $headers?: Record<string, unknown>;
          }
        : {
            $headers: Node['headers'];
          })
  ) => ObservableResponse<
    Node['response'] extends { 200: infer ReturnedType }
      ? ReturnedType
      : unknown
  >;

  export type Sign<Route extends Record<string, any>> = {
    [Key in keyof Route as Key extends `:${string}`
      ? (string & {}) | number | Key
      : Key extends '' | '/'
      ? 'index'
      : Key]: [Route[Key]] extends [AnySchema]
      ? Key extends HttpMethod
        ? MethodSignature<Route[Key]>
        : never
      : Route[Key] extends Record<string, any>
      ? Sign<Route[Key]>
      : never;
  };
}
