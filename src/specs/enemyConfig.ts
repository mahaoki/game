/**
 * enemyConfig.ts — Configuração dos Inimigos
 *
 * Parâmetros de balanceamento validados com Zod.
 *
 * 🎮 Valores inspirados no MegaMan X (SNES)
 */
import { z } from 'zod';
import { S } from '../config/scaleConstants';

export const EnemyConfigSchema = z.object({
  // ─── Patrol (Met) ──────────────────────────────────────────
  patrolSpeed: z.number().positive().default(30 * S),
  patrolHealth: z.number().int().positive().default(2),
  patrolDamage: z.number().int().positive().default(2),

  // ─── Turret (Cannon) ──────────────────────────────────────
  turretHealth: z.number().int().positive().default(3),
  turretDamage: z.number().int().positive().default(3),
  turretBulletSpeed: z.number().positive().default(120 * S),
  turretShootIntervalMs: z.number().positive().default(2000),
  turretRange: z.number().positive().default(150 * S),

  // ─── Comum ─────────────────────────────────────────────────
  hurtDurationMs: z.number().positive().default(200),
  deathDurationMs: z.number().positive().default(300),
  spriteSize: z.number().int().positive().default(32 * S),
});

export type EnemyConfig = z.infer<typeof EnemyConfigSchema>;

export function getEnemyConfig(
  overrides: Partial<EnemyConfig> = {}
): EnemyConfig {
  return EnemyConfigSchema.parse(overrides);
}
