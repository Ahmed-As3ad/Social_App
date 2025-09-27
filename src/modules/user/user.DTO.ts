import z from "zod";
import { logoutValidate, resetPasswordCodeValidate, resetPasswordValidate } from "./user.validate.js";

export type logoutDTO = z.infer<typeof logoutValidate.body>;
export type resetPasswordCodeDTO = z.infer<typeof resetPasswordCodeValidate.body>;
export type resetPasswordDTO = z.infer<typeof resetPasswordValidate.body>;