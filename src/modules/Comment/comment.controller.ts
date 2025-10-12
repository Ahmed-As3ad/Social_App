import { Router } from "express";
import { commentService } from "./comment.service";
import * as validators from './commint.validate'
import { authentication } from "../../middleware/authentication.middleware.js";
import { validation } from "../../middleware/validation.middleware.js";
import { ALLOWED_MIME_TYPES, cloudMulter } from "../../utils/multer/cloud.multer.js";

const router: Router = Router({ mergeParams: true });

router.post('/', authentication(), cloudMulter({ allowedMimeTypes: ALLOWED_MIME_TYPES.image }).array('attachments', 2), validation(validators.addCommentValidate), commentService.addComment);
router.post('/:commentId/reply', authentication(), cloudMulter({ allowedMimeTypes: ALLOWED_MIME_TYPES.image }).array('attachments', 2), validation(validators.replyCommentValidate), commentService.replyComment);
// router.get('/', authentication(), commentService.getComments);

export default router;