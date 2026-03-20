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
  type: z.enum(['patrol', 'turret', 'flamer', 'dropper']),
  x: z.number(),
  y: z.number(),
});

export type EnemySpawn = z.infer<typeof EnemySpawnSchema>;

/** Schema completo de um nível — com enemies */
export const LevelConfigWithEnemiesSchema = LevelConfigSchema.extend({
  enemies: z.array(EnemySpawnSchema).default([]),
  /** X position do portal de fim de stage */
  goalX: z.number().optional(),
  /** X position onde começa a boss fight (trava câmera) */
  bossZoneX: z.number().optional(),
  /** Cor de fundo da fase */
  bgColor: z.string().optional(),
});

export type LevelConfigWithEnemies = z.infer<typeof LevelConfigWithEnemiesSchema>;

/**
 * Retorna a configuração do Level 1 — Intro Stage expandido.
 *
 * 3200px de largura, 6 seções temáticas, 15 inimigos.
 */
export function getLevel1Config(): LevelConfigWithEnemies {
  return LevelConfigWithEnemiesSchema.parse({
    name: 'Intro Stage',
    worldWidth: 3200,
    worldHeight: 180,
    backgroundColor: '#0a1628',
    spawnPoint: { x: 40, y: 130 },
    goalX: 3160,
    platforms: [
      // ═══════════════════════════════════════════════════════════
      // SEÇÃO 1: Início (x: 0–450) — Tutorial
      // ═══════════════════════════════════════════════════════════
      { x: 130, y: 172, width: 260, height: 16 },
      { x: 80, y: 140, width: 48, height: 10 },
      { x: 180, y: 125, width: 48, height: 10 },
      { x: 380, y: 172, width: 140, height: 16 },

      // ═══════════════════════════════════════════════════════════
      // SEÇÃO 2: Cidade (x: 450–1000) — Gaps + rota alta
      // ═══════════════════════════════════════════════════════════
      { x: 550, y: 172, width: 160, height: 16 },
      { x: 770, y: 172, width: 140, height: 16 },
      { x: 960, y: 172, width: 120, height: 16 },
      // Rota alta cidade
      { x: 500, y: 135, width: 56, height: 10 },
      { x: 600, y: 115, width: 56, height: 10 },
      { x: 700, y: 98, width: 64, height: 10 },
      { x: 800, y: 115, width: 56, height: 10 },
      { x: 900, y: 130, width: 56, height: 10 },

      // ═══════════════════════════════════════════════════════════
      // SEÇÃO 3: Esgoto (x: 1000–1500) — Chão estreito, muitos gaps
      // ═══════════════════════════════════════════════════════════
      { x: 1080, y: 172, width: 80, height: 16 },
      { x: 1190, y: 172, width: 60, height: 16 },
      { x: 1290, y: 172, width: 60, height: 16 },
      { x: 1400, y: 172, width: 80, height: 16 },
      // Plataformas do esgoto
      { x: 1130, y: 140, width: 48, height: 10 },
      { x: 1240, y: 120, width: 48, height: 10 },
      { x: 1350, y: 100, width: 56, height: 10 },

      // ═══════════════════════════════════════════════════════════
      // SEÇÃO 4: Fábrica (x: 1500–2100) — Verticalidade
      // ═══════════════════════════════════════════════════════════
      { x: 1550, y: 172, width: 120, height: 16 },
      { x: 1750, y: 172, width: 100, height: 16 },
      { x: 1920, y: 172, width: 120, height: 16 },
      { x: 2060, y: 172, width: 80, height: 16 },
      // Torre de subida
      { x: 1500, y: 145, width: 48, height: 10 },
      { x: 1570, y: 120, width: 48, height: 10 },
      { x: 1640, y: 95, width: 56, height: 10 },
      { x: 1710, y: 75, width: 48, height: 10 },
      // Passarela alta
      { x: 1810, y: 78, width: 140, height: 10 },
      // Descida
      { x: 1940, y: 110, width: 48, height: 10 },
      { x: 2000, y: 140, width: 48, height: 10 },

      // ═══════════════════════════════════════════════════════════
      // SEÇÃO 5: Fortaleza (x: 2100–2700) — Combate pesado
      // ═══════════════════════════════════════════════════════════
      { x: 2180, y: 172, width: 140, height: 16 },
      { x: 2380, y: 172, width: 120, height: 16 },
      { x: 2560, y: 172, width: 140, height: 16 },
      { x: 2700, y: 172, width: 60, height: 16 },
      // Plataformas de combate
      { x: 2160, y: 130, width: 56, height: 10 },
      { x: 2260, y: 105, width: 64, height: 10 },
      { x: 2360, y: 85, width: 56, height: 10 },
      { x: 2460, y: 105, width: 64, height: 10 },
      { x: 2550, y: 125, width: 56, height: 10 },
      { x: 2650, y: 100, width: 56, height: 10 },

      // ═══════════════════════════════════════════════════════════
      // SEÇÃO 6: Final (x: 2700–3200) — Corrida até o portal
      // ═══════════════════════════════════════════════════════════
      { x: 2800, y: 172, width: 100, height: 16 },
      { x: 2950, y: 172, width: 80, height: 16 },
      { x: 3080, y: 172, width: 80, height: 16 },
      // Plataformas finais
      { x: 2850, y: 135, width: 48, height: 10 },
      { x: 2950, y: 115, width: 48, height: 10 },
      { x: 3050, y: 100, width: 56, height: 10 },
      // Plataforma do portal (final)
      { x: 3160, y: 172, width: 80, height: 16 },
      { x: 3160, y: 130, width: 40, height: 10 },
    ],

    // ─── Inimigos (15 total) ─────────────────────────────────────
    enemies: [
      // SEÇÃO 1: Tutorial — 1 patrol
      { type: 'patrol', x: 380, y: 155 },

      // SEÇÃO 2: Cidade — 2 patrols chão + 1 turret plataforma alta
      { type: 'patrol', x: 560, y: 155 },
      { type: 'patrol', x: 780, y: 155 },
      { type: 'turret', x: 700, y: 86 },

      // SEÇÃO 3: Esgoto — 1 patrol + 1 turret em plataforma
      { type: 'patrol', x: 1190, y: 155 },
      { type: 'turret', x: 1350, y: 88 },

      // SEÇÃO 4: Fábrica — 1 patrol + 2 turrets na passarela
      { type: 'patrol', x: 1750, y: 155 },
      { type: 'turret', x: 1780, y: 66 },
      { type: 'turret', x: 1850, y: 66 },

      // SEÇÃO 5: Fortaleza — 3 patrols + 2 turrets
      { type: 'patrol', x: 2200, y: 155 },
      { type: 'patrol', x: 2400, y: 155 },
      { type: 'turret', x: 2360, y: 73 },
      { type: 'turret', x: 2650, y: 88 },

      // SEÇÃO 6: Final — 1 patrol guarda + 1 turret
      { type: 'patrol', x: 2960, y: 155 },
      { type: 'turret', x: 3050, y: 88 },
    ],
  });
}

/**
 * Vulcan Factory — Fase de fogo industrial.
 * 2400px, boss fight no final.
 */
export function getVulcanFactoryConfig(): LevelConfigWithEnemies {
  return LevelConfigWithEnemiesSchema.parse({
    name: 'Vulcan Factory',
    worldWidth: 2400,
    worldHeight: 180,
    backgroundColor: '#1a0a0a',
    bgColor: '#1a0a0a',
    spawnPoint: { x: 40, y: 130 },
    bossZoneX: 2280,
    platforms: [
      // ═══ SEÇÃO 1: Entrada da fábrica (0–500) ═══
      { x: 130, y: 172, width: 260, height: 16 },
      { x: 380, y: 172, width: 140, height: 16 },
      { x: 100, y: 140, width: 48, height: 10 },
      { x: 200, y: 120, width: 56, height: 10 },
      { x: 320, y: 105, width: 48, height: 10 },

      // ═══ SEÇÃO 2: Fornalha (500–1000) ═══
      { x: 550, y: 172, width: 120, height: 16 },
      { x: 720, y: 172, width: 100, height: 16 },
      { x: 880, y: 172, width: 120, height: 16 },
      { x: 620, y: 130, width: 56, height: 10 },
      { x: 750, y: 110, width: 56, height: 10 },
      { x: 850, y: 90, width: 64, height: 10 },

      // ═══ SEÇÃO 3: Conveyor (1000–1500) ═══
      { x: 1050, y: 172, width: 100, height: 16 },
      { x: 1180, y: 172, width: 80, height: 16 },
      { x: 1320, y: 172, width: 100, height: 16 },
      { x: 1450, y: 172, width: 80, height: 16 },
      { x: 1100, y: 135, width: 48, height: 10 },
      { x: 1250, y: 115, width: 56, height: 10 },
      { x: 1380, y: 95, width: 48, height: 10 },

      // ═══ SEÇÃO 4: Chaminé (1500–1900) ═══
      { x: 1560, y: 172, width: 100, height: 16 },
      { x: 1700, y: 172, width: 120, height: 16 },
      { x: 1860, y: 172, width: 80, height: 16 },
      { x: 1620, y: 140, width: 48, height: 10 },
      { x: 1720, y: 115, width: 56, height: 10 },
      { x: 1820, y: 90, width: 56, height: 10 },

      // ═══ SEÇÃO 5: Arena do Boss (1900–2400) ═══
      // Chão largo para boss fight
      { x: 2000, y: 172, width: 200, height: 16 },
      { x: 2250, y: 172, width: 300, height: 16 },
      // Plataformas de escape (para pular os ataques do boss)
      { x: 2150, y: 130, width: 56, height: 10 },
      { x: 2300, y: 100, width: 64, height: 10 },
    ],

    enemies: [
      // SEÇÃO 1: intro flamers
      { type: 'flamer', x: 380, y: 155 },
      { type: 'patrol', x: 200, y: 155 },

      // SEÇÃO 2: fornalha
      { type: 'flamer', x: 560, y: 155 },
      { type: 'turret', x: 850, y: 78 },
      { type: 'dropper', x: 700, y: 30 },

      // SEÇÃO 3: conveyor
      { type: 'flamer', x: 1180, y: 155 },
      { type: 'patrol', x: 1320, y: 155 },
      { type: 'dropper', x: 1250, y: 30 },
      { type: 'turret', x: 1380, y: 83 },

      // SEÇÃO 4: chaminé
      { type: 'flamer', x: 1700, y: 155 },
      { type: 'dropper', x: 1620, y: 30 },
      { type: 'turret', x: 1820, y: 78 },
      { type: 'patrol', x: 1860, y: 155 },
    ],
  });
}
