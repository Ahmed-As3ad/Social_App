import { z } from "zod";
import { generalFieldValidator } from "../../middleware/validation.middleware.js";

export const loginValidate = {
    body: z.strictObject({
        email: generalFieldValidator.email,
        password: generalFieldValidator.password
    })
}

export const signUpValidate = {
    body: loginValidate.body.extend({
        firstName: generalFieldValidator.firstName,
        lastName: generalFieldValidator.lastName,
        DOB: z.string().min(10, 'DOB must be at least 10 characters long').max(10, 'DOB must be at most 10 characters long'),
        password: generalFieldValidator.password,
        confirmPassword: z.string().min(6, 'confirm password must be at least 6 characters long').max(100, 'confirm password must be at most 100 characters long')

    }).superRefine((data, ctx) => {
        if (data.password !== data.confirmPassword) {
            ctx.addIssue({
                code: "custom",
                message: "confirm password does not match",
                path: ["confirmPassword"]
            })
        }
    })
}

export const verifyEmailValidate = {
    body: z.strictObject({
        email: generalFieldValidator.email,
        otp: generalFieldValidator.otp
    })
}

export const signUpWithGmail = {
    body: z.strictObject({
        idToken: z.string().min(1, 'idToken is required').max(500, 'idToken must be at most 500 characters long')
    })
}