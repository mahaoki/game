/**
 * GameOverScene.ts — Tela de Game Over
 *
 * Exibida quando o player perde todas as vidas.
 * Mostra "GAME OVER" e permite voltar ao título.
 *
 * 🎮 Estilo MegaMan X: simples, direto, pixel art.
 */
import Phaser from 'phaser';
import { S, fontSize } from '../config/scaleConstants';

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameOverScene' });
  }

  create(): void {
    const { width, height } = this.scale;
    const centerX = width / 2;
    const centerY = height / 2;

    // Fade-in
    this.cameras.main.fadeIn(500, 0, 0, 0);

    // Fundo preto
    this.cameras.main.setBackgroundColor('#000000');

    // "GAME OVER" em vermelho
    const gameOverText = this.add
      .text(centerX, centerY - 20 * S, 'GAME OVER', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: fontSize(12),
        color: '#cc0000',
        stroke: '#440000',
        strokeThickness: 2 * S,
      })
      .setOrigin(0.5)
      .setAlpha(0);

    // Animação de aparição
    this.tweens.add({
      targets: gameOverText,
      alpha: 1,
      y: centerY - 24 * S,
      duration: 1000,
      ease: 'Power2',
    });

    // "PRESS START" piscando (aparece após 1.5s)
    const promptText = this.add
      .text(centerX, centerY + 16 * S, 'PRESS START', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: fontSize(6),
        color: '#aaaaaa',
      })
      .setOrigin(0.5)
      .setAlpha(0);

    this.time.delayedCall(1500, () => {
      // Piscar
      this.tweens.add({
        targets: promptText,
        alpha: { from: 0, to: 1 },
        duration: 500,
        yoyo: true,
        repeat: -1,
      });

      // Aceitar input
      this.input.keyboard?.once('keydown', () => {
        this.cameras.main.fadeOut(500, 0, 0, 0);
        this.time.delayedCall(600, () => {
          this.scene.start('TitleScene');
        });
      });

      this.input.once('pointerdown', () => {
        this.cameras.main.fadeOut(500, 0, 0, 0);
        this.time.delayedCall(600, () => {
          this.scene.start('TitleScene');
        });
      });
    });
  }
}
