import { Router } from "express";
import { authentication } from "../../middleware/authentication.middleware.js";
import * as chatValidate from "./chat.validate";
import { validation } from "../../middleware/validation.middleware.js";
import {chatService} from "./chat.service.js";
const router: Router = Router({mergeParams: true});
router.get('/', authentication(), validation(chatValidate.getChatValidate), chatService.getChat);
export default router;