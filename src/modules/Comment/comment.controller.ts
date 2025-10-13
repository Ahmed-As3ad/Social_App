import { Router } from "express";
import { commentService } from "./comment.service";
import * as validators from './commint.validate'
import { authentication } from "../../middleware/authentication.middleware.js";
import { validation } from "../../middleware/validation.middleware.js";
import { ALLOWED_MIME_TYPES, cloudMulter } from "../../utils/multer/cloud.multer.js";
import { endPoint } from "./comments.endPoint.js";
import { authorization } from "../../middleware/authorizition.middleware.js";
import { endPointAccess } from "./comments.endPointAccess.js";

const router: Router = Router({ mergeParams: true });

router.post(endPoint.addComment, authentication(), cloudMulter({ allowedMimeTypes: ALLOWED_MIME_TYPES.image }).array('attachments', 2), validation(validators.addCommentValidate), commentService.addComment);
router.post(endPoint.replyComment, authentication(), cloudMulter({ allowedMimeTypes: ALLOWED_MIME_TYPES.image }).array('attachments', 2), validation(validators.replyCommentValidate), commentService.replyComment);
router.patch(endPoint.updateComment, authentication(), cloudMulter({ allowedMimeTypes: ALLOWED_MIME_TYPES.image }).array('attachments', 2), validation(validators.updateCommentValidate), commentService.updateComment);
router.delete(endPoint.freezeComment, authorization(endPointAccess.freezeComment), validation(validators.freezeCommentValidate), commentService.freezeComment);
router.patch(endPoint.unfreezeComment, authorization(endPointAccess.unFreezeComment), validation(validators.unfreezeCommentValidate), commentService.unFreezeComment);
router.delete(endPoint.deleteComment, authentication(), validation(validators.deleteCommentValidate), commentService.deleteComment);
router.get(endPoint.getCommentById, authentication(), validation(validators.getCommentById), commentService.getCommentById);

export default router;