import express from "express";
import { protect } from "../controllers/authControllers";
import {
  countUnreadNotifications,
  getNotifications,
  markAsReadNotifications,
} from "../controllers/notificationsController";

const router = express.Router();

router.route("/").get(protect, getNotifications);
router.route("/count").get(protect, countUnreadNotifications);
router.route("/read").post(protect, markAsReadNotifications);

export default router;
