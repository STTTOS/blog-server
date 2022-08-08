export const port = 80

export const apiPrefix = '/api'

export const timeFormat = 'yyyy-MM-DD HH:mm:ss'

export const timeFormatWithoutSeconds = 'yyyy-MM-DD HH:mm'

export const wordsToMinuteBaseNumber = 500

export const authCode = 'bgs_ycr_2022'

export const cacheTime = 30 * 24 * 60 * 60

export const apiNeededToAuth = [
  '/api/user/add',
  '/api/user/update',
  '/api/user/delete',

  '/api/article/add',
  '/api/article/update',
  '/api/article/delete',

  '/api/tag/add',
  '/api/tag/update',
  '/api/tag/delete',

  '/api/common/upload'
]
