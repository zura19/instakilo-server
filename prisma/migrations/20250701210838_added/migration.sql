-- CreateTable
CREATE TABLE "_likedStory" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_likedStory_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_likedStory_B_index" ON "_likedStory"("B");

-- AddForeignKey
ALTER TABLE "_likedStory" ADD CONSTRAINT "_likedStory_A_fkey" FOREIGN KEY ("A") REFERENCES "Story"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_likedStory" ADD CONSTRAINT "_likedStory_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
