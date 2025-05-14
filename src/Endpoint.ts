import { Router, type Request, type Response, type NextFunction } from 'express';
import { type ValidationChain, type ValidationError, validationResult } from 'express-validator';
import { BadRequestException } from './exceptions/BadRequestException.js';
import { type MiddlewareFunc, type RequestData } from './types.js';
import stream from 'stream';
import * as isStream from 'is-stream';

const isString = (x: unknown): x is string => typeof x === 'string' || x instanceof String;

export enum EndpointType {
  GET,
  POST,
  DELETE,
  PUT
};

export enum ResponseType {
  FILE = 'file',
  STREAM = 'stream',
  JSON = 'json'
}

export interface ResponseHeaders {
  headers: Headers;
  status: number;
}

abstract class Endpoint {

  private authRequired: boolean = true;
  private path: string;
  private type: EndpointType;
  private responseType: ResponseType = ResponseType.JSON;
  private static middlewares: Array<MiddlewareFunc> = [];
  private static authMiddleware: MiddlewareFunc | undefined;

  constructor(path: string, type: EndpointType) {
    this.path = path;
    this.type = type;
  }

  public static registerMiddleware(mw: MiddlewareFunc) {
    Endpoint.middlewares.push(mw);
  }
  public static registerAuthMiddleware(mw: MiddlewareFunc) {
    Endpoint.authMiddleware = mw;
  }

  public setupEndpoint(router: Router) {
    switch (this.type) {
      case EndpointType.GET:
        router.get(this.path, ...this.getValidator(), this.runAuthIfNeeded.bind(this), ...Endpoint.middlewares, this.process.bind(this));
        break;
      case EndpointType.POST:
        router.post(this.path, ...this.getValidator(), this.runAuthIfNeeded.bind(this), ...Endpoint.middlewares, this.process.bind(this));
        break;
      case EndpointType.DELETE:
        router.delete(this.path, ...this.getValidator(), this.runAuthIfNeeded.bind(this), ...Endpoint.middlewares, this.process.bind(this));
        break;
      case EndpointType.PUT:
        router.put(this.path, ...this.getValidator(), this.runAuthIfNeeded.bind(this), ...Endpoint.middlewares, this.process.bind(this));
        break;
    }
  }

  protected setAuthRequired(value: boolean) {
    this.authRequired = value;
  }

  protected setResponseType(value: ResponseType) {
    this.responseType = value;
  }

  /**
   * Function called to get the validation settings for the request
   */
  protected abstract getValidator(): ValidationChain[];

  /**
   * Function called when the server receives a request
   * @param body Express request body
   * @param query Express request query
   */
  protected abstract execute(data: RequestData): Promise<unknown> | unknown;

  /**
   * Function called when the server needs to set status code and headers. Can be overloaded
   */
  protected async headers(data: RequestData): Promise<ResponseHeaders> {
    return {
      headers: new Headers(),
      status: 200
    }
  }

  /**
   * Called when a file is sent to the client, can be overloaded
   * @param file The file that was sent
   * @returns 
   */
  protected async fileSent(file: string): Promise<void> {
    return;
  }

  private setHeaders(res: Response, status: number, headers: Headers) {
    res.statusCode = status;
    Array.from(headers).map(([ key, value ]) => res.setHeader(key, value));
  }

  private async process(req: Request, res: Response, next: NextFunction) {
    const validationErrors = this.getValidationErrors(req);
    try {
      if (validationErrors.length > 0) {
        throw new BadRequestException(validationErrors);
      } else {
        const data: RequestData = {
          body: req.body,
          query: req.query,
          params: req.params,
          headers: req.headers,
        };

        const responseHeaders = await this.headers(data);
        this.setHeaders(res, responseHeaders.status, responseHeaders.headers);
        const result = await this.execute(data);
        this.sendResponse(result, res);
      }
    } catch (err) {
      next(err);
    }
  }

  private sendResponse(data: unknown, res: Response) {
    switch (this.responseType) {
      case ResponseType.JSON:
        res.send(data);
        break;
      case ResponseType.FILE:
        if (!isString(data)) {
          throw new Error(`Expected data to be a string`);
        }
        res.sendFile(data, (err: Error) => {
          if (err) {
            console.error(`Error sending file ${err}`);
          }
          this.fileSent(data);
        });
        break;
      case ResponseType.STREAM:
        const passThrough = new stream.PassThrough();
        if (!isStream.isReadableStream(data)) {
          throw new Error('Expected data to be a readable stream');
        }
        stream.pipeline(
          data,
          passThrough,
          (err: unknown): void => {
            if (err) {
              console.error(`Error writing stream in image endpoint`);
              console.error(err);
              throw new Error(`Error writing stream in image endpoint`);
            }
          }
        );
        passThrough.pipe(res);
        break;
      default:
        throw new Error(`${this.responseType} is not implemented`);
    }
  }

  private getValidationErrors(req: Request): ValidationError[] {
    const result = validationResult(req);
    return result.array();
  }

  private runAuthIfNeeded(req: Request, res: Response, next: NextFunction) {
    if (this.authRequired && Endpoint.authMiddleware) {
      Endpoint.authMiddleware(req, res, next);
    } else {
      next();
    }
  }
}

// Overide execute here, should not get reqbody
export abstract class GetEndpoint extends Endpoint {
  constructor(path: string = '/') {
    super(path, EndpointType.GET);
  }
}

export abstract class PostEndpoint extends Endpoint {
  constructor(path: string = '/') {
    super(path, EndpointType.POST);
  }
}

export abstract class DeleteEndpoint extends Endpoint {
  constructor(path: string = '/') {
    super(path, EndpointType.DELETE);
  }
}

export abstract class PutEndpoint extends Endpoint {
  constructor(path: string = '/') {
    super(path, EndpointType.PUT);
  }
}