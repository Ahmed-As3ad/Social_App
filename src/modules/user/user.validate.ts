import z from "zod";
import { LogoutEnum } from "../../utils/security/token.security.js";
import { generalFieldValidator } from "../../middleware/validation.middleware.js";

export const logoutValidate = {
    body: z.strictObject({
        flag: z.enum(LogoutEnum).default(LogoutEnum.only)
    })
}

export const resetPasswordCodeValidate = {
    body: z.strictObject({
        email: generalFieldValidator.email
    })
}

export const resetPasswordValidate = {
    body: resetPasswordCodeValidate.body.extend({
        email: generalFieldValidator.email,
        otp: generalFieldValidator.otp,
        newPassword: generalFieldValidator.password,
        confirmNewPassword: z.string().min(6, 'confirm password must be at least 6 characters long').max(100, 'confirm password must be at most 100 characters long')
    }).refine((data) => data.newPassword === data.confirmNewPassword, {
        message: "confirm password does not match",
        path: ["confirmNewPassword"]
    })
}