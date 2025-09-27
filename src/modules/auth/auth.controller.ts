import { Router } from "express";
import endPoint from "./auth.endpoint.js";
import authService from "./auth.service.js";
import { validation } from "../../middleware/validation.middleware"
import * as validators from './auth.validate'
import { authentication } from "../../middleware/authentication.middleware.js";
import { TokenEnum } from "../../utils/security/token.security.js";

const router: Router = Router();

router.post(endPoint.signup!, validation(validators.signUpValidate), authService.signUp)
router.post(endPoint.signUpWithGmail!, validation(validators.signUpWithGmail), authService.signUpWithGmail)
router.post(endPoint.signInWithGmail!, validation(validators.signUpWithGmail), authService.signInWithGmail)
router.patch(endPoint.verifyEmail!, validation(validators.verifyEmailValidate), authService.verifyEmail)
router.post(endPoint.login!, authService.login)
router.post(endPoint.refreshToken!, authentication(TokenEnum.refresh), authService.refreshToken)
export default router;