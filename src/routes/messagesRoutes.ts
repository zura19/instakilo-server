import express from "express";
import {
  countUnreadMessages,
  getConversation,
  getUserConversations,
  readMessages,
  sentMessage,
} from "../controllers/messagesController";
import { protect } from "../controllers/authControllers";
const router = express.Router();

router.route("/:secondUserId").post(protect, sentMessage);

router.route("/conversations").get(protect, getUserConversations);
router.route("/conversation/:id").get(protect, getConversation);
router.route("/countUnread").get(protect, countUnreadMessages);

router
  .route("/readMessages/:coversationId/:secondUserId")
  .post(protect, readMessages);

export default router;
