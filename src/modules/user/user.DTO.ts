import z from "zod";
import { DeleteAccountValidate, FreezeAccountValidate, logoutValidate, resetPasswordCodeValidate, resetPasswordValidate, UnFreezeAccountValidate } from "./user.validate.js";

export type logoutDTO = z.infer<typeof logoutValidate.body>;
export type resetPasswordCodeDTO = z.infer<typeof resetPasswordCodeValidate.body>;
export type resetPasswordDTO = z.infer<typeof resetPasswordValidate.body>;
export type FreezeAccountParamsDTO = z.infer<typeof FreezeAccountValidate.params>;
export type FreezeAccountBodyDTO = z.infer<typeof FreezeAccountValidate.body>;
export type UnFreezeAccountDTO = z.infer<typeof UnFreezeAccountValidate.params>;
export type DeleteAccountDTO = z.infer<typeof DeleteAccountValidate.params>;