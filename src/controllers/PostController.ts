import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { createNotification } from "./notificationsController";
import { v2 } from "cloudinary";
import {
  deleteFileFromCloudinary,
  uploadFileToCloudinary,
} from "../lib/uploadFile";

export async function createPost(req: Request, res: Response): Promise<any> {
  try {
    const user = req.user;
    if (!user)
      return res
        .status(400)
        .json({ success: false, message: "User not found" });
    const { content, images, tags } = req.body;
    if (!content || !images || !tags) {
      return res
        .status(400)
        .json({ success: false, message: "Missing required fields" });
    }

    const imagesToSend = await uploadFileToCloudinary(images);
    if (!imagesToSend || imagesToSend.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "Failed to upload images" });
    }

    const post = await prisma.post.create({
      data: {
        content,
        images: imagesToSend,
        authorId: user.id,
        tags: { connect: tags.map((tag: string) => ({ id: tag })) },
      },
    });

    return res
      .status(200)
      .json({ success: true, message: "Post successfully created!" });
  } catch (error: any) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: error?.message || "Internal server error",
    });
  }
}

export async function getRandomPosts(
  req: Request,
  res: Response
): Promise<any> {
  try {
    const posts = await prisma.post.findMany({
      // prettier-ignore
      include: {
        likedBy: { select: { id: true } },
        tags: {
          select: { id: true, name: true, email: true, image: true, isVerificated: true}},
          author: {select: {id: true,email: true,name: true,image: true,role: true,isVerificated: true}
        },
      },
      skip: 0,
      take: 10,
      orderBy: { likedBy: { _count: "desc" } },
    });
    return res.status(200).json({ success: true, posts, nextPage: null });
  } catch (error: any) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

export async function getPosts(req: Request, res: Response): Promise<any> {
  const user = req?.user;
  const { page = 0, limit = 10 } = req.query;

  console.log("DOMAIN:" + process.env.DOMAIN);

  const skip = Number(page) * Number(limit);
  const take = Number(limit);

  if (!user) {
    return res
      .status(400)
      .json({ success: false, message: "Authorize to get posts" });
  }

  try {
    const posts = await prisma.post.findMany({
      skip,
      take,
      include: {
        likedBy: { select: { id: true } },
        tags: {
          // prettier-ignore
          select: { id: true, name: true, email: true, image: true, isVerificated: true},
        },
        // prettier-ignore
        author: {select: {id: true,email: true,name: true,image: true,role: true,isVerificated: true,followers:{select:{followerId: true}}}
        },
        savedBy: { select: { id: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const count = await prisma.post.count();
    const hasMore = (Number(page) + 1) * take < count;
    const nextPage = hasMore ? Number(page) + 1 : null;

    return res.status(200).json({ success: true, posts, nextPage });
  } catch (error: any) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: error?.message || "Internal server error",
    });
  }
}

export async function getUserPosts(req: Request, res: Response): Promise<any> {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "No posts found" });
    }

    const posts = await prisma.post.findMany({
      where: { authorId: id },
      select: { id: true, images: true, likedBy: { select: { id: true } } },
      orderBy: { createdAt: "desc" },
    });
    return res.status(200).json({ success: true, posts });
  } catch (error: any) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: error?.message || "Internal server error",
    });
  }
}

export async function getTaggedPosts(
  req: Request,
  res: Response
): Promise<any> {
  try {
    const { id } = req.params;
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "No posts found" });
    }

    const posts = await prisma.post.findMany({
      // prettier-ignore
      include: {
        likedBy: { select: { id: true } },
        tags: {select: { id: true, name: true, email: true, image: true, isVerificated: true}},
        author: {select: {id: true,email: true,name: true,image: true,role: true,isVerificated: true}}
      },
      // prettier-ignore
      where: {tags: {some: {id: id}}},
    });
    return res.status(200).json({ success: true, posts });
  } catch (error: any) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: error?.message || "Internal server error",
    });
  }
}

export async function getSavedPosts(req: Request, res: Response): Promise<any> {
  try {
    const user = req.user;
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "No posts found" });
    }

    const posts = await prisma.post.findMany({
      // prettier-ignore
      include: {
        likedBy: { select: { id: true } },
        tags: {select: { id: true, name: true, email: true, image: true, isVerificated: true}},
        author: {select: {id: true,email: true,name: true,image: true,role: true,isVerificated: true}}
      },
      // prettier-ignore
      where: {savedBy: {some: {id: user.id}}},
    });
    return res.status(200).json({ success: true, posts });
  } catch (error: any) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: error?.message || "Internal server error",
    });
  }
}

export async function getPost(req: Request, res: Response): Promise<any> {
  const { id } = req.params;
  try {
    const post = await prisma.post.findUnique({
      where: { id },
      // prettier-ignore
      include: {
        likedBy: {select: { id: true }},
        savedBy: {select: { id: true }},
        tags: {select: {id: true,name: true,email: true,image: true,isVerificated: true}},
        author: {select: {id: true,email: true,name: true,image: true,role: true,isVerificated: true,followers:{select:{followerId: true}}}},
      },
    });
    return res.status(200).json({ success: true, post });
  } catch (error: any) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: error?.message || "Internal server error",
    });
  }
}

export async function likePost(req: Request, res: Response): Promise<any> {
  const { postId } = req.params;
  const userId = req.user?.id;

  try {
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { id: true, likedBy: { select: { id: true } } },
    });
    if (!post) {
      return res
        .status(404)
        .json({ success: false, message: "Post not found" });
    }

    const alreadyLiked = post.likedBy.some((user) => user.id === userId);

    const updatedPost = await prisma.post.update({
      where: { id: postId },
      include: {
        likedBy: {
          select: { id: true },
        },
      },
      data: {
        likedBy: {
          [alreadyLiked ? "disconnect" : "connect"]: {
            id: userId,
          },
        },
      },
    });

    if (!alreadyLiked) {
      await createNotification({
        type: "like",
        senderId: userId as string,
        receiverId: updatedPost.authorId,
        message: `${req.user?.name} liked your post`,
        redirectTo: `/?post=${updatedPost.id}`,
      });
    }

    return res
      .status(200)
      .json({ success: true, likes: post.likedBy.map((user) => user.id) });
  } catch (error: any) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: error?.message || "Internal server error",
    });
  }
}

export async function savePost(req: Request, res: Response): Promise<any> {
  const user = req.user;
  const { postId } = req.params;
  if (!postId) {
    return res.status(404).json({ success: false, message: "Post not found" });
  }

  const isSaved = await prisma.user.findFirst({
    where: { id: user?.id, saved: { some: { id: postId } } },
  });

  try {
    await prisma.user.update({
      where: { id: user?.id },
      data: {
        saved: isSaved
          ? { disconnect: { id: postId } }
          : { connect: { id: postId } },
      },
    });

    return res.status(200).json({
      success: true,
      message: isSaved
        ? "Post unsaved successfully"
        : "Post saved successfully",
    });
  } catch (error: any) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: error?.message || "Internal server error",
    });
  }
}

export async function deletePost(req: Request, res: Response): Promise<any> {
  const { id } = req.params;
  const userId = req.user?.id;
  try {
    const post = await prisma.post.findUnique({
      where: { id },
      select: { authorId: true, images: true },
    });

    console.log(post);

    if (userId !== post?.authorId) {
      return res.status(404).json({
        success: false,
        message: "You don't have permission to delete this post",
      });
    }

    if (post?.images) {
      await deleteFileFromCloudinary(post?.images);
    }
    await prisma.post.delete({ where: { id } });
    return res.status(200).json({ success: true, message: "Post deleted" });
  } catch (error: any) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: error?.message || "Internal server error",
    });
  } finally {
    prisma.$disconnect();
  }
}

export async function updatePost(req: Request, res: Response): Promise<any> {
  try {
    const { id } = req.params;
    const { tags, content } = req.body;
    let { images } = req.body;

    const oldPost = await prisma.post.findUnique({
      where: { id },
      select: { images: true, content: true },
    });

    const isSameImages =
      JSON.stringify(images) === JSON.stringify(oldPost?.images);

    console.log(tags);

    console.log(isSameImages);

    if (!isSameImages) {
      await deleteFileFromCloudinary(oldPost?.images as string[]);
      images = await uploadFileToCloudinary(images);
    }

    const post = await prisma.post.update({
      where: { id },
      data: {
        content,
        tags: { connect: tags.map((tag: string) => ({ id: tag })) },
        images: images,
      },
    });
    return res.status(200).json({ success: true });
  } catch (error: any) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: error?.message || "Internal server error",
    });
  } finally {
    prisma.$disconnect();
  }
}

export async function getLikes(req: Request, res: Response): Promise<any> {
  const { postId, commentId } = req.query;
  const userId = req.user?.id;
  if (!postId && !commentId)
    return res
      .status(404)
      .json({ success: false, message: "Failed to get likes" });

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        following: { select: { followingId: true } },
      },
    });

    const followingIds = user?.following.map((f) => f.followingId) || [];

    let likes;
    if (postId) {
      const Plikes = await prisma.post.findUnique({
        where: { id: String(postId) },
        select: {
          likedBy: {
            select: { id: true, name: true, email: true, image: true },
          },
        },
      });
      likes = Plikes?.likedBy || [];
    }

    if (commentId) {
      const Clikes = await prisma.comment.findUnique({
        where: { id: String(commentId) },
        select: {
          likes: {
            select: { id: true, name: true, email: true, image: true },
          },
        },
      });

      likes = Clikes?.likes || [];
    }

    likes?.sort((a, b) => {
      const getPriority = (userIdToCheck: string) => {
        if (userIdToCheck === userId) return 0; // logged-in user
        if (followingIds.includes(userIdToCheck)) return 1; // following
        return 2; // others
      };

      return getPriority(a.id) - getPriority(b.id);
    });

    return res.status(200).json({
      success: true,
      likes,
      user: { id: userId },
    });
  } catch (error: any) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: error?.message || "Internal server error",
    });
  } finally {
    await prisma.$disconnect();
  }
}
