-- AlterTable
ALTER TABLE "User" ADD COLUMN     "resetPasswordRequestedAt" TIMESTAMP(3),
ADD COLUMN     "resetPasswordToken" TEXT,
ADD COLUMN     "resetPasswordTokenExpiresAt" TIMESTAMP(3);
