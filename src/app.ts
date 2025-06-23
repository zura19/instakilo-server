import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import http from "http";
import { Server } from "socket.io";
import cloudinary from "cloudinary";
import { Request, Response } from "express";

import authRouter from "./routes/authRoutes";
import userRouter from "./routes/userRoutes";
import postRoutes from "./routes/postRoutes";
import commentRoutes from "./routes/commentsRoutes";
import messagesRoutes from "./routes/messagesRoutes";
import notificationRoutes from "./routes/notificationsRoutes";

dotenv.config();

const app = express();

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));
app.use(cookieParser());

app.use(
  cors({
    origin: process.env.CLIENT_URL!,
    credentials: true,
  })
);

app.use("/api/auth", authRouter);
app.use("/api/users", userRouter);
app.use("/api/posts", postRoutes);
app.use("/api/comments", commentRoutes);
app.use("/api/messages", messagesRoutes);
app.use("/api/notifications", notificationRoutes);

const server = http.createServer(app);
export const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL!,
    credentials: true,
  },
});

cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

io.on("connection", (socket) => {
  const userId = socket.handshake.query.userId;

  if (userId) {
    socket.join(userId);
    console.log(`✅ User ${userId} joined their own room`);
  } else {
    console.log("❌ No userId provided in handshake query");
  }

  socket.on("disconnect", () => {
    console.log("a user disconnected");
  });
});

// app.all("*", (req, res) => {
//   res.status(404).json({ message: "Route not found" });
// });

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
