/**
 * HealthBar.ts — Barra de Vida estilo MegaMan X
 *
 * Barra vertical no canto esquerdo da tela com segmentos
 * que representam pontos de vida.
 *
 * 🎮 Inspirada na barra de vida do MegaMan X (SNES):
 *    - Vertical, lado esquerdo
 *    - Segmentos coloridos (verde → amarelo → vermelho)
 *    - Animação ao perder vida
 */
import Phaser from 'phaser';

export interface HealthBarConfig {
  /** Cena Phaser */
  scene: Phaser.Scene;
  /** Posição X (esquerda) */
  x?: number;
  /** Posição Y (topo da barra) */
  y?: number;
  /** Vida máxima */
  maxHealth: number;
  /** Largura de cada segmento */
  segmentWidth?: number;
  /** Altura de cada segmento */
  segmentHeight?: number;
  /** Espaço entre segmentos */
  gap?: number;
}

export class HealthBar {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private segments: Phaser.GameObjects.Rectangle[] = [];
  private maxHealth: number;
  private currentHealth: number;

  private segmentWidth: number;
  private segmentHeight: number;
  private gap: number;

  constructor(config: HealthBarConfig) {
    this.scene = config.scene;
    this.maxHealth = config.maxHealth;
    this.currentHealth = config.maxHealth;
    this.segmentWidth = config.segmentWidth ?? 6;
    this.segmentHeight = config.segmentHeight ?? 3;
    this.gap = config.gap ?? 1;

    const x = config.x ?? 8;
    const y = config.y ?? 20;

    // Container fixo na câmera (HUD)
    this.container = this.scene.add.container(x, y);
    this.container.setScrollFactor(0);
    this.container.setDepth(900);

    this.createBar();
  }

  /** Cria a barra visual */
  private createBar(): void {
    const totalHeight =
      this.maxHealth * (this.segmentHeight + this.gap) - this.gap;

    // Fundo da barra (moldura)
    const bgWidth = this.segmentWidth + 4;
    const bgHeight = totalHeight + 4;
    const bg = this.scene.add.rectangle(
      this.segmentWidth / 2,
      totalHeight / 2,
      bgWidth,
      bgHeight,
      0x111122,
      0.9
    );
    bg.setStrokeStyle(1, 0x334466);
    this.container.add(bg);

    // Ícone "HP" no topo
    const hpText = this.scene.add
      .text(this.segmentWidth / 2, -8, 'HP', {
        fontFamily: 'monospace',
        fontSize: '4px',
        color: '#00ccff',
      })
      .setOrigin(0.5);
    this.container.add(hpText);

    // Segmentos (de baixo para cima, como no MegaMan X)
    for (let i = 0; i < this.maxHealth; i++) {
      const segY =
        totalHeight - i * (this.segmentHeight + this.gap) - this.segmentHeight / 2;

      const segment = this.scene.add.rectangle(
        this.segmentWidth / 2,
        segY,
        this.segmentWidth,
        this.segmentHeight,
        this.getSegmentColor(i, this.maxHealth)
      );

      this.container.add(segment);
      this.segments.push(segment);
    }
  }

  /** Cor do segmento baseada na posição (verde → amarelo → vermelho) */
  private getSegmentColor(index: number, max: number): number {
    const ratio = index / max;
    if (ratio > 0.6) return 0x00cc44; // Verde (vida alta)
    if (ratio > 0.3) return 0xcccc00; // Amarelo (vida média)
    return 0xcc3300; // Vermelho (vida baixa)
  }

  /** Atualiza a barra com a vida atual */
  update(currentHealth: number): void {
    if (currentHealth === this.currentHealth) return;

    this.currentHealth = Math.max(0, Math.min(this.maxHealth, currentHealth));

    for (let i = 0; i < this.segments.length; i++) {
      const segment = this.segments[i];
      if (i < this.currentHealth) {
        segment.setVisible(true);
        segment.setFillStyle(this.getSegmentColor(i, this.maxHealth));
      } else {
        // Segmento vazio (cinza escuro)
        segment.setVisible(true);
        segment.setFillStyle(0x222233, 0.5);
      }
    }
  }

  /** Limpa a barra */
  destroy(): void {
    this.container.destroy();
  }
}
