/**
 * WaterBoss.ts — Entidade do Boss Aquático (Aqua Serpent)
 *
 * Boss 64×64 com 3 fases de combate:
 *   Phase 1: ondula + dispara bolhas em arco
 *   Phase 2: adiciona tsunami wave (onda no chão)
 *   Phase 3: turbilhão (projéteis em espiral)
 *
 * 🎮 Estilo MegaMan X Maverick boss fight!
 */
import Phaser from 'phaser';
import { createActor } from 'xstate';
import { bossMachine } from '../core/machines/bossMachine';
import { BossHealthBar } from '../ui/components/BossHealthBar';
import { S } from '../config/scaleConstants';

export class WaterBoss extends Phaser.Physics.Arcade.Sprite {
  private bossActor;
  private playerRef: Phaser.Physics.Arcade.Sprite;
  private bulletGroup: Phaser.Physics.Arcade.Group;
  private healthBar: BossHealthBar;

  private actionTimer: Phaser.Time.TimerEvent | null = null;
  private aiTickTimer: Phaser.Time.TimerEvent | null = null;
  private isIntroPlaying: boolean = true;
  private arenaMinX: number;
  private arenaMaxX: number;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    player: Phaser.Physics.Arcade.Sprite,
    bulletGroup: Phaser.Physics.Arcade.Group,
    arenaMinX: number,
    arenaMaxX: number
  ) {
    super(scene, x, y, 'boss_aqua_sheet', 0);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.playerRef = player;
    this.bulletGroup = bulletGroup;
    this.arenaMinX = arenaMinX;
    this.arenaMaxX = arenaMaxX;

    // Configura body
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(48, 56);
    body.setOffset(8, 8);
    body.setCollideWorldBounds(false);
    this.setDisplaySize(64 * S, 64 * S);

    // XState
    this.bossActor = createActor(bossMachine);
    this.bossActor.start();

    // Animations
    this.createAnimations();

    // Health bar
    this.healthBar = new BossHealthBar(scene, 'AQUA SERPENT', 20);

    // Intro sequence
    this.setAlpha(0);
    scene.tweens.add({
      targets: this,
      alpha: 1,
      duration: 800,
      delay: 500,
      onComplete: () => {
        this.isIntroPlaying = false;
        this.bossActor.send({ type: 'INTRO_DONE' });
        this.startAI();
      },
    });
  }

  private createAnimations(): void {
    if (!this.scene.anims.exists('aqua_idle')) {
      this.scene.anims.create({
        key: 'aqua_idle',
        frames: this.scene.anims.generateFrameNumbers('boss_aqua_sheet', { frames: [0] }),
        frameRate: 1,
        repeat: 0,
      });
    }
    if (!this.scene.anims.exists('aqua_jump')) {
      this.scene.anims.create({
        key: 'aqua_jump',
        frames: this.scene.anims.generateFrameNumbers('boss_aqua_sheet', { frames: [1] }),
        frameRate: 1,
        repeat: 0,
      });
    }
    if (!this.scene.anims.exists('aqua_attack')) {
      this.scene.anims.create({
        key: 'aqua_attack',
        frames: this.scene.anims.generateFrameNumbers('boss_aqua_sheet', { frames: [2] }),
        frameRate: 1,
        repeat: 0,
      });
    }
    if (!this.scene.anims.exists('aqua_hurt')) {
      this.scene.anims.create({
        key: 'aqua_hurt',
        frames: this.scene.anims.generateFrameNumbers('boss_aqua_sheet', { frames: [3] }),
        frameRate: 1,
        repeat: 0,
      });
    }
  }

  /** Inicia o loop de IA */
  private startAI(): void {
    const phase = this.bossActor.getSnapshot().context.phase;
    const interval = phase === 3 ? 1200 : 2000;

    this.aiTickTimer = this.scene.time.addEvent({
      delay: interval,
      callback: () => this.chooseAction(),
      loop: true,
    });
  }

  /** Escolhe próxima ação baseado na fase */
  private chooseAction(): void {
    const snapshot = this.bossActor.getSnapshot();
    const state = snapshot.value;
    if (state !== 'idle') return;

    const phase = snapshot.context.phase;
    const roll = Math.random();

    if (phase >= 3 && roll < 0.3) {
      this.doWhirlpool();
    } else if (phase >= 2 && roll < 0.45) {
      this.doTsunami();
    } else if (roll < 0.6) {
      this.doLunge();
    } else {
      this.doBubbleShot();
    }
  }

  /** Bote em direção ao player */
  private doLunge(): void {
    this.bossActor.send({ type: 'JUMP' });
    this.play('aqua_jump', true);

    const body = this.body as Phaser.Physics.Arcade.Body;
    const dx = this.playerRef.x - this.x;
    const phase = this.bossActor.getSnapshot().context.phase;
    const speed = phase === 3 ? 130 * S : 90 * S;

    body.setVelocityY(-180 * S);
    body.setVelocityX(dx > 0 ? speed : -speed);

    this.scene.time.delayedCall(600, () => {
      body.setVelocityX(0);
      this.bossActor.send({ type: 'LAND' });
      this.play('aqua_idle', true);

      if (this.x < this.arenaMinX) this.x = this.arenaMinX;
      if (this.x > this.arenaMaxX) this.x = this.arenaMaxX;
    });
  }

  /** Dispara bolhas em leque */
  private doBubbleShot(): void {
    this.bossActor.send({ type: 'SHOOT' });
    this.play('aqua_attack', true);

    const phase = this.bossActor.getSnapshot().context.phase;
    const dx = this.playerRef.x - this.x;
    this.setFlipX(dx > 0);

    this.scene.time.delayedCall(300, () => {
      const angles = phase === 3 ? [-25, -12, 0, 12, 25] : [-15, 0, 15];
      for (const angle of angles) {
        this.spawnWaterProjectile(angle);
      }
    });

    this.scene.time.delayedCall(600, () => {
      this.bossActor.send({ type: 'SHOOT_DONE' });
      this.play('aqua_idle', true);
    });
  }

  /** Tsunami wave (fase 2+) */
  private doTsunami(): void {
    this.bossActor.send({ type: 'SLAM' });
    this.play('aqua_jump', true);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocityY(-220 * S);

    this.scene.time.delayedCall(400, () => {
      body.setVelocityY(280 * S);
      this.play('aqua_attack', true);
    });

    this.scene.time.delayedCall(700, () => {
      body.setVelocityY(0);
      // Ondas de água nas duas direções
      this.spawnWaterProjectile(0);
      this.spawnWaterProjectile(180);

      this.scene.cameras.main.shake(100, 0.01);
      this.bossActor.send({ type: 'SLAM_DONE' });
      this.play('aqua_idle', true);
    });
  }

  /** Turbilhão — projéteis em espiral (fase 3) */
  private doWhirlpool(): void {
    this.bossActor.send({ type: 'SHOOT' });
    this.play('aqua_attack', true);

    // Disparos em espiral
    for (let i = 0; i < 8; i++) {
      this.scene.time.delayedCall(i * 150, () => {
        if (!this.active) return;
        const angle = i * 45;
        this.spawnWaterProjectile(angle, true);
      });
    }

    this.scene.time.delayedCall(1400, () => {
      if (this.active) {
        this.bossActor.send({ type: 'SHOOT_DONE' });
        this.play('aqua_idle', true);
      }
    });
  }

  /** Spawna um projétil de água */
  private spawnWaterProjectile(angleDeg: number, radial: boolean = false): void {
    const bullet = this.bulletGroup.get(
      this.x,
      this.y - 8 * S,
      'water_projectile'
    ) as Phaser.Physics.Arcade.Sprite;
    if (!bullet) return;

    bullet.setActive(true);
    bullet.setVisible(true);
    bullet.setDisplaySize(12 * S, 12 * S);
    bullet.setTint(0x00ccff);

    const body = bullet.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);

    const rad = Phaser.Math.DegToRad(angleDeg);
    const speed = 110 * S;

    if (radial) {
      body.setVelocity(Math.cos(rad) * speed, Math.sin(rad) * speed);
    } else {
      const dir = this.playerRef.x > this.x ? 1 : -1;
      body.setVelocity(
        Math.cos(rad) * speed * dir,
        Math.sin(rad) * speed
      );
    }

    this.scene.time.delayedCall(3000, () => {
      if (bullet.active) {
        bullet.setActive(false);
        bullet.setVisible(false);
        body.setVelocity(0);
      }
    });
  }

  /** Recebe dano */
  takeDamage(amount: number): void {
    const state = this.bossActor.getSnapshot().value;
    if (state === 'hurt' || state === 'dying' || state === 'dead' || state === 'intro') return;

    this.bossActor.send({ type: 'TAKE_DAMAGE', damage: amount } as any);

    const newState = this.bossActor.getSnapshot().value;
    const ctx = this.bossActor.getSnapshot().context;

    this.healthBar.update(ctx.health);

    if (newState === 'dying' || newState === 'dead') {
      this.handleDeath();
      return;
    }

    // Flash de dano
    this.play('aqua_hurt', true);
    this.setTint(0x44aaff);
    this.scene.time.delayedCall(300, () => {
      this.clearTint();
      this.bossActor.send({ type: 'HURT_END' });
      this.play('aqua_idle', true);
    });
  }

  /** Morte do boss */
  private handleDeath(): void {
    this.aiTickTimer?.destroy();
    this.actionTimer?.destroy();
    (this.body as Phaser.Physics.Arcade.Body).setVelocity(0);
    this.play('aqua_hurt', true);
    this.setTint(0x0044ff);

    // Explosões sequenciais (azuis)
    for (let i = 0; i < 8; i++) {
      this.scene.time.delayedCall(i * 200, () => {
        const ex = this.x + Phaser.Math.Between(-20 * S, 20 * S);
        const ey = this.y + Phaser.Math.Between(-20 * S, 20 * S);
        const exp = this.scene.add.circle(ex, ey, 6 * S, 0x00aaff, 1);
        this.scene.tweens.add({
          targets: exp,
          alpha: 0,
          scaleX: 2,
          scaleY: 2,
          duration: 300,
          onComplete: () => exp.destroy(),
        });
      });
    }

    this.scene.time.delayedCall(1800, () => {
      this.bossActor.send({ type: 'DEATH_ANIM_DONE' });
      const dropX = this.x;
      const dropY = this.y;
      const scene = this.scene;
      this.healthBar.destroy();
      this.bossActor.stop();
      this.destroy();
      scene.events.emit('boss-defeated', dropX, dropY);
    });
  }

  /** Atualização per-frame */
  updateBoss(): void {
    if (!this.active || this.isIntroPlaying) return;

    const state = this.bossActor.getSnapshot().value as string;

    // Face player
    if (state === 'idle') {
      this.setFlipX(this.playerRef.x > this.x);
    }
  }

  getHealth(): number {
    return this.bossActor.getSnapshot().context.health;
  }

  isDead(): boolean {
    return this.bossActor.getSnapshot().value === 'dead';
  }
}
