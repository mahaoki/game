/**
 * main.ts — Ponto de Entrada do Jogo
 *
 * Cria a instância do Phaser com configuração validada por Zod.
 * Registra todas as cenas na ordem correta:
 *   1. BootScene → carrega assets
 *   2. TitleScene → tela inicial
 *   3. GameScene → jogo (futuro)
 *
 * 🎮 O jogo inicia automaticamente na BootScene.
 */
import Phaser from 'phaser';
import { createPhaserConfig } from './config/gameConfig';
import { BootScene } from './scenes/BootScene';
import { TitleScene } from './scenes/TitleScene';
import { GameScene } from './scenes/GameScene';

// Carrega a fonte "Press Start 2P" do Google Fonts
const fontLink = document.createElement('link');
fontLink.href =
  'https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap';
fontLink.rel = 'stylesheet';
document.head.appendChild(fontLink);

// Cria a configuração do Phaser (validada pelo Zod)
const config = createPhaserConfig(
  [BootScene, TitleScene, GameScene],
  {
    width: 320,
    height: 180,
    pixelArt: true,
    zoom: 4,
    backgroundColor: '#0a0a1a',
  }
);

// Aguarda a fonte carregar, depois inicia o jogo
document.fonts.ready.then(() => {
  // Cria o jogo!
  const game = new Phaser.Game(config);

  // Acessível no console para debug
  if (import.meta.env.DEV) {
    (window as unknown as Record<string, unknown>).__GAME__ = game;
  }
});
