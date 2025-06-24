import { NextFunction, Request, Response } from "express";
import bcrypt from "bcryptjs";
import { prisma as db } from "../lib/prisma";
import { generateJWTAndSetCookies } from "../lib/generateJWTAndSetCookies";
import dotenv from "dotenv";
import jwt, { JwtPayload } from "jsonwebtoken";
import { uploadFileToCloudinary } from "../lib/uploadFile";
dotenv.config();

export async function register(req: Request, res: Response): Promise<any> {
  const { email, password, name, birthDay, gender, bio } = req.body;
  let { image } = req.body;

  if (!email || !password || !name || !birthDay || !gender) {
    return res
      .status(400)
      .json({ success: false, message: "Missing required fields" });
  }

  try {
    if (image) {
      const images = await uploadFileToCloudinary(image);
      if (!images) {
        return res
          .status(500)
          .json({ success: false, message: "Error uploading image" });
      }
      image = images[0]; // Assuming images is an array and we take the first image
      console.log("Image uploaded successfully:", image);
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await db.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        birthDay: new Date(birthDay),
        gender,
        image,
        bio,
      },
    });

    res.status(201).json({ success: true, user });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
}

export async function login(req: Request, res: Response): Promise<any> {
  const { email, password } = req.body;

  if (!email || !password) {
    return res
      .status(401)
      .json({ success: false, message: "Missing required fields" });
  }

  try {
    const user = await db.user.findFirst({
      where: { email },
      // prettier-ignore
      select: { id: true, email: true, password: true, name: true, role: true, image: true },
    });

    const isPasswordCorrect = await bcrypt.compare(
      password,
      user?.password as string
    );

    if (!user || !isPasswordCorrect) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid Email or Password" });
    }

    const token = generateJWTAndSetCookies(user.id, res);
    res.status(201).json({
      success: true,
      message: "Login in successfull",
      token,
      user: { ...user, password: undefined },
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
}

export async function logout(req: Request, res: Response): Promise<any> {
  try {
    res.clearCookie("jwt", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    });
    console.log("recieved");
    return res.status(200).json({ success: true, message: "Logout success" });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
}

declare module "express-serve-static-core" {
  interface Request {
    user?: {
      id: string;
      email: string;
      name: string;
      role: string;
      image: string | null;
    };
    headers: {
      authorization?: string;
    };
  }
}

export async function protect(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> {
  try {
    // if (
    //   req.headers.authorization &&
    //   !req.headers.authorization.startsWith("Bearer")
    // ) {
    //   return res
    //     .status(401)
    //     .json({ success: false, message: "User is not Authenticated" });
    // }

    const token = req.cookies.jwt || req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res
        .status(401)
        .json({ success: false, message: "User is not Authenticated" });
    }

    const payload: any = jwt.verify(token, process.env.JWT_SECRET!);

    if (!payload) {
      return res
        .status(401)
        .json({ success: false, message: "User is not aUthenticated" });
    }

    const user = await db.user.findUnique({
      where: { id: payload.id! },
      // prettier-ignore
      select: { id: true, email: true, name: true, role: true, image: true },
    });

    if (!user) {
      return res
        .status(401)
        .json({ success: false, message: "User is not auThenticated" });
    }

    req.user = user;

    next();
  } catch (error: any) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
}

export async function updatePassword(
  req: Request,
  res: Response
): Promise<any> {
  const { oldPassword, newPassword, confirmPassword } = req.body;

  if (!oldPassword || !newPassword || !confirmPassword) {
    return res
      .status(400)
      .json({ success: false, message: "Missing required fields" });
  }

  if (newPassword !== confirmPassword) {
    return res
      .status(400)
      .json({ success: false, message: "Passwords do not match" });
  }
  try {
    const userId = req.user?.id;

    const user = await db.user.findUnique({
      where: { id: userId },
      select: { password: true },
    });

    const isPasswordCorrect = await bcrypt.compare(
      oldPassword,
      user?.password as string
    );

    if (!user || !isPasswordCorrect) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid old password" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await db.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    res.clearCookie("jwt", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    });

    return res.status(200).json({
      success: true,
      message: "Password updated successfully",
    });
  } catch (error: any) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  } finally {
    await db.$disconnect();
  }
}
