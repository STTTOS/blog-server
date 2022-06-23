import type { AddTagReq } from './interface'
import type { Identity } from '../interface'

import { Prisma } from '@prisma/client'

import router from '../instance'
import { tag } from '../../models'
import { apiPrefix } from '../../config'
import response from '../../utils/response'
import { withList } from '../../utils/response'
import { WithPaginationReq } from '../interface'
import combinePath from '../../utils/combinePath'

const tagApi = combinePath(apiPrefix)('/tag')

router.post(tagApi('/add'), async (ctx) => {
  const { name } = ctx.request.body

  if (!name) throw new Error('参数不正确')

  try {
    await tag.create({ data: { name } })
    response.success(ctx)
  } catch (error) {
    response.success(ctx, null, '标签已存在')
  }
})

router.post(tagApi('/delete'), async (ctx) => {
  const { id }: Identity & AddTagReq = ctx.request.body

  if (!id) throw new Error('参数不正确')

  try {
    await tag.delete({ where: { id } })
    response.success(ctx)
  } catch (error) {
    response.success(ctx, null, '标签不存在')
  }
})

router.post(tagApi('/update'), async (ctx) => {
  const { id, name }: Identity & AddTagReq = ctx.request.body

  if (!id || !name) throw new Error('参数不正确')
  try {
    await tag.update({ where: { id }, data: { name } })
    response.success(ctx)
  } catch (error) {
    response.success(ctx, null, '标签不存在或标签名称重复')
  }
})

router.post(tagApi('/list'), async (ctx) => {
  const {
    name,
    current: skip,
    pageSize: take
  }: WithPaginationReq & AddTagReq = ctx.request.body

  if (!skip || !take) throw new Error('参数不正确')

  const where: Prisma.TagWhereInput = {
    name: {
      contains: name
    }
  }
  const total = await tag.count({ where })
  const list = await tag.findMany({
    take,
    where,
    skip: (skip - 1) * take
  })
  response.success(ctx, withList(list, total))
})

router.post(tagApi('/all'), async (ctx) => {
  const list = await tag.findMany()

  response.success(ctx, withList(list, list.length))
})
