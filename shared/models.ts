export type Role = 'player' | 'admin'
export type MatchType = 'single' | 'double'

export interface SessionUser {
  id: number
  firstName: string
  lastName: string
  role: Role
  groupId: number
}

export interface Group {
  id: number
  name: string
}

export interface PlayerOption {
  id: number
  firstName: string
  lastName: string
  groupId: number
}

export interface Participant {
  id: number
  firstName: string
  lastName: string
  eloBefore: number
  eloDelta: number
}

export interface MatchView {
  id: number
  type: MatchType
  playedAt: string
  scoreA: number
  scoreB: number
  createdBy: number
  sideA: Participant[]
  sideB: Participant[]
}

export interface RankingRow {
  rank: number
  id: number
  firstName: string
  lastName: string
  groupId: number
  groupName: string
  elo: number
  matches: number
  wins: number
  losses: number
}

export interface PlayerProfile {
  id: number
  firstName: string
  lastName: string
  groupId: number
  groupName: string
  elo: number
  deleted: boolean
  history: MatchView[]
}

export interface AdminUserRow {
  id: number
  email: string
  firstName: string
  lastName: string
  groupId: number
  role: Role
  elo: number
}
