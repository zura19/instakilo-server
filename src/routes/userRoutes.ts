import express from "express";
import {
  followUnfollowUser,
  getProfile,
  getUser,
  getUserFollowersOrFollowings,
  getUsers,
  isEmailOrNameRegistered,
  updateProfile,
} from "../controllers/userController";
import { protect } from "../controllers/authControllers";
import {
  addSearchHistory,
  deleteSearchHistory,
  deleteUserFromSearchHistory,
  getSearchHistory,
} from "../controllers/searchHistoryController";

const router = express.Router();

router.route("/profile").get(protect, getProfile).post(protect, updateProfile);

router.route("/many/:username").get(protect, getUsers);
router
  .route("/searchHistory")
  .get(protect, getSearchHistory)
  .delete(protect, deleteSearchHistory);
router
  .route("/searchHistory/:id")
  .post(protect, addSearchHistory)
  .delete(protect, deleteUserFromSearchHistory);

router.route("/:id").get(getUser);
router.route("/:id/:type").get(protect, getUserFollowersOrFollowings);

router.route("/follow/:followingId").post(protect, followUnfollowUser);
router.post("/checkEmailAndName", isEmailOrNameRegistered);

export default router;
