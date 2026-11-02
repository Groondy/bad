/** Erreur métier, convertie en erreur HTTP par runService (server/utils/http.ts). */
export class ServiceError extends Error {
  readonly statusCode: number
  readonly field?: string

  constructor(statusCode: number, message: string, field?: string) {
    super(message)
    this.name = 'ServiceError'
    this.statusCode = statusCode
    this.field = field
  }
}
