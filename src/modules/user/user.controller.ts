import { Router } from "express";
import endPoint from "./user.endpoint";
import { authentication } from "../../middleware/authentication.middleware.js";
import userService from "./user.service";
import * as validate from "./user.validate";
import { validation } from "../../middleware/validation.middleware.js";
import { cloudMulter, storageTypeEnum } from "../../utils/multer/cloud.multer.js";
import { authorization } from "../../middleware/authorizition.middleware.js";
import { RoleEnum } from "../../DB/model/User.model.js";
const router: Router = Router();
router.get(endPoint.profile!, authentication(), userService.profile)
router.get(endPoint.dashboard!, authorization([RoleEnum.superAdmin]), userService.dashboard)
router.patch(endPoint.changeRole!, authorization([RoleEnum.superAdmin, RoleEnum.admin]), validation(validate.changeRoleValidate), userService.changeRole)
router.get(endPoint.getPreSignedUrl!, authentication(), userService.getPreSignedUrl)
router.post(endPoint.logout!, authentication(), validation(validate.logoutValidate), userService.logout)
router.post(endPoint.resetPasswordCode!, validation(validate.resetPasswordCodeValidate), userService.resetPasswordCode)
router.get(endPoint.uploadAvatar!, authentication(), cloudMulter({ type: storageTypeEnum.memory }).single('image'), userService.uploadAvatar)
router.post(endPoint.uploadCovers!, authentication(), cloudMulter({ type: storageTypeEnum.disk }).array('images'), userService.uploadCovers)
router.patch(endPoint.resetPassword!, validation(validate.resetPasswordValidate), userService.resetPasswordVerify)
router.delete(endPoint.freezeAccount!, authentication(), validation(validate.FreezeAccountValidate), userService.FreezeAccount)
router.patch(endPoint.unfreezeAccount!, authentication(), validation(validate.UnFreezeAccountValidate), userService.UnFreezeAccount)
router.delete(endPoint.deleteAccount!, authentication(), validation(validate.DeleteAccountValidate), userService.deleteHardAccount)
router.post(endPoint.sendRequest!, authentication(), validation(validate.sendFriendRequestValidate), userService.sendFriendRequest)
router.patch(endPoint.acceptRequest!, authentication(), validation(validate.acceptRequestValidate), userService.acceptRequest)
router.delete(endPoint.rejectRequest!, authentication(), validation(validate.rejectRequestValidate), userService.rejectRequest)
router.delete(endPoint.removeFriend!, authentication(), validation(validate.removeFriendValidate), userService.removeFriend)
export default router;