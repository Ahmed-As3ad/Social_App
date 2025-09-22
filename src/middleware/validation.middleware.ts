import type { NextFunction, Request, Response } from "express"
import type { ZodError, ZodType } from "zod"
import { z } from "zod"
import { BadRequestException } from "../utils/response/error.response.js"

// types
type keyReqType = keyof Request; // 'body' | 'query' | 'params' 
type SchemaType = Partial<Record<keyReqType, ZodType>>
type ValidationErrorType = Array<{
    key: keyReqType,
    errors: Array<{
        path: string | number | symbol | undefined,
        message: string
    }>
}>

export const validation = (schema: SchemaType) => {
    return (req: Request, res: Response, next: NextFunction): NextFunction => {
        const validationErrors: ValidationErrorType = [];
        for (const key of Object.keys(schema) as keyReqType[]) {
            if (!key) continue;
            const validationResult = schema[key]?.safeParse(req[key]);
            if (validationResult && !validationResult.success) {
                const errors = validationResult.error as ZodError;
                validationErrors.push({
                    key,
                    errors: errors.issues.map(issue => ({ path: issue.path[0], message: issue.message }))
                })
            }
        }
        if (validationErrors.length) {
            throw new BadRequestException('validation error', {
                errors: validationErrors
            })
        }

        return next() as unknown as NextFunction;
    }
}

// general field validator
export const generalFieldValidator = {
    firstName: z.string().min(3, 'first name must be at least 3 characters long').max(30, 'first name must be at most 30 characters long'),
    lastName: z.string().min(3, 'last name must be at least 3 characters long').max(30, 'last name must be at most 30 characters long'),
    email: z.string().email('invalid email format'),
    password: z.string().min(6, 'password must be at least 6 characters long').max(100, 'password must be at most 100 characters long'),
    otp: z.string().regex(/^\d{6}$/, 'OTP must be a 6-digit number')
}