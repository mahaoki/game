/**
 * BootScene.ts — Cena de Carregamento
 *
 * Responsável por carregar todos os assets do jogo (imagens, sons, fontes)
 * antes de passar para a TitleScene.
 *
 * 🎨 Mostra uma barra de progresso simples durante o carregamento.
 */
import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  /**
   * Preload: carrega todos os assets necessários.
   * A barra de progresso é atualizada automaticamente.
   */
  preload(): void {
    this.createLoadingBar();
    this.loadAssets();
  }

  /**
   * Create: chamado quando todos os assets terminaram de carregar.
   * Transiciona para a TitleScene.
   */
  create(): void {
    // Pequeno delay para suavizar a transição
    this.time.delayedCall(300, () => {
      this.scene.start('TitleScene');
    });
  }

  /** Cria uma barra de progresso pixel art simples */
  private createLoadingBar(): void {
    const { width, height } = this.scale;
    const centerX = width / 2;
    const centerY = height / 2;

    // Texto "LOADING..."
    const loadingText = this.add
      .text(centerX, centerY - 16, 'LOADING...', {
        fontFamily: 'monospace',
        fontSize: '8px',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    // Barra de fundo (cinza escuro)
    const barBg = this.add.rectangle(centerX, centerY, 120, 8, 0x333333);

    // Barra de progresso (azul MegaMan)
    const barFill = this.add.rectangle(
      centerX - 60,
      centerY,
      0,
      8,
      0x00aaff
    );
    barFill.setOrigin(0, 0.5);

    // Atualiza a barra conforme os assets carregam
    this.load.on('progress', (value: number) => {
      barFill.width = 120 * value;
    });

    // Limpa quando terminar
    this.load.on('complete', () => {
      loadingText.destroy();
      barBg.destroy();
      barFill.destroy();
    });
  }

  /** Carrega os assets do jogo */
  private loadAssets(): void {
    // Carrega a fonte "Press Start 2P" via CSS (Google Fonts)
    // A fonte será aplicada via CSS no index.html

    // Carrega as imagens da Title Screen
    this.load.image('title_bg', 'assets/title_bg.png');
    this.load.image('logo', 'assets/logo.png');

    // Carrega o spritesheet do player (8 frames de 32×32)
    // Ordem: idle1, idle2, run1, run2, jump, fall, shoot, dash
    this.load.spritesheet('player_sheet', 'assets/player_sheet.png', {
      frameWidth: 32,
      frameHeight: 32,
    });

    // Carrega o sprite do projétil (16×16 com transparência)
    this.load.image('bullet_sprite', 'assets/bullet.png');

    // ─── Enemy assets ─────────────────────────────────────────
    this.load.spritesheet('enemy_met_sheet', 'assets/enemy_met_sheet.png', {
      frameWidth: 32,
      frameHeight: 32,
    });
    this.load.spritesheet('enemy_turret_sheet', 'assets/enemy_turret_sheet.png', {
      frameWidth: 32,
      frameHeight: 32,
    });
    this.load.image('enemy_bullet', 'assets/enemy_bullet.png');
  }
}
