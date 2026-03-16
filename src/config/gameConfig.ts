/**
 * gameConfig.ts — Configuração Central do Jogo
 * 
 * Define e valida a configuração do Phaser usando Zod.
 * Todos os valores passam por validação antes de criar o jogo.
 * 
 * 🎮 Resolução: 320×180 pixels (paisagem 16:9)
 * 🔍 Zoom: 4× para desktop (1280×720 na tela)
 * 🎨 Pixel Art: ativado, sem suavização
 */
import { z } from 'zod';
import Phaser from 'phaser';

// ─── Schema Zod para validar a configuração ───────────────────────
export const GameConfigSchema = z.object({
  /** Largura interna do jogo em pixels */
  width: z.number().int().positive().default(320),
  /** Altura interna do jogo em pixels */
  height: z.number().int().positive().default(180),
  /** Ativa renderização pixel art (sem suavização) */
  pixelArt: z.boolean().default(true),
  /** Fator de zoom (320×4 = 1280px no desktop) */
  zoom: z.number().positive().default(4),
  /** Cor de fundo do canvas */
  backgroundColor: z.string().default('#0a0a1a'),
  /** Usar física Arcade */
  enablePhysics: z.boolean().default(true),
});

/** Tipo derivado do schema */
export type GameConfig = z.infer<typeof GameConfigSchema>;

/**
 * Cria a configuração completa do Phaser a partir de valores validados.
 * 
 * @param scenes - Lista de cenas do jogo (na ordem de registro)
 * @param overrides - Valores opcionais que sobrescrevem os defaults
 * @returns Configuração pronta para o `new Phaser.Game(config)`
 */
export function createPhaserConfig(
  scenes: typeof Phaser.Scene[],
  overrides: Partial<GameConfig> = {}
): Phaser.Types.Core.GameConfig {
  // Valida e aplica defaults
  const config = GameConfigSchema.parse(overrides);

  return {
    type: Phaser.AUTO,
    width: config.width,
    height: config.height,
    backgroundColor: config.backgroundColor,
    parent: 'game-container',

    // Renderização Pixel Art — sem borrões! (MASTER_SPEC §5)
    pixelArt: config.pixelArt,
    roundPixels: true,
    antialias: false,

    // Escala: preenche a tela mantendo proporção
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      zoom: config.zoom,
    },

    // Física Arcade (para plataformas e colisões futuras)
    physics: config.enablePhysics
      ? {
          default: 'arcade',
          arcade: {
            gravity: { x: 0, y: 800 },
            debug: false,
          },
        }
      : undefined,

    // Cenas do jogo
    scene: scenes,

    // Input: teclado + touch (mobile)
    input: {
      keyboard: true,
      touch: true,
    },
  };
}
