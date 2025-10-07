import { Router } from "express";
import postService from "./post.service";
import { authorization } from "../../middleware/authorizition.middleware.js";
import { endPointAccess } from "./post.endPoint.js";
import { ALLOWED_MIME_TYPES, cloudMulter } from "../../utils/multer/cloud.multer.js";
import * as validators from "./post.validate";
import { validation } from "../../middleware/validation.middleware.js";
import { authentication } from "../../middleware/authentication.middleware.js";

const router: Router = Router();
router.post('/create-post', authorization(endPointAccess.createPost), cloudMulter({ allowedMimeTypes: ALLOWED_MIME_TYPES.image }).array('attachments', 2), validation(validators.createPost), postService.createPost)
router.post('/like-post/:postId', authentication(), validation(validators.likePost), postService.likePost)
export default router;