import { z } from 'zod'
import { todayInParis } from './date'

const email = z.string().trim().toLowerCase().pipe(z.email('Email invalide'))
const personName = (label: string) =>
  z.string().trim().min(1, `${label} requis`).max(50, `${label} trop long`)
const password = z.string().min(8, 'Au moins 8 caractères').max(200, 'Mot de passe trop long')
const groupId = z.number({ error: 'Choisis un groupe' }).int().positive('Choisis un groupe')
const playerId = z.number({ error: 'Joueur requis' }).int().positive('Joueur requis')
const score = z
  .number({ error: 'Score requis' })
  .int('Score entier attendu')
  .min(0, 'Score positif attendu')

export const registerSchema = z.object({
  email,
  firstName: personName('Prénom'),
  lastName: personName('Nom'),
  password,
  groupId,
})

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Mot de passe requis'),
})

export const profileSchema = z.object({
  firstName: personName('Prénom'),
  lastName: personName('Nom'),
  groupId,
})

export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, 'Mot de passe actuel requis'),
  newPassword: password,
})

export const accountDeleteSchema = z.object({
  password: z.string().min(1, 'Mot de passe requis'),
})

export const matchInputSchema = z
  .object({
    type: z.enum(['single', 'double'], { error: 'Type de match invalide' }),
    sideA: z.array(playerId),
    sideB: z.array(playerId),
    scoreA: score,
    scoreB: score,
    playedAt: z.iso.date('Date invalide'),
  })
  .superRefine((match, ctx) => {
    const size = match.type === 'single' ? 1 : 2
    if (match.sideA.length !== size || match.sideB.length !== size) {
      ctx.addIssue({
        code: 'custom',
        path: ['sideA'],
        message:
          match.type === 'single'
            ? 'Un joueur par équipe en simple'
            : 'Deux joueurs par équipe en double',
      })
    }
    const all = [...match.sideA, ...match.sideB]
    if (new Set(all).size !== all.length) {
      ctx.addIssue({
        code: 'custom',
        path: ['sideA'],
        message: 'Un joueur ne peut apparaître qu’une fois',
      })
    }
    if (match.scoreA === match.scoreB) {
      ctx.addIssue({
        code: 'custom',
        path: ['scoreB'],
        message: 'Il ne peut pas y avoir d’égalité',
      })
    }
    if (match.playedAt > todayInParis()) {
      ctx.addIssue({
        code: 'custom',
        path: ['playedAt'],
        message: 'La date ne peut pas être dans le futur',
      })
    }
  })

export const adminUserUpdateSchema = z
  .object({
    groupId: groupId.optional(),
    role: z.enum(['player', 'admin']).optional(),
  })
  .refine((update) => update.groupId !== undefined || update.role !== undefined, 'Rien à modifier')

export const resetPasswordSchema = z.object({ password })

export const groupRenameSchema = z.object({
  name: z.string().trim().min(1, 'Nom requis').max(30, 'Nom trop long'),
})

export type RegisterInput = z.infer<typeof registerSchema>
export type ProfileInput = z.infer<typeof profileSchema>
export type MatchInput = z.infer<typeof matchInputSchema>
export type AdminUserUpdate = z.infer<typeof adminUserUpdateSchema>
