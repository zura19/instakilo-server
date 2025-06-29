import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { createNotification } from "./notificationsController";

export async function getPostComments(
  req: Request,
  res: Response
): Promise<any> {
  const { postId } = req.params;
  const user = req?.user;
  const { limit, page } = req.query;

  const skip = Number(page) * Number(limit);
  const take = Number(limit);

  try {
    const comments = await prisma.comment.findMany({
      where: { postId },
      skip,
      take,
      include: {
        author: {
          select: {
            id: true,
            email: true,
            name: true,
            image: true,
            role: true,
            isVerificated: true,
          },
        },
        likes: {
          select: { id: true },
        },
      },
      orderBy: [{ likes: { _count: "desc" } }, { createdAt: "desc" }],
    });

    if (!comments) {
      return res
        .status(404)
        .json({ success: false, message: "Comments not found" });
    }

    const totalComments = await prisma.comment.count({ where: { postId } });
    const hasMore = (Number(page) + 1) * take < totalComments;
    const nextPage = hasMore ? Number(page) + 1 : null;

    return res.status(200).json({ success: true, comments, nextPage });
  } catch (error: any) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: error?.message || "Internal server error",
    });
  }
}

export async function addComment(req: Request, res: Response): Promise<any> {
  const { postId } = req.params;
  const { content } = req.body;
  const userId = req.user?.id;

  if (!userId)
    return res
      .status(400)
      .json({ success: false, message: "Authorize to add comment." });

  try {
    const comment = await prisma.comment.create({
      data: {
        content,
        authorId: userId,
        postId,
      },
    });

    if (comment) {
      const post = await prisma.post.findUnique({
        where: { id: postId },
        select: { authorId: true },
      });
      await createNotification({
        type: "comment",
        senderId: userId as string,
        receiverId: post?.authorId as string,
        message: `${req.user?.name} commented on your post: ${content}`,
        redirectTo: `/?post=${comment.postId}&c=${comment.id}`,
      });
    }

    return res.status(200).json({ success: true, comment });
  } catch (error: any) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: error?.message || "Internal server error",
    });
  }
}

export async function likeUnlikeComment(
  req: Request,
  res: Response
): Promise<any> {
  const { postId, commentId } = req.params;
  const userId = req.user?.id;

  console.log(commentId);
  try {
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      select: { id: true, likes: { select: { id: true } } },
    });
    if (!comment) {
      return res
        .status(404)
        .json({ success: false, message: "Comment not found" });
    }

    const alreadyLiked = comment.likes.some((user) => user.id === userId);

    const updatedComment = await prisma.comment.update({
      where: { id: commentId },
      include: {
        likes: {
          select: { id: true },
        },
      },
      data: {
        likes: {
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
        receiverId: updatedComment.authorId,
        message: `${req.user?.name} liked your comment`,
        redirectTo: `/?post=${postId}&c=${commentId}`,
      });
    }

    return res.status(200).json({
      success: true,
      message: alreadyLiked
        ? "Comment unliked successfully"
        : "Comment liked successfully",
      likes: updatedComment.likes?.map((user) => user.id),
    });
  } catch (error: any) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: error?.message || "Internal server error",
    });
  }
}

export async function deleteComment(req: Request, res: Response): Promise<any> {
  const { postId, commentId } = req.params;
  const userId = req.user?.id;
  try {
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      select: { authorId: true },
    });
    if (comment?.authorId !== userId) {
      return res.status(404).json({
        success: false,
        message: "You don't have permission to delete this comment",
      });
    }

    await prisma.comment.delete({ where: { id: commentId, postId } });
    return res.status(200).json({ success: true, message: "Comment deleted" });
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

export async function updateComment(req: Request, res: Response): Promise<any> {
  const { postId, commentId } = req.params;
  const { content } = req.body;
  const userId = req.user?.id;
  try {
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      select: { authorId: true },
    });

    if (comment?.authorId !== userId) {
      return res.status(404).json({
        success: false,
        message: "You don't have permission to update this comment",
      });
    }

    const updatedComment = await prisma.comment.update({
      where: { id: commentId },
      data: { content },
    });

    return res.status(200).json({
      success: true,
      message: "Comment updated successfully",
    });
  } catch (error) {
  } finally {
    await prisma.$disconnect();
  }
}
