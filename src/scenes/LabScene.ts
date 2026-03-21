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
import { S } from '../config/scaleConstants';

export class LabScene extends Phaser.Scene {
  private dialog!: DialogBox;

  constructor() {
    super({ key: 'LabScene' });
  }

  create(): void {
    const { width, height } = this.scale;
    const data = this.scene.settings.data as { completedLevel?: string } | undefined;
    const completedLevel = data?.completedLevel;

    // ─── Background do laboratório ────────────────────────────
    this.createLabBackground();

    // ─── Plataforma de teleporte ──────────────────────────────
    const telepadX = width * 0.35;
    const telepadY = height - 20 * S;
    this.createTelepad(telepadX, telepadY);

    // ─── Dr. White (direita) ──────────────────────────────────
    const drWhite = this.add
      .sprite(width * 0.65, telepadY - 16 * S, 'drwhite_sheet', 0)
      .setDisplaySize(32 * S, 32 * S);

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
      .sprite(telepadX, telepadY - 16 * S, 'player_sheet', 0)
      .setDisplaySize(32 * S, 32 * S)
      .setAlpha(0);

    // Aplica tint vermelho se voltou de Vulcan (já tem fire power)
    if (completedLevel === 'vulcan') {
      player.setTint(0xff3333);
    }

    // ─── Efeito de teleporte (chegada) ────────────────────────
    // Flash na plataforma
    const teleFlash = this.add.graphics();
    teleFlash.fillStyle(0x00ffcc, 0.8);
    teleFlash.fillRect(telepadX - 8 * S, telepadY - 40 * S, 16 * S, 40 * S);
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
            this.startDialogue(drWhite, completedLevel);
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
    for (let x = 8 * S; x < width - 8 * S; x += 40 * S) {
      bg.fillStyle(0x222844, 1);
      bg.fillRect(x, 10 * S, 36 * S, height - 30 * S);
      bg.lineStyle(1, 0x334466, 0.5);
      bg.strokeRect(x, 10 * S, 36 * S, height - 30 * S);
    }

    // Telas/monitores na parede
    const screenPositions = [20 * S, 100 * S, 200 * S, 280 * S];
    for (const sx of screenPositions) {
      if (sx > width - 40 * S) continue;
      // Moldura do monitor
      bg.fillStyle(0x111122, 1);
      bg.fillRect(sx, 20 * S, 28 * S, 20 * S);
      // Tela verde
      bg.fillStyle(0x003322, 1);
      bg.fillRect(sx + 2 * S, 22 * S, 24 * S, 16 * S);
      // Linhas de dados
      for (let ly = 24 * S; ly < 36 * S; ly += 4 * S) {
        bg.fillStyle(0x00cc66, 0.6);
        const lineW = Phaser.Math.Between(8 * S, 20 * S);
        bg.fillRect(sx + 4 * S, ly, lineW, S);
      }
    }

    // Chão metálico
    bg.fillStyle(0x334455, 1);
    bg.fillRect(0, height - 16 * S, width, 16 * S);
    bg.lineStyle(1, 0x556677, 0.5);
    for (let x = 0; x < width; x += 16 * S) {
      bg.strokeRect(x, height - 16 * S, 16 * S, 16 * S);
    }

    // Luzes no teto
    for (let x = 20 * S; x < width; x += 60 * S) {
      bg.fillStyle(0xffffcc, 0.3);
      bg.fillRect(x, 8 * S, 20 * S, 2 * S);
    }
  }

  /** Cria a plataforma de teleporte */
  private createTelepad(x: number, y: number): void {
    const pad = this.add.graphics();
    // Base circular
    pad.fillStyle(0x224466, 1);
    pad.fillEllipse(x, y - 2 * S, 40 * S, 8 * S);
    // Anel de energia
    pad.lineStyle(S, 0x00ccff, 0.8);
    pad.strokeEllipse(x, y - 2 * S, 40 * S, 8 * S);
    // Brilho
    pad.fillStyle(0x00ccff, 0.2);
    pad.fillEllipse(x, y - 2 * S, 30 * S, 5 * S);

    // Glow pulsante
    const glow = this.add.graphics();
    glow.fillStyle(0x00ccff, 0.1);
    glow.fillEllipse(x, y - 2 * S, 44 * S, 10 * S);
    this.tweens.add({
      targets: glow,
      alpha: { from: 0.2, to: 0.6 },
      duration: 1000,
      yoyo: true,
      repeat: -1,
    });
  }

  /** Inicia o diálogo do Dr. White */
  private startDialogue(drWhite: Phaser.GameObjects.Sprite, completedLevel?: string): void {
    this.dialog = new DialogBox(this);

    let lines: DialogLine[];

    if (completedLevel === 'vulcan') {
      // Diálogo sobre o upgrade de fogo
      lines = [
        {
          speaker: 'Dr. White',
          text: 'Mega Pixel! Voce derrotou o Vulcan Lord!',
          portrait: 'drwhite_portrait',
        },
        {
          speaker: 'Dr. White',
          text: 'Vejo que voce absorveu a energia dele...',
          portrait: 'drwhite_portrait',
        },
        {
          speaker: 'Dr. White',
          text: 'Excelente! Agora voce tem o FIRE POWER!',
          portrait: 'drwhite_portrait',
        },
        {
          speaker: 'Dr. White',
          text: 'Seus tiros de fogo causam o dobro de dano.',
          portrait: 'drwhite_portrait',
        },
        {
          speaker: 'Dr. White',
          text: 'Pressione A para alternar entre suas armas.',
          portrait: 'drwhite_portrait',
        },
        {
          speaker: 'Dr. White',
          text: 'Use o fire power contra os proximos inimigos!',
          portrait: 'drwhite_portrait',
        },
      ];
    } else {
      // Diálogo genérico
      lines = [
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
    }

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
