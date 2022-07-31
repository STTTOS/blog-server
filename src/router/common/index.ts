import { join } from 'path'
import { readFile, writeFile, access } from 'fs/promises'

import router from '../instance'
import response from '../../utils/response'
import combinePath from '../../utils/combinePath'
import { apiPrefix, authCode } from '../../config'

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

// 网站访问量埋点
router.post(commonApi('/webViewCount'), async (ctx) => {
  const filePath = join(__dirname, '../../../system.json')

  try {
    await access(filePath)

    const buffer = await readFile(filePath)
    const { viewCount } = JSON.parse(buffer.toString())

    const newData = { viewCount: viewCount + 1 }
    await writeFile(filePath, JSON.stringify(newData))
  } catch (error) {
    const initialData = { viewCount: 1 }
    await writeFile(filePath, JSON.stringify(initialData))
  } finally {
    response.success(ctx, null)
  }
})

// 获取网站访问量
router.post(commonApi('/getWebViewCount'), async (ctx) => {
  const filePath = join(__dirname, '../../../system.json')

  try {
    await access(filePath)

    const buffer = await readFile(filePath)
    const { viewCount } = JSON.parse(buffer.toString())
    response.success(ctx, { viewCount })
  } catch (error) {
    response.success(ctx, { viewCount: 0 })
  }
})
