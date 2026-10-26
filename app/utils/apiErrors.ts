interface ApiErrorBody {
  message?: string
  data?: { fieldErrors?: Record<string, string[] | undefined> }
}

function errorBody(error: unknown): ApiErrorBody | undefined {
  return (error as { data?: ApiErrorBody } | null)?.data
}

/** Premier message d'erreur de chaque champ renvoyé par l'API. */
export function getFieldErrors(error: unknown): Record<string, string> {
  const result: Record<string, string> = {}
  for (const [field, messages] of Object.entries(errorBody(error)?.data?.fieldErrors ?? {})) {
    const [first] = messages ?? []
    if (first) result[field] = first
  }
  return result
}

export function getErrorMessage(
  error: unknown,
  fallback = 'Une erreur est survenue, réessaie.',
): string {
  return errorBody(error)?.message ?? fallback
}
