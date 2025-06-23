import express from "express";
import { protect } from "../controllers/authControllers";
import {
  createPost,
  deletePost,
  getLikes,
  getPost,
  getPosts,
  getRandomPosts,
  getSavedPosts,
  getTaggedPosts,
  getUserPosts,
  savePost,
  updatePost,
} from "../controllers/PostController";
import { likePost } from "../controllers/PostController";

const router = express.Router();

router.route("/").get(protect, getPosts).post(protect, createPost);
router.route("/randomPosts").get(getRandomPosts);
router.route("/getLikes").get(protect, getLikes);

router.route("/profile/:id").get(getUserPosts);
router.route("/profile/:id/tagged").get(getTaggedPosts);
router.route("/profile/:id/saved").get(protect, getSavedPosts);

router.route("/profile/:id/saved/:postId").post(protect, savePost);

router
  .route("/:id")
  .get(getPost)
  .delete(protect, deletePost)
  .put(protect, updatePost);
router.route("/:postId/like").post(protect, likePost);

export default router;
