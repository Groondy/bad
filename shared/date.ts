const parisDate = new Intl.DateTimeFormat('fr-CA', {
  timeZone: 'Europe/Paris',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

/** Date du jour à Paris au format YYYY-MM-DD (le serveur tourne en UTC). */
export function todayInParis(now: Date = new Date()): string {
  return parisDate.format(now)
}
