/*
  Warnings:

  - You are about to drop the `Search` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Search" DROP CONSTRAINT "Search_userId_fkey";

-- DropTable
DROP TABLE "Search";
