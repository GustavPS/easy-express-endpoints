import { type ValidationError } from "express-validator";
import { HttpException } from "./HttpException.js";

export class BadRequestException extends HttpException {
  constructor(validationErrors: ValidationError[]) {
    super(400, 'Bad request', validationErrors);
  }
}