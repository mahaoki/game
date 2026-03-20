/**
 * BossHealthBar.ts — Barra de HP do Boss
 *
 * Barra horizontal no topo da tela com nome + HP.
 * Muda de cor por fase (verde → amarelo → vermelho).
 *
 * 🎮 Estilo MegaMan X boss HP bar!
 */
import Phaser from 'phaser';

export class BossHealthBar {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private barBg: Phaser.GameObjects.Graphics;
  private barFill: Phaser.GameObjects.Graphics;
  private nameText: Phaser.GameObjects.Text;
  private maxHealth: number;
  private barWidth: number = 200;
  private barHeight: number = 6;

  constructor(scene: Phaser.Scene, bossName: string, maxHealth: number) {
    this.scene = scene;
    this.maxHealth = maxHealth;

    const { width } = scene.scale;
    const barX = (width - this.barWidth) / 2;
    const barY = 8;

    this.container = scene.add.container(0, 0).setScrollFactor(0).setDepth(900);

    // Nome do boss
    this.nameText = scene.add
      .text(width / 2, barY - 2, bossName, {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '4px',
        color: '#ff4444',
        stroke: '#000000',
        strokeThickness: 1,
      })
      .setOrigin(0.5, 1);
    this.container.add(this.nameText);

    // Background da barra
    this.barBg = scene.add.graphics();
    this.barBg.fillStyle(0x111111, 0.8);
    this.barBg.fillRect(barX, barY, this.barWidth, this.barHeight);
    this.barBg.lineStyle(1, 0x444444, 1);
    this.barBg.strokeRect(barX, barY, this.barWidth, this.barHeight);
    this.container.add(this.barBg);

    // Fill da barra
    this.barFill = scene.add.graphics();
    this.container.add(this.barFill);

    this.update(maxHealth);

    // Animação de entrada
    this.container.setAlpha(0);
    scene.tweens.add({
      targets: this.container,
      alpha: 1,
      duration: 500,
    });
  }

  update(currentHealth: number): void {
    const { width } = this.scene.scale;
    const barX = (width - this.barWidth) / 2;
    const barY = 8;
    const pct = Math.max(0, currentHealth / this.maxHealth);
    const fillW = Math.floor(this.barWidth * pct);

    // Cor por fase
    let color: number;
    if (pct > 0.6) color = 0x00cc44;
    else if (pct > 0.3) color = 0xccaa00;
    else color = 0xcc2222;

    this.barFill.clear();
    this.barFill.fillStyle(color, 1);
    this.barFill.fillRect(barX + 1, barY + 1, fillW - 2, this.barHeight - 2);
  }

  destroy(): void {
    this.container.destroy();
  }
}
