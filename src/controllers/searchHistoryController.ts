import e, { Request, Response } from "express";
import { prisma } from "../lib/prisma";

type userPart = {
  id: string;
  image: string | null;
  isVerificated: boolean;
  name: string;
};

export async function getSearchHistory(
  req: Request,
  res: Response
): Promise<any> {
  try {
    const user = req.user;
    const searchHistoryRecord = await prisma.searchHistory.findUnique({
      where: { searchedById: user?.id },
      // prettier-ignore
      select: { searchedUsers: { select: { id: true,image: true,isVerificated: true,name: true, } },orderedSearchedUserIds: true },
    });

    if (!searchHistoryRecord) {
      return res.status(200).json({
        success: false,
        message: "No searchHistory",
      });
    }

    const orderedSearchedUsers: userPart[] = [];
    const searchedUsersMap = new Map<string, userPart>();

    searchHistoryRecord.searchedUsers.forEach((searchedUser) => {
      searchedUsersMap.set(searchedUser.id, searchedUser);
    });

    searchHistoryRecord.orderedSearchedUserIds.forEach((userId) => {
      const user = searchedUsersMap.get(userId);
      if (user) {
        orderedSearchedUsers.push(user);
      }
    });

    return res.status(200).json({
      success: true,
      searchHistory: orderedSearchedUsers,
    });
  } catch (error: any) {
    console.log(error);
    return res.status(500).json({
      success: false,
      error: error?.message || "Internal server error",
    });
  } finally {
    await prisma.$disconnect();
  }
}

export async function addSearchHistory(
  req: Request,
  res: Response
): Promise<any> {
  try {
    const user = req.user;
    const { id: searchedUserId } = req.params;

    if (!user?.id || !searchedUserId || searchedUserId === user.id) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid request: Missing user data, searched user ID, or cannot search self.",
      });
    }

    const isSearchedUserExists = await prisma.user.findUnique({
      where: { id: searchedUserId },
    });
    if (!isSearchedUserExists) {
      return res
        .status(404)
        .json({ success: false, message: "User with this ID not found." });
    }

    const searchHistoryRecord = await prisma.searchHistory.upsert({
      where: { searchedById: user.id },
      update: {},
      create: {
        searchedById: user.id,
        orderedSearchedUserIds: [searchedUserId],
        searchedUsers: {
          connect: { id: searchedUserId },
        },
      },
      include: {
        searchedUsers: true, // Include searchedUsers to get the current list for logic
      },
    });

    let updatedOrderedSearchedUserIds =
      searchHistoryRecord.orderedSearchedUserIds.filter(
        (id) => id !== searchedUserId
      );

    // Prepend the new/re-searched user ID to the beginning of the array
    updatedOrderedSearchedUserIds.unshift(searchedUserId);

    await prisma.searchHistory.update({
      where: { id: searchHistoryRecord.id }, // Use the found/created history's ID
      data: {
        orderedSearchedUserIds: updatedOrderedSearchedUserIds, // Update the ordered array
        searchedUsers: {
          connect: { id: searchedUserId }, // Ensure the many-to-many relationship is maintained
        },
      },
    });

    return res
      .status(200)
      .json({ success: true, message: "Search history updated successfully." });
  } catch (error: any) {
    console.error("Error in addSearchHistory:", error); // Use console.error for errors
    return res.status(500).json({
      success: false,
      error: error?.message || "Internal server error",
    });
  } finally {
    await prisma.$disconnect(); // Always disconnect Prisma Client
  }
}

export async function deleteSearchHistory(
  req: Request,
  res: Response
): Promise<any> {
  try {
    const user = req.user;
    await prisma.searchHistory.update({
      where: { searchedById: user?.id },
      data: { searchedUsers: { set: [] }, orderedSearchedUserIds: [] },
    });
    return res
      .status(200)
      .json({ success: true, message: "Search history deleted" });
  } catch (error: any) {
    console.log(error);
    return res.status(500).json({
      success: false,
      error: error?.message || "Internal server error",
    });
  } finally {
    await prisma.$disconnect();
  }
}

export async function deleteUserFromSearchHistory(
  req: Request,
  res: Response
): Promise<any> {
  try {
    const { id: searchedUserId } = req.params;
    const user = req.user;

    const isUserInSearchHistory = await prisma.searchHistory.findFirst({
      where: {
        searchedById: user?.id,
        searchedUsers: { some: { id: searchedUserId } },
      },
    });
    if (!isUserInSearchHistory) {
      return res
        .status(404)
        .json({ success: false, message: "User not found in search history" });
    }

    await prisma.searchHistory.update({
      where: { searchedById: user?.id },
      data: { searchedUsers: { disconnect: { id: searchedUserId } } },
    });

    return res
      .status(200)
      .json({ success: true, message: "User deleted from search history" });
  } catch (error: any) {
    console.log(error);
    return res.status(500).json({
      success: false,
      error: error?.message || "Internal server error",
    });
  } finally {
    await prisma.$disconnect();
  }
}
