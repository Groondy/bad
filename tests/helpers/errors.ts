import { expect } from 'vitest'
import { ServiceError } from '../../server/utils/errors'

export function expectServiceError(fn: () => unknown, statusCode: number, field?: string): void {
  try {
    fn()
  } catch (error) {
    expect(error).toBeInstanceOf(ServiceError)
    expect((error as ServiceError).statusCode).toBe(statusCode)
    if (field !== undefined) expect((error as ServiceError).field).toBe(field)
    return
  }
  throw new Error(`ServiceError ${statusCode} attendue, aucune erreur levée`)
}
