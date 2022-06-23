import type { BizError } from './router/interface'

import Koa from 'koa'
import { join } from 'path'
import cors from '@koa/cors'
import serve from 'koa-static'
import koaBody from 'koa-body'

import router from './router'
import { port } from './config'
import { logger } from './logger'
import response from './utils/response'

const app = new Koa()

app.use(async (ctx, next) => {
  try {
    await next()
  } catch (err) {
    const status = (err as BizError).status || 500

    logger.error((err as BizError).message)
    response.error(ctx, status, '系统异常')
  }
})

// 访问静态文件
app.use(serve('.'))

// 解析请求体
app.use(
  koaBody({
    // 支持文件格式
    multipart: true,
    formidable: {
      // 保留文件扩展名
      keepExtensions: true,
      // 上传目录
      uploadDir: join(__dirname, '../static')
    }
  })
)

// 请求跨域
app.use(cors())

//路由中间件
app.use(router.routes())

app.listen(port, () => {
  logger.info('server startup on port:' + port)
})
