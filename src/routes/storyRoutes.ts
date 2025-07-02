import express from "express";
import { protect } from "../controllers/authControllers";
import {
  addStory,
  deleteStory,
  getArchivedStories,
  getStories,
  getStoryViewers,
  getUserStories,
  likeUnlikeStory,
  viewStory,
} from "../controllers/storyController";

const router = express.Router();

router.route("/").get(protect, getStories).post(protect, addStory);

router.route("/archive").get(protect, getArchivedStories);
router.route("/:userId").get(protect, getUserStories);

router.route("/story/:storyId").delete(protect, deleteStory);
router.route("/like/:storyId").post(protect, likeUnlikeStory);
router
  .route("/view/:storyId")
  .get(protect, getStoryViewers)
  .post(protect, viewStory);

export default router;
