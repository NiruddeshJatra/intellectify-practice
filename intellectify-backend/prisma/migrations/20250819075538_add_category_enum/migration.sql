/*
  Warnings:

  - The `category` column on the `content` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "public"."Category" AS ENUM ('GENERAL', 'PROGRAMMING_LANGUAGES', 'DATA_STRUCTURES_ALGORITHMS', 'SYSTEM_DESIGN', 'TECH_INSIGHTS', 'DATA_AI', 'WEB_DEVELOPMENT');

-- AlterTable
ALTER TABLE "public"."content" DROP COLUMN "category",
ADD COLUMN     "category" "public"."Category";
