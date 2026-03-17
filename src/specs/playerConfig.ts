/**
 * playerConfig.ts — Schema de Configuração do Player
 *
 * Define os parâmetros de balanceamento do personagem.
 * Todos os valores são validados com Zod e podem ser
 * ajustados sem mudar código — basta alterar o JSON.
 *
 * 🎮 Valores inspirados no MegaMan X (SNES):
 *   - Movimentação responsiva e ágil
 *   - Pulo alto com controle no ar
 *   - Dash rápido para esquiva
 *   - Tiro (buster) com cadência rápida
 */
import { z } from 'zod';

// ─── Schema do Player ─────────────────────────────────────────────
export const PlayerConfigSchema = z.object({
  // ─── Movimentação ───────────────────────────────────────────
  /** Velocidade horizontal ao andar (pixels/segundo) */
  moveSpeed: z.number().positive().default(120),

  /** Impulso do pulo (negativo = para cima na tela) */
  jumpForce: z.number().negative().default(-280),

  /** Velocidade do dash (pixels/segundo) */
  dashSpeed: z.number().positive().default(250),

  /** Duração do dash em milissegundos */
  dashDurationMs: z.number().positive().default(250),

  /** Cooldown entre dashes em milissegundos */
  dashCooldownMs: z.number().nonnegative().default(500),

  // ─── Combate ────────────────────────────────────────────────
  /** Vida máxima (cada barra = 1 ponto de vida) */
  maxHealth: z.number().int().positive().default(16),

  /** Velocidade do projétil do buster (pixels/segundo) */
  bulletSpeed: z.number().positive().default(300),

  /** Cooldown entre tiros em milissegundos */
  bulletCooldownMs: z.number().nonnegative().default(200),

  /** Máximo de projéteis na tela ao mesmo tempo */
  maxBullets: z.number().int().positive().default(3),

  // ─── Sprite ─────────────────────────────────────────────────
  /** Largura do sprite em pixels */
  spriteWidth: z.number().int().positive().default(32),

  /** Altura do sprite em pixels */
  spriteHeight: z.number().int().positive().default(32),

  /** Largura do hitbox (menor que o sprite para ser justo) */
  hitboxWidth: z.number().int().positive().default(16),

  /** Altura do hitbox */
  hitboxHeight: z.number().int().positive().default(24),

  /** Offset X do hitbox em relação ao sprite */
  hitboxOffsetX: z.number().default(8),

  /** Offset Y do hitbox em relação ao sprite */
  hitboxOffsetY: z.number().default(8),
});

/** Tipo derivado do schema */
export type PlayerConfig = z.infer<typeof PlayerConfigSchema>;

/**
 * Retorna a configuração do Player validada.
 *
 * @param overrides - Valores que sobrescrevem os defaults
 * @returns Configuração completa e validada
 *
 * @example
 * ```ts
 * // Config padrão
 * const config = getPlayerConfig();
 *
 * // Personagem mais rápido
 * const fastConfig = getPlayerConfig({ moveSpeed: 180 });
 * ```
 */
export function getPlayerConfig(
  overrides: Partial<PlayerConfig> = {}
): PlayerConfig {
  return PlayerConfigSchema.parse(overrides);
}
