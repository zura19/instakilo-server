import { Response, Request } from "express";
import { prisma } from "../lib/prisma";
import { io } from "../app";

export async function sentMessage(req: Request, res: Response): Promise<any> {
  const user = req.user;
  const { secondUserId } = req.params;
  const { message } = req.body;
  io.to([user?.id || "", secondUserId]).emit(`sendMessage`, {
    id: Date.now().toString(),
    message,
    sender: user,
    isRead: false,
    senderId: user?.id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  if (!message || !secondUserId || !message) {
    return res.status(400).json({
      success: false,
      message: "Missing required fields",
    });
  }

  try {
    const isUserExists = await prisma.user.findFirst({
      where: {
        id: secondUserId,
      },
    });

    if (!isUserExists) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const isConversationExists = await prisma.conversation.findFirst({
      // prettier-ignore
      where: {
        OR: [{ firstUserId: user?.id!,secondUserId: secondUserId!},
             { firstUserId: secondUserId,secondUserId: user?.id }],
      },
    });

    let newConversation;
    if (!isConversationExists) {
      newConversation = await prisma.conversation.create({
        data: {
          firstUserId: user?.id as string,
          secondUserId: secondUserId as string,
          lastMessage: message,
          lastMessageAt: new Date(),
        },
      });
    }

    if (isConversationExists) {
      await prisma.conversation.update({
        where: {
          id: isConversationExists.id,
        },
        data: {
          lastMessage: message,
          lastMessageAt: new Date(),
        },
      });
    }

    const newMessage = await prisma.message.create({
      data: {
        senderId: user?.id as string,
        message,
        isRead: false,
        conversationId: isConversationExists?.id! || newConversation?.id!,
      },
    });

    res.status(200).json({ success: true, message: newMessage });
  } catch (error: any) {
    console.log(error);
    res.status(500).json({
      success: false,
      error: error?.message || "Internal server error",
    });
  } finally {
    await prisma.$disconnect();
  }
}

export async function getConversation(
  req: Request,
  res: Response
): Promise<any> {
  const user = req.user;
  const { id } = req.params;
  const { page = 0, limit = 10 } = req.query;

  if (!id) {
    return res.status(400).json({
      success: false,
      message: "Something went wrong",
    });
  }

  const skip = Number(page) * Number(limit);
  const limitNumber = Number(limit);

  try {
    const conversation = await prisma.conversation.findFirst({
      // prettier-ignore
      where: {
        OR: [{ firstUserId: user?.id!,secondUserId: id},
             { secondUserId: user?.id,firstUserId: id }],
      },

      select: {
        id: true,
        messages: {
          skip,
          take: limitNumber,
          include: {
            sender: { select: { id: true, name: true, image: true } },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found",
      });
    }

    const totalMessages = await prisma.message.count({
      where: { conversationId: conversation.id },
    });
    const hasMore = (Number(page) + 1) * limitNumber < totalMessages;
    const nextPage = hasMore ? Number(page) + 1 : null;

    res.status(200).json({ success: true, conversation, nextPage });
  } catch (error: any) {
    console.log(error);
    res.status(500).json({
      success: false,
      error: error?.message || "Internal server error",
    });
  } finally {
    await prisma.$disconnect();
  }
}

export async function readMessages(req: Request, res: Response): Promise<any> {
  const user = req.user;
  const { secondUserId, conversationId } = req.params;

  try {
    const messagesToRead = await prisma.message.updateMany({
      // prettier-ignore
      where: {
        conversationId,
        senderId: secondUserId!,
        isRead: false,
      },
      data: {
        isRead: true,
      },
    });

    if (!messagesToRead) {
      return res.status(404).json({
        success: false,
        message: "Messages not found that can be marked as read",
      });
    }

    res.status(200).json({
      success: true,
      message: "Messages marked as read",
    });
  } catch (error: any) {
    console.log(error);
    res.status(500).json({
      success: false,
      error: error?.message || "Internal server error",
    });
  } finally {
    await prisma.$disconnect();
  }
}

export async function getUserConversations(
  req: Request,
  res: Response
): Promise<any> {
  const user = req.user;
  try {
    const conversations = await prisma.conversation.findMany({
      // prettier-ignore
      where: {
        OR: [{ firstUserId: user?.id!},
             { secondUserId: user?.id }],
      },

      select: {
        id: true,
        secondUser: { select: { id: true, name: true, image: true } },
        firstUser: { select: { id: true, name: true, image: true } },
        messages: {
          select: { isRead: true, senderId: true },
        },
        lastMessage: true,
        lastMessageAt: true,
      },
    });

    if (!conversations) {
      return res.status(404).json({
        success: false,
        message: "Conversations not found",
      });
    }

    const convs = conversations.map((conversation) => {
      if (conversation.firstUser.id === user?.id) {
        return {
          ...conversation,
          firstUser: undefined,
          secondUser: undefined,
          hasToRead: conversation.messages.some(
            (message) => message.senderId !== user?.id && !message.isRead
          ),
          conversationWith: conversation.secondUser,
          messages: undefined,
        };
      } else {
        return {
          ...conversation,
          secondUser: undefined,
          firstUser: undefined,
          conversationWith: conversation.firstUser,
          hasToRead: conversation.messages.some(
            (message) => message.senderId !== user?.id && !message.isRead
          ),
          messages: undefined,
        };
      }
    });

    res.status(200).json({ success: true, conversations: convs });
  } catch (error: any) {
  } finally {
    await prisma.$disconnect();
  }
}

export async function countUnreadMessages(
  req: Request,
  res: Response
): Promise<any> {
  const user = req.user;
  try {
    const count = await prisma.conversation.count({
      // prettier-ignore
      where: {
        OR: [{ firstUserId: user?.id!},
             { secondUserId: user?.id }],
        messages: { some: { isRead: false,senderId: {not: user?.id} } },
      },
    });

    res.status(200).json({ count });
  } catch (error: any) {
    console.log(error);
    res.status(500).json({ count: 0 });
  } finally {
    await prisma.$disconnect();
  }
}
