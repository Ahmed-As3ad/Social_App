import { Router } from "express";
import endPoint from "./user.endpoint";
import { authentication } from "../../middleware/authentication.middleware.js";
import userService from "./user.service";
import * as validate from "./user.validate";
import { validation } from "../../middleware/validation.middleware.js";
const router: Router = Router();
router.get(endPoint.profile!, authentication(), userService.profile)
router.post(endPoint.logout!, authentication(), validation(validate.logoutValidate), userService.logout)
export default router;