import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const scss = readFileSync(new URL('../app/assets/scss/_variables.scss', import.meta.url), 'utf8')
const colors: Record<string, string> = Object.fromEntries(
  [...scss.matchAll(/^\$(color-[\w-]+):\s*(#[0-9a-fA-F]{6});/gm)].map(([, name, hex]) => [
    name,
    hex,
  ]),
)

function color(name: string): string {
  const hex = colors[name]
  if (!hex) throw new Error(`Variable $${name} absente de _variables.scss`)
  return hex
}

// Luminance relative WCAG 2.1
function luminance(hex: string): number {
  return [0.2126, 0.7152, 0.0722].reduce((sum, weight, k) => {
    const c = parseInt(hex.slice(1 + 2 * k, 3 + 2 * k), 16) / 255
    return sum + weight * (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  }, 0)
}

function contrast(a: string, b: string): number {
  const [la, lb] = [luminance(a), luminance(b)]
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}

// [texte, fond]
const pairs: [string, string][] = [
  ['color-text', 'color-bg'],
  ['color-text', 'color-surface'],
  ['color-muted', 'color-bg'],
  ['color-muted', 'color-surface'],
  ['color-on-primary', 'color-primary'],
  ['color-accent', 'color-primary'],
  ['color-primary', 'color-accent'],
  ['color-primary', 'color-accent-dark'],
  ['color-success', 'color-success-bg'],
  ['color-danger', 'color-danger-bg'],
  ['color-danger', 'color-surface'],
  ['color-primary', 'color-gold'],
  ['color-primary', 'color-silver'],
  ['color-primary', 'color-bronze'],
]

describe('contrastes des couleurs', () => {
  it.each(pairs)('$%s sur $%s ≥ 4,5:1', (text, background) => {
    expect(contrast(color(text), color(background))).toBeGreaterThanOrEqual(4.5)
  })

  it("l'accent n'est pas lisible en texte sur fond clair (règle d'usage)", () => {
    expect(contrast(color('color-accent'), color('color-surface'))).toBeLessThan(4.5)
  })
})
