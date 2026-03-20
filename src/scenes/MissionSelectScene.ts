/**
 * MissionSelectScene.ts — Tela de Seleção de Missões
 *
 * Grid 2×2 com 4 missões estilo MegaMan X boss select.
 * Navegar com setas, selecionar com Enter.
 *
 * 🎮 Estilo MegaMan X — Stage Select!
 */
import Phaser from 'phaser';

interface MissionData {
  name: string;
  subtitle: string;
  color: number;
  icon: string;
  levelId: string;
}

const MISSIONS: MissionData[] = [
  { name: 'Vulcan Factory', subtitle: 'Fire Zone', color: 0xcc3333, icon: '🔥', levelId: 'vulcan' },
  { name: 'Frost Cavern', subtitle: 'Ice Zone', color: 0x3366cc, icon: '❄️', levelId: 'frost' },
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

    // ─── Background ───────────────────────────────────────────
    const bg = this.add.graphics();
    bg.fillStyle(0x0a0a1a, 1);
    bg.fillRect(0, 0, width, height);

    // Grid pattern
    bg.lineStyle(1, 0x111133, 0.3);
    for (let x = 0; x < width; x += 16) {
      bg.lineBetween(x, 0, x, height);
    }
    for (let y = 0; y < height; y += 16) {
      bg.lineBetween(0, y, width, y);
    }

    // ─── Título ───────────────────────────────────────────────
    this.add
      .text(width / 2, 16, 'SELECT MISSION', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '8px',
        color: '#00ccff',
        stroke: '#001133',
        strokeThickness: 2,
      })
      .setOrigin(0.5);

    // ─── Grid 2×2 ─────────────────────────────────────────────
    const cardW = 120;
    const cardH = 50;
    const gapX = 16;
    const gapY = 12;
    const gridX = (width - cardW * 2 - gapX) / 2;
    const gridY = 36;

    for (let i = 0; i < MISSIONS.length; i++) {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const cx = gridX + col * (cardW + gapX) + cardW / 2;
      const cy = gridY + row * (cardH + gapY) + cardH / 2;
      const card = this.createMissionCard(cx, cy, cardW, cardH, MISSIONS[i]);
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
      .text(width / 2, height - 14, '← → ↑ ↓  NAVIGATE    ENTER  SELECT', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '3px',
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
    });
  }

  /** Cria um card de missão */
  private createMissionCard(
    cx: number,
    cy: number,
    w: number,
    h: number,
    mission: MissionData
  ): Phaser.GameObjects.Container {
    const container = this.add.container(cx, cy).setDepth(400);

    // Background do card
    const cardBg = this.add.graphics();
    cardBg.fillStyle(0x111122, 0.9);
    cardBg.fillRoundedRect(-w / 2, -h / 2, w, h, 3);
    // Barra de cor no topo
    cardBg.fillStyle(mission.color, 0.8);
    cardBg.fillRect(-w / 2, -h / 2, w, 4);
    // Borda
    cardBg.lineStyle(1, mission.color, 0.5);
    cardBg.strokeRoundedRect(-w / 2, -h / 2, w, h, 3);
    container.add(cardBg);

    // Ícone
    const icon = this.add
      .text(-w / 2 + 10, -6, mission.icon, { fontSize: '12px' })
      .setOrigin(0, 0.5);
    container.add(icon);

    // Nome da missão
    const nameText = this.add
      .text(6, -10, mission.name, {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '5px',
        color: '#ffffff',
      })
      .setOrigin(0, 0.5);
    container.add(nameText);

    // Subtítulo
    const subText = this.add
      .text(6, 4, mission.subtitle, {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '3px',
        color: '#88aacc',
      })
      .setOrigin(0, 0.5);
    container.add(subText);

    // Status
    const status = this.add
      .text(w / 2 - 8, h / 2 - 8, 'READY', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '3px',
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

    const w = 124;
    const h = 54;
    this.selectorGlow.lineStyle(2, 0x00ffcc, 1);
    this.selectorGlow.strokeRoundedRect(
      card.x - w / 2,
      card.y - h / 2,
      w,
      h,
      4
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
    flash.fillRoundedRect(card.x - 62, card.y - 27, 124, 54, 4);

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
  }
}
