import { Router } from "express";
import endPoint from "./auth.endpoint.js";
import authService from "./auth.service.js";
import { validation } from "../../middleware/validation.middleware"
import * as validators from './auth.validate'

const router: Router = Router();

router.post(endPoint.signup!, validation(validators.signUpValidate), authService.signUp)
// router.post(endPoint.login!, authService.login)
export default router;