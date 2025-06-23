import express from "express";
import { protect } from "../controllers/authControllers";
import {
  addComment,
  getPostComments,
  likeUnlikeComment,
} from "../controllers/commentController";
const router = express.Router();
router
  .route("/:postId")
  .post(protect, addComment)
  .get(protect, getPostComments);

router.route("/:postId/like/:commentId").post(protect, likeUnlikeComment);

export default router;
