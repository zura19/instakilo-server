import jwt from "jsonwebtoken";
import { Response } from "express";
import dotenv from "dotenv";
dotenv.config();

export function generateJWTAndSetCookies(userId: string, res: Response) {
  const token = jwt.sign({ id: userId }, process.env.JWT_SECRET!, {
    expiresIn: "30d",
  });
  res.cookie("jwt", token, {
    httpOnly: true,
    // secure: true,
    // sameSite: "none",
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    // domain: ".instakilo-client.vercel.app",
    path: "/",
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    domain:
      process.env.NODE_ENV === "production"
        ? ".instakilo-server.onrender.com"
        : "localhost",
  });

  return token;
}

// https://instakilo-client.vercel.app/
