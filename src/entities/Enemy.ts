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
import { patrolMachine, turretMachine, flamerMachine, dropperMachine, type EnemyType } from '../core/machines/enemyMachine';
import { getEnemyConfig, type EnemyConfig } from '../specs/enemyConfig';
import { S } from '../config/scaleConstants';

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
    const textureMap: Record<EnemyType, string> = {
      patrol: 'enemy_met_sheet',
      turret: 'enemy_turret_sheet',
      flamer: 'enemy_flamer_sheet',
      dropper: 'enemy_dropper_sheet',
    };
    super(scene, x, y, textureMap[type], 0);

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
    if (type === 'dropper') {
      body.setAllowGravity(false);
      body.setImmovable(true);
    }

    // Criar animações
    this.createAnimations();

    // Iniciar máquina
    const machineMap = {
      patrol: patrolMachine,
      turret: turretMachine,
      flamer: flamerMachine,
      dropper: dropperMachine,
    };
    this.enemyActor = createActor(machineMap[type] as typeof patrolMachine);
    this.enemyActor.start();

    // Turret/Flamer: iniciar loops
    if (type === 'turret') {
      this.startTurretLoop();
    }
    if (type === 'flamer') {
      this.startFlamerLoop();
    }
  }

  private createAnimations(): void {
    const prefixMap: Record<EnemyType, string> = {
      patrol: 'met', turret: 'turret', flamer: 'flamer', dropper: 'dropper',
    };
    const sheetMap: Record<EnemyType, string> = {
      patrol: 'enemy_met_sheet', turret: 'enemy_turret_sheet',
      flamer: 'enemy_flamer_sheet', dropper: 'enemy_dropper_sheet',
    };
    const prefix = prefixMap[this.enemyType];
    const sheetKey = sheetMap[this.enemyType];

    if (!this.scene.anims.exists(`${prefix}_walk`)) {
      const walkFrames = this.enemyType === 'flamer' ? [0, 1] : [0, 1];
      this.scene.anims.create({
        key: `${prefix}_walk`,
        frames: this.scene.anims.generateFrameNumbers(sheetKey, { frames: walkFrames }),
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
      const shootFrame = this.enemyType === 'flamer' ? 2 : 1;
      this.scene.anims.create({
        key: `${prefix}_shoot`,
        frames: this.scene.anims.generateFrameNumbers(sheetKey, { frames: [shootFrame] }),
        frameRate: 1,
        repeat: 0,
      });
    }
  }

  /** Atualiza a IA do inimigo a cada frame */
  updateEnemy(): void {
    const state = this.enemyActor.getSnapshot().value;
    if (state === 'dead' || state === 'dying') return;

    switch (this.enemyType) {
      case 'patrol': this.updatePatrol(); break;
      case 'turret': this.updateTurret(); break;
      case 'flamer': this.updateFlamer(); break;
      case 'dropper': this.updateDropper(); break;
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
      const feelerX = this.x + dir * 16 * S;
      const feelerY = this.y + 20 * S;

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
            feelerY <= platBody.y + platBody.height + 8 * S
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
      this.x + dir * 12 * S,
      this.y,
      'enemy_bullet'
    ) as Phaser.Physics.Arcade.Sprite;

    if (bullet) {
      bullet.setActive(true);
      bullet.setVisible(true);
      bullet.setDisplaySize(8 * S, 8 * S);
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

  // ─── Flamer AI ──────────────────────────────────────────────────

  /** Inicia loop de detecção do flamer */
  private startFlamerLoop(): void {
    this.shootTimer = this.scene.time.addEvent({
      delay: 1500,
      callback: () => {
        if (!this.active) return;
        const state = this.enemyActor.getSnapshot().value;
        if (state !== 'detecting') return;

        // Cospe fogo
        this.enemyActor.send({ type: 'SHOOT' });
        this.play('flamer_shoot', true);

        // Spawna projétil de fogo
        if (this.enemyBulletGroup && this.playerRef) {
          const dir = this.playerRef.x > this.x ? 1 : -1;
          const bullet = this.enemyBulletGroup.get(
            this.x + dir * 12 * S, this.y, 'fire_projectile'
          ) as Phaser.Physics.Arcade.Sprite;
          if (bullet) {
            bullet.setActive(true).setVisible(true).setDisplaySize(10 * S, 10 * S);
            const bBody = bullet.body as Phaser.Physics.Arcade.Body;
            bBody.setAllowGravity(false);
            bBody.setVelocityX(dir * 100 * S);
            this.scene.time.delayedCall(2000, () => {
              if (bullet.active) {
                bullet.setActive(false).setVisible(false);
                bBody.setVelocity(0);
              }
            });
          }
        }

        // Cooldown → volta a patrulhar
        this.scene.time.delayedCall(500, () => {
          if (this.active) {
            this.enemyActor.send({ type: 'SHOOT_COOLDOWN_DONE' });
          }
        });
      },
      loop: true,
    });
  }

  /** IA do Flamer — patrulha + detecta + cospe fogo */
  private updateFlamer(): void {
    const state = this.enemyActor.getSnapshot().value;
    if (state === 'hurt') return;

    const body = this.body as Phaser.Physics.Arcade.Body;
    const ctx = this.enemyActor.getSnapshot().context;

    if (state === 'patrolling') {
      // Igual ao patrol
      const speed = this.config.patrolSpeed;
      body.setVelocityX(ctx.facing === 'left' ? -speed : speed);
      this.setFlipX(ctx.facing === 'right');
      this.play('flamer_walk', true);

      // Edge detection
      this.checkEdge();

      // Detecta player
      if (this.playerRef) {
        const dist = Phaser.Math.Distance.Between(this.x, this.y, this.playerRef.x, this.playerRef.y);
        if (dist < 100 * S) {
          this.enemyActor.send({ type: 'PLAYER_IN_RANGE' });
        }
      }
    } else if (state === 'detecting') {
      body.setVelocityX(0);
      this.play('flamer_idle', true);
      // Face player
      if (this.playerRef) {
        this.setFlipX(this.playerRef.x > this.x);
        const dist = Phaser.Math.Distance.Between(this.x, this.y, this.playerRef.x, this.playerRef.y);
        if (dist > 120 * S) {
          this.enemyActor.send({ type: 'PLAYER_OUT_OF_RANGE' });
        }
      }
    } else if (state === 'flaming') {
      body.setVelocityX(0);
    }
  }

  /** Edge detection helper (reused from patrol) */
  private checkEdge(): void {
    if (!this.platformsRef) return;
    const ctx = this.enemyActor.getSnapshot().context;
    const checkX = ctx.facing === 'left' ? this.x - 16 * S : this.x + 16 * S;
    const checkY = this.y + 16 * S;
    let hasGround = false;
    this.platformsRef.getChildren().forEach((plat) => {
      const p = plat as Phaser.Physics.Arcade.Sprite;
      const pBody = p.body as Phaser.Physics.Arcade.StaticBody;
      if (
        checkX >= pBody.x && checkX <= pBody.x + pBody.width &&
        Math.abs(checkY - pBody.y) < 20 * S
      ) {
        hasGround = true;
      }
    });
    if (!hasGround) {
      this.enemyActor.send({ type: 'EDGE_DETECTED' });
    }
  }

  // ─── Dropper AI ─────────────────────────────────────────────────

  /** IA do Dropper — pendura no teto, cai quando player embaixo */
  private updateDropper(): void {
    const state = this.enemyActor.getSnapshot().value;
    if (state === 'hurt' || state === 'exploding') return;

    if (state === 'hanging') {
      this.play('dropper_idle', true);
      // Detecta player abaixo
      if (this.playerRef) {
        const dx = Math.abs(this.playerRef.x - this.x);
        const dy = this.playerRef.y - this.y;
        if (dx < 24 * S && dy > 0 && dy < 120 * S) {
          this.enemyActor.send({ type: 'PLAYER_IN_RANGE' });
          // Ativa gravidade para cair
          const body = this.body as Phaser.Physics.Arcade.Body;
          body.setAllowGravity(true);
          body.setImmovable(false);
        }
      }
    } else if (state === 'dropping') {
      this.play('dropper_shoot', true);
      // Checa se atingiu o chão
      const body = this.body as Phaser.Physics.Arcade.Body;
      if (body.blocked.down || body.touching.down) {
        this.enemyActor.send({ type: 'EDGE_DETECTED' }); // hit ground → explode
        // Explosão visual
        body.setVelocity(0);
        body.setEnable(false);
        this.setTint(0xff6600);
        this.scene.time.delayedCall(200, () => {
          this.enemyActor.send({ type: 'DEATH_ANIM_DONE' });
          this.setActive(false);
          this.setVisible(false);
          this.destroy();
        });
      }
    }
  }

  destroy(fromScene?: boolean): void {
    this.enemyActor.stop();
    this.hurtTimer?.destroy();
    this.deathTimer?.destroy();
    this.shootTimer?.destroy();
    super.destroy(fromScene);
  }
}
