/**
 * InputManager.ts — Gerenciador de Input Unificado
 *
 * Abstrai teclado e touch em uma única interface.
 * O jogo consulta `getInput()` a cada frame e recebe
 * um objeto simples dizendo quais ações estão ativas.
 *
 * 🎮 Teclado: Arrows + Space/X/Z
 * 📱 Touch: D-pad virtual + botões (futuro)
 *
 * 🧠 Sem lógica de jogo — apenas lê o hardware.
 */
import Phaser from 'phaser';

/** Interface de input do jogador — o que o jogo "vê" */
export interface PlayerInput {
  /** Está pressionando para a esquerda? */
  left: boolean;
  /** Está pressionando para a direita? */
  right: boolean;
  /** Pressionou pulo neste frame? (edge-triggered) */
  jump: boolean;
  /** Pressionou tiro neste frame? (edge-triggered) */
  shoot: boolean;
  /** Pressionou dash neste frame? (edge-triggered) */
  dash: boolean;
  /** Pressionou trocar arma neste frame? (edge-triggered) */
  switchWeapon: boolean;
}

/**
 * Gerenciador de input para o Player.
 *
 * Uso:
 * ```ts
 * const input = new InputManager(this);
 * // No update():
 * const actions = input.getInput();
 * if (actions.jump) player.jump();
 * ```
 */
export class InputManager {
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys | null = null;
  private jumpKey: Phaser.Input.Keyboard.Key | null = null;
  private shootKey: Phaser.Input.Keyboard.Key | null = null;
  private dashKey: Phaser.Input.Keyboard.Key | null = null;
  private switchWeaponKey: Phaser.Input.Keyboard.Key | null = null;

  // Touch state
  private touchLeft = false;
  private touchRight = false;
  private touchJump = false;
  private touchShoot = false;
  private touchDash = false;
  private touchSwitchWeapon = false;

  constructor(scene: Phaser.Scene) {
    this.setupKeyboard(scene);
    this.setupTouchButtons(scene);
  }

  /** Configura as teclas do teclado */
  private setupKeyboard(scene: Phaser.Scene): void {
    if (!scene.input.keyboard) return;

    this.cursors = scene.input.keyboard.createCursorKeys();
    this.jumpKey = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.shootKey = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.X);
    this.dashKey = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Z);
    this.switchWeaponKey = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
  }

  /** Cria botões virtuais de touch na tela */
  private setupTouchButtons(scene: Phaser.Scene): void {
    const { height } = scene.scale;
    const buttonSize = 20;
    const padding = 4;
    const bottomY = height - padding - buttonSize / 2;
    const buttonAlpha = 0.3;

    // ─── D-pad (lado esquerdo) ─────────────────────────────
    const leftBtn = scene.add
      .rectangle(padding + buttonSize / 2, bottomY, buttonSize, buttonSize, 0xffffff, buttonAlpha)
      .setInteractive()
      .setScrollFactor(0)
      .setDepth(1000);

    const leftText = scene.add
      .text(padding + buttonSize / 2, bottomY, '◄', {
        fontSize: '10px',
        color: '#ffffff',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(1001)
      .setAlpha(0.5);

    const rightBtn = scene.add
      .rectangle(
        padding + buttonSize + padding + buttonSize / 2,
        bottomY,
        buttonSize,
        buttonSize,
        0xffffff,
        buttonAlpha
      )
      .setInteractive()
      .setScrollFactor(0)
      .setDepth(1000);

    const rightText = scene.add
      .text(padding + buttonSize + padding + buttonSize / 2, bottomY, '►', {
        fontSize: '10px',
        color: '#ffffff',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(1001)
      .setAlpha(0.5);

    // ─── Action buttons (lado direito) ─────────────────────
    const rightX = scene.scale.width - padding - buttonSize / 2;

    // Jump (A) — mais à direita
    const jumpBtn = scene.add
      .rectangle(rightX, bottomY, buttonSize, buttonSize, 0x00aaff, buttonAlpha)
      .setInteractive()
      .setScrollFactor(0)
      .setDepth(1000);

    const jumpText = scene.add
      .text(rightX, bottomY, 'A', {
        fontSize: '8px',
        color: '#00aaff',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(1001)
      .setAlpha(0.7);

    // Shoot (B) — ao lado do jump
    const shootBtn = scene.add
      .rectangle(
        rightX - buttonSize - padding,
        bottomY,
        buttonSize,
        buttonSize,
        0xff6600,
        buttonAlpha
      )
      .setInteractive()
      .setScrollFactor(0)
      .setDepth(1000);

    const shootText = scene.add
      .text(rightX - buttonSize - padding, bottomY, 'B', {
        fontSize: '8px',
        color: '#ff6600',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(1001)
      .setAlpha(0.7);

    // Dash (C) — acima do shoot
    const dashBtn = scene.add
      .rectangle(
        rightX - buttonSize - padding,
        bottomY - buttonSize - padding,
        buttonSize,
        buttonSize,
        0x00ff66,
        buttonAlpha
      )
      .setInteractive()
      .setScrollFactor(0)
      .setDepth(1000);

    const dashText = scene.add
      .text(rightX - buttonSize - padding, bottomY - buttonSize - padding, 'C', {
        fontSize: '8px',
        color: '#00ff66',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(1001)
      .setAlpha(0.7);

    // ─── Touch events ──────────────────────────────────────
    leftBtn.on('pointerdown', () => { this.touchLeft = true; });
    leftBtn.on('pointerup', () => { this.touchLeft = false; });
    leftBtn.on('pointerout', () => { this.touchLeft = false; });

    rightBtn.on('pointerdown', () => { this.touchRight = true; });
    rightBtn.on('pointerup', () => { this.touchRight = false; });
    rightBtn.on('pointerout', () => { this.touchRight = false; });

    jumpBtn.on('pointerdown', () => { this.touchJump = true; });
    jumpBtn.on('pointerup', () => { this.touchJump = false; });
    jumpBtn.on('pointerout', () => { this.touchJump = false; });

    shootBtn.on('pointerdown', () => { this.touchShoot = true; });
    shootBtn.on('pointerup', () => { this.touchShoot = false; });
    shootBtn.on('pointerout', () => { this.touchShoot = false; });

    dashBtn.on('pointerdown', () => { this.touchDash = true; });
    dashBtn.on('pointerup', () => { this.touchDash = false; });
    dashBtn.on('pointerout', () => { this.touchDash = false; });

    // Suprimir warnings de variáveis não usadas
    void leftText; void rightText;
    void jumpText; void shootText; void dashText;
  }

  /**
   * Lê o estado atual do input.
   * Chamado a cada frame no update() da cena.
   *
   * ⚠️ jump, shoot e dash são edge-triggered:
   *    retornam true apenas no frame em que a tecla foi pressionada.
   */
  getInput(): PlayerInput {
    const kbLeft = this.cursors?.left.isDown ?? false;
    const kbRight = this.cursors?.right.isDown ?? false;
    const kbJump = Phaser.Input.Keyboard.JustDown(this.jumpKey!) || false;
    const kbShoot = Phaser.Input.Keyboard.JustDown(this.shootKey!) || false;
    const kbDash = Phaser.Input.Keyboard.JustDown(this.dashKey!) || false;
    const kbSwitch = Phaser.Input.Keyboard.JustDown(this.switchWeaponKey!) || false;

    return {
      left: kbLeft || this.touchLeft,
      right: kbRight || this.touchRight,
      jump: kbJump || this.touchJump,
      shoot: kbShoot || this.touchShoot,
      dash: kbDash || this.touchDash,
      switchWeapon: kbSwitch || this.touchSwitchWeapon,
    };
  }
}
