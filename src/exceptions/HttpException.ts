export class HttpException extends Error {
  constructor(public status: number, public override message: string, public info?: unknown) {
    super(message);
  }
}
