import { Router } from "express";
import endPoint from "./user.endpoint";
import { authentication } from "../../middleware/authentication.middleware.js";
import userService from "./user.service";
const router: Router = Router();
router.get(endPoint.profile!, authentication(), userService.profile)
export default router;