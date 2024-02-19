import { Router } from "express";
import {
  changeCurrentPassword,
  getChannelUserProfile,
  getCurrentUser,
  loggedOutUser,
  loginUser,
  refreshAccessToken,
  registerUser,
  updateAccountDetail,
  updateCoverImage,
  updateUserAvatar,
//   getwatchHistory
} from "../controllers/user.controller.js";
import { upload } from "../middleware/multer.js";
import { verifyJWT } from "../middleware/auth.middleware.js";
const router = Router();

router.route("/registration").post(
  upload.fields([
    {
      name: "avatar",
      maxCount: 1,
    },
    {
      name: "coverImage",
      maxCount: 1,
    },
  ]),
  registerUser
);

router.route("/login").post(loginUser);

router.route("/logout").post(verifyJWT, loggedOutUser);
router.route("/refreshToken").post(refreshAccessToken);
router.route("/changePassword").post(verifyJWT, changeCurrentPassword);
router.route("/currentUser").get(verifyJWT, getCurrentUser);
router.route("/updateAccount").patch(verifyJWT, updateAccountDetail);

router
  .route("/avatar")
  .patch(verifyJWT, upload.single("avatar"), updateUserAvatar);
router
  .route("/updateCover")
  .patch(verifyJWT, upload.single("coverImage"), updateCoverImage);
router.route("/c/:username").get(verifyJWT, getChannelUserProfile);

// router.route("/watchHistory").get(verifyJWT, getwatchHistory);
export default router;
