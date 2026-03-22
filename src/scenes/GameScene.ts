/**
 * GameScene.ts — Cena Principal do Jogo
 *
 * Side-scroller estilo MegaMan X com:
 *   - Player controlável (andar, pular, dash, tiro)
 *   - Inimigos (Patrol + Turret) com IA
 *   - Plataformas com colisão
 *   - Câmera que segue o Player
 *   - HUD (barra de vida + vidas)
 *   - Parallax background
 *   - Sistema de dano e vidas
 *
 * 🎮 A gameplay acontece aqui!
 */
import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { Enemy } from '../entities/Enemy';
import { InputManager } from '../core/InputManager';
import { HealthBar } from '../ui/components/HealthBar';
import { getLevel1Config, getVulcanFactoryConfig, getAquaDepthsConfig, type LevelConfigWithEnemies } from '../specs/levelConfig';
import { Boss } from '../entities/Boss';
import { WaterBoss } from '../entities/WaterBoss';
import { S, fontSize } from '../config/scaleConstants';

export class GameScene extends Phaser.Scene {
  private player!: Player;
  private inputManager!: InputManager;
  private healthBar!: HealthBar;
  private platforms!: Phaser.Physics.Arcade.StaticGroup;
  private bulletGroup!: Phaser.Physics.Arcade.Group;
  private enemyGroup!: Phaser.Physics.Arcade.Group;
  private enemyBulletGroup!: Phaser.Physics.Arcade.Group;
  private enemies: Enemy[] = [];
  private boss: Boss | WaterBoss | null = null;
  private levelConfig!: LevelConfigWithEnemies;
  private livesText!: Phaser.GameObjects.Text;
  private isRespawning: boolean = false;
  private bossTriggered: boolean = false;
  private isStageClearTriggered: boolean = false;
  private levelId: string = 'intro';

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    // Carrega config do nível baseado em levelId
    const data = this.scene.settings.data as { levelId?: string } | undefined;
    const levelId = data?.levelId ?? 'intro';
    this.levelId = levelId;
    this.levelConfig = this.getLevelConfig(levelId);
    this.enemies = [];
    this.boss = null;
    this.bossTriggered = false;
    this.isStageClearTriggered = false;

    // Fade-in ao entrar
    this.cameras.main.fadeIn(500, 0, 0, 0);

    // ─── Mundo ────────────────────────────────────────────────
    // checkDown = false → permite o player cair pelo fundo (pit death)
    this.physics.world.setBounds(
      0, 0,
      this.levelConfig.worldWidth, this.levelConfig.worldHeight,
      true,  // checkLeft
      true,  // checkRight
      true,  // checkTop
      false  // checkDown → permite cair no buraco
    );

    // ─── Background (parallax) ────────────────────────────────
    this.createBackground();

    // ─── Plataformas ──────────────────────────────────────────
    this.createPlatforms();

    // ─── Bullet pools ─────────────────────────────────────────
    this.createBulletPool();
    this.createEnemyBulletPool();

    // ─── Player ───────────────────────────────────────────────
    this.player = new Player(
      this,
      this.levelConfig.spawnPoint.x,
      this.levelConfig.spawnPoint.y,
      this.bulletGroup
    );

    // ─── Inimigos ─────────────────────────────────────────────
    this.createEnemies();

    // ─── Colisões ─────────────────────────────────────────────
    this.setupCollisions();

    // ─── Input ────────────────────────────────────────────────
    this.inputManager = new InputManager(this);

    // ─── Câmera ───────────────────────────────────────────────
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setBounds(0, 0, this.levelConfig.worldWidth, this.levelConfig.worldHeight);
    this.cameras.main.setDeadzone(40 * S, 20 * S);

    // ─── HUD ──────────────────────────────────────────────────
    this.healthBar = new HealthBar({
      scene: this,
      maxHealth: this.player.getMaxHealth(),
    });

    // ─── Vidas HUD ────────────────────────────────────────────
    this.livesText = this.add
      .text(8 * S, 90 * S, '', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: fontSize(5),
        color: '#00ccff',
      })
      .setScrollFactor(0)
      .setDepth(900);
    this.updateLivesDisplay();

    // ─── Listener de morte ────────────────────────────────────
    this.events.on('player-died', this.onPlayerDied, this);

    // ─── Stage info ───────────────────────────────────────────
    this.createStageInfo();

    // ─── Portal de fim de stage ───────────────────────────────
    this.createGoalPortal();

    this.isRespawning = false;
  }

  /** Loop principal — chamado a cada frame (~60fps) */
  update(): void {
    if (this.isRespawning) return;

    // Lê input e atualiza Player
    const input = this.inputManager.getInput();
    this.player.handleInput(input);

    // Atualiza HUD
    this.healthBar.update(this.player.getHealth());

    // Atualiza IA dos inimigos
    for (const enemy of this.enemies) {
      if (enemy.active) {
        enemy.updateEnemy();
      }
    }

    // Atualiza boss
    if (this.boss?.active) {
      this.boss.updateBoss();
    }

    // Verifica se Player caiu no buraco
    if (this.player.y > this.levelConfig.worldHeight + 20 * S) {
      this.handlePitDeath();
    }

    // Verifica se Player chegou ao portal de fim de stage
    if (!this.isStageClearTriggered && this.levelConfig.goalX && this.player.x >= this.levelConfig.goalX - 20 * S) {
      this.handleStageClear();
    }

    // Verifica se Player entrou na zona do boss
    if (this.levelConfig.bossZoneX && !this.bossTriggered && this.player.x >= this.levelConfig.bossZoneX - 40 * S) {
      this.triggerBossFight();
    }
  }

  /** Retorna config do level pelo ID */
  private getLevelConfig(levelId: string): LevelConfigWithEnemies {
    switch (levelId) {
      case 'vulcan': return getVulcanFactoryConfig();
      case 'aqua': return getAquaDepthsConfig();
      default: return getLevel1Config();
    }
  }

  /** Inicia a boss fight */
  private triggerBossFight(): void {
    this.bossTriggered = true;

    // Trava a câmera na arena
    const bossX = this.levelConfig.bossZoneX!;
    const { width } = this.scale;
    this.cameras.main.stopFollow();
    this.cameras.main.pan(bossX - width / 4, this.levelConfig.worldHeight / 2, 500);

    // Spawn do boss
    this.time.delayedCall(800, () => {
      if (this.levelId === 'aqua') {
        this.boss = new WaterBoss(
          this,
          bossX + 60 * S,
          130 * S,
          this.player,
          this.enemyBulletGroup,
          bossX - 80 * S,
          bossX + 120 * S
        );
      } else {
        this.boss = new Boss(
          this,
          bossX + 60 * S,
          130 * S,
          this.player,
          this.enemyBulletGroup,
          bossX - 80 * S,
          bossX + 120 * S
        );
      }

      // Colisão boss vs plataformas
      this.physics.add.collider(this.boss, this.platforms);

      // Player bala vs boss
      this.physics.add.overlap(this.bulletGroup, this.boss, (_bossObj, bulletObj) => {
        const bullet = bulletObj as Phaser.Physics.Arcade.Sprite;
        if (!bullet.active) return;
        bullet.setActive(false);
        bullet.setVisible(false);
        (bullet.body as Phaser.Physics.Arcade.Body).setVelocity(0);
        this.boss?.takeDamage(1);
      });

      // Boss contato vs player
      this.physics.add.overlap(this.player, this.boss, () => {
        this.player.takeDamage(3);
      });

      // Boss projectile vs player (usa enemyBulletGroup existente)

      // Quando boss morre → spawna power-up → stage clear
      this.events.once('boss-defeated', (dropX: number, dropY: number) => {
        this.boss = null; // Limpar referência ao boss destruído
        // Spawna power-up baseado no nível
        const isAqua = this.levelId === 'aqua';
        const powerupKey = isAqua ? 'powerup_water' : 'powerup_fire';
        const powerup = this.physics.add.sprite(dropX, dropY - 20 * S, powerupKey);
        powerup.setDisplaySize(16 * S, 16 * S);
        powerup.setBounce(0.4);
        (powerup.body as Phaser.Physics.Arcade.Body).setAllowGravity(true);

        // Glow pulsante
        this.tweens.add({
          targets: powerup,
          alpha: { from: 0.6, to: 1 },
          scaleX: { from: 0.8, to: 1.2 },
          scaleY: { from: 0.8, to: 1.2 },
          duration: 400,
          yoyo: true,
          repeat: -1,
        });

        // Colisão com plataformas
        this.physics.add.collider(powerup, this.platforms);

        // Pickup pelo player
        this.physics.add.overlap(this.player, powerup, () => {
          if (!powerup.active) return;
          powerup.setActive(false);
          powerup.setVisible(false);
          powerup.destroy();

          // Ativa power no player
          if (isAqua) {
            this.player.activateWaterPower();
          } else {
            this.player.activateFirePower();
          }

          // Texto de obtenção
          const powerLabel = isAqua ? '🌊 WATER POWER!' : '🔥 FIRE POWER!';
          const powerColor = isAqua ? '#00aaff' : '#ff6600';
          const text = this.add.text(
            this.player.x, this.player.y - 24 * S,
            powerLabel,
            {
              fontFamily: '"Press Start 2P", monospace',
              fontSize: fontSize(5),
              color: powerColor,
              stroke: '#000000',
              strokeThickness: 1 * S,
            }
          ).setOrigin(0.5);

          this.tweens.add({
            targets: text,
            y: text.y - 20 * S,
            alpha: 0,
            duration: 1500,
            onComplete: () => text.destroy(),
          });

          // Stage clear após pegar
          this.time.delayedCall(2000, () => {
            this.handleStageClear();
          });
        });
      });
    });
  }

  /** Player chegou ao portal — stage clear! */
  private handleStageClear(): void {
    if (this.isRespawning || this.isStageClearTriggered) return;
    this.isRespawning = true;
    this.isStageClearTriggered = true;

    // Flash branco + fade
    this.cameras.main.flash(500, 255, 255, 255);
    this.player.setTint(0xffffff);
    (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0);

    this.time.delayedCall(1000, () => {
      this.cameras.main.fadeOut(500, 255, 255, 255);
      this.time.delayedCall(600, () => {
        const data = this.scene.settings.data as { levelId?: string } | undefined;
        const levelId = data?.levelId ?? 'intro';
        this.scene.start('StageClearScene', { completedLevel: levelId });
      });
    });
  }

  /** Player caiu no buraco — perde 1 vida */
  private handlePitDeath(): void {
    if (this.isRespawning) return;
    this.isRespawning = true;
    this.player.pitDeath();
  }

  /** Callback quando o player morre */
  private onPlayerDied(remainingLives: number): void {
    this.updateLivesDisplay();

    if (remainingLives <= 0) {
      this.cameras.main.fadeOut(1000, 0, 0, 0);
      this.time.delayedCall(1200, () => {
        this.scene.start('GameOverScene');
      });
      return;
    }

    // Respawn com fade
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.time.delayedCall(500, () => {
      const respawned = this.player.respawn(
        this.levelConfig.spawnPoint.x,
        this.levelConfig.spawnPoint.y
      );

      if (respawned) {
        this.cameras.main.fadeIn(300, 0, 0, 0);
        this.isRespawning = false;
        this.updateLivesDisplay();
      }
    });
  }

  /** Atualiza o display de vidas no HUD */
  private updateLivesDisplay(): void {
    const lives = this.player.getLives();
    this.livesText.setText(`♥ × ${lives}`);
  }

  // ═══════════════════════════════════════════════════════════════
  // Criação de elementos
  // ═══════════════════════════════════════════════════════════════

  /** Cria o fundo com parallax */
  private createBackground(): void {
    if (this.levelId === 'vulcan') {
      this.createVulcanBackground();
      return;
    }
    if (this.levelId === 'aqua') {
      this.createAquaBackground();
      return;
    }
    this.createCityBackground();
  }

  /** Background padrão: cidade noturna */
  private createCityBackground(): void {
    const { worldWidth, worldHeight } = this.levelConfig;

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
    bg.setScrollFactor(0.1);

    const stars = this.add.graphics();
    for (let i = 0; i < 40; i++) {
      const sx = Phaser.Math.Between(0, worldWidth);
      const sy = Phaser.Math.Between(0, worldHeight - 40);
      const brightness = Phaser.Math.Between(100, 255);
      const starColor = (brightness << 16) | (brightness << 8) | brightness;
      stars.fillStyle(starColor, Phaser.Math.FloatBetween(0.2, 0.8));
      stars.fillRect(sx, sy, S, S);
    }
    stars.setScrollFactor(0.2);

    const buildings = this.add.graphics();
    buildings.fillStyle(0x0a1220, 1);
    for (let bx = 0; bx < worldWidth; bx += Phaser.Math.Between(20 * S, 40 * S)) {
      const bw = Phaser.Math.Between(15 * S, 30 * S);
      const bh = Phaser.Math.Between(20 * S, 60 * S);
      buildings.fillRect(bx, worldHeight - bh, bw, bh);
      buildings.fillStyle(0x223344, 0.3);
      for (let wy = worldHeight - bh + 4 * S; wy < worldHeight - 4 * S; wy += 6 * S) {
        for (let wx = bx + 3 * S; wx < bx + bw - 3 * S; wx += 5 * S) {
          buildings.fillRect(wx, wy, 2 * S, 2 * S);
        }
      }
      buildings.fillStyle(0x0a1220, 1);
    }
    buildings.setScrollFactor(0.4);
  }

  /** Background vulcânico: céu vermelho, lava, chaminés industriais */
  private createVulcanBackground(): void {
    const { worldWidth, worldHeight } = this.levelConfig;

    // ─── Céu vulcânico (gradiente vermelho-escuro → preto) ────
    const sky = this.add.graphics();
    const steps = 20;
    const bandH = Math.ceil(worldHeight / steps);
    for (let i = 0; i < steps; i++) {
      const t = i / (steps - 1);
      const r = Math.floor(30 + t * 15);
      const g = Math.floor(5 + t * 3);
      const b = Math.floor(2);
      sky.fillStyle((r << 16) | (g << 8) | b, 1);
      sky.fillRect(0, i * bandH, worldWidth, bandH);
    }
    sky.setScrollFactor(0.05);

    // ─── Cinzas/partículas flutuando ──────────────────────────
    const ash = this.add.graphics();
    for (let i = 0; i < 50; i++) {
      const ax = Phaser.Math.Between(0, worldWidth);
      const ay = Phaser.Math.Between(0, worldHeight - 30 * S);
      const ashColor = Phaser.Math.Between(0, 1) === 0 ? 0xff4400 : 0x663322;
      ash.fillStyle(ashColor, Phaser.Math.FloatBetween(0.1, 0.4));
      ash.fillRect(ax, ay, S, S);
    }
    ash.setScrollFactor(0.15);

    // ─── Montanhas vulcânicas (silhueta) ──────────────────────
    const mountains = this.add.graphics();
    mountains.fillStyle(0x1a0808, 1);
    for (let mx = 0; mx < worldWidth; mx += Phaser.Math.Between(60 * S, 120 * S)) {
      const mw = Phaser.Math.Between(80 * S, 160 * S);
      const mh = Phaser.Math.Between(40 * S, 80 * S);
      // Triangulo simplificado
      mountains.fillTriangle(
        mx, worldHeight,
        mx + mw / 2, worldHeight - mh,
        mx + mw, worldHeight
      );
    }
    mountains.setScrollFactor(0.2);

    // ─── Chaminés industriais (background) ────────────────────
    const factory = this.add.graphics();
    for (let cx = 40 * S; cx < worldWidth; cx += Phaser.Math.Between(100 * S, 200 * S)) {
      const cw = Phaser.Math.Between(8 * S, 14 * S);
      const ch = Phaser.Math.Between(50 * S, 90 * S);
      // Chaminé
      factory.fillStyle(0x221111, 1);
      factory.fillRect(cx, worldHeight - ch, cw, ch);
      // Anéis metálicos
      factory.fillStyle(0x443322, 0.6);
      factory.fillRect(cx - S, worldHeight - ch, cw + 2 * S, 2 * S);
      factory.fillRect(cx - S, worldHeight - ch + ch * 0.3, cw + 2 * S, 2 * S);
      factory.fillRect(cx - S, worldHeight - ch + ch * 0.6, cw + 2 * S, 2 * S);
      // Topo com fogo
      factory.fillStyle(0xff3300, 0.5);
      factory.fillRect(cx + S, worldHeight - ch - 3 * S, cw - 2 * S, 3 * S);

      // Fumaça animada (glow subindo)
      const smoke = this.add.graphics();
      smoke.fillStyle(0x332211, 0.3);
      smoke.fillCircle(cx + cw / 2, worldHeight - ch - 6 * S, 5 * S);
      smoke.fillCircle(cx + cw / 2 - 2 * S, worldHeight - ch - 10 * S, 4 * S);
      smoke.setScrollFactor(0.3);
      this.tweens.add({
        targets: smoke,
        alpha: { from: 0.3, to: 0.1 },
        y: '-=' + 8 * S,
        duration: 3000 + Phaser.Math.Between(0, 2000),
        yoyo: true,
        repeat: -1,
      });
    }
    factory.setScrollFactor(0.3);

    // ─── Tubos/canos industriais (mid-ground) ────────────────
    const pipes = this.add.graphics();
    for (let px = 0; px < worldWidth; px += Phaser.Math.Between(80 * S, 140 * S)) {
      const py = Phaser.Math.Between(20 * S, worldHeight - 40 * S);
      const pw = Phaser.Math.Between(30 * S, 60 * S);
      // Tubo horizontal
      pipes.fillStyle(0x332222, 0.7);
      pipes.fillRect(px, py, pw, 3 * S);
      // Junções
      pipes.fillStyle(0x554433, 0.8);
      pipes.fillRect(px, py - S, 2 * S, 5 * S);
      pipes.fillRect(px + pw - 2 * S, py - S, 2 * S, 5 * S);
      // Vapor
      if (Phaser.Math.Between(0, 2) === 0) {
        const steam = this.add.graphics();
        steam.fillStyle(0xffaa44, 0.2);
        steam.fillCircle(px + pw / 2, py - 2 * S, 3 * S);
        steam.setScrollFactor(0.4);
        this.tweens.add({
          targets: steam,
          alpha: { from: 0.2, to: 0 },
          duration: 2000,
          yoyo: true,
          repeat: -1,
        });
      }
    }
    pipes.setScrollFactor(0.4);

    // ─── Rio de lava no fundo ─────────────────────────────────
    const lava = this.add.graphics();
    lava.fillStyle(0xff2200, 0.7);
    lava.fillRect(0, worldHeight - 8 * S, worldWidth, 8 * S);
    lava.fillStyle(0xff6600, 0.4);
    lava.fillRect(0, worldHeight - 10 * S, worldWidth, 4 * S);
    lava.fillStyle(0xffaa00, 0.2);
    lava.fillRect(0, worldHeight - 12 * S, worldWidth, 3 * S);
    lava.setScrollFactor(0.5);

    // Glow da lava (pulsante)
    const lavaGlow = this.add.graphics();
    lavaGlow.fillStyle(0xff4400, 0.15);
    lavaGlow.fillRect(0, worldHeight - 20 * S, worldWidth, 20 * S);
    lavaGlow.setScrollFactor(0.5);
    this.tweens.add({
      targets: lavaGlow,
      alpha: { from: 0.15, to: 0.35 },
      duration: 1500,
      yoyo: true,
      repeat: -1,
    });
  }

  /** Cria background para Aqua Depths — gelo em cima, água embaixo */
  private createAquaBackground(): void {
    const { worldWidth, worldHeight } = this.levelConfig;
    const midY = worldHeight * 0.35; // Linha de transição gelo → água

    // ═══ CAMADA SUPERIOR: GELO / NEVE ═══

    // Gradiente gelado (branco → ciano claro)
    const ice = this.add.graphics();
    const iceSteps = 6;
    const iceBandH = midY / iceSteps;
    for (let i = 0; i < iceSteps; i++) {
      const t = i / iceSteps;
      const r = Math.floor(200 - t * 60);
      const g = Math.floor(220 - t * 40);
      const b = Math.floor(255 - t * 30);
      ice.fillStyle(Phaser.Display.Color.GetColor(r, g, b), 1);
      ice.fillRect(0, i * iceBandH, worldWidth, iceBandH + 1);
    }
    ice.setScrollFactor(0.1);

    // Flocos de neve caindo
    for (let i = 0; i < 25; i++) {
      const sx = Phaser.Math.Between(0, worldWidth);
      const sy = Phaser.Math.Between(0, midY);
      const size = Phaser.Math.Between(1, 2) * S;
      const flake = this.add.circle(sx, sy, size, 0xffffff, 0.6);
      flake.setScrollFactor(0.1 + Math.random() * 0.15);
      this.tweens.add({
        targets: flake,
        y: sy + Phaser.Math.Between(20, 50) * S,
        x: sx + Phaser.Math.Between(-10, 10) * S,
        alpha: 0,
        duration: Phaser.Math.Between(3000, 6000),
        repeat: -1,
        delay: Phaser.Math.Between(0, 3000),
      });
    }

    // Estalactites de gelo penduradas no teto
    for (let ix = 20 * S; ix < worldWidth; ix += Phaser.Math.Between(40, 80) * S) {
      const icicleH = Phaser.Math.Between(8, 24) * S;
      const icicleW = Phaser.Math.Between(2, 5) * S;
      const icicle = this.add.graphics();
      icicle.fillStyle(0xcceeff, 0.7);
      icicle.beginPath();
      icicle.moveTo(ix - icicleW / 2, 0);
      icicle.lineTo(ix + icicleW / 2, 0);
      icicle.lineTo(ix, icicleH);
      icicle.closePath();
      icicle.fillPath();
      icicle.setScrollFactor(0.15);
    }

    // Névoa gelada na transição
    const frostMist = this.add.graphics();
    frostMist.fillStyle(0xaaddff, 0.15);
    frostMist.fillRect(0, midY - 10 * S, worldWidth, 20 * S);
    frostMist.setScrollFactor(0.2);
    this.tweens.add({
      targets: frostMist,
      alpha: { from: 0.1, to: 0.25 },
      duration: 2000,
      yoyo: true,
      repeat: -1,
    });

    // Superfície de gelo (linha brilhante na transição)
    const iceSurface = this.add.graphics();
    iceSurface.fillStyle(0xddeeff, 0.6);
    iceSurface.fillRect(0, midY - 2 * S, worldWidth, 4 * S);
    iceSurface.setScrollFactor(0.15);

    // ═══ CAMADA INFERIOR: OCEANO PROFUNDO ═══

    // Gradiente oceano (ciano escuro → azul marinho)
    const ocean = this.add.graphics();
    const waterSteps = 8;
    const waterH = worldHeight - midY;
    const waterBandH = waterH / waterSteps;
    for (let i = 0; i < waterSteps; i++) {
      const t = i / waterSteps;
      const r = Math.floor(10 - t * 8);
      const g = Math.floor(60 - t * 35);
      const b = Math.floor(120 - t * 40);
      ocean.fillStyle(Phaser.Display.Color.GetColor(r, g, b), 1);
      ocean.fillRect(0, midY + i * waterBandH, worldWidth, waterBandH + 1);
    }
    ocean.setScrollFactor(0.1);

    // Bolhas subindo (só na parte de água)
    for (let i = 0; i < 25; i++) {
      const bx = Phaser.Math.Between(0, worldWidth);
      const by = Phaser.Math.Between(midY + 10 * S, worldHeight - 10 * S);
      const size = Phaser.Math.Between(1, 3) * S;
      const bubble = this.add.circle(bx, by, size, 0x88ddff, 0.3);
      bubble.setScrollFactor(0.15 + Math.random() * 0.2);
      this.tweens.add({
        targets: bubble,
        y: midY,
        alpha: 0,
        duration: Phaser.Math.Between(3000, 6000),
        repeat: -1,
        delay: Phaser.Math.Between(0, 3000),
      });
    }

    // Corais no fundo do oceano
    for (let cx = 0; cx < worldWidth; cx += Phaser.Math.Between(80, 180) * S) {
      const coralH = Phaser.Math.Between(10, 24) * S;
      const coralW = Phaser.Math.Between(5, 12) * S;
      const colors = [0x992255, 0xaa4411, 0x339966, 0x884477];
      const color = colors[Phaser.Math.Between(0, colors.length - 1)];
      const coral = this.add.rectangle(
        cx, worldHeight - coralH / 2 - 4 * S,
        coralW, coralH, color, 0.4
      );
      coral.setScrollFactor(0.3);
    }

    // Algas balançando
    for (let kx = 60 * S; kx < worldWidth; kx += Phaser.Math.Between(80, 150) * S) {
      const kelpH = Phaser.Math.Between(16, 40) * S;
      const kelp = this.add.rectangle(
        kx, worldHeight - kelpH / 2, 3 * S, kelpH, 0x226633, 0.5
      );
      kelp.setScrollFactor(0.25);
      this.tweens.add({
        targets: kelp,
        x: kx + 4 * S,
        duration: Phaser.Math.Between(1500, 3000),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }

    // Raios de luz filtrando pela camada de gelo
    for (let r = 0; r < 6; r++) {
      const rayX = Phaser.Math.Between(0, worldWidth);
      const ray = this.add.graphics();
      ray.fillStyle(0xaaddff, 0.04);
      ray.beginPath();
      ray.moveTo(rayX, midY);
      ray.lineTo(rayX + 15 * S, midY);
      ray.lineTo(rayX - 10 * S, worldHeight);
      ray.lineTo(rayX - 25 * S, worldHeight);
      ray.closePath();
      ray.fillPath();
      ray.setScrollFactor(0.1);
      this.tweens.add({
        targets: ray,
        alpha: { from: 0.03, to: 0.12 },
        duration: Phaser.Math.Between(2000, 4000),
        yoyo: true,
        repeat: -1,
      });
    }

    // Chão arenoso
    const sand = this.add.graphics();
    sand.fillStyle(0x443322, 0.4);
    sand.fillRect(0, worldHeight - 6 * S, worldWidth, 6 * S);
    sand.setScrollFactor(0.5);
  }

  /** Cria as plataformas do nível */
  private createPlatforms(): void {
    this.platforms = this.physics.add.staticGroup();

    const isVulcan = this.levelId === 'vulcan';
    const isAqua = this.levelId === 'aqua';

    for (const platConfig of this.levelConfig.platforms) {
      // Cores temáticas por nível
      let fillColor: number, strokeColor: number, topColor: number;
      if (isVulcan) {
        fillColor = platConfig.height > 12 * S ? 0x331111 : 0x442211;
        strokeColor = 0x663322;
        topColor = 0xaa4422;
      } else if (isAqua) {
        fillColor = platConfig.height > 12 * S ? 0x0a2233 : 0x113344;
        strokeColor = 0x225566;
        topColor = 0x22aacc;
      } else {
        fillColor = platConfig.height > 12 * S ? 0x334466 : 0x3a5577;
        strokeColor = 0x556688;
        topColor = 0x5588aa;
      }

      const plat = this.add.rectangle(
        platConfig.x,
        platConfig.y,
        platConfig.width,
        platConfig.height,
        fillColor
      );
      plat.setStrokeStyle(S, strokeColor);
      this.physics.add.existing(plat, true);
      this.platforms.add(plat);

      const topLine = this.add.rectangle(
        platConfig.x,
        platConfig.y - platConfig.height / 2,
        platConfig.width,
        S,
        topColor
      );
      void topLine;
    }
  }

  /** Cria o pool de balas do player */
  private createBulletPool(): void {
    this.bulletGroup = this.physics.add.group({
      maxSize: 10,
      allowGravity: false,
      collideWorldBounds: false,
    });
  }

  /** Cria o pool de balas dos inimigos */
  private createEnemyBulletPool(): void {
    this.enemyBulletGroup = this.physics.add.group({
      maxSize: 10,
      allowGravity: false,
      collideWorldBounds: false,
    });
  }

  /** Cria os inimigos do nível */
  private createEnemies(): void {
    this.enemyGroup = this.physics.add.group();

    for (const spawn of this.levelConfig.enemies) {
      const enemy = new Enemy(
        this,
        spawn.x,
        spawn.y,
        spawn.type,
        this.player,
        this.enemyBulletGroup,
        this.platforms
      );
      this.enemyGroup.add(enemy);

      // Re-aplicar physics (group.add() reseta defaults do body)
      if (spawn.type === 'turret' || spawn.type === 'jellyfish') {
        const body = enemy.body as Phaser.Physics.Arcade.Body;
        body.setImmovable(true);
        body.setAllowGravity(false);
      }

      this.enemies.push(enemy);
    }
  }

  /** Configura todas as colisões */
  private setupCollisions(): void {
    // Player ↔ Plataformas
    this.physics.add.collider(this.player, this.platforms);

    // Enemy ↔ Plataformas
    this.physics.add.collider(this.enemyGroup, this.platforms);

    // Player Bullet ↔ Enemy → enemy toma dano, bullet desativa
    this.physics.add.overlap(
      this.bulletGroup,
      this.enemyGroup,
      (bullet, enemy) => {
        const b = bullet as Phaser.Physics.Arcade.Sprite;
        const e = enemy as unknown as Enemy;
        if (!b.active || !e.active) return;

        // Desativa a bala
        b.setActive(false);
        b.setVisible(false);
        (b.body as Phaser.Physics.Arcade.Body).setVelocity(0);

        // Dano no inimigo (1 ponto por tiro)
        e.takeDamage(1);
      }
    );

    // Player ↔ Enemy (contato) → player toma dano
    this.physics.add.overlap(
      this.player,
      this.enemyGroup,
      (_player, enemy) => {
        const e = enemy as unknown as Enemy;
        if (!e.active || !e.isAlive()) return;
        this.player.takeDamage(e.getContactDamage());
      }
    );

    // Player ↔ Enemy Bullet → player toma dano
    this.physics.add.overlap(
      this.player,
      this.enemyBulletGroup,
      (_player, bullet) => {
        const b = bullet as Phaser.Physics.Arcade.Sprite;
        if (!b.active) return;

        // Desativa o projétil
        b.setActive(false);
        b.setVisible(false);
        (b.body as Phaser.Physics.Arcade.Body).setVelocity(0);

        // Dano no player (3 pts por projétil de turret)
        this.player.takeDamage(3);
      }
    );
  }

  /** Info do stage no início */
  private createStageInfo(): void {
    const { width, height } = this.scale;
    const stageText = this.add
      .text(width / 2, height / 2 - 20 * S, this.levelConfig.name, {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: fontSize(8),
        color: '#00ccff',
        stroke: '#001133',
        strokeThickness: 2 * S,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(800)
      .setAlpha(0);

    this.tweens.add({
      targets: stageText,
      alpha: 1,
      duration: 500,
      hold: 1500,
      yoyo: true,
      onComplete: () => stageText.destroy(),
    });
  }

  /** Cria portal visual no fim do stage */
  private createGoalPortal(): void {
    if (!this.levelConfig.goalX) return;
    const gx = this.levelConfig.goalX;

    // Coluna de energia (portal)
    const portal = this.add.graphics();
    portal.fillStyle(0x00ffaa, 0.3);
    portal.fillRect(gx - 6 * S, 60 * S, 12 * S, 112 * S);
    portal.fillStyle(0x00ffcc, 0.5);
    portal.fillRect(gx - 3 * S, 60 * S, 6 * S, 112 * S);
    portal.fillStyle(0xffffff, 0.7);
    portal.fillRect(gx - 1 * S, 60 * S, 2 * S, 112 * S);

    // Glow pulsante
    const glow = this.add.graphics();
    glow.fillStyle(0x00ff88, 0.15);
    glow.fillCircle(gx, 120 * S, 20 * S);
    this.tweens.add({
      targets: glow,
      alpha: { from: 0.3, to: 0.8 },
      duration: 800,
      yoyo: true,
      repeat: -1,
    });

    // Label "GOAL"
    this.add
      .text(gx, 52 * S, '▼ GOAL', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: fontSize(4),
        color: '#00ff88',
      })
      .setOrigin(0.5);
  }

  /** Limpa ao sair */
  shutdown(): void {
    this.events.off('player-died', this.onPlayerDied, this);
    this.events.off('boss-defeated');
    this.healthBar?.destroy();
    this.boss = null;
  }
}
