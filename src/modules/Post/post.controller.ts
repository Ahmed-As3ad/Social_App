import { Router } from "express";
import { postService } from "./post.service";
import { authorization } from "../../middleware/authorizition.middleware.js";
import { endPointAccess } from "./post.endPointAccess.js";
import { ALLOWED_MIME_TYPES, cloudMulter } from "../../utils/multer/cloud.multer.js";
import * as validators from "./post.validate";
import { validation } from "../../middleware/validation.middleware.js";
import { authentication } from "../../middleware/authentication.middleware.js";
import { commentController } from "../Comment/index.js";
import { endPoint } from "./post.endPoint.js";

const router: Router = Router();
router.use(endPoint.commentController, commentController);
router.post(endPoint.createPost, authorization(endPointAccess.createPost), cloudMulter({ allowedMimeTypes: ALLOWED_MIME_TYPES.image }).array('attachments', 2), validation(validators.createPost), postService.createPost)
router.patch(endPoint.updatePost, authentication(), cloudMulter({ allowedMimeTypes: ALLOWED_MIME_TYPES.image }).array('attachments', 2), validation(validators.updatePost), postService.updatePost)
router.delete(endPoint.freezePost, authorization(endPointAccess.freezePost), validation(validators.freezePost), postService.freezePost)
router.patch(endPoint.unFreezePost, authentication(), validation(validators.unFreezePost), postService.unFreezePost)
router.delete(endPoint.deletePost, authentication(), validation(validators.deletePost), postService.deletePost)
router.patch(endPoint.likePost, authentication(), validation(validators.likePost), postService.likePost)
router.get(endPoint.getPosts, authentication(), postService.getPosts)
router.get(endPoint.getPostById, authentication(), validation(validators.getPostById), postService.getPostById)
export default router;