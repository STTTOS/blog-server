import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export const { user, article, tag, tagsOnArticles } = prisma

export default prisma
