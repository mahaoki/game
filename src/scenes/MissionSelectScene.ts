/**
 * MissionSelectScene.ts — Tela de Seleção de Missões
 *
 * Grid 2×2 com 4 missões estilo MegaMan X boss select.
 * Navegar com setas, selecionar com Enter.
 *
 * 🎮 Estilo MegaMan X — Stage Select!
 */
import Phaser from 'phaser';
import { S, fontSize } from '../config/scaleConstants';

interface MissionData {
  name: string;
  subtitle: string;
  color: number;
  icon: string;
  levelId: string;
}

const MISSIONS: MissionData[] = [
  { name: 'Vulcan Factory', subtitle: 'Fire Zone', color: 0xcc3333, icon: '🔥', levelId: 'vulcan' },
  { name: 'Aqua Depths', subtitle: 'Water Zone', color: 0x0088cc, icon: '🌊', levelId: 'aqua' },
  { name: 'Storm Tower', subtitle: 'Electric Zone', color: 0xccaa33, icon: '⚡', levelId: 'storm' },
  { name: 'Shadow Base', subtitle: 'Dark Zone', color: 0x8833aa, icon: '🌑', levelId: 'shadow' },
];

export class MissionSelectScene extends Phaser.Scene {
  private selectedIndex: number = 0;
  private missionCards: Phaser.GameObjects.Container[] = [];
  private selectorGlow!: Phaser.GameObjects.Graphics;
  private inputEnabled: boolean = false;

  constructor() {
    super({ key: 'MissionSelectScene' });
  }

  create(): void {
    const { width, height } = this.scale;
    this.selectedIndex = 0;
    this.missionCards = [];

    // Fade-in ao entrar (corrige tela preta vinda de outra cena com fadeOut)
    this.cameras.main.fadeIn(500, 0, 0, 0);

    // ─── Background ───────────────────────────────────────────
    const bg = this.add.graphics();
    bg.fillStyle(0x0a0a1a, 1);
    bg.fillRect(0, 0, width, height);

    // Grid pattern
    bg.lineStyle(1, 0x111133, 0.3);
    for (let x = 0; x < width; x += 16 * S) {
      bg.lineBetween(x, 0, x, height);
    }
    for (let y = 0; y < height; y += 16 * S) {
      bg.lineBetween(0, y, width, y);
    }

    // ─── Título ───────────────────────────────────────────────
    this.add
      .text(width / 2, 16 * S, 'SELECT MISSION', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: fontSize(8),
        color: '#00ccff',
        stroke: '#001133',
        strokeThickness: 2 * S,
      })
      .setOrigin(0.5);

    // ─── Grid 2×2 ─────────────────────────────────────────────
    const cardW = 120 * S;
    const cardH = 50 * S;
    const gapX = 16 * S;
    const gapY = 12 * S;
    const gridX = (width - cardW * 2 - gapX) / 2;
    const gridY = 36 * S;

    for (let i = 0; i < MISSIONS.length; i++) {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const cx = gridX + col * (cardW + gapX) + cardW / 2;
      const cy = gridY + row * (cardH + gapY) + cardH / 2;
      const card = this.createMissionCard(cx, cy, cardW, cardH, MISSIONS[i], i);
      this.missionCards.push(card);
    }

    // ─── Selector glow ────────────────────────────────────────
    this.selectorGlow = this.add.graphics().setDepth(500);
    this.updateSelector();

    // Glow animation
    this.tweens.add({
      targets: this.selectorGlow,
      alpha: { from: 0.6, to: 1 },
      duration: 500,
      yoyo: true,
      repeat: -1,
    });

    // ─── Instrução ────────────────────────────────────────────
    this.add
      .text(width / 2, height - 14 * S, '← → ↑ ↓  NAVIGATE    ENTER  SELECT', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: fontSize(3),
        color: '#556688',
      })
      .setOrigin(0.5);

    // ─── Input ────────────────────────────────────────────────
    this.cameras.main.fadeIn(500, 0, 0, 0);

    this.time.delayedCall(600, () => {
      this.inputEnabled = true;
      this.input.keyboard!.on('keydown-LEFT', this.moveLeft, this);
      this.input.keyboard!.on('keydown-RIGHT', this.moveRight, this);
      this.input.keyboard!.on('keydown-UP', this.moveUp, this);
      this.input.keyboard!.on('keydown-DOWN', this.moveDown, this);
      this.input.keyboard!.on('keydown-ENTER', this.selectMission, this);
      this.input.keyboard!.on('keydown-SPACE', this.selectMission, this);
    });
  }

  /** Cria um card de missão */
  private createMissionCard(
    cx: number,
    cy: number,
    w: number,
    h: number,
    mission: MissionData,
    index: number
  ): Phaser.GameObjects.Container {
    const container = this.add.container(cx, cy).setDepth(400);

    // Hitzone interativa (invisível, cobre o card inteiro)
    const hitZone = this.add.rectangle(0, 0, w, h, 0x000000, 0);
    hitZone.setInteractive({ useHandCursor: true });
    hitZone.on('pointerdown', () => {
      if (!this.inputEnabled) return;
      this.selectedIndex = index;
      this.updateSelector();
      this.selectMission();
    });
    hitZone.on('pointerover', () => {
      if (!this.inputEnabled) return;
      this.selectedIndex = index;
      this.updateSelector();
    });
    container.add(hitZone);

    // Background do card
    const cardBg = this.add.graphics();
    cardBg.fillStyle(0x111122, 0.9);
    cardBg.fillRoundedRect(-w / 2, -h / 2, w, h, 3 * S);
    // Barra de cor no topo
    cardBg.fillStyle(mission.color, 0.8);
    cardBg.fillRect(-w / 2, -h / 2, w, 4 * S);
    // Borda
    cardBg.lineStyle(1, mission.color, 0.5);
    cardBg.strokeRoundedRect(-w / 2, -h / 2, w, h, 3 * S);
    container.add(cardBg);

    // Ícone
    const icon = this.add
      .text(-w / 2 + 10 * S, -6 * S, mission.icon, { fontSize: fontSize(12) })
      .setOrigin(0, 0.5);
    container.add(icon);

    // Nome da missão
    const nameText = this.add
      .text(6 * S, -10 * S, mission.name, {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: fontSize(5),
        color: '#ffffff',
      })
      .setOrigin(0, 0.5);
    container.add(nameText);

    // Subtítulo
    const subText = this.add
      .text(6 * S, 4 * S, mission.subtitle, {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: fontSize(3),
        color: '#88aacc',
      })
      .setOrigin(0, 0.5);
    container.add(subText);

    // Status
    const status = this.add
      .text(w / 2 - 8 * S, h / 2 - 8 * S, 'READY', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: fontSize(3),
        color: '#00ff66',
      })
      .setOrigin(1, 1);
    container.add(status);

    return container;
  }

  /** Atualiza a posição do selector */
  private updateSelector(): void {
    this.selectorGlow.clear();
    const card = this.missionCards[this.selectedIndex];
    if (!card) return;

    const w = 124 * S;
    const h = 54 * S;
    this.selectorGlow.lineStyle(2 * S, 0x00ffcc, 1);
    this.selectorGlow.strokeRoundedRect(
      card.x - w / 2,
      card.y - h / 2,
      w,
      h,
      4 * S
    );
  }

  private moveLeft = (): void => {
    if (!this.inputEnabled) return;
    if (this.selectedIndex % 2 !== 0) {
      this.selectedIndex--;
      this.updateSelector();
    }
  };

  private moveRight = (): void => {
    if (!this.inputEnabled) return;
    if (this.selectedIndex % 2 === 0 && this.selectedIndex < MISSIONS.length - 1) {
      this.selectedIndex++;
      this.updateSelector();
    }
  };

  private moveUp = (): void => {
    if (!this.inputEnabled) return;
    if (this.selectedIndex >= 2) {
      this.selectedIndex -= 2;
      this.updateSelector();
    }
  };

  private moveDown = (): void => {
    if (!this.inputEnabled) return;
    if (this.selectedIndex < MISSIONS.length - 2) {
      this.selectedIndex += 2;
      this.updateSelector();
    }
  };

  private selectMission = (): void => {
    if (!this.inputEnabled) return;
    this.inputEnabled = false;

    // Flash no card selecionado
    const card = this.missionCards[this.selectedIndex];
    const mission = MISSIONS[this.selectedIndex];

    // Flash de seleção
    const flash = this.add.graphics().setDepth(600);
    flash.fillStyle(mission.color, 0.4);
    flash.fillRoundedRect(card.x - 62 * S, card.y - 27 * S, 124 * S, 54 * S, 4 * S);

    this.tweens.add({
      targets: flash,
      alpha: { from: 1, to: 0 },
      duration: 200,
      repeat: 3,
      onComplete: () => {
        this.cameras.main.fadeOut(500, 0, 0, 0);
        this.time.delayedCall(600, () => {
          this.scene.start('GameScene', { levelId: mission.levelId });
        });
      },
    });
  };

  shutdown(): void {
    this.input.keyboard!.off('keydown-LEFT', this.moveLeft, this);
    this.input.keyboard!.off('keydown-RIGHT', this.moveRight, this);
    this.input.keyboard!.off('keydown-UP', this.moveUp, this);
    this.input.keyboard!.off('keydown-DOWN', this.moveDown, this);
    this.input.keyboard!.off('keydown-ENTER', this.selectMission, this);
    this.input.keyboard!.off('keydown-SPACE', this.selectMission, this);
  }
}
