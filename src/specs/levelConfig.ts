/**
 * levelConfig.ts — Schema de Configuração de Níveis
 *
 * Define o layout de plataformas e configurações do cenário.
 * Cada nível é um array de plataformas com posições e tamanhos.
 *
 * 🎮 Schema-first: o nível é definido em dados, não em código.
 */
import { z } from 'zod';
import { S } from '../config/scaleConstants';

/** Schema de uma plataforma individual */
const PlatformSchema = z.object({
  /** Posição X do centro da plataforma */
  x: z.number(),
  /** Posição Y do centro da plataforma */
  y: z.number(),
  /** Largura em pixels */
  width: z.number().positive(),
  /** Altura em pixels */
  height: z.number().positive().default(16 * S),
});

export type Platform = z.infer<typeof PlatformSchema>;

/** Schema do spawn point do player */
const SpawnPointSchema = z.object({
  x: z.number().default(40 * S),
  y: z.number().default(140 * S),
});

/** Schema completo de um nível */
export const LevelConfigSchema = z.object({
  /** Nome do nível */
  name: z.string().default('Stage 1'),
  /** Largura total do nível em pixels */
  worldWidth: z.number().positive().default(640 * S),
  /** Altura total do nível em pixels */
  worldHeight: z.number().positive().default(180 * S),
  /** Cor de fundo */
  backgroundColor: z.string().default('#0a1628'),
  /** Spawn point do Player */
  spawnPoint: SpawnPointSchema.default({}),
  /** Lista de plataformas */
  platforms: z.array(PlatformSchema).default([]),
  /** Gravidade do nível (override) */
  gravity: z.number().default(800 * S),
});

export type LevelConfig = z.infer<typeof LevelConfigSchema>;

/** Schema de spawn de inimigo */
const EnemySpawnSchema = z.object({
  type: z.enum(['patrol', 'turret', 'flamer', 'dropper', 'jellyfish', 'torpedoer']),
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
 * Helper: multiplica coordenadas de plataforma pelo fator de escala.
 */
function p(x: number, y: number, width: number, height: number = 16) {
  return { x: x * S, y: y * S, width: width * S, height: height * S };
}

/** Helper: multiplica coordenadas de enemy spawn */
function e(type: 'patrol' | 'turret' | 'flamer' | 'dropper' | 'jellyfish' | 'torpedoer', x: number, y: number) {
  return { type, x: x * S, y: y * S };
}

/**
 * Retorna a configuração do Level 1 — Intro Stage expandido.
 *
 * 3200px de largura (base), 6 seções temáticas, 15 inimigos.
 */
export function getLevel1Config(): LevelConfigWithEnemies {
  return LevelConfigWithEnemiesSchema.parse({
    name: 'Intro Stage',
    worldWidth: 3200 * S,
    worldHeight: 180 * S,
    backgroundColor: '#0a1628',
    spawnPoint: { x: 40 * S, y: 130 * S },
    goalX: 3160 * S,
    platforms: [
      // ═══════════════════════════════════════════════════════════
      // SEÇÃO 1: Início (x: 0–450) — Tutorial
      // ═══════════════════════════════════════════════════════════
      p(130, 172, 260),
      p(80, 140, 48, 10),
      p(180, 125, 48, 10),
      p(380, 172, 140),

      // ═══════════════════════════════════════════════════════════
      // SEÇÃO 2: Cidade (x: 450–1000) — Gaps + rota alta
      // ═══════════════════════════════════════════════════════════
      p(550, 172, 160),
      p(770, 172, 140),
      p(960, 172, 120),
      // Rota alta cidade
      p(500, 135, 56, 10),
      p(600, 115, 56, 10),
      p(700, 98, 64, 10),
      p(800, 115, 56, 10),
      p(900, 130, 56, 10),

      // ═══════════════════════════════════════════════════════════
      // SEÇÃO 3: Esgoto (x: 1000–1500) — Chão estreito, muitos gaps
      // ═══════════════════════════════════════════════════════════
      p(1080, 172, 80),
      p(1190, 172, 60),
      p(1290, 172, 60),
      p(1400, 172, 80),
      // Plataformas do esgoto
      p(1130, 140, 48, 10),
      p(1240, 120, 48, 10),
      p(1350, 100, 56, 10),

      // ═══════════════════════════════════════════════════════════
      // SEÇÃO 4: Fábrica (x: 1500–2100) — Verticalidade
      // ═══════════════════════════════════════════════════════════
      p(1550, 172, 120),
      p(1750, 172, 100),
      p(1920, 172, 120),
      p(2060, 172, 80),
      // Torre de subida
      p(1500, 145, 48, 10),
      p(1570, 120, 48, 10),
      p(1640, 95, 56, 10),
      p(1710, 75, 48, 10),
      // Passarela alta
      p(1810, 78, 140, 10),
      // Descida
      p(1940, 110, 48, 10),
      p(2000, 140, 48, 10),

      // ═══════════════════════════════════════════════════════════
      // SEÇÃO 5: Fortaleza (x: 2100–2700) — Combate pesado
      // ═══════════════════════════════════════════════════════════
      p(2180, 172, 140),
      p(2380, 172, 120),
      p(2560, 172, 140),
      p(2700, 172, 60),
      // Plataformas de combate
      p(2160, 130, 56, 10),
      p(2260, 105, 64, 10),
      p(2360, 85, 56, 10),
      p(2460, 105, 64, 10),
      p(2550, 125, 56, 10),
      p(2650, 100, 56, 10),

      // ═══════════════════════════════════════════════════════════
      // SEÇÃO 6: Final (x: 2700–3200) — Corrida até o portal
      // ═══════════════════════════════════════════════════════════
      p(2800, 172, 100),
      p(2950, 172, 80),
      p(3080, 172, 80),
      // Plataformas finais
      p(2850, 135, 48, 10),
      p(2950, 115, 48, 10),
      p(3050, 100, 56, 10),
      // Plataforma do portal (final)
      p(3160, 172, 80),
      p(3160, 130, 40, 10),
    ],

    // ─── Inimigos (15 total) ─────────────────────────────────────
    enemies: [
      // SEÇÃO 1: Tutorial — 1 patrol
      e('patrol', 380, 155),

      // SEÇÃO 2: Cidade — 2 patrols chão + 1 turret plataforma alta
      e('patrol', 560, 155),
      e('patrol', 780, 155),
      e('turret', 700, 86),

      // SEÇÃO 3: Esgoto — 1 patrol + 1 turret em plataforma
      e('patrol', 1190, 155),
      e('turret', 1350, 88),

      // SEÇÃO 4: Fábrica — 1 patrol + 2 turrets na passarela
      e('patrol', 1750, 155),
      e('turret', 1780, 66),
      e('turret', 1850, 66),

      // SEÇÃO 5: Fortaleza — 3 patrols + 2 turrets
      e('patrol', 2200, 155),
      e('patrol', 2400, 155),
      e('turret', 2360, 73),
      e('turret', 2650, 88),

      // SEÇÃO 6: Final — 1 patrol guarda + 1 turret
      e('patrol', 2960, 155),
      e('turret', 3050, 88),
    ],
  });
}

/**
 * Vulcan Factory — Fase de fogo industrial.
 * 2400px (base), boss fight no final.
 */
export function getVulcanFactoryConfig(): LevelConfigWithEnemies {
  return LevelConfigWithEnemiesSchema.parse({
    name: 'Vulcan Factory',
    worldWidth: 2400 * S,
    worldHeight: 180 * S,
    backgroundColor: '#1a0a0a',
    bgColor: '#1a0a0a',
    spawnPoint: { x: 40 * S, y: 130 * S },
    bossZoneX: 2280 * S,
    platforms: [
      // ═══ SEÇÃO 1: Entrada da fábrica (0–500) ═══
      p(130, 172, 260),
      p(380, 172, 140),
      p(100, 140, 48, 10),
      p(200, 120, 56, 10),
      p(320, 105, 48, 10),

      // ═══ SEÇÃO 2: Fornalha (500–1000) ═══
      p(550, 172, 120),
      p(720, 172, 100),
      p(880, 172, 120),
      p(620, 130, 56, 10),
      p(750, 110, 56, 10),
      p(850, 90, 64, 10),

      // ═══ SEÇÃO 3: Conveyor (1000–1500) ═══
      p(1050, 172, 100),
      p(1180, 172, 80),
      p(1320, 172, 100),
      p(1450, 172, 80),
      p(1100, 135, 48, 10),
      p(1250, 115, 56, 10),
      p(1380, 95, 48, 10),

      // ═══ SEÇÃO 4: Chaminé (1500–1900) ═══
      p(1560, 172, 100),
      p(1700, 172, 120),
      p(1860, 172, 80),
      p(1620, 140, 48, 10),
      p(1720, 115, 56, 10),
      p(1820, 90, 56, 10),

      // ═══ SEÇÃO 5: Arena do Boss (1900–2400) ═══
      // Chão largo para boss fight
      p(2000, 172, 200),
      p(2250, 172, 300),
      // Plataformas de escape (para pular os ataques do boss)
      p(2150, 130, 56, 10),
      p(2300, 100, 64, 10),
    ],

    enemies: [
      // SEÇÃO 1: intro flamers
      e('flamer', 380, 155),
      e('patrol', 200, 155),

      // SEÇÃO 2: fornalha
      e('flamer', 560, 155),
      e('turret', 850, 78),
      e('dropper', 700, 30),

      // SEÇÃO 3: conveyor
      e('flamer', 1180, 155),
      e('patrol', 1320, 155),
      e('dropper', 1250, 30),
      e('turret', 1380, 83),

      // SEÇÃO 4: chaminé
      e('flamer', 1700, 155),
      e('dropper', 1620, 30),
      e('turret', 1820, 78),
      e('patrol', 1860, 155),
    ],
  });
}

/**
 * Retorna a configuração da Aqua Depths — Fase subaquática.
 *
 * 2400px de largura, 5 seções temáticas, boss Aqua Serpent.
 */
export function getAquaDepthsConfig(): LevelConfigWithEnemies {
  return LevelConfigWithEnemiesSchema.parse({
    name: 'Aqua Depths',
    worldWidth: 2400 * S,
    worldHeight: 180 * S,
    spawnPoint: { x: 40 * S, y: 140 * S },
    goalX: 2350 * S,
    bossZoneX: 1950 * S,

    platforms: [
      // ═══ SEÇÃO 1: Recifes de Coral (0–500) ═══
      // Chão contínuo com pequenas variações de altura
      p(0, 172, 260),           // chão largo de início
      p(290, 172, 100),         // gap pequeno (30px), fácil de pular
      p(420, 172, 100),         // continuação
      // Plataformas opcionais (ao lado, não bloqueando)
      p(150, 130, 56, 10),      // plataforma alta opcional
      p(350, 120, 48, 10),      // plataforma alta opcional

      // ═══ SEÇÃO 2: Caverna Submersa (500–1000) ═══
      p(530, 172, 160),         // chão largo
      p(720, 172, 140),         // gap pequeno (30px)
      p(890, 172, 120),         // continuação
      // Plataformas opcionais acima
      p(600, 125, 56, 10),
      p(780, 110, 48, 10),

      // ═══ SEÇÃO 3: Ruínas Submersas (1000–1500) ═══
      p(1030, 172, 140),
      p(1200, 172, 120),        // gap pequeno
      p(1350, 172, 160),
      // Plataformas escalonadas (ao lado, subida gradual)
      p(1100, 135, 56, 10),
      p(1280, 120, 48, 10),

      // ═══ SEÇÃO 4: Abismo (1500–1900) ═══
      p(1530, 172, 140),
      p(1700, 172, 130),        // gap pequeno
      p(1860, 172, 100),
      // Plataformas opcionais
      p(1600, 130, 56, 10),
      p(1780, 115, 48, 10),

      // ═══ SEÇÃO 5: Arena do Boss (1900–2400) ═══
      // Chão totalmente contínuo para boss fight
      p(1990, 172, 440),
      // Plataformas de escape (para pular ataques do boss)
      p(2100, 125, 64, 10),
      p(2280, 105, 64, 10),
    ],

    enemies: [
      // SEÇÃO 1: corais
      e('jellyfish', 200, 100),
      e('torpedoer', 350, 155),

      // SEÇÃO 2: caverna
      e('jellyfish', 620, 90),
      e('torpedoer', 750, 155),
      e('jellyfish', 890, 70),

      // SEÇÃO 3: ruínas
      e('torpedoer', 1100, 155),
      e('jellyfish', 1250, 80),
      e('torpedoer', 1400, 155),

      // SEÇÃO 4: abismo
      e('jellyfish', 1580, 100),
      e('torpedoer', 1720, 155),
      e('jellyfish', 1850, 70),
    ],
  });
}
