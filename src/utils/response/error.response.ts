import { NextFunction, Request, Response } from "express";

export interface IErrorResponse extends Error {
    statusCode: number
}

// base error class
export class ErrorResponseException extends Error {
    constructor(public override message: string, public statusCode: number, public override cause?: unknown) {
        super();
        this.name = this.constructor.name;
        // return the stack trace excluding constructor call from it.
        Error.captureStackTrace(this, this.constructor);
    }
}

// bad request error
export class BadRequestException extends ErrorResponseException {
    constructor(message: string, cause?: unknown) {
        super(message, 400, cause);
    }
}

// unauthorized error
export class NotFoundException extends ErrorResponseException {
    constructor(message: string, cause?: unknown) {
        super(message, 404, cause);
    }
}
// conflict error
export class ConflictException extends ErrorResponseException {
    constructor(message: string, cause?: unknown) {
        super(message, 409, cause);
    }
}
export class ForbiddenException extends ErrorResponseException {
    constructor(message: string, cause?: unknown) {
        super(message, 403, cause);
    }
}

// global error handler middleware
export const handleError = (err: IErrorResponse, req: Request, res: Response, next: NextFunction): Response => {
    return res.status(err.statusCode || 500).json({
        error: err.message || 'something went wrong, please try again later ❌',
        stack: process.env.MOOD === 'development' ? err.stack : undefined,
        cause: err.cause ? err.cause : undefined
    })
}