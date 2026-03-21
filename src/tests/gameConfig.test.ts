/**
 * gameConfig.test.ts — Testes do Schema de Configuração
 *
 * Verifica que o Zod valida corretamente:
 *   - Valores default funcionam
 *   - Valores inválidos são rejeitados
 *   - Overrides parciais são mesclados com defaults
 *
 * 🧪 TDD: garante que a configuração nunca terá valores inválidos
 */
import { describe, it, expect, vi } from 'vitest';

// Mock Phaser para evitar dependência de canvas no ambiente de teste
vi.mock('phaser', () => ({
  default: {
    AUTO: 0,
    Scale: { FIT: 0, CENTER_BOTH: 0 },
  },
}));

import { GameConfigSchema } from '../config/gameConfig';
import { TitleScreenConfigSchema, getTitleScreenConfig } from '../specs/titleScreen.spec';
import { S } from '../config/scaleConstants';

describe('GameConfigSchema', () => {
  it('deve gerar valores default corretos', () => {
    const config = GameConfigSchema.parse({});

    expect(config.width).toBe(320 * S);
    expect(config.height).toBe(180 * S);
    expect(config.pixelArt).toBe(true);
    expect(config.zoom).toBe(4 / S);
    expect(config.backgroundColor).toBe('#0a0a1a');
    expect(config.enablePhysics).toBe(true);
  });

  it('deve aceitar overrides parciais', () => {
    const config = GameConfigSchema.parse({ zoom: 2 });

    expect(config.zoom).toBe(2);
    expect(config.width).toBe(320 * S); // Mantém default
  });

  it('deve rejeitar width negativo', () => {
    expect(() => {
      GameConfigSchema.parse({ width: -1 });
    }).toThrow();
  });

  it('deve rejeitar width zero', () => {
    expect(() => {
      GameConfigSchema.parse({ width: 0 });
    }).toThrow();
  });

  it('deve rejeitar width decimal', () => {
    expect(() => {
      GameConfigSchema.parse({ width: 320.5 });
    }).toThrow();
  });

  it('deve rejeitar tipo errado para pixelArt', () => {
    expect(() => {
      GameConfigSchema.parse({ pixelArt: 'sim' });
    }).toThrow();
  });
});

describe('TitleScreenConfigSchema', () => {
  it('deve gerar valores default corretos', () => {
    const config = TitleScreenConfigSchema.parse({});

    expect(config.startText).toBe('PRESS START');
    expect(config.versionText).toBe('v0.1.0');
    expect(config.textColor).toBe('#ffffff');
    expect(config.animation.logoBounceMs).toBe(800);
    expect(config.animation.blinkIntervalMs).toBe(500);
    expect(config.animation.fadeOutMs).toBe(600);
  });

  it('deve aceitar override de texto', () => {
    const config = TitleScreenConfigSchema.parse({
      startText: 'PRESSIONE INICIAR',
    });

    expect(config.startText).toBe('PRESSIONE INICIAR');
    expect(config.versionText).toBe('v0.1.0'); // Mantém default
  });

  it('deve aceitar override de animação parcial', () => {
    const config = TitleScreenConfigSchema.parse({
      animation: { logoBounceMs: 1200 },
    });

    expect(config.animation.logoBounceMs).toBe(1200);
    expect(config.animation.blinkIntervalMs).toBe(500); // Mantém default
  });

  it('deve rejeitar duração negativa', () => {
    expect(() => {
      TitleScreenConfigSchema.parse({
        animation: { logoBounceMs: -100 },
      });
    }).toThrow();
  });
});

describe('getTitleScreenConfig', () => {
  it('deve retornar config válida sem argumentos', () => {
    const config = getTitleScreenConfig();
    expect(config.startText).toBe('PRESS START');
    expect(config.animation.logoBounceMs).toBe(800);
  });

  it('deve mesclar overrides com defaults', () => {
    const config = getTitleScreenConfig({ startText: 'GO!' });
    expect(config.startText).toBe('GO!');
    expect(config.versionText).toBe('v0.1.0');
  });
});
