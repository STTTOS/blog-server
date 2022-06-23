import { Prisma } from '@prisma/client'
import type { Identity } from '../interface'
import type { GetArticleByPaginationReq } from './interface'

import router from '../instance'
import { article } from '../../models'
import { apiPrefix } from '../../config'
import response from '../../utils/response'
import { withList } from '../../utils/response'
import combinePath from '../../utils/combinePath'

const articleApi = combinePath(apiPrefix)('/article')

router.post(articleApi('/add'), async (ctx) => {
  const { tagIds, content, ...data } = ctx.request.body

  const length = content.length

  await article.create({
    data: {
      ...data,
      content,
      length,
      tags: {
        createMany: {
          data: tagIds.map((tagId: number) => ({ tagId }))
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
    id,
    tagIds,
    content,
    ...data
  }: Partial<Record<string, any> & Identity> = ctx.request.body

  if (!id) throw new Error('参数不正确')

  const length = content.length
  await article.update({
    where: {
      id
    },
    data: {
      ...data,
      content,
      length,
      tags: {
        deleteMany: {
          articleId: id
        },
        createMany: {
          data: tagIds.map((tagId: number) => ({ tagId }))
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
    },
    tags: {
      some: {
        tagId: {
          in: tagIds
        }
      }
    },
    authorId: {
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
  const orderBy = (() => {
    if (filterType === 'hotest') return { id: 'desc' } as const
    else if (filterType === 'newest') return { viewCount: 'desc' } as const
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

  const newList = list.map(({ author, tags, ...rest }) => ({
    ...rest,
    authorName: author?.name,
    tags: tags.map(({ tagId: id, tag: { name } }) => ({ id, name }))
  }))
  response.success(ctx, withList(newList, total))
})
