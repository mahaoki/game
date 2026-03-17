/**
 * GameScene.ts — Cena Principal do Jogo
 *
 * Side-scroller estilo MegaMan X com:
 *   - Player controlável (andar, pular, dash, tiro)
 *   - Plataformas com colisão
 *   - Câmera que segue o Player
 *   - HUD (barra de vida)
 *   - Parallax background
 *
 * 🎮 A gameplay acontece aqui!
 */
import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { InputManager } from '../core/InputManager';
import { HealthBar } from '../ui/components/HealthBar';
import { getLevel1Config, type LevelConfig } from '../specs/levelConfig';

export class GameScene extends Phaser.Scene {
  private player!: Player;
  private inputManager!: InputManager;
  private healthBar!: HealthBar;
  private platforms!: Phaser.Physics.Arcade.StaticGroup;
  private bulletGroup!: Phaser.Physics.Arcade.Group;
  private levelConfig!: LevelConfig;

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    // Carrega config do nível
    this.levelConfig = getLevel1Config();

    // Fade-in ao entrar
    this.cameras.main.fadeIn(500, 0, 0, 0);

    // ─── Mundo ────────────────────────────────────────────────
    this.physics.world.setBounds(0, 0, this.levelConfig.worldWidth, this.levelConfig.worldHeight);

    // ─── Background (parallax) ────────────────────────────────
    this.createBackground();

    // ─── Plataformas ──────────────────────────────────────────
    this.createPlatforms();

    // ─── Bullet pool & texture ─────────────────────────────────
    this.createBulletPool();
    this.createBulletTexture();

    this.player = new Player(
      this,
      this.levelConfig.spawnPoint.x,
      this.levelConfig.spawnPoint.y,
      this.bulletGroup
    );

    // Colisão Player ↔ Plataformas
    this.physics.add.collider(this.player, this.platforms);

    // ─── Input ────────────────────────────────────────────────
    this.inputManager = new InputManager(this);

    // ─── Câmera ───────────────────────────────────────────────
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setBounds(0, 0, this.levelConfig.worldWidth, this.levelConfig.worldHeight);
    this.cameras.main.setDeadzone(40, 20);

    // ─── HUD ──────────────────────────────────────────────────
    this.healthBar = new HealthBar({
      scene: this,
      maxHealth: this.player.getMaxHealth(),
    });

    // ─── Stage info ───────────────────────────────────────────
    this.createStageInfo();
  }

  /** Loop principal — chamado a cada frame (~60fps) */
  update(): void {
    // Lê input e atualiza Player
    const input = this.inputManager.getInput();
    this.player.handleInput(input);

    // Atualiza HUD
    this.healthBar.update(this.player.getHealth());

    // Verifica se Player caiu no buraco
    if (this.player.y > this.levelConfig.worldHeight + 20) {
      this.handlePlayerDeath();
    }
  }

  /** Cria o fundo com parallax */
  private createBackground(): void {
    const { worldWidth, worldHeight } = this.levelConfig;

    // Camada 1: fundo escuro estático
    const bg = this.add.graphics();
    const steps = 18;
    const bandHeight = Math.ceil(worldHeight / steps);

    for (let i = 0; i < steps; i++) {
      const t = i / (steps - 1);
      const r = Math.floor(10);
      const g = Math.floor(22 - t * 10);
      const b = Math.floor(40 - t * 15);
      const color = (r << 16) | (g << 8) | b;
      bg.fillStyle(color, 1);
      bg.fillRect(0, i * bandHeight, worldWidth, bandHeight);
    }
    bg.setScrollFactor(0.1); // Parallax lento

    // Camada 2: estrelas
    const stars = this.add.graphics();
    for (let i = 0; i < 40; i++) {
      const sx = Phaser.Math.Between(0, worldWidth);
      const sy = Phaser.Math.Between(0, worldHeight - 40);
      const brightness = Phaser.Math.Between(100, 255);
      const starColor = (brightness << 16) | (brightness << 8) | brightness;
      stars.fillStyle(starColor, Phaser.Math.FloatBetween(0.2, 0.8));
      stars.fillRect(sx, sy, 1, 1);
    }
    stars.setScrollFactor(0.2); // Parallax médio

    // Camada 3: prédios no fundo (silhuetas)
    const buildings = this.add.graphics();
    buildings.fillStyle(0x0a1220, 1);

    // Silhuetas de prédios aleatórios
    for (let bx = 0; bx < worldWidth; bx += Phaser.Math.Between(20, 40)) {
      const bw = Phaser.Math.Between(15, 30);
      const bh = Phaser.Math.Between(20, 60);
      buildings.fillRect(bx, worldHeight - bh, bw, bh);

      // Janelas
      buildings.fillStyle(0x223344, 0.3);
      for (let wy = worldHeight - bh + 4; wy < worldHeight - 4; wy += 6) {
        for (let wx = bx + 3; wx < bx + bw - 3; wx += 5) {
          buildings.fillRect(wx, wy, 2, 2);
        }
      }
      buildings.fillStyle(0x0a1220, 1);
    }
    buildings.setScrollFactor(0.4); // Parallax rápido
  }

  /** Cria as plataformas do nível */
  private createPlatforms(): void {
    this.platforms = this.physics.add.staticGroup();

    for (const platConfig of this.levelConfig.platforms) {
      // Caixa visual (retângulo colorido)
      const plat = this.add.rectangle(
        platConfig.x,
        platConfig.y,
        platConfig.width,
        platConfig.height,
        platConfig.height > 12 ? 0x334466 : 0x3a5577 // Cor diferente para chão vs plataforma
      );
      plat.setStrokeStyle(1, 0x556688);

      // Corpo físico estático
      this.physics.add.existing(plat, true);
      this.platforms.add(plat);

      // Detalhes visuais no topo da plataforma
      const topLine = this.add.rectangle(
        platConfig.x,
        platConfig.y - platConfig.height / 2,
        platConfig.width,
        1,
        0x5588aa
      );
      void topLine; // Visual only
    }
  }

  /** Cria o pool de balas */
  private createBulletPool(): void {
    this.bulletGroup = this.physics.add.group({
      maxSize: 10,
      allowGravity: false,
      collideWorldBounds: false,
    });
  }

  /** Cria textura procedural para as balas */
  private createBulletTexture(): void {
    if (this.textures.exists('bullet_sprite')) return;

    const g = this.make.graphics({ x: 0, y: 0 });

    // Projétil de energia (cyan com core branco)
    g.fillStyle(0x00aaff, 1);
    g.fillCircle(4, 4, 3);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(4, 4, 1);

    g.generateTexture('bullet_sprite', 8, 8);
    g.destroy();
  }

  /** Info do stage no início */
  private createStageInfo(): void {
    const { width, height } = this.scale;
    const stageText = this.add
      .text(width / 2, height / 2 - 20, this.levelConfig.name, {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '8px',
        color: '#00ccff',
        stroke: '#001133',
        strokeThickness: 2,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(800)
      .setAlpha(0);

    // Animação: aparece e desaparece
    this.tweens.add({
      targets: stageText,
      alpha: 1,
      duration: 500,
      hold: 1500,
      yoyo: true,
      onComplete: () => stageText.destroy(),
    });
  }

  /** Player morreu (caiu no buraco) */
  private handlePlayerDeath(): void {
    // Respawn no ponto inicial
    this.player.setPosition(
      this.levelConfig.spawnPoint.x,
      this.levelConfig.spawnPoint.y
    );
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(0, 0);
    this.player.takeDamage(2);

    // Flash da câmera
    this.cameras.main.flash(200, 255, 0, 0);
  }

  /** Limpa ao sair */
  shutdown(): void {
    this.healthBar?.destroy();
  }
}
