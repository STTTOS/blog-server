import type { BizError } from './router/interface'

import Koa from 'koa'
import { join } from 'path'
import cors from '@koa/cors'
import mount from 'koa-mount'
import serve from 'koa-static'
import koaBody from 'koa-body'
import { historyApiFallback } from 'koa2-connect-history-api-fallback'

import router from './router'
import { logger } from './logger'
import response from './utils/response'
import { port, authCode, apiNeededToAuth, cacheTime as maxAge } from './config'

const app = new Koa()

//统一错误处理
app.use(async (ctx, next) => {
  try {
    await next()
  } catch (err) {
    const status = (err as BizError).status || 500

    logger.error((err as BizError).message)
    response.error(ctx, status, '系统异常')
  }
})

app.use(async (ctx, next) => {
  const { ip, url } = ctx.request
  logger.info(`ip: ${ip}, request for ${url}`)
  await next()
})
// 请求跨域
app.use(cors())

// 配合history模式
// 放在静态资源服务中间件前面加载
// 404  重定向到 /public/index.html
app.use(historyApiFallback({ index: '/index.html' }))

// 访问 网站静态文件
app.use(serve(join(__dirname, '../public'), { maxAge }))
// 注册静态资源前缀 /static
app.use(mount('/static', serve(join(__dirname, '../static'), { maxAge })))

// 统一鉴权
app.use(async (ctx, next) => {
  const { code } = ctx.request.header
  const url = ctx.request.url

  if (code !== authCode && apiNeededToAuth.includes(url)) {
    response.success(ctx, null, '没有权限', 403)
    return
  }
  await next()
})

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

//路由中间件
app.use(router.routes())

app.listen(port, () => {
  logger.info('server startup on port:' + port)
})
