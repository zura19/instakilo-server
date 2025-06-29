import express from "express";
import { protect } from "../controllers/authControllers";
import {
  addComment,
  deleteComment,
  getPostComments,
  likeUnlikeComment,
  updateComment,
} from "../controllers/commentController";
const router = express.Router();
router
  .route("/:postId")
  .post(protect, addComment)
  .get(protect, getPostComments);

router
  .route("/:postId/:commentId")
  .delete(protect, deleteComment)
  .patch(protect, updateComment);

router.route("/:postId/like/:commentId").post(protect, likeUnlikeComment);

export default router;
