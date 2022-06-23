/* eslint-disable @typescript-eslint/ban-ts-comment */
import router from '../instance'
import { apiPrefix } from '../../config'
import { authCode } from '../../secret'
import response from '../../utils/response'
import combinePath from '../../utils/combinePath'

const commonApi = combinePath(apiPrefix)('/common')

// 接收二进制流
router.post(commonApi('/upload'), async (ctx) => {
  const file = ctx.request.files?.file

  if (!file) throw new Error('空文件!')

  if (Array.isArray(file)) throw new Error('不支持多文件上传')

  const url = `/static/${file.newFilename}`
  response.success(ctx, { url })
})

router.post(commonApi('/auth'), async (ctx) => {
  const { code } = ctx.request.body

  if (!code) throw new Error('参数异常')

  response.success(ctx, {
    isPass: code === authCode
  })
})
