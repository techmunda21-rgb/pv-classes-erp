import { Context } from 'hono'

export function errorHandler(err: Error, c: Context) {
  console.error('[PV-ERP]', err.message, err.stack)

  if (err.message.includes('UNIQUE constraint')) {
    return c.json({ error: 'duplicate', message: 'Record already exists' }, 409)
  }
  if (err.message.includes('FOREIGN KEY constraint')) {
    return c.json({ error: 'reference_error', message: 'Referenced record not found' }, 400)
  }
  if (err.message.includes('NOT NULL constraint')) {
    return c.json({ error: 'validation', message: 'Required field missing' }, 400)
  }

  return c.json({
    error: 'internal_error',
    message: c.env?.ENVIRONMENT === 'production' ? 'Something went wrong' : err.message
  }, 500)
}
