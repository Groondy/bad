export function formatDate(iso: string): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function formatDelta(delta: number): string {
  return delta > 0 ? `+${delta}` : `${delta}`
}
