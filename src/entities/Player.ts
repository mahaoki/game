/**
 * Player.ts — Entidade do Jogador (Phaser)
 *
 * Conecta a lógica pura (playerMachine) ao mundo visual do Phaser.
 *
 * Responsabilidades:
 *   - Renderizar o sprite do personagem usando spritesheet real
 *   - Aplicar física (Arcade) e colisões
 *   - Ler input do InputManager e traduzir em eventos XState
 *   - Tocar animações conforme o estado
 *   - Gerenciar tiro (criar Bullets)
 *   - Gerenciar dano (knockback, i-frames, morte)
 *
 * 🎮 Spritesheet: player_sheet.png (8 frames de 32×32)
 *    Frame 0-1: Idle (breathing)
 *    Frame 2-3: Run cycle
 *    Frame 4:   Jump (ascending)
 *    Frame 5:   Fall (descending)
 *    Frame 6:   Shoot (buster extended)
 *    Frame 7:   Dash (leaning forward)
 */
import Phaser from 'phaser';
import { createActor } from 'xstate';
import { playerMachine } from '../core/machines/playerMachine';
import { getPlayerConfig, type PlayerConfig } from '../specs/playerConfig';
import { type PlayerInput } from '../core/InputManager';

export class Player extends Phaser.Physics.Arcade.Sprite {
  /** Ator XState que gerencia os estados */
  private playerActor: ReturnType<typeof createActor<typeof playerMachine>>;

  /** Configuração de balanceamento */
  private config: PlayerConfig;

  /** Pool de projéteis do buster */
  private bulletGroup: Phaser.Physics.Arcade.Group;

  /** Timers */
  private dashTimer: Phaser.Time.TimerEvent | null = null;
  private shootCooldownTimer: Phaser.Time.TimerEvent | null = null;
  private hurtTimer: Phaser.Time.TimerEvent | null = null;
  private invulnerabilityTimer: Phaser.Time.TimerEvent | null = null;

  /** Estado local para dash direction */
  private dashDirection: number = 1;

  /** Timer para o efeito de piscar (i-frames) */
  private blinkTween: Phaser.Tweens.Tween | null = null;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    bulletGroup: Phaser.Physics.Arcade.Group,
    configOverrides: Partial<PlayerConfig> = {}
  ) {
    // Usa o spritesheet real carregado no BootScene
    super(scene, x, y, 'player_sheet', 0);

    this.config = getPlayerConfig(configOverrides);
    this.bulletGroup = bulletGroup;

    // Adiciona ao mundo Phaser
    scene.add.existing(this);
    scene.physics.add.existing(this);

    // Configura corpo físico
    this.setupPhysics();

    // Cria animações a partir do spritesheet
    this.createAnimations();

    // Inicia a máquina de estado
    this.playerActor = createActor(playerMachine);
    this.playerActor.start();
  }

  /** Configura o corpo físico do Player */
  private setupPhysics(): void {
    const body = this.body as Phaser.Physics.Arcade.Body;

    // Hitbox menor que o sprite (mais justo visualmente)
    body.setSize(this.config.hitboxWidth, this.config.hitboxHeight);
    body.setOffset(this.config.hitboxOffsetX, this.config.hitboxOffsetY);

    // Não pode sair do mundo
    body.setCollideWorldBounds(true);

    // Drag para parar suavemente
    body.setDragX(600);

    // Tamanho do display (sprite na tela)
    this.setDisplaySize(this.config.spriteWidth, this.config.spriteHeight);
  }

  /**
   * Cria as animações usando frames do spritesheet real.
   */
  private createAnimations(): void {
    // Idle: alterna entre frame 0 e 1
    if (!this.scene.anims.exists('player_idle')) {
      this.scene.anims.create({
        key: 'player_idle',
        frames: this.scene.anims.generateFrameNumbers('player_sheet', {
          frames: [0, 1],
        }),
        frameRate: 2,
        repeat: -1,
      });
    }

    // Run: ciclo de corrida (frames 2 e 3)
    if (!this.scene.anims.exists('player_run')) {
      this.scene.anims.create({
        key: 'player_run',
        frames: this.scene.anims.generateFrameNumbers('player_sheet', {
          frames: [2, 3, 2, 3],
        }),
        frameRate: 8,
        repeat: -1,
      });
    }

    // Jump: frame 4 (ascending)
    if (!this.scene.anims.exists('player_jump')) {
      this.scene.anims.create({
        key: 'player_jump',
        frames: this.scene.anims.generateFrameNumbers('player_sheet', {
          frames: [4],
        }),
        frameRate: 1,
        repeat: 0,
      });
    }

    // Fall: frame 5 (descending)
    if (!this.scene.anims.exists('player_fall')) {
      this.scene.anims.create({
        key: 'player_fall',
        frames: this.scene.anims.generateFrameNumbers('player_sheet', {
          frames: [5],
        }),
        frameRate: 1,
        repeat: 0,
      });
    }

    // Shoot: frame 6 (arm cannon extended)
    if (!this.scene.anims.exists('player_shoot')) {
      this.scene.anims.create({
        key: 'player_shoot',
        frames: this.scene.anims.generateFrameNumbers('player_sheet', {
          frames: [6],
        }),
        frameRate: 1,
        repeat: 0,
      });
    }

    // Dash: frame 7 (leaning forward)
    if (!this.scene.anims.exists('player_dash')) {
      this.scene.anims.create({
        key: 'player_dash',
        frames: this.scene.anims.generateFrameNumbers('player_sheet', {
          frames: [7],
        }),
        frameRate: 1,
        repeat: 0,
      });
    }

    // Hurt: pisca entre frame 0 e nenhum (usa idle frame + tint)
    if (!this.scene.anims.exists('player_hurt')) {
      this.scene.anims.create({
        key: 'player_hurt',
        frames: this.scene.anims.generateFrameNumbers('player_sheet', {
          frames: [5], // Usa frame de fall como "hit"
        }),
        frameRate: 1,
        repeat: 0,
      });
    }
  }

  /**
   * Atualiza o Player a cada frame.
   * Chamado no update() da GameScene.
   */
  handleInput(input: PlayerInput): void {
    const state = this.playerActor.getSnapshot().value;
    const context = this.playerActor.getSnapshot().context;
    const body = this.body as Phaser.Physics.Arcade.Body;
    const onFloor = body.blocked.down || body.touching.down;

    // ─── Bloquear input durante hurt/dead ─────────────────────
    if (state === 'hurt' || state === 'dead') {
      this.updateAnimation(state as string);
      return;
    }

    // ─── Movimentação horizontal ──────────────────────────────
    if (state !== 'dashing') {
      if (input.left) {
        body.setVelocityX(-this.config.moveSpeed);
        this.playerActor.send({ type: 'MOVE_LEFT' });
      } else if (input.right) {
        body.setVelocityX(this.config.moveSpeed);
        this.playerActor.send({ type: 'MOVE_RIGHT' });
      } else if (onFloor && (state === 'running')) {
        this.playerActor.send({ type: 'STOP' });
      }
    }

    // ─── Flip (espelhar sprite) ───────────────────────────────
    this.setFlipX(context.facing === 'left');

    // ─── Pulo ─────────────────────────────────────────────────
    if (input.jump && onFloor) {
      body.setVelocityY(this.config.jumpForce);
      this.playerActor.send({ type: 'JUMP' });
    }

    // ─── Detectar queda / pouso ───────────────────────────────
    if (!onFloor && body.velocity.y > 0 && state === 'jumping') {
      this.playerActor.send({ type: 'FALL' });
    }
    if (onFloor && (state === 'jumping' || state === 'falling')) {
      this.playerActor.send({ type: 'LAND' });
    }
    if (!onFloor && state !== 'jumping' && state !== 'falling' && state !== 'dashing') {
      this.playerActor.send({ type: 'FALL' });
    }

    // ─── Dash ─────────────────────────────────────────────────
    if (input.dash && onFloor) {
      this.performDash();
    }

    // ─── Tiro ─────────────────────────────────────────────────
    if (input.shoot) {
      this.performShoot();
    }

    // ─── Animação ─────────────────────────────────────────────
    this.updateAnimation(state as string);
  }

  /** Executa o dash */
  private performDash(): void {
    const context = this.playerActor.getSnapshot().context;
    if (!context.canDash) return;

    this.playerActor.send({ type: 'DASH' });
    this.dashDirection = context.facing === 'right' ? 1 : -1;

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocityX(this.dashDirection * this.config.dashSpeed);
    body.setVelocityY(0);

    // Termina o dash após a duração
    this.dashTimer?.destroy();
    this.dashTimer = this.scene.time.delayedCall(this.config.dashDurationMs, () => {
      this.playerActor.send({ type: 'DASH_END' });

      // Cooldown do dash
      this.scene.time.delayedCall(this.config.dashCooldownMs, () => {
        this.playerActor.send({ type: 'DASH_COOLDOWN_RESET' });
      });
    });
  }

  /** Dispara um projétil */
  private performShoot(): void {
    const context = this.playerActor.getSnapshot().context;
    if (!context.canShoot) return;

    // Verifica limite de projéteis na tela
    const activeBullets = this.bulletGroup.getChildren().filter(
      (b) => (b as Phaser.Physics.Arcade.Sprite).active
    );
    if (activeBullets.length >= this.config.maxBullets) return;

    this.playerActor.send({ type: 'SHOOT' });

    // Cria o projétil
    const direction = context.facing === 'right' ? 1 : -1;
    const bulletX = this.x + direction * 16;
    const bulletY = this.y - 2;

    const bullet = this.bulletGroup.get(bulletX, bulletY, 'bullet_sprite') as Phaser.Physics.Arcade.Sprite;
    if (bullet) {
      bullet.setActive(true);
      bullet.setVisible(true);
      bullet.setDisplaySize(8, 6);
      const bulletBody = bullet.body as Phaser.Physics.Arcade.Body;
      bulletBody.setAllowGravity(false);
      bulletBody.setVelocityX(direction * this.config.bulletSpeed);
      bullet.setFlipX(direction === -1);

      // Destruir ao sair da tela
      this.scene.time.delayedCall(2000, () => {
        if (bullet.active) {
          bullet.setActive(false);
          bullet.setVisible(false);
          bulletBody.setVelocity(0);
        }
      });
    }

    // Cooldown do tiro
    this.playerActor.send({ type: 'SHOOT_END' });
    this.shootCooldownTimer?.destroy();
    this.shootCooldownTimer = this.scene.time.delayedCall(
      this.config.bulletCooldownMs,
      () => {
        this.playerActor.send({ type: 'SHOOT_COOLDOWN_RESET' });
      }
    );
  }

  /**
   * Recebe dano — aplica knockback, inicia i-frames, e envia evento à máquina.
   * Chamado externamente (colisão com inimigo, etc.)
   */
  takeDamage(amount: number): void {
    const context = this.playerActor.getSnapshot().context;

    // Não toma dano se invulnerável ou durante dash
    if (context.isInvulnerable) return;
    const state = this.playerActor.getSnapshot().value;
    if (state === 'dashing' || state === 'dead') return;

    // Envia evento à máquina (transiciona para hurt)
    this.playerActor.send({ type: 'TAKE_DAMAGE', damage: amount });

    // Knockback (empurra para trás)
    const body = this.body as Phaser.Physics.Arcade.Body;
    const knockDir = context.facing === 'right' ? -1 : 1;
    body.setVelocityX(knockDir * this.config.knockbackForceX);
    body.setVelocityY(this.config.knockbackForceY);

    // Verifica se morreu (imediato — a máquina faz always: dead se health=0)
    const newState = this.playerActor.getSnapshot().value;

    if (newState === 'dead') {
      this.handleDeath();
      return;
    }

    // Flash vermelho
    this.setTint(0xff0000);

    // Timer do estado hurt → volta ao idle
    this.hurtTimer?.destroy();
    this.hurtTimer = this.scene.time.delayedCall(this.config.hurtDurationMs, () => {
      this.clearTint();
      this.playerActor.send({ type: 'HURT_END' });
    });

    // I-frames (invulnerabilidade com efeito de piscar)
    this.startInvulnerabilityBlink();

    // Timer de invulnerabilidade
    this.invulnerabilityTimer?.destroy();
    this.invulnerabilityTimer = this.scene.time.delayedCall(
      this.config.invulnerabilityMs,
      () => {
        this.playerActor.send({ type: 'INVULNERABILITY_END' });
        this.stopInvulnerabilityBlink();
      }
    );
  }

  /**
   * Morte por cair no buraco — perde 1 vida inteira, respawn.
   */
  pitDeath(): void {
    const state = this.playerActor.getSnapshot().value;
    if (state === 'dead') return;

    this.playerActor.send({ type: 'PIT_DEATH' });
    this.handleDeath();
  }

  /** Lida com a morte (emite evento para GameScene) */
  private handleDeath(): void {
    // Para todos os timers
    this.dashTimer?.destroy();
    this.shootCooldownTimer?.destroy();
    this.hurtTimer?.destroy();

    // Emite evento para a scene
    this.scene.events.emit('player-died', this.getLives());
  }

  /**
   * Respawn — reseta posição, reinicia máquina se tem vidas.
   * Retorna true se respawnou, false se game over.
   */
  respawn(x: number, y: number): boolean {
    const context = this.playerActor.getSnapshot().context;
    if (context.lives <= 0) return false;

    this.playerActor.send({ type: 'RESPAWN' });
    this.setPosition(x, y);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(0, 0);

    // I-frames de respawn
    this.startInvulnerabilityBlink();
    this.invulnerabilityTimer?.destroy();
    this.invulnerabilityTimer = this.scene.time.delayedCall(
      this.config.invulnerabilityMs,
      () => {
        this.playerActor.send({ type: 'INVULNERABILITY_END' });
        this.stopInvulnerabilityBlink();
      }
    );

    return true;
  }

  /** Inicia efeito de piscar (i-frames) */
  private startInvulnerabilityBlink(): void {
    this.stopInvulnerabilityBlink();
    this.blinkTween = this.scene.tweens.add({
      targets: this,
      alpha: { from: 1, to: 0.2 },
      duration: 80,
      yoyo: true,
      repeat: -1,
    });
  }

  /** Para o efeito de piscar */
  private stopInvulnerabilityBlink(): void {
    if (this.blinkTween) {
      this.blinkTween.stop();
      this.blinkTween = null;
    }
    this.setAlpha(1);
  }

  /** Atualiza a animação baseada no estado atual */
  private updateAnimation(state: string): void {
    const context = this.playerActor.getSnapshot().context;

    // Flip baseado na direção
    this.setFlipX(context.facing === 'left');

    switch (state) {
      case 'hurt':
        this.play('player_hurt', true);
        break;
      case 'dead':
        this.play('player_hurt', true);
        this.setTint(0xff0000);
        break;
      case 'dashing':
        this.play('player_dash', true);
        break;
      case 'jumping':
        this.play('player_jump', true);
        break;
      case 'falling':
        this.play('player_fall', true);
        break;
      case 'running':
        if (context.isShooting) {
          this.play('player_shoot', true);
        } else {
          this.play('player_run', true);
        }
        break;
      case 'idle':
      default:
        if (context.isShooting) {
          this.play('player_shoot', true);
        } else {
          this.play('player_idle', true);
        }
        break;
    }
  }

  /** Retorna a vida atual */
  getHealth(): number {
    return this.playerActor.getSnapshot().context.health;
  }

  /** Retorna a vida máxima */
  getMaxHealth(): number {
    return this.playerActor.getSnapshot().context.maxHealth;
  }

  /** Retorna as vidas restantes */
  getLives(): number {
    return this.playerActor.getSnapshot().context.lives;
  }

  /** Limpa ao destruir */
  destroy(fromScene?: boolean): void {
    this.playerActor.stop();
    this.dashTimer?.destroy();
    this.shootCooldownTimer?.destroy();
    this.hurtTimer?.destroy();
    this.invulnerabilityTimer?.destroy();
    this.stopInvulnerabilityBlink();
    super.destroy(fromScene);
  }
}
