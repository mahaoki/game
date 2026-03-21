/**
 * DialogBox.ts — Caixa de Diálogo estilo MegaMan X
 *
 * Features:
 *   - Portrait do personagem (esquerda)
 *   - Nome do falante
 *   - Texto typewriter (letra por letra)
 *   - "▼" piscando para avançar
 *   - Enter/Space para próxima fala
 *
 * 🎮 Usado nas cutscenes (Lab, etc.)
 */
import Phaser from 'phaser';
import { S, fontSize } from '../../config/scaleConstants';

export interface DialogLine {
  speaker: string;
  text: string;
  portrait?: string; // texture key
}

export class DialogBox {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private bg: Phaser.GameObjects.Graphics;
  private nameText: Phaser.GameObjects.Text;
  private bodyText: Phaser.GameObjects.Text;
  private portrait: Phaser.GameObjects.Image | null = null;
  private advanceIcon: Phaser.GameObjects.Text;

  private lines: DialogLine[] = [];
  private currentLine: number = 0;
  private currentChar: number = 0;
  private isTyping: boolean = false;
  private typeTimer: Phaser.Time.TimerEvent | null = null;
  private onComplete: (() => void) | null = null;

  /** Velocidade do typewriter (ms por letra) */
  private typeSpeed: number = 30;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    const { width, height } = scene.scale;

    // Container (fixo na tela)
    this.container = scene.add.container(0, 0).setScrollFactor(0).setDepth(1000);

    // ─── Background da caixa ──────────────────────────────────
    const boxY = height - 52 * S;
    const boxH = 48 * S;
    this.bg = scene.add.graphics();
    // Borda externa
    this.bg.fillStyle(0x112244, 0.95);
    this.bg.fillRoundedRect(4 * S, boxY, width - 8 * S, boxH, 4 * S);
    // Borda highlight
    this.bg.lineStyle(1 * S, 0x4488cc, 0.8);
    this.bg.strokeRoundedRect(4 * S, boxY, width - 8 * S, boxH, 4 * S);
    this.container.add(this.bg);

    // ─── Nome do falante ──────────────────────────────────────
    this.nameText = scene.add
      .text(52 * S, boxY + 4 * S, '', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: fontSize(5),
        color: '#00ccff',
      });
    this.container.add(this.nameText);

    // ─── Texto do diálogo ─────────────────────────────────────
    this.bodyText = scene.add
      .text(52 * S, boxY + 15 * S, '', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: fontSize(4),
        color: '#ffffff',
        wordWrap: { width: width - 64 * S },
        lineSpacing: 4 * S,
      });
    this.container.add(this.bodyText);

    // ─── Ícone de avançar ─────────────────────────────────────
    this.advanceIcon = scene.add
      .text(width - 14 * S, boxY + boxH - 10 * S, '▼', {
        fontSize: fontSize(5),
        color: '#ffdd44',
      })
      .setAlpha(0);
    this.container.add(this.advanceIcon);

    // Esconder inicialmente
    this.container.setVisible(false);
  }

  /** Inicia o diálogo com uma sequência de falas */
  start(lines: DialogLine[], onComplete?: () => void): void {
    this.lines = lines;
    this.currentLine = 0;
    this.onComplete = onComplete ?? null;
    this.container.setVisible(true);
    this.showLine(0);

    // Input handler
    this.scene.input.keyboard!.on('keydown-ENTER', this.advance, this);
    this.scene.input.keyboard!.on('keydown-SPACE', this.advance, this);
  }

  /** Avança o diálogo (skip typewriter ou próxima fala) */
  private advance = (): void => {
    if (this.isTyping) {
      // Se ainda está digitando, completa a fala instantaneamente
      this.typeTimer?.destroy();
      this.isTyping = false;
      this.bodyText.setText(this.lines[this.currentLine].text);
      this.showAdvanceIcon();
      return;
    }

    // Próxima fala
    this.currentLine++;
    if (this.currentLine >= this.lines.length) {
      this.close();
      return;
    }
    this.showLine(this.currentLine);
  };

  /** Mostra uma linha específica com typewriter */
  private showLine(index: number): void {
    const line = this.lines[index];
    this.nameText.setText(line.speaker);
    this.bodyText.setText('');
    this.currentChar = 0;
    this.isTyping = true;
    this.advanceIcon.setAlpha(0);

    // Portrait
    if (this.portrait) {
      this.portrait.destroy();
      this.portrait = null;
    }
    if (line.portrait) {
      const { height } = this.scene.scale;
      const boxY = height - 52 * S;
      this.portrait = this.scene.add
        .image(28 * S, boxY + 24 * S, line.portrait)
        .setDisplaySize(36 * S, 36 * S);
      this.container.add(this.portrait);
    }

    // Typewriter
    this.typeTimer = this.scene.time.addEvent({
      delay: this.typeSpeed,
      callback: () => {
        this.currentChar++;
        this.bodyText.setText(line.text.substring(0, this.currentChar));
        if (this.currentChar >= line.text.length) {
          this.isTyping = false;
          this.typeTimer?.destroy();
          this.showAdvanceIcon();
        }
      },
      repeat: line.text.length - 1,
    });
  }

  /** Mostra ▼ piscando */
  private showAdvanceIcon(): void {
    this.advanceIcon.setAlpha(1);
    this.scene.tweens.add({
      targets: this.advanceIcon,
      alpha: 0,
      duration: 400,
      yoyo: true,
      repeat: -1,
    });
  }

  /** Fecha o diálogo */
  private close(): void {
    this.scene.input.keyboard!.off('keydown-ENTER', this.advance, this);
    this.scene.input.keyboard!.off('keydown-SPACE', this.advance, this);
    this.container.setVisible(false);
    this.typeTimer?.destroy();
    this.onComplete?.();
  }

  destroy(): void {
    this.typeTimer?.destroy();
    this.container.destroy();
  }
}
