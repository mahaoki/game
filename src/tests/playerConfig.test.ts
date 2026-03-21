/**
 * playerConfig.test.ts — Testes do Schema de Configuração do Player
 *
 * Verifica que o Zod valida corretamente os parâmetros de balanceamento.
 *
 * 🧪 Garante que valores inválidos nunca chegam ao jogo.
 */
import { describe, it, expect } from 'vitest';
import { PlayerConfigSchema, getPlayerConfig } from '../specs/playerConfig';
import { LevelConfigSchema, getLevel1Config } from '../specs/levelConfig';
import { S } from '../config/scaleConstants';

describe('PlayerConfigSchema', () => {
  it('deve gerar valores default corretos', () => {
    const config = PlayerConfigSchema.parse({});

    expect(config.moveSpeed).toBe(120 * S);
    expect(config.jumpForce).toBe(-280 * S);
    expect(config.dashSpeed).toBe(250 * S);
    expect(config.dashDurationMs).toBe(250);
    expect(config.dashCooldownMs).toBe(500);
    expect(config.maxHealth).toBe(16);
    expect(config.bulletSpeed).toBe(300 * S);
    expect(config.bulletCooldownMs).toBe(200);
    expect(config.maxBullets).toBe(3);
    expect(config.spriteWidth).toBe(32 * S);
    expect(config.spriteHeight).toBe(32 * S);
    expect(config.hitboxWidth).toBe(16 * S);
    expect(config.hitboxHeight).toBe(24 * S);
  });

  it('deve aceitar overrides parciais', () => {
    const config = PlayerConfigSchema.parse({ moveSpeed: 200 });
    expect(config.moveSpeed).toBe(200);
    expect(config.jumpForce).toBe(-280 * S); // Mantém default
  });

  it('deve rejeitar moveSpeed negativo', () => {
    expect(() => PlayerConfigSchema.parse({ moveSpeed: -10 })).toThrow();
  });

  it('deve rejeitar jumpForce positivo', () => {
    expect(() => PlayerConfigSchema.parse({ jumpForce: 100 })).toThrow();
  });

  it('deve rejeitar maxHealth zero', () => {
    expect(() => PlayerConfigSchema.parse({ maxHealth: 0 })).toThrow();
  });

  it('deve rejeitar maxHealth decimal', () => {
    expect(() => PlayerConfigSchema.parse({ maxHealth: 5.5 })).toThrow();
  });
});

describe('getPlayerConfig', () => {
  it('deve retornar config padrão sem argumentos', () => {
    const config = getPlayerConfig();
    expect(config.moveSpeed).toBe(120 * S);
  });

  it('deve mesclar overrides', () => {
    const config = getPlayerConfig({ dashSpeed: 300 });
    expect(config.dashSpeed).toBe(300);
    expect(config.moveSpeed).toBe(120 * S);
  });
});

describe('LevelConfigSchema', () => {
  it('deve gerar valores default corretos', () => {
    const config = LevelConfigSchema.parse({});
    expect(config.worldWidth).toBe(640 * S);
    expect(config.worldHeight).toBe(180 * S);
    expect(config.spawnPoint.x).toBe(40 * S);
    expect(config.spawnPoint.y).toBe(140 * S);
    expect(config.platforms).toEqual([]);
  });

  it('deve aceitar plataformas customizadas', () => {
    const config = LevelConfigSchema.parse({
      platforms: [{ x: 100, y: 160, width: 200, height: 16 }],
    });
    expect(config.platforms).toHaveLength(1);
    expect(config.platforms[0].x).toBe(100);
  });

  it('deve rejeitar largura de plataforma negativa', () => {
    expect(() =>
      LevelConfigSchema.parse({
        platforms: [{ x: 0, y: 0, width: -10, height: 16 }],
      })
    ).toThrow();
  });
});

describe('getLevel1Config', () => {
  it('deve retornar um nível com plataformas', () => {
    const level = getLevel1Config();
    expect(level.name).toBe('Intro Stage');
    expect(level.platforms.length).toBeGreaterThan(0);
    expect(level.spawnPoint.x).toBeGreaterThan(0);
  });

  it('todas as plataformas devem ter dimensões válidas', () => {
    const level = getLevel1Config();
    for (const plat of level.platforms) {
      expect(plat.width).toBeGreaterThan(0);
      expect(plat.height).toBeGreaterThan(0);
    }
  });
});
