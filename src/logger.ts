import log4js from 'log4js'

// TODO: 日志组件使用
log4js.configure({
  appenders: { server: { type: 'file', filename: './logs/server.log' } },
  categories: { default: { appenders: ['server'], level: 'error' } }
})

const logger = log4js.getLogger()
logger.level = 'debug'

export { logger }
