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
import { S } from '../config/scaleConstants';

// ─── Schema do Player ─────────────────────────────────────────────
export const PlayerConfigSchema = z.object({
  // ─── Movimentação ───────────────────────────────────────────
  /** Velocidade horizontal ao andar (pixels/segundo) */
  moveSpeed: z.number().positive().default(120 * S),

  /** Impulso do pulo (negativo = para cima na tela) */
  jumpForce: z.number().negative().default(-280 * S),

  /** Velocidade do dash (pixels/segundo) */
  dashSpeed: z.number().positive().default(250 * S),

  /** Duração do dash em milissegundos */
  dashDurationMs: z.number().positive().default(250),

  /** Cooldown entre dashes em milissegundos */
  dashCooldownMs: z.number().nonnegative().default(500),

  // ─── Combate ────────────────────────────────────────────────
  /** Vida máxima (cada barra = 1 ponto de vida) */
  maxHealth: z.number().int().positive().default(16),

  /** Velocidade do projétil do buster (pixels/segundo) */
  bulletSpeed: z.number().positive().default(300 * S),

  /** Cooldown entre tiros em milissegundos */
  bulletCooldownMs: z.number().nonnegative().default(200),

  /** Máximo de projéteis na tela ao mesmo tempo */
  maxBullets: z.number().int().positive().default(3),

  // ─── Dano & Vidas ───────────────────────────────────────────
  /** Número de vidas iniciais */
  lives: z.number().int().positive().default(3),

  /** Duração do estado hurt em milissegundos (sem controle) */
  hurtDurationMs: z.number().positive().default(500),

  /** Duração da invulnerabilidade após dano (ms) */
  invulnerabilityMs: z.number().positive().default(1500),

  /** Knockback horizontal ao tomar dano (pixels/s) */
  knockbackForceX: z.number().default(80 * S),

  /** Knockback vertical ao tomar dano (negativo = para cima) */
  knockbackForceY: z.number().negative().default(-120 * S),

  /** Dano ao cair no buraco (= vida inteira por padrão) */
  pitDamage: z.number().positive().default(16),

  // ─── Sprite ─────────────────────────────────────────────────
  /** Largura do display em pixels (64 = tamanho nativo do frame) */
  spriteWidth: z.number().int().positive().default(64),

  /** Altura do display em pixels */
  spriteHeight: z.number().int().positive().default(64),

  /** Largura do hitbox — com frame 64×64 e displaySize 64, scale=1, valores usados diretamente */
  hitboxWidth: z.number().int().positive().default(20),

  /** Altura do hitbox */
  hitboxHeight: z.number().int().positive().default(32),

  /** Offset X do hitbox em relação ao sprite */
  hitboxOffsetX: z.number().default(22),

  /** Offset Y do hitbox em relação ao sprite */
  hitboxOffsetY: z.number().default(30),
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
