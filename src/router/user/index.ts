import type { UpdateUserReq, GetUserByPaginationReq } from './interface'
import type { Identity } from '../interface'

import moment from 'moment'
import { Prisma } from '@prisma/client'
import { compose, map, reduce, prop } from 'ramda'

import router from '../instance'
import { user } from '../../models'
import response from '../../utils/response'
import { withList } from '../../utils/response'
import combinePath from '../../utils/combinePath'
import { apiPrefix, timeFormat } from '../../config'

const userApi = combinePath(apiPrefix)('/user')

router.post(userApi('/add'), async (ctx) => {
  const { name, ...data } = ctx.request.body

  if (!name) throw new Error('昵称不能为空')

  await user.create({ data: { ...data, name } })
  response.success(ctx)
})

router.post(userApi('/delete'), async (ctx) => {
  const { id }: Identity = ctx.request.body

  if (!id) throw new Error('id 不能为空')

  try {
    await user.delete({ where: { id: Number(id) } })
    response.success(ctx)
  } catch (error) {
    response.success(ctx, null, '用户不存在')
  }
})

router.post(userApi('/update'), async (ctx) => {
  const { id, name, ...data }: UpdateUserReq = ctx.request.body

  if (!id) throw new Error('id 不能为空')
  if (!name) throw new Error('昵称不能为空')

  try {
    await user.update({
      data: { ...data, name },
      where: { id: Number(id) }
    })
    response.success(ctx, null)
  } catch (error) {
    response.success(ctx, null, '用户不存在')
  }
})

router.post(userApi('/list'), async (ctx) => {
  const { name, email, time, current, pageSize }: GetUserByPaginationReq =
    ctx.request.body

  if (!current || !pageSize) throw new Error('分页参数不正确')

  const where: Prisma.UserWhereInput = {}
  if (name) {
    where.name = {
      contains: name
    }
  }
  if (email) {
    where.email = {
      contains: email
    }
  }
  if (time && Array.isArray(time)) {
    const [start, end] = time

    where.createdAt = {
      lte: end,
      gte: start
    }
  }

  const total = await user.count({ where })
  const list = await user.findMany({
    where,
    include: {
      articles: {
        select: {
          viewCount: true
        }
      }
    },
    take: pageSize,
    skip: (current - 1) * pageSize
  })
  const newList = list.map(({ createdAt, articles, ...rest }) => ({
    ...rest,
    createdAt: moment(createdAt).format(timeFormat),
    viewCount: articles.reduce((acc, { viewCount }) => acc + viewCount, 0)
  }))
  response.success(ctx, withList(newList, total))
})

router.post(userApi('/recommend'), async (ctx) => {
  const list = await user.findMany({
    include: {
      articles: {
        select: {
          viewCount: true
        }
      }
    }
  })
  const newList = list.map(({ articles, ...rest }) => ({
    totalViewCount: sumViewCounts(articles),
    ...rest
  }))

  response.success(ctx, withList(newList, newList.length))
})

router.post(userApi('/detail'), async (ctx) => {
  const { id }: Identity = ctx.request.body

  if (!id) throw new Error('参数不正确')

  const result = await user.findUnique({ where: { id: Number(id) } })
  if (result) {
    response.success(ctx, result)
    return
  }

  response.success(ctx, null, '用户不存在')
})

router.post(userApi('/all'), async (ctx) => {
  const list = await user.findMany()
  response.success(ctx, withList(list, list.length))
})

export const sum = (a: number, b: number) => a + b
const sumViewCounts = compose(reduce(sum, 0), map(prop('viewCount')))

router.post(userApi('/card'), async (ctx) => {
  const { id } = ctx.request.body

  if (!id) throw new Error('参数不正确')

  const data = await user.findUnique({
    where: {
      id
    },
    include: {
      articles: {
        select: {
          viewCount: true
        }
      }
    }
  })
  if (!data) {
    response.success(ctx, null)
    return
  }
  const { articles, ...rest } = data
  response.success(ctx, {
    totalViewCount: sumViewCounts(articles),
    ...rest
  })
})
