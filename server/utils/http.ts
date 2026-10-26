import type { H3Event } from 'h3'
import { z } from 'zod'
import { ServiceError } from './errors'

export async function parseBody<T extends z.ZodType>(event: H3Event, schema: T): Promise<z.output<T>> {
  const result = schema.safeParse(await readBody(event))
  if (!result.success) {
    throw createError({
      statusCode: 400,
      message: 'Données invalides',
      data: { fieldErrors: z.flattenError(result.error).fieldErrors },
    })
  }
  return result.data
}

export function parseId(event: H3Event): number {
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) throw createError({ statusCode: 404, message: 'Introuvable' })
  return id
}

export function runService<T>(fn: () => T): T {
  try {
    return fn()
  } catch (error) {
    if (error instanceof ServiceError) {
      throw createError({
        statusCode: error.statusCode,
        message: error.message,
        data: error.field ? { fieldErrors: { [error.field]: [error.message] } } : undefined,
      })
    }
    throw error
  }
}
