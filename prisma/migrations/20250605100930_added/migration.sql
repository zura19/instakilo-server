/*
  Warnings:

  - Added the required column `birthDay` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "birthDay" TIMESTAMP(3) NOT NULL;
