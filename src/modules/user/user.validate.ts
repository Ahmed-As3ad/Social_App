import z from "zod";
import { LogoutEnum } from "../../utils/security/token.security.js";
import { generalFieldValidator } from "../../middleware/validation.middleware.js";
import { Types } from "mongoose";
import { RoleEnum } from "../../DB/model/User.model.js";

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

export const FreezeAccountValidate = {
    params: z.object({
        userId: z.string().optional(),
    }
    ).refine((data) => {
        return data?.userId ? Types.ObjectId.isValid(data?.userId) : true
    }, { error: "invalid user id", path: ["userId"] }),
    body: z.strictObject({
        reason: z.string().min(10, 'reason must be at least 10 characters long').max(300, 'reason must be at most 300 characters long')
    })
}

export const UnFreezeAccountValidate = {
    params: z.strictObject({
        userId: z.string().refine((id) => Types.ObjectId.isValid(id), { error: "invalid user id", path: ["userId"] })
    })
}

export const DeleteAccountValidate = {
    params: z.strictObject({
        userId: z.string().optional().refine((id) => {
            return id ? Types.ObjectId.isValid(id) : true
        }, { error: "invalid user id", path: ["userId"] })
    })
}

export const changeRoleValidate = {
    params: z.strictObject({
        userId: generalFieldValidator.id
    }),
    body: z.strictObject({
        role: z.enum(RoleEnum)
    })
}

export const sendFriendRequestValidate = {
    params: z.strictObject({
        toUserId: generalFieldValidator.id
    })
}

export const acceptRequestValidate = {
    params: z.strictObject({
        requestId: generalFieldValidator.id
    })
}
export const rejectRequestValidate = {
    params: acceptRequestValidate.params.extend({})
}
export const removeFriendValidate = {
    params: z.strictObject({
        friendId: generalFieldValidator.id
    })
}