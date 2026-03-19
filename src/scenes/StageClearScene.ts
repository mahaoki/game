/**
 * StageClearScene.ts — Tela de Vitória ao completar o Stage
 *
 * Mostra "STAGE CLEAR!" com animação e transição de volta ao título.
 *
 * 🎮 Estilo MegaMan X — tela de resultado!
 */
import Phaser from 'phaser';

export class StageClearScene extends Phaser.Scene {
  constructor() {
    super({ key: 'StageClearScene' });
  }

  create(): void {
    const { width, height } = this.scale;

    // Fundo gradiente escuro
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x001133, 0x001133, 0x000a1a, 0x000a1a, 1);
    bg.fillRect(0, 0, width, height);

    // ─── "STAGE CLEAR!" ────────────────────────────────────────
    const clearText = this.add
      .text(width / 2, height / 2 - 30, 'STAGE CLEAR!', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '12px',
        color: '#00ff88',
        stroke: '#003322',
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setAlpha(0);

    // ─── Estrelas decorativas ─────────────────────────────────
    for (let i = 0; i < 20; i++) {
      const star = this.add
        .text(
          Phaser.Math.Between(10, width - 10),
          Phaser.Math.Between(10, height - 10),
          '✦',
          {
            fontSize: `${Phaser.Math.Between(4, 8)}px`,
            color: '#ffdd44',
          }
        )
        .setAlpha(0);

      this.tweens.add({
        targets: star,
        alpha: { from: 0, to: Phaser.Math.FloatBetween(0.3, 1) },
        duration: Phaser.Math.Between(500, 2000),
        delay: Phaser.Math.Between(200, 1500),
        yoyo: true,
        repeat: -1,
      });
    }

    // ─── Animação de entrada ──────────────────────────────────
    this.tweens.add({
      targets: clearText,
      alpha: 1,
      y: height / 2 - 35,
      duration: 800,
      ease: 'Back.easeOut',
    });

    // ─── Subtítulo ────────────────────────────────────────────
    const subText = this.add
      .text(width / 2, height / 2, 'MISSION COMPLETE', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '6px',
        color: '#88ccff',
      })
      .setOrigin(0.5)
      .setAlpha(0);

    this.tweens.add({
      targets: subText,
      alpha: 1,
      duration: 600,
      delay: 1000,
    });

    // ─── "PRESS START" piscando ───────────────────────────────
    const pressStart = this.add
      .text(width / 2, height / 2 + 30, 'PRESS START', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '5px',
        color: '#ffffff',
      })
      .setOrigin(0.5)
      .setAlpha(0);

    this.tweens.add({
      targets: pressStart,
      alpha: 1,
      duration: 500,
      delay: 2000,
      onComplete: () => {
        this.tweens.add({
          targets: pressStart,
          alpha: 0,
          duration: 400,
          yoyo: true,
          repeat: -1,
        });
      },
    });

    // ─── Input (volta ao título) ──────────────────────────────
    this.time.delayedCall(2500, () => {
      this.input.keyboard!.on('keydown', () => {
        this.cameras.main.fadeOut(500, 0, 0, 0);
        this.time.delayedCall(600, () => {
          this.scene.start('LabScene');
        });
      });
    });
  }
}
