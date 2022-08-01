import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export const { user, article, tag, tagsOnArticles, tools } = prisma

export default prisma
