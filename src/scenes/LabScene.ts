/**
 * LabScene.ts — Laboratório do Dr. White
 *
 * Mega Pixel é teletransportado ao lab após completar um stage.
 * Dr. White aparece e fala com ele via DialogBox typewriter.
 * Após o diálogo → transição para MissionSelectScene.
 *
 * 🎮 Estilo MegaMan X — Lab do Dr. Light!
 */
import Phaser from 'phaser';
import { DialogBox, type DialogLine } from '../ui/components/DialogBox';

export class LabScene extends Phaser.Scene {
  private dialog!: DialogBox;

  constructor() {
    super({ key: 'LabScene' });
  }

  create(): void {
    const { width, height } = this.scale;

    // ─── Background do laboratório ────────────────────────────
    this.createLabBackground();

    // ─── Plataforma de teleporte ──────────────────────────────
    const telepadX = width * 0.35;
    const telepadY = height - 20;
    this.createTelepad(telepadX, telepadY);

    // ─── Dr. White (direita) ──────────────────────────────────
    const drWhite = this.add
      .sprite(width * 0.65, telepadY - 16, 'drwhite_sheet', 0)
      .setDisplaySize(32, 32);

    // Animação idle/talk
    if (!this.anims.exists('drwhite_idle')) {
      this.anims.create({
        key: 'drwhite_idle',
        frames: this.anims.generateFrameNumbers('drwhite_sheet', { frames: [0] }),
        frameRate: 1,
        repeat: 0,
      });
    }
    if (!this.anims.exists('drwhite_talk')) {
      this.anims.create({
        key: 'drwhite_talk',
        frames: this.anims.generateFrameNumbers('drwhite_sheet', { frames: [0, 1] }),
        frameRate: 3,
        repeat: -1,
      });
    }
    drWhite.play('drwhite_idle');

    // ─── Mega Pixel (teleporte in) ────────────────────────────
    const player = this.add
      .sprite(telepadX, telepadY - 16, 'player_sheet', 0)
      .setDisplaySize(32, 32)
      .setAlpha(0);

    // ─── Efeito de teleporte (chegada) ────────────────────────
    // Flash na plataforma
    const teleFlash = this.add.graphics();
    teleFlash.fillStyle(0x00ffcc, 0.8);
    teleFlash.fillRect(telepadX - 8, telepadY - 40, 16, 40);
    teleFlash.setAlpha(0);

    // Sequência de animação
    this.tweens.add({
      targets: teleFlash,
      alpha: { from: 0, to: 1 },
      duration: 300,
      delay: 500,
      yoyo: true,
      hold: 200,
      onComplete: () => {
        teleFlash.destroy();
        // Player materializa
        this.tweens.add({
          targets: player,
          alpha: 1,
          duration: 400,
          onComplete: () => {
            // Dr. White começa a falar
            drWhite.play('drwhite_talk');
            this.startDialogue(drWhite);
          },
        });
      },
    });

    // Fade in da cena
    this.cameras.main.fadeIn(500, 0, 0, 0);
  }

  /** Cria o fundo do laboratório com graphics */
  private createLabBackground(): void {
    const { width, height } = this.scale;
    const bg = this.add.graphics();

    // Parede do lab (gradiente azul escuro → cinza)
    bg.fillStyle(0x1a2040, 1);
    bg.fillRect(0, 0, width, height);

    // Painéis da parede
    for (let x = 8; x < width - 8; x += 40) {
      bg.fillStyle(0x222844, 1);
      bg.fillRect(x, 10, 36, height - 30);
      bg.lineStyle(1, 0x334466, 0.5);
      bg.strokeRect(x, 10, 36, height - 30);
    }

    // Telas/monitores na parede
    const screenPositions = [20, 100, 200, 280];
    for (const sx of screenPositions) {
      if (sx > width - 40) continue;
      // Moldura do monitor
      bg.fillStyle(0x111122, 1);
      bg.fillRect(sx, 20, 28, 20);
      // Tela verde
      bg.fillStyle(0x003322, 1);
      bg.fillRect(sx + 2, 22, 24, 16);
      // Linhas de dados
      for (let ly = 24; ly < 36; ly += 4) {
        bg.fillStyle(0x00cc66, 0.6);
        const lineW = Phaser.Math.Between(8, 20);
        bg.fillRect(sx + 4, ly, lineW, 1);
      }
    }

    // Chão metálico
    bg.fillStyle(0x334455, 1);
    bg.fillRect(0, height - 16, width, 16);
    bg.lineStyle(1, 0x556677, 0.5);
    for (let x = 0; x < width; x += 16) {
      bg.strokeRect(x, height - 16, 16, 16);
    }

    // Luzes no teto
    for (let x = 20; x < width; x += 60) {
      bg.fillStyle(0xffffcc, 0.3);
      bg.fillRect(x, 8, 20, 2);
    }
  }

  /** Cria a plataforma de teleporte */
  private createTelepad(x: number, y: number): void {
    const pad = this.add.graphics();
    // Base circular
    pad.fillStyle(0x224466, 1);
    pad.fillEllipse(x, y - 2, 40, 8);
    // Anel de energia
    pad.lineStyle(1, 0x00ccff, 0.8);
    pad.strokeEllipse(x, y - 2, 40, 8);
    // Brilho
    pad.fillStyle(0x00ccff, 0.2);
    pad.fillEllipse(x, y - 2, 30, 5);

    // Glow pulsante
    const glow = this.add.graphics();
    glow.fillStyle(0x00ccff, 0.1);
    glow.fillEllipse(x, y - 2, 44, 10);
    this.tweens.add({
      targets: glow,
      alpha: { from: 0.2, to: 0.6 },
      duration: 1000,
      yoyo: true,
      repeat: -1,
    });
  }

  /** Inicia o diálogo do Dr. White */
  private startDialogue(drWhite: Phaser.GameObjects.Sprite): void {
    this.dialog = new DialogBox(this);

    const lines: DialogLine[] = [
      {
        speaker: 'Dr. White',
        text: 'Mega Pixel, bem-vindo de volta!',
        portrait: 'drwhite_portrait',
      },
      {
        speaker: 'Dr. White',
        text: 'Detectamos atividade inimiga em varias regioes.',
        portrait: 'drwhite_portrait',
      },
      {
        speaker: 'Dr. White',
        text: 'Escolha sua proxima missao com cuidado.',
        portrait: 'drwhite_portrait',
      },
    ];

    this.dialog.start(lines, () => {
      // Após diálogo → Mission Select
      drWhite.play('drwhite_idle');

      this.cameras.main.fadeOut(500, 0, 0, 0);
      this.time.delayedCall(600, () => {
        this.scene.start('MissionSelectScene');
      });
    });
  }

  shutdown(): void {
    this.dialog?.destroy();
  }
}
