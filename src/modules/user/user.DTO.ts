import z from "zod";
import { logoutValidate } from "./user.validate.js";

export type logoutDTO = z.infer<typeof logoutValidate.body>;