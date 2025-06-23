import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { io } from "../app";

export type notificationType = {
  type: "post" | "comment" | "like" | "follow" | "likedComment" | "tag";
  message?: string;
  redirectTo?: string;
  receiverId: string;
  senderId: string;
};

export async function getNotifications(
  req: Request,
  res: Response
): Promise<any> {
  const user = req.user;
  const { limit, page } = req.query;
  const take = Number(limit) || 10;
  const skip = Number(page) * Number(limit) || 0;
  try {
    const notifications = await prisma.notification.findMany({
      where: { receiverId: user?.id },
      take,
      skip,
      include: { sender: { select: { id: true, name: true, image: true } } },
      orderBy: { createdAt: "desc" },
    });

    const count = await prisma.notification.count({
      where: { receiverId: user?.id },
    });

    const hasMore = (Number(page) + 1) * take < count;
    const nextPage = hasMore ? Number(page) + 1 : null;

    res.status(200).json({ success: true, notifications, nextPage });
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

export async function markAsReadNotifications(
  req: Request,
  res: Response
): Promise<any> {
  const user = req.user;
  io.to(user?.id as string).emit("readNotifications");

  try {
    await prisma.notification.updateMany({
      where: { receiverId: user?.id, isRead: false },
      data: { isRead: true },
    });

    res.status(200).json({
      success: true,
      message: "Notifications marked as read",
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

export async function countUnreadNotifications(
  req: Request,
  res: Response
): Promise<any> {
  const user = req.user;
  try {
    const count = await prisma.notification.count({
      where: { receiverId: user?.id, isRead: false },
    });
    res.status(200).json({ count });
  } catch (error) {
    res.status(500).json({ count: 0 });
  } finally {
    await prisma.$disconnect();
  }
}

// prettier-ignore
export async function createNotification({senderId, receiverId, type, message, redirectTo}:notificationType) {
    if(senderId === receiverId) return
  try {
    const notification = await prisma.notification.create({
      data: {
        message,
        receiverId,
        senderId,
        type,
        redirectTo,
      },
    });

    console.log(notification);

    io.to(receiverId).emit("sendNotification", notification);

    return notification
  } catch (error) {
    console.log(error);
  }
}
