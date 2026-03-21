/**
 * Boss.ts — Entidade do Boss (Vulcan Lord)
 *
 * Boss 64×64 com 3 fases de combate:
 *   Phase 1: pula + atira 3 projéteis
 *   Phase 2: adiciona ground slam
 *   Phase 3: enrage (velocidade +50%)
 *
 * 🎮 Estilo MegaMan X Maverick boss fight!
 */
import Phaser from 'phaser';
import { createActor } from 'xstate';
import { bossMachine } from '../core/machines/bossMachine';
import { BossHealthBar } from '../ui/components/BossHealthBar';
import { S } from '../config/scaleConstants';

export class Boss extends Phaser.Physics.Arcade.Sprite {
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
    super(scene, x, y, 'boss_vulcan_sheet', 0);
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
    this.healthBar = new BossHealthBar(scene, 'VULCAN LORD', 20);

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
    if (!this.scene.anims.exists('boss_idle')) {
      this.scene.anims.create({
        key: 'boss_idle',
        frames: this.scene.anims.generateFrameNumbers('boss_vulcan_sheet', { frames: [0] }),
        frameRate: 1,
        repeat: 0,
      });
    }
    if (!this.scene.anims.exists('boss_jump')) {
      this.scene.anims.create({
        key: 'boss_jump',
        frames: this.scene.anims.generateFrameNumbers('boss_vulcan_sheet', { frames: [1] }),
        frameRate: 1,
        repeat: 0,
      });
    }
    if (!this.scene.anims.exists('boss_attack')) {
      this.scene.anims.create({
        key: 'boss_attack',
        frames: this.scene.anims.generateFrameNumbers('boss_vulcan_sheet', { frames: [2] }),
        frameRate: 1,
        repeat: 0,
      });
    }
    if (!this.scene.anims.exists('boss_hurt')) {
      this.scene.anims.create({
        key: 'boss_hurt',
        frames: this.scene.anims.generateFrameNumbers('boss_vulcan_sheet', { frames: [3] }),
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

    if (phase >= 2 && roll < 0.25) {
      this.doSlam();
    } else if (roll < 0.55) {
      this.doJump();
    } else {
      this.doShoot();
    }
  }

  /** Pula em direção ao player */
  private doJump(): void {
    this.bossActor.send({ type: 'JUMP' });
    this.play('boss_jump', true);

    const body = this.body as Phaser.Physics.Arcade.Body;
    const dx = this.playerRef.x - this.x;
    const phase = this.bossActor.getSnapshot().context.phase;
    const speed = phase === 3 ? 120 * S : 80 * S;

    body.setVelocityY(-200 * S);
    body.setVelocityX(dx > 0 ? speed : -speed);

    // Esperar aterrissar
    this.scene.time.delayedCall(600, () => {
      body.setVelocityX(0);
      this.bossActor.send({ type: 'LAND' });
      this.play('boss_idle', true);

      // Clamp dentro da arena
      if (this.x < this.arenaMinX) this.x = this.arenaMinX;
      if (this.x > this.arenaMaxX) this.x = this.arenaMaxX;
    });
  }

  /** Atira projéteis em leque */
  private doShoot(): void {
    this.bossActor.send({ type: 'SHOOT' });
    this.play('boss_attack', true);

    const phase = this.bossActor.getSnapshot().context.phase;
    const dx = this.playerRef.x - this.x;
    this.setFlipX(dx > 0);

    this.scene.time.delayedCall(300, () => {
      const angles = phase === 3 ? [-20, -10, 0, 10, 20] : [-15, 0, 15];
      for (const angle of angles) {
        this.spawnFireProjectile(angle);
      }
    });

    this.scene.time.delayedCall(600, () => {
      this.bossActor.send({ type: 'SHOOT_DONE' });
      this.play('boss_idle', true);
    });
  }

  /** Ground slam (fase 2+) */
  private doSlam(): void {
    this.bossActor.send({ type: 'SLAM' });
    this.play('boss_jump', true);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocityY(-250 * S);

    this.scene.time.delayedCall(400, () => {
      body.setVelocityY(300 * S);
      this.play('boss_attack', true);
    });

    this.scene.time.delayedCall(700, () => {
      body.setVelocityY(0);
      // Ondas de fogo ao pousar
      this.spawnFireProjectile(0);
      this.spawnFireProjectile(180);

      this.scene.cameras.main.shake(100, 0.01);
      this.bossActor.send({ type: 'SLAM_DONE' });
      this.play('boss_idle', true);
    });
  }

  /** Spawna um projétil de fogo */
  private spawnFireProjectile(angleDeg: number): void {
    const bullet = this.bulletGroup.get(
      this.x,
      this.y - 8 * S,
      'fire_projectile'
    ) as Phaser.Physics.Arcade.Sprite;
    if (!bullet) return;

    bullet.setActive(true);
    bullet.setVisible(true);
    bullet.setDisplaySize(12 * S, 12 * S);

    const body = bullet.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);

    const rad = Phaser.Math.DegToRad(angleDeg);
    const dir = this.playerRef.x > this.x ? 1 : -1;
    const speed = 120 * S;
    body.setVelocity(
      Math.cos(rad) * speed * dir,
      Math.sin(rad) * speed
    );

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
    this.play('boss_hurt', true);
    this.setTint(0xff4444);
    this.scene.time.delayedCall(300, () => {
      this.clearTint();
      this.bossActor.send({ type: 'HURT_END' });
      this.play('boss_idle', true);
    });
  }

  /** Morte do boss */
  private handleDeath(): void {
    this.aiTickTimer?.destroy();
    this.actionTimer?.destroy();
    (this.body as Phaser.Physics.Arcade.Body).setVelocity(0);
    this.play('boss_hurt', true);
    this.setTint(0xff0000);

    // Explosões sequenciais
    for (let i = 0; i < 8; i++) {
      this.scene.time.delayedCall(i * 200, () => {
        const ex = this.x + Phaser.Math.Between(-20 * S, 20 * S);
        const ey = this.y + Phaser.Math.Between(-20 * S, 20 * S);
        const exp = this.scene.add.circle(ex, ey, 6 * S, 0xffaa00, 1);
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
      const scene = this.scene; // Salvar referência antes do destroy
      this.healthBar.destroy();
      this.bossActor.stop(); // Parar a máquina de estado
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
