/**
 * levelConfig.ts — Schema de Configuração de Níveis
 *
 * Define o layout de plataformas e configurações do cenário.
 * Cada nível é um array de plataformas com posições e tamanhos.
 *
 * 🎮 Schema-first: o nível é definido em dados, não em código.
 */
import { z } from 'zod';

/** Schema de uma plataforma individual */
const PlatformSchema = z.object({
  /** Posição X do centro da plataforma */
  x: z.number(),
  /** Posição Y do centro da plataforma */
  y: z.number(),
  /** Largura em pixels */
  width: z.number().positive(),
  /** Altura em pixels */
  height: z.number().positive().default(16),
});

export type Platform = z.infer<typeof PlatformSchema>;

/** Schema do spawn point do player */
const SpawnPointSchema = z.object({
  x: z.number().default(40),
  y: z.number().default(140),
});

/** Schema completo de um nível */
export const LevelConfigSchema = z.object({
  /** Nome do nível */
  name: z.string().default('Stage 1'),
  /** Largura total do nível em pixels */
  worldWidth: z.number().positive().default(640),
  /** Altura total do nível em pixels */
  worldHeight: z.number().positive().default(180),
  /** Cor de fundo */
  backgroundColor: z.string().default('#0a1628'),
  /** Spawn point do Player */
  spawnPoint: SpawnPointSchema.default({}),
  /** Lista de plataformas */
  platforms: z.array(PlatformSchema).default([]),
  /** Gravidade do nível (override) */
  gravity: z.number().default(800),
});

export type LevelConfig = z.infer<typeof LevelConfigSchema>;

/** Schema de spawn de inimigo */
const EnemySpawnSchema = z.object({
  type: z.enum(['patrol', 'turret']),
  x: z.number(),
  y: z.number(),
});

export type EnemySpawn = z.infer<typeof EnemySpawnSchema>;

/** Schema completo de um nível — com enemies */
export const LevelConfigWithEnemiesSchema = LevelConfigSchema.extend({
  enemies: z.array(EnemySpawnSchema).default([]),
});

export type LevelConfigWithEnemies = z.infer<typeof LevelConfigWithEnemiesSchema>;

/**
 * Retorna a configuração do Level 1 — tutorial/intro stage.
 *
 * Layout:
 * ```
 * ┌────────────────────────────────────────────────────────────────┐
 * │                                                                │
 * │                              ████                              │
 * │                    ████                          ████           │
 * │          ████                                                  │
 * │  P                                                             │
 * │████████████████████     ████████████    ████████████████████████│
 * └────────────────────────────────────────────────────────────────┘
 *  P = Player spawn
 *  ████ = Plataformas
 * ```
 */
export function getLevel1Config(): LevelConfigWithEnemies {
  return LevelConfigWithEnemiesSchema.parse({
    name: 'Intro Stage',
    worldWidth: 640,
    worldHeight: 180,
    backgroundColor: '#0a1628',
    spawnPoint: { x: 40, y: 130 },
    platforms: [
      // ─── Chão principal (com buraco) ─────────────────────
      // Seção esquerda do chão
      { x: 100, y: 172, width: 200, height: 16 },
      // Seção central do chão
      { x: 330, y: 172, width: 120, height: 16 },
      // Seção direita do chão
      { x: 540, y: 172, width: 200, height: 16 },

      // ─── Plataformas elevadas ────────────────────────────
      // Plataforma 1 (esquerda, baixa)
      { x: 80, y: 140, width: 48, height: 8 },

      // Plataforma 2 (meio-esquerda, média)
      { x: 180, y: 120, width: 48, height: 8 },

      // Plataforma 3 (centro, alta)
      { x: 300, y: 100, width: 48, height: 8 },

      // Plataforma 4 (meio-direita, média)
      { x: 420, y: 120, width: 48, height: 8 },

      // Plataforma 5 (direita alta)
      { x: 520, y: 100, width: 64, height: 8 },

      // Plataforma 6 (escada para cima)
      { x: 580, y: 80, width: 48, height: 8 },
    ],

    // ─── Inimigos ────────────────────────────────────────────
    enemies: [
      // 2x Patrol na seção central e direita do chão
      { type: 'patrol', x: 320, y: 155 },
      { type: 'patrol', x: 500, y: 155 },
      // 1x Turret na plataforma 5 (direita alta)
      { type: 'turret', x: 530, y: 88 },
    ],
  });
}
