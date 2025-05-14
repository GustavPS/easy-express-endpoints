import { type IncomingHttpHeaders } from 'http';
import { Router, type Request, type Response, type NextFunction } from 'express';

// Can we change from unknown somehow?
export interface RequestData<Body = unknown, Query = unknown, Params = unknown> {
  body: Body;
  query: Query;
  params: Params;
  headers: IncomingHttpHeaders
}

export type MiddlewareFunc = (req: Request, res: Response, next: NextFunction) => void;
