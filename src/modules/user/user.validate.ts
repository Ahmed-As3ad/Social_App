import z from "zod";
import { LogoutEnum } from "../../utils/security/token.security.js";

export const logoutValidate = {
    body: z.strictObject({
        flag: z.enum(LogoutEnum).default(LogoutEnum.only)
    })
}