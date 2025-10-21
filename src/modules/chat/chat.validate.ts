import z from "zod";
import { generalFieldValidator } from "../../middleware/validation.middleware.js";

export const getChatValidate = {
    params: z.strictObject({
        userId: generalFieldValidator.id,
    })
}