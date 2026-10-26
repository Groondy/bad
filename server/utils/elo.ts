export const INITIAL_ELO = 1000
export const K_FACTOR = 32

/** Probabilité de victoire d'un joueur (ou d'une équipe) noté `rating` face à `opponentRating`. */
export function expectedScore(rating: number, opponentRating: number): number {
  return 1 / (1 + 10 ** ((opponentRating - rating) / 400))
}

/** Points gagnés par le vainqueur ; le perdant perd exactement la même valeur. */
export function computeGain(winnerRating: number, loserRating: number): number {
  return Math.round(K_FACTOR * (1 - expectedScore(winnerRating, loserRating)))
}

/** Note d'une équipe : moyenne de ses joueurs (un seul joueur en simple). */
export function teamRating(ratings: number[]): number {
  return ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length
}
