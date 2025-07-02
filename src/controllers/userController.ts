import { prisma as db } from "../lib/prisma";
import { Request, Response } from "express";
import { v2 as cloudinary } from "cloudinary";
import {
  deleteFileFromCloudinary,
  uploadFileToCloudinary,
} from "../lib/uploadFile";

export async function isEmailOrNameRegistered(
  req: Request,
  res: Response
): Promise<any> {
  const { email, name } = req.body;
  try {
    const isEmailRegistered = await db.user.findUnique({
      where: {
        email,
      },
    });

    if (isEmailRegistered) {
      return res
        .status(400)
        .json({ success: false, message: "Email already registered" });
    }

    const isNameRegistered = await db.user.findFirst({
      where: {
        name,
      },
    });

    if (isNameRegistered) {
      return res
        .status(400)
        .json({ success: false, message: "Name already registered" });
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}

export async function getUser(req: Request, res: Response): Promise<any> {
  const { id } = req.params;

  try {
    const user = await db.user.findUnique({
      where: { id },
      // prettier-ignore
      include:
         {
          followers: { select: { followerId: true } },
          following: { select: { followingId: true } },
          stories:{where: { createdAt: { gt: new Date(Date.now() - 24 * 60 * 60 * 1000) }}, select: { id: true }
        },
      },
    });

    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    const countPosts = await db.post.count({
      where: { authorId: user.id },
    });

    // const isStoryViewed = user.stories.every((s) =>
    //   s.viewedBy.some((v) => v.id === "cmbjazzu600006s0v62fm3e8x")
    // );

    const u = {
      ...user,
      password: undefined,
      hasStory: user.stories.length > 0,
      // isStoryViewed,
    };

    return res.status(200).json({
      success: true,
      user: u,
      posts: countPosts,
    });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ success: false, error: "Internal server error" });
  }
}

export async function getProfile(req: Request, res: Response): Promise<any> {
  try {
    const full = JSON.parse((req.query.full as string) || "{}");

    console.log(full);
    let user;
    if (!full) {
      user = req.user;
    } else {
      user = await db.user.findUnique({
        where: { id: req.user?.id },
        // prettier-ignore
      });
    }

    return res
      .status(200)
      .json({ success: true, user: { ...user, password: undefined } });
  } catch (error: any) {
    console.log(error);
    return res.status(500).json({
      success: false,
      error: error.message || "Internal server error",
    });
  }
}

export async function updateProfile(req: Request, res: Response): Promise<any> {
  try {
    const user = req.user;
    const { name, email, bio, gender } = req.body.data;
    let image = req.body.data.image;
    const isEmailRegistered = await db.user.findFirst({
      where: {
        email,
      },
    });

    if (email !== user?.email && isEmailRegistered) {
      return res
        .status(400)
        .json({ success: false, message: "Email already registered" });
    }

    const isNameRegistered = await db.user.findFirst({
      where: {
        name,
      },
    });

    if (name !== user?.name && isNameRegistered) {
      return res
        .status(400)
        .json({ success: false, message: "Name already registered" });
    }

    if (user?.image !== image) {
      const deleted = await deleteFileFromCloudinary(user?.image as string);
      if (!deleted) {
        return res
          .status(403)
          .json({ success: false, message: "Error deleting old image" });
      }
      const i = await uploadFileToCloudinary(image);
      if (!i) {
        return res
          .status(500)
          .json({ success: false, message: "Error uploading image" });
      }
      image = i[0];
    }

    const updated = await db.user.update({
      where: { id: req.user?.id },
      data: { name, image, email, bio, gender },
      // prettier-ignore
      select: {id: true, name: true, email: true, image: true,role: true, isVerificated: true},
    });
    return res.status(200).json({ success: true, user: updated });
  } catch (error: any) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
}

export async function getUsers(req: Request, res: Response): Promise<any> {
  const loggedUser = req.user;
  const { username } = req.params;

  console.log(loggedUser);
  try {
    const user = await db.user.findMany({
      where: {
        id: { not: loggedUser?.id },
        name: { contains: username, mode: "insensitive" },
      },
      orderBy: { name: "asc" },
      take: 10,
      // prettier-ignore
      select: {id: true,email: true,name: true,image: true,},
    });

    if (!user || user.length === 0)
      return res
        .status(404)
        .json({ success: false, message: "User with name not found" });

    return res.status(200).json({ success: true, users: user });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ success: false, error: "Internal server error" });
  }
}

export async function followUnfollowUser(
  req: Request,
  res: Response
): Promise<any> {
  try {
    const { followingId } = req.params;
    const followerId = req.user?.id;

    if (!followerId || !followingId) {
      return res
        .status(400)
        .json({ success: false, message: "Missing required fields" });
    }

    const isFollowing = await db.follow.findFirst({
      where: {
        followerId,
        followingId,
      },
    });

    if (isFollowing) {
      await db.follow.delete({
        where: {
          id: isFollowing.id,
        },
      });
      return res.status(200).json({ success: true, message: "Unfollow" });
    }

    await db.follow.create({
      data: {
        followerId,
        followingId,
      },
    });
    return res.status(200).json({ success: true, message: "Follow" });
  } catch (error: any) {
    console.log(error);
    return res.status(500).json({
      success: false,
      error: error.message || "Internal server error",
    });
  }
}

export async function getUserFollowersOrFollowings(
  req: Request,
  res: Response
): Promise<any> {
  const { id, type } = req.params;
  const userId = req.user?.id;

  // const name = req.query.name as string;

  const nameQuery = req.query.name ? (req.query.name as string) : ""; // Get the name to filter by

  const types = ["followers", "following"];
  if (!types.includes(type))
    return res.status(400).json({ success: false, message: "Invalid type" });

  try {
    // @ts-expect-error idk
    const userWithRelations: {
      followers: { follower: any }[];
      following: { following: any }[];
    } = await db.user.findUnique({
      where: { id },
      // prettier-ignore
      include: type === "followers" ? { followers: {include: {follower: {select: {id: true,image: true,name:true , isVerificated: true}}}}}
          : { following: { include: { following: { select: { id: true, image: true, name: true, isVerificated: true}}}}},
    });

    if (!userWithRelations)
      return res
        .status(404)
        .json({ success: false, message: "User with this id not found" });

    let usersToFilter: any[] = [];

    if (type === "followers") {
      usersToFilter = userWithRelations.followers.map((f) => f.follower);
    } else {
      usersToFilter = userWithRelations.following.map((f) => f.following);
    }

    // Apply the name filter if nameQuery is provided
    let filteredUsers = usersToFilter;

    console.log(nameQuery);

    if (nameQuery && nameQuery !== "undefined") {
      console.log(nameQuery);
      const lowerCaseNameQuery = nameQuery.toLowerCase();
      filteredUsers = usersToFilter.filter(
        (user) => user.name && user.name.toLowerCase().includes(nameQuery)
      );
    }

    return res.status(200).json({ success: true, users: filteredUsers });
  } catch (error: any) {
    console.log(error);
    return res.status(500).json({
      success: false,
      error: error.message || "Internal server error",
    });
  }
}
