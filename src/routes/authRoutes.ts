import express from "express";
import {
  login,
  logout,
  protect,
  register,
  updatePassword,
} from "../controllers/authControllers";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/logout", logout);
router.post("/updatePassword", protect, updatePassword);

export default router;
