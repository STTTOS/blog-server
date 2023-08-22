import type { Identity } from '../interface'
import type { GetArticleByPaginationReq } from './interface'

import moment from 'moment'
import { prop } from 'ramda'
import { Prisma } from '@prisma/client'

import router from '../instance'
import prisma from '../../models'
import { tag, article } from '../../models'
import response from '../../utils/response'
import { withList } from '../../utils/response'
import { parseUserInfoByCookie } from '../user'
import combinePath from '../../utils/combinePath'
import {
  apiPrefix,
  timeFormat,
  wordsToMinuteBaseNumber,
  timeFormatWithoutSeconds
} from '../../config'

const articleApi = combinePath(apiPrefix)('/article')

router.post(articleApi('/add'), async (ctx) => {
  const {
    body: { tagIds, content, coAuthorIds, ...data },
    header: { cookie }
  } = ctx.request
  const user = await parseUserInfoByCookie(cookie)

  if (!user) throw new Error('系统异常')

  const { id: authorId } = user
  const length = content.replace(/[\s#*-<>~]/g, '').length
  const readingTime = Math.ceil(length / wordsToMinuteBaseNumber)

  await article.create({
    data: {
      ...data,
      coAuthorIds: coAuthorIds?.join(','),
      authorId,
      content,
      length,
      readingTime,
      tags: {
        createMany: {
          data: tagIds.map((tagId: number) => ({ tagId, authorId }))
        }
      }
    }
  })
  response.success(ctx)
})

router.post(articleApi('/delete'), async (ctx) => {
  const { id }: Partial<Identity> = ctx.request.body

  if (!id) throw new Error('参数不正确')

  try {
    await article.delete({ where: { id: Number(id) } })
    response.success(ctx)
  } catch (error) {
    throw new Error('文章不存在')
  }
})

router.post(articleApi('/update'), async (ctx) => {
  const {
    body: { id, tagIds, content, createdAt, updatedAt, coAuthorIds, ...data }
  } = ctx.request

  if (!id) throw new Error('参数不正确')

  // 去除掉markdown标记
  const length = content.replace(/[\s#*-<>~]/g, '').length
  const readingTime = Math.ceil(length / wordsToMinuteBaseNumber)

  const thisOne = await article.findUnique({ where: { id } })
  await article.update({
    where: {
      id
    },
    data: {
      ...data,
      coAuthorIds: coAuthorIds?.join(','),
      content,
      length,
      readingTime,
      tags: {
        deleteMany: {
          articleId: id
        },
        createMany: {
          data: tagIds.map((tagId: number) => ({
            tagId,
            authorId: thisOne?.authorId
          }))
        }
      }
    }
  })
  response.success(ctx)
})

router.post(articleApi('/list'), async (ctx) => {
  const {
    time,
    title,
    tagIds,
    authorIds,
    filterType,
    current: skip,
    pageSize: take
  }: GetArticleByPaginationReq = ctx.request.body

  if (!skip || !take) throw new Error('分页参数不正确')

  // 条件查询
  const where: Prisma.ArticleWhereInput = {
    title: {
      contains: title
    }
  }

  if (tagIds && tagIds.length > 0) {
    where.tags = {
      some: {
        tagId: {
          in: tagIds
        }
      }
    }
  }
  if (authorIds && authorIds.length > 0) {
    where.authorId = {
      in: authorIds
    }
  }

  // 时间范围筛选
  if (time) {
    const [start, end] = time
    where.createdAt = {
      lte: end,
      gte: start
    }
  }

  // 排序方案
  const orderBy: Prisma.ArticleOrderByWithRelationInput = (() => {
    if (filterType === 'hotest') return { viewCount: 'desc' }

    return { id: 'desc' }
  })()

  const total = await article.count({ where })
  const list = await article.findMany({
    where,
    include: {
      author: {
        select: {
          name: true
        }
      },
      tags: {
        include: {
          tag: {
            select: {
              name: true
            }
          }
        }
      }
    },
    take,
    skip: (skip - 1) * take,
    orderBy
  })

  const newList = list.map(({ author, tags, createdAt, ...rest }) => ({
    ...rest,
    authorName: author?.name,
    createdAt: moment(createdAt).format(timeFormat),
    tags: tags.map(({ tagId: id, tag: { name } }) => ({ id, name }))
  }))
  response.success(ctx, withList(newList, total))
})

router.post(articleApi('/detail'), async (ctx) => {
  const { id }: Identity = ctx.request.body

  if (!id) throw new Error('参数不正确')

  const data = await article.findUnique({
    include: {
      tags: {
        include: {
          tag: true
        }
      }
    },
    where: { id }
  })
  if (!data) {
    response.success(ctx, null)
    return
  }
  const { tags, createdAt, ...rest } = data
  response.success(ctx, {
    tagIds: tags.map(({ tag: { id } }) => id),
    tags: tags.map(({ tag: { id, name } }) => ({ id, name })),
    createdAt: moment(createdAt).format(timeFormatWithoutSeconds),
    ...rest
  })
})

router.post(articleApi('/similar'), async (ctx) => {
  const { id }: Identity = ctx.request.body

  if (!id) throw new Error('参数不正确')

  const tagIds = await getTagIdsByArticleId(id)
  const list = await article.findMany({
    where: {
      id: {
        not: id
      },
      tags: {
        some: {
          tagId: {
            in: tagIds
          }
        }
      }
    },
    orderBy: {
      viewCount: 'desc'
    },
    take: 5
  })
  response.success(ctx, withList(list, list.length))
})

// 埋点统计
router.post(articleApi('/count'), async (ctx) => {
  const { id }: Identity = ctx.request.body

  if (!id) throw new Error('参数不正确')

  const tagIds = await getTagIdsByArticleId(id)

  const updateArticleViewCounts = article.update({
    where: {
      id
    },
    data: {
      viewCount: {
        increment: 1
      }
    }
  })
  const updateTagViewCount = tag.updateMany({
    where: {
      id: {
        in: tagIds
      }
    },
    data: {
      viewCount: {
        increment: 1
      }
    }
  })

  await prisma.$transaction([updateArticleViewCounts, updateTagViewCount])
  response.success(ctx, null)
})

router.post(articleApi('/clientList'), async (ctx) => {
  const { authorId, tagId } = ctx.request.body

  const where: Prisma.ArticleWhereInput = {}

  if (authorId) {
    where.authorId = authorId
  }
  if (tagId) {
    where.tags = {
      some: {
        tagId
      }
    }
  }
  const list = await article.findMany({
    include: {
      author: {
        select: {
          avatar: true,
          name: true
        }
      }
    },
    where
  })
  const newList = list.map(({ createdAt, author, ...rest }) => ({
    ...rest,
    avatar: author?.avatar,
    authorName: author?.name,
    createdAt: moment(createdAt).format(timeFormat)
  }))
  response.success(ctx, withList(newList, newList.length))
})
async function getTagIdsByArticleId(id: number) {
  const data = await article.findUnique({
    where: {
      id
    },
    include: {
      tags: true
    }
  })
  if (!data) return []

  return data.tags.map(prop('tagId'))
}
