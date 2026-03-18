/**
 * Enemy.ts — Entidade de Inimigo (Phaser)
 *
 * Suporta dois tipos:
 *   - Patrol (Met): anda ← → na plataforma, inverte na borda
 *   - Turret (Cannon): fixo, atira no player quando em range
 *
 * 🎮 Estilo MegaMan X!
 */
import Phaser from 'phaser';
import { createActor } from 'xstate';
import { patrolMachine, turretMachine, type EnemyType } from '../core/machines/enemyMachine';
import { getEnemyConfig, type EnemyConfig } from '../specs/enemyConfig';

export class Enemy extends Phaser.Physics.Arcade.Sprite {
  private enemyActor: ReturnType<typeof createActor<typeof patrolMachine>>;
  private enemyType: EnemyType;
  private config: EnemyConfig;
  private hurtTimer: Phaser.Time.TimerEvent | null = null;
  private deathTimer: Phaser.Time.TimerEvent | null = null;
  private shootTimer: Phaser.Time.TimerEvent | null = null;

  /** Referência ao player para turret aiming */
  private playerRef: Phaser.Physics.Arcade.Sprite | null = null;

  /** Pool de projéteis do turret */
  private enemyBulletGroup: Phaser.Physics.Arcade.Group | null = null;

  /** Plataformas para edge detection */
  private platformsRef: Phaser.Physics.Arcade.StaticGroup | null = null;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    type: EnemyType,
    player: Phaser.Physics.Arcade.Sprite,
    enemyBulletGroup?: Phaser.Physics.Arcade.Group,
    platforms?: Phaser.Physics.Arcade.StaticGroup
  ) {
    const textureKey = type === 'patrol' ? 'enemy_met_sheet' : 'enemy_turret_sheet';
    super(scene, x, y, textureKey, 0);

    this.enemyType = type;
    this.config = getEnemyConfig();
    this.playerRef = player;
    this.enemyBulletGroup = enemyBulletGroup ?? null;
    this.platformsRef = platforms ?? null;

    // Adiciona ao mundo
    scene.add.existing(this);
    scene.physics.add.existing(this);

    // Configurar física
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(20, 24);
    body.setOffset(6, 8);
    this.setDisplaySize(this.config.spriteSize, this.config.spriteSize);

    if (type === 'turret') {
      body.setImmovable(true);
      body.setAllowGravity(false);
    }

    // Criar animações
    this.createAnimations();

    // Iniciar máquina
    const machine = type === 'patrol' ? patrolMachine : turretMachine;
    this.enemyActor = createActor(machine as typeof patrolMachine);
    this.enemyActor.start();

    // Turret: iniciar loop de tiro
    if (type === 'turret') {
      this.startTurretLoop();
    }
  }

  private createAnimations(): void {
    const prefix = this.enemyType === 'patrol' ? 'met' : 'turret';
    const sheetKey = this.enemyType === 'patrol' ? 'enemy_met_sheet' : 'enemy_turret_sheet';

    if (!this.scene.anims.exists(`${prefix}_walk`)) {
      this.scene.anims.create({
        key: `${prefix}_walk`,
        frames: this.scene.anims.generateFrameNumbers(sheetKey, { frames: [0, 1] }),
        frameRate: 4,
        repeat: -1,
      });
    }

    if (!this.scene.anims.exists(`${prefix}_idle`)) {
      this.scene.anims.create({
        key: `${prefix}_idle`,
        frames: this.scene.anims.generateFrameNumbers(sheetKey, { frames: [0] }),
        frameRate: 1,
        repeat: 0,
      });
    }

    if (!this.scene.anims.exists(`${prefix}_shoot`)) {
      this.scene.anims.create({
        key: `${prefix}_shoot`,
        frames: this.scene.anims.generateFrameNumbers(sheetKey, { frames: [1] }),
        frameRate: 1,
        repeat: 0,
      });
    }
  }

  /** Atualiza a IA do inimigo a cada frame */
  updateEnemy(): void {
    const state = this.enemyActor.getSnapshot().value;
    if (state === 'dead' || state === 'dying') return;

    if (this.enemyType === 'patrol') {
      this.updatePatrol();
    } else {
      this.updateTurret();
    }
  }

  /** IA de patrulha: anda e inverte na borda */
  private updatePatrol(): void {
    const state = this.enemyActor.getSnapshot().value;
    const context = this.enemyActor.getSnapshot().context;
    const body = this.body as Phaser.Physics.Arcade.Body;

    if (state === 'hurt') {
      body.setVelocityX(0);
      return;
    }

    if (state !== 'patrolling') return;

    // Movimentação
    const speed = this.config.patrolSpeed;
    const dir = context.facing === 'left' ? -1 : 1;
    body.setVelocityX(dir * speed);
    this.setFlipX(context.facing === 'right');

    // Edge detection: verifica se há chão à frente
    const onFloor = body.blocked.down || body.touching.down;
    if (onFloor) {
      const feelerX = this.x + dir * 16;
      const feelerY = this.y + 20;

      // Verifica se há plataforma abaixo do próximo passo
      let hasGround = false;
      if (this.platformsRef) {
        this.platformsRef.getChildren().forEach((child) => {
          const plat = child as Phaser.GameObjects.Rectangle;
          const platBody = plat.body as Phaser.Physics.Arcade.StaticBody;
          if (
            feelerX >= platBody.x &&
            feelerX <= platBody.x + platBody.width &&
            feelerY >= platBody.y &&
            feelerY <= platBody.y + platBody.height + 8
          ) {
            hasGround = true;
          }
        });
      }

      if (!hasGround) {
        this.enemyActor.send({ type: 'EDGE_DETECTED' });
      }
    }

    // Wall detection
    if (body.blocked.left || body.blocked.right) {
      this.enemyActor.send({ type: 'WALL_HIT' });
    }

    // Animação
    this.play('met_walk', true);
  }

  /** IA de turret: detecta player e atira */
  private updateTurret(): void {
    const state = this.enemyActor.getSnapshot().value;

    if (state === 'hurt') return;

    if (!this.playerRef || !this.playerRef.active) return;

    // Calcular distância ao player
    const dx = this.playerRef.x - this.x;
    const dist = Math.abs(dx);

    // Virar na direção do player
    this.setFlipX(dx > 0);

    // Detecção de range
    if (dist <= this.config.turretRange) {
      if (state === 'idle') {
        this.enemyActor.send({ type: 'PLAYER_IN_RANGE' });
      }
    } else {
      if (state === 'aiming' || state === 'shooting') {
        this.enemyActor.send({ type: 'PLAYER_OUT_OF_RANGE' });
      }
    }

    // Animação
    if (state === 'shooting') {
      this.play('turret_shoot', true);
    } else {
      this.play('turret_idle', true);
    }
  }

  /** Loop de tiro do turret */
  private startTurretLoop(): void {
    this.shootTimer = this.scene.time.addEvent({
      delay: this.config.turretShootIntervalMs,
      callback: () => {
        const state = this.enemyActor.getSnapshot().value;
        if (state === 'aiming') {
          this.enemyActor.send({ type: 'SHOOT' });
          this.fireTurretBullet();

          // Cooldown
          this.scene.time.delayedCall(300, () => {
            const s = this.enemyActor.getSnapshot().value;
            if (s === 'shooting') {
              this.enemyActor.send({ type: 'SHOOT_COOLDOWN_DONE' });
            }
          });
        }
      },
      loop: true,
    });
  }

  /** Dispara projétil do turret */
  private fireTurretBullet(): void {
    if (!this.enemyBulletGroup || !this.playerRef) return;

    const dx = this.playerRef.x - this.x;
    const dir = dx > 0 ? 1 : -1;

    const bullet = this.enemyBulletGroup.get(
      this.x + dir * 12,
      this.y,
      'enemy_bullet'
    ) as Phaser.Physics.Arcade.Sprite;

    if (bullet) {
      bullet.setActive(true);
      bullet.setVisible(true);
      bullet.setDisplaySize(8, 8);
      const bulletBody = bullet.body as Phaser.Physics.Arcade.Body;
      bulletBody.setAllowGravity(false);
      bulletBody.setVelocityX(dir * this.config.turretBulletSpeed);
      bullet.setFlipX(dir === -1);

      // Auto-destroy após 3s
      this.scene.time.delayedCall(3000, () => {
        if (bullet.active) {
          bullet.setActive(false);
          bullet.setVisible(false);
          bulletBody.setVelocity(0);
        }
      });
    }
  }

  /** Recebe dano */
  takeDamage(amount: number): void {
    const state = this.enemyActor.getSnapshot().value;
    if (state === 'dead' || state === 'dying' || state === 'hurt') return;

    this.enemyActor.send({ type: 'TAKE_DAMAGE', damage: amount });

    const newState = this.enemyActor.getSnapshot().value;

    if (newState === 'dying') {
      this.handleDeath();
      return;
    }

    // Flash de dano
    this.setTint(0xff0000);
    this.hurtTimer?.destroy();
    this.hurtTimer = this.scene.time.delayedCall(this.config.hurtDurationMs, () => {
      this.clearTint();
      const s = this.enemyActor.getSnapshot().value;
      if (s === 'hurt') {
        this.enemyActor.send({ type: 'HURT_END' });
      }
    });
  }

  /** Animação e lógica de morte */
  private handleDeath(): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(0);
    body.setEnable(false);

    // Flash branco → desaparecer
    this.setTint(0xffffff);
    this.shootTimer?.destroy();

    this.deathTimer = this.scene.time.delayedCall(this.config.deathDurationMs, () => {
      this.enemyActor.send({ type: 'DEATH_ANIM_DONE' });
      this.setActive(false);
      this.setVisible(false);
      this.destroy();
    });
  }

  /** Retorna o dano de contato */
  getContactDamage(): number {
    return this.enemyActor.getSnapshot().context.damage;
  }

  /** Verifica se está vivo */
  isAlive(): boolean {
    const state = this.enemyActor.getSnapshot().value;
    return state !== 'dead' && state !== 'dying';
  }

  destroy(fromScene?: boolean): void {
    this.enemyActor.stop();
    this.hurtTimer?.destroy();
    this.deathTimer?.destroy();
    this.shootTimer?.destroy();
    super.destroy(fromScene);
  }
}
