import z from "zod";
import * as  validators from "./post.validate.js";

export type likePostDTO = {
    params: z.infer<typeof validators.likePost.params>;
    query: z.infer<typeof validators.likePost.query>;
};