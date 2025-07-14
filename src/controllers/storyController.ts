import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { uploadFileToCloudinary } from "../lib/uploadFile";
import { createNotification } from "./notificationsController";

export async function getUserStories(
  req: Request,
  res: Response
): Promise<any> {
  const loggedId = req.user?.id;
  const { userId } = req.params;
  try {
    const stories = await prisma.story.findMany({
      where: {
        authorId: userId,
        createdAt: {
          gt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hours ago
        },
      },
      // prettier-ignore
      include: { author: { select: { id: true, name: true, image: true } },viewedBy: { select: { id: true } },likedBy: { select: { id: true } } },
      orderBy: {
        createdAt: "asc",
      },
    });

    const s = stories.map((story) => {
      return {
        ...story,
        // isViewed: story.viewedBy.some((v) => v.id === userId),
        isLiked: story.likedBy.some((v) => v.id === loggedId),
        likedBy: undefined,
      };
    });

    console.log(stories[0].likedBy, loggedId);

    res.status(200).json({
      success: true,
      stories: s,
    });
  } catch (error: any) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: error?.message || "Internal server error",
    });
  } finally {
    await prisma.$disconnect();
  }
}

export async function addStory(req: Request, res: Response): Promise<any> {
  const userId = req.user?.id;
  let image = req.body.image;

  if (!userId || !image) {
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

    const story = await prisma.story.create({
      data: {
        authorId: userId,
        image,
      },
    });
    res.status(200).json({
      success: true,
      story,
    });
  } catch (error: any) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: error?.message || "Internal server error",
    });
  } finally {
    await prisma.$disconnect();
  }
}

export async function deleteStory(req: Request, res: Response): Promise<any> {
  try {
    const { storyId } = req.params;
    const userId = req.user?.id;
    const story = await prisma.story.findUnique({
      where: { id: storyId },
      select: { authorId: true },
    });
    if (story?.authorId !== userId) {
      return res.status(404).json({
        success: false,
        message: "You don't have permission to delete this story",
      });
    }
    await prisma.story.delete({ where: { id: storyId } });
    res.status(200).json({
      success: true,
      message: "Story deleted successfully",
    });
  } catch (error: any) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: error?.message || "Internal server error",
    });
  } finally {
    await prisma.$disconnect();
  }
}

export async function getStories(req: Request, res: Response): Promise<any> {
  const id = req.user?.id;
  // const { limit, page } = req.query;
  // const skip = Number(page) * Number(limit) || 0;
  // const take = Number(limit) || 8;
  try {
    const stories = await prisma.user.findMany({
      // get users who are following the logged in user
      where: {
        followers: {
          some: {
            followerId: id,
          },
        },
        // prettier-ignore
        stories: { some: { createdAt: { gt: new Date(Date.now() - 24 * 60 * 60 * 1000)}}},
      },
      // prettier-ignore
      select: { id: true, name: true, image: true, stories: { select: { viewedBy: { select: { id: true } } } },
      },
      orderBy: {
        createdAt: "desc",
      },
      // skip,
      // take,
    });

    // const countStories = await prisma.user.count({
    //   // prettier-ignore
    //   where: { followers: { some: { followerId: id }},
    //   // prettier-ignore
    //   stories: { some: { createdAt: { gt: new Date(Date.now() - 24 * 60 * 60 * 1000)}}},
    //   },
    // });

    // const hasNextPage = (Number(page) + 1) * take < countStories;
    // const nextPage = hasNextPage ? Number(page) + 1 : null;

    const st = stories
      .map((story) => ({
        ...story,
        stories: undefined,
        isViewed: story.stories.every((s) =>
          s.viewedBy.some((v) => v.id === id)
        ),
      }))
      .sort((a, b) => Number(a.isViewed) - Number(b.isViewed));

    res.status(200).json({
      success: true,
      stories: st,
    });
  } catch (error: any) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: error?.message || "Internal server error",
    });
  } finally {
    await prisma.$disconnect();
  }
}

export async function viewStory(req: Request, res: Response): Promise<any> {
  const userId = req.user?.id;
  const { storyId } = req.params;
  try {
    await prisma.story.update({
      where: { id: storyId },
      data: {
        viewedBy: { connect: { id: userId } },
      },
    });
    res.status(200).json({
      success: true,
      message: "Story viewed successfully",
    });
  } catch (error: any) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: error?.message || "Internal server error",
    });
  } finally {
    await prisma.$disconnect();
  }
}

export async function getStoryViewers(
  req: Request,
  res: Response
): Promise<any> {
  const userId = req.user?.id;
  const { storyId } = req.params;
  try {
    const story = await prisma.story.findUnique({
      where: { id: storyId, authorId: userId },
      select: { viewedBy: { select: { id: true, name: true, image: true } } },
    });
    res.status(200).json({
      success: true,
      viewers: story?.viewedBy,
    });
  } catch (error: any) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: error?.message || "Internal server error",
    });
  } finally {
    await prisma.$disconnect();
  }
}

export async function likeUnlikeStory(
  req: Request,
  res: Response
): Promise<any> {
  const userId = req.user?.id;
  const storyId = req.params.storyId;
  try {
    const isLiked = await prisma.story.findUnique({
      where: { id: storyId, likedBy: { some: { id: userId } } },
    });

    const updatedStory = await prisma.story.update({
      where: {
        id: storyId,
      },
      data: {
        likedBy: isLiked
          ? { disconnect: { id: userId } }
          : { connect: { id: userId } },
      },
    });

    if (!isLiked) {
      createNotification({
        senderId: userId!,
        receiverId: updatedStory.authorId,
        type: "like",
        message: `${req.user?.name} liked your story`,
        redirectTo: `/story/${updatedStory.authorId}`,
      });
    }

    res.status(200).json({
      success: true,
      message: isLiked
        ? "Story unliked successfully"
        : "Story liked successfully",
    });
  } catch (error: any) {
    console.log(error);

    res.status(500).json({
      success: false,
      message: error?.message || "Internal server error",
    });
  } finally {
    await prisma.$disconnect();
  }
}

export async function getArchivedStories(
  req: Request,
  res: Response
): Promise<any> {
  const userId = req.user?.id;
  console.log(userId);
  try {
    const stories = await prisma.story.findMany({
      where: {
        authorId: userId,
        createdAt: {
          lt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hours ago
        },
      },
      select: { id: true, image: true, createdAt: true },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.status(200).json({
      success: true,
      stories,
    });
  } catch (error: any) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: error?.message || "Internal server error",
    });
  } finally {
    await prisma.$disconnect();
  }
}

export async function getArchivedStory(req: Request, res: Response) {
  const userId = req.user?.id;
  const { id } = req.params;
  try {
    const story = await prisma.story.findUnique({
      where: {
        id,
        authorId: userId,
        createdAt: {
          lt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hours ago
        },
      },
      select: {
        id: true,
        image: true,
        createdAt: true,
        author: { select: { id: true, name: true, image: true } },
      },
    });
    res.status(200).json({
      success: true,
      story,
    });
  } catch (error: any) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: error?.message || "Internal server error",
    });
  } finally {
    await prisma.$disconnect();
  }
}
