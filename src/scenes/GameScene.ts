/**
 * GameScene.ts — Cena de Jogo (Placeholder)
 *
 * Esta cena será onde o jogo side-scroller acontece.
 * Por enquanto, mostra apenas um placeholder com informações básicas.
 * 
 * 🚧 Será implementada nas próximas fases com:
 *    - Personagem (Player) com animações
 *    - Cenário com plataformas e obstáculos
 *    - Inimigos e sistema de tiro
 */
import Phaser from 'phaser';

export class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    const { width, height } = this.scale;

    // Fade-in ao entrar
    this.cameras.main.fadeIn(500, 0, 0, 0);

    // Fundo temporário
    this.cameras.main.setBackgroundColor('#0a1628');

    // Grid pixel art de referência
    this.createPixelGrid(width, height);

    // Texto placeholder
    this.add
      .text(width / 2, height / 2 - 10, '🎮 GAME SCENE', {
        fontFamily: 'monospace',
        fontSize: '10px',
        color: '#00ccff',
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height / 2 + 10, 'Em breve: Side-scroller!', {
        fontFamily: 'monospace',
        fontSize: '6px',
        color: '#666666',
      })
      .setOrigin(0.5);

    // Linha de chão placeholder
    const ground = this.add.rectangle(
      width / 2,
      height - 8,
      width,
      16,
      0x334455
    );
    ground.setStrokeStyle(1, 0x556677);
  }

  /** Grid sutil para referência de posicionamento */
  private createPixelGrid(width: number, height: number): void {
    const graphics = this.add.graphics();
    graphics.lineStyle(1, 0x1a2a3a, 0.3);

    // Linhas verticais a cada 16px
    for (let x = 0; x <= width; x += 16) {
      graphics.moveTo(x, 0);
      graphics.lineTo(x, height);
    }

    // Linhas horizontais a cada 16px
    for (let y = 0; y <= height; y += 16) {
      graphics.moveTo(0, y);
      graphics.lineTo(width, y);
    }

    graphics.strokePath();
  }
}
