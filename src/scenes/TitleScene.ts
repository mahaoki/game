/**
 * TitleScene.ts — Tela Inicial do Jogo
 *
 * Inspirada na title screen do MegaMan X (SNES).
 * Mostra o logo com animação bounce, fundo estrelado,
 * e texto "PRESS START" piscando.
 *
 * 🎮 Aceita input de teclado (Enter/Space) e touch (tap).
 * 🧠 Usa a menuMachine do XState para controlar o fluxo.
 */
import Phaser from 'phaser';
import { createActor } from 'xstate';
import { menuMachine } from '../core/machines/menuMachine';
import { getTitleScreenConfig } from '../specs/titleScreen.spec';
import { createBlinkText } from '../ui/components/BlinkText';
import { S, fontSize } from '../config/scaleConstants';

export class TitleScene extends Phaser.Scene {
  /** Ator XState que controla o fluxo de estados */
  private menuActor!: ReturnType<typeof createActor<typeof menuMachine>>;

  /** Referência ao texto piscante para limpeza */
  private blinkTextRef: ReturnType<typeof createBlinkText> | null = null;

  /** Flag para evitar inputs duplos */
  private isTransitioning = false;

  constructor() {
    super({ key: 'TitleScene' });
  }

  create(): void {
    // Carrega configuração validada da Title Screen
    const config = getTitleScreenConfig();

    // Inicia a máquina de estado no estado "title"
    // (pulamos "boot" pois a BootScene já fez o carregamento)
    this.menuActor = createActor(menuMachine, {
      snapshot: menuMachine.resolveState({ value: 'title', context: {} }),
    });
    this.menuActor.start();

    // ─── Fundo ───────────────────────────────────────────────
    this.createBackground();

    // ─── Logo ────────────────────────────────────────────────
    this.createLogoAnimation(config);

    // ─── Partículas (estrelas) ───────────────────────────────
    this.createStarParticles();

    // ─── Versão ──────────────────────────────────────────────
    this.createVersionText(config);
  }

  /** Cria o fundo — usa imagem se disponível, senão gera gradient */
  private createBackground(): void {
    const { width, height } = this.scale;

    // Tenta usar a imagem de fundo carregada
    if (this.textures.exists('title_bg')) {
      const bg = this.add.image(width / 2, height / 2, 'title_bg');
      bg.setDisplaySize(width, height);
    } else {
      // Fallback: gera um gradient procedural pixel art
      this.createProceduralBackground(width, height);
    }
  }

  /** Gera um fundo gradient procedural quando não há imagem */
  private createProceduralBackground(width: number, height: number): void {
    const graphics = this.add.graphics();

    // Gradient de cima (azul escuro) para baixo (preto)
    const steps = 18; // número de faixas no gradient
    const bandHeight = Math.ceil(height / steps);

    for (let i = 0; i < steps; i++) {
      const t = i / (steps - 1);
      // De azul escuro (#0a0a2e) para preto (#0a0a1a)
      const r = Math.floor(10 + t * 0);
      const g = Math.floor(10 + t * 0);
      const b = Math.floor(46 - t * 26);
      const color = (r << 16) | (g << 8) | b;
      graphics.fillStyle(color, 1);
      graphics.fillRect(0, i * bandHeight, width, bandHeight);
    }

    // Adiciona algumas estrelas estáticas
    const starCount = 25;
    for (let i = 0; i < starCount; i++) {
      const sx = Phaser.Math.Between(0, width);
      const sy = Phaser.Math.Between(0, height - 30 * S);
      const brightness = Phaser.Math.Between(150, 255);
      const starColor = (brightness << 16) | (brightness << 8) | brightness;
      graphics.fillStyle(starColor, Phaser.Math.FloatBetween(0.3, 1.0));
      graphics.fillRect(sx, sy, S, S);
    }
  }

  /** Anima o logo descendo com efeito bounce */
  private createLogoAnimation(config: ReturnType<typeof getTitleScreenConfig>): void {
    const { width } = this.scale;
    const { animation } = config;

    let logo: Phaser.GameObjects.Image | Phaser.GameObjects.Text;

    if (this.textures.exists('logo')) {
      logo = this.add.image(width / 2, animation.logoStartY, 'logo');
      logo.setOrigin(0.5);
      // Escala o logo para caber na tela
      const maxLogoWidth = 160 * S;
      const maxLogoHeight = 80 * S;
      const logoFrame = this.textures.getFrame('logo');
      const scaleX = maxLogoWidth / logoFrame.width;
      const scaleY = maxLogoHeight / logoFrame.height;
      const scale = Math.min(scaleX, scaleY);
      logo.setScale(scale);
    } else {
      // Fallback: texto estilizado como logo
      logo = this.add
        .text(width / 2, animation.logoStartY, 'MEGA\nPIXEL', {
          fontFamily: 'monospace',
          fontSize: fontSize(16),
          color: '#00ccff',
          align: 'center',
          stroke: '#003366',
          strokeThickness: 2 * S,
        })
        .setOrigin(0.5);
    }

    // Começa invisível
    logo.setAlpha(0);

    // Animação: fade-in + slide down com bounce
    this.tweens.add({
      targets: logo,
      y: animation.logoEndY,
      alpha: 1,
      duration: animation.logoBounceMs,
      ease: animation.logoEasing,
      onComplete: () => {
        // Logo terminou de animar — habilita input
        this.menuActor.send({ type: 'ENTER_TITLE' });
        this.enableStartInput(config);
      },
    });
  }

  /** Cria partículas de estrelas sutis se uma textura existir */
  private createStarParticles(): void {
    const { width } = this.scale;

    // Cria textura de partícula (1×1 pixel branco)
    if (!this.textures.exists('star_particle')) {
      const particleGraphics = this.make.graphics({ x: 0, y: 0 });
      particleGraphics.fillStyle(0xffffff, 1);
      particleGraphics.fillRect(0, 0, S, S);
      particleGraphics.generateTexture('star_particle', S, S);
      particleGraphics.destroy();
    }

    // Emitter de partículas — estrelas caindo lentamente
    this.add.particles(0, 0, 'star_particle', {
      x: { min: 0, max: width },
      y: -2 * S,
      lifespan: 6000,
      speedY: { min: 3 * S, max: 8 * S },
      scale: { min: 0.5, max: 1.5 },
      alpha: { start: 0.8, end: 0 },
      frequency: 500,
      quantity: 1,
      blendMode: 'ADD',
      emitZone: {
        type: 'random',
        source: new Phaser.Geom.Rectangle(0, 0, width, S),
        quantity: 1,
      },
    });
  }

  /** Mostra menu com opções e habilita input */
  private enableStartInput(config: ReturnType<typeof getTitleScreenConfig>): void {
    const { width, height } = this.scale;

    const menuY = height - 50 * S;
    const menuItems = [
      { label: '▶  INICIAR JOGO', target: 'GameScene' },
      { label: '⚡  SELECIONAR FASE', target: 'MissionSelectScene' },
    ];

    const texts: Phaser.GameObjects.Text[] = [];
    let selectedIndex = 0;

    // Cria textos do menu
    menuItems.forEach((item, i) => {
      const txt = this.add.text(
        width / 2, menuY + i * 14 * S,
        item.label,
        {
          fontFamily: '"Press Start 2P", monospace',
          fontSize: fontSize(5),
          color: i === 0 ? '#00ccff' : '#556677',
          stroke: '#000000',
          strokeThickness: 1 * S,
        }
      ).setOrigin(0.5);

      // Clique/touch direto no item
      txt.setInteractive({ useHandCursor: true });
      txt.on('pointerdown', () => {
        selectedIndex = i;
        updateHighlight();
        this.handleMenuSelect(config, item.target);
      });
      txt.on('pointerover', () => {
        selectedIndex = i;
        updateHighlight();
      });

      texts.push(txt);
    });

    // Atualiza destaque visual
    const updateHighlight = () => {
      texts.forEach((txt, i) => {
        if (i === selectedIndex) {
          txt.setColor('#00ccff');
          txt.setScale(1.05);
        } else {
          txt.setColor('#556677');
          txt.setScale(1);
        }
      });
    };

    // Texto "PRESS START" piscante (acima do menu)
    this.blinkTextRef = createBlinkText({
      scene: this,
      x: width / 2,
      y: menuY - 16 * S,
      text: config.startText,
      style: {
        color: config.textColor,
        fontSize: fontSize(4),
      },
      blinkInterval: config.animation.blinkIntervalMs,
    });

    // ─── Input: Teclado ──────────────────────────────────────
    if (this.input.keyboard) {
      this.input.keyboard.on('keydown-UP', () => {
        selectedIndex = (selectedIndex - 1 + menuItems.length) % menuItems.length;
        updateHighlight();
      });
      this.input.keyboard.on('keydown-DOWN', () => {
        selectedIndex = (selectedIndex + 1) % menuItems.length;
        updateHighlight();
      });
      this.input.keyboard.on('keydown-ENTER', () => {
        this.handleMenuSelect(config, menuItems[selectedIndex].target);
      });
      this.input.keyboard.on('keydown-SPACE', () => {
        this.handleMenuSelect(config, menuItems[selectedIndex].target);
      });
    }
  }

  /** Processa a seleção do menu — fade-out e transição */
  private handleMenuSelect(
    config: ReturnType<typeof getTitleScreenConfig>,
    targetScene: string
  ): void {
    if (this.isTransitioning) return;
    this.isTransitioning = true;

    this.menuActor.send({ type: 'START_PRESSED' });
    this.blinkTextRef?.stopBlinking();

    // Flash branco rápido
    this.cameras.main.flash(150, 255, 255, 255);

    // Fade-out
    this.cameras.main.fadeOut(config.animation.fadeOutMs, 0, 0, 0);

    this.cameras.main.once(
      Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE,
      () => {
        this.menuActor.send({ type: 'TRANSITION_DONE' });
        this.menuActor.stop();
        this.scene.start(targetScene);
      }
    );
  }

  /** Texto de versão no canto inferior-direito */
  private createVersionText(config: ReturnType<typeof getTitleScreenConfig>): void {
    const { width, height } = this.scale;

    this.add
      .text(width - 4 * S, height - 4 * S, config.versionText, {
        fontFamily: 'monospace',
        fontSize: fontSize(4),
        color: config.versionColor,
      })
      .setOrigin(1, 1);
  }

  /** Limpa recursos ao sair da cena */
  shutdown(): void {
    this.blinkTextRef?.destroy();
    this.blinkTextRef = null;
    this.menuActor?.stop();
  }
}
