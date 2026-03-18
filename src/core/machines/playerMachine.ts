/**
 * playerMachine.ts — Máquina de Estado do Player (XState 5)
 *
 * Controla os estados do personagem de forma pura (sem Phaser).
 * Isso permite testar toda a lógica de transição sem renderização.
 *
 * Estados:
 *   idle     → Parado, respirando
 *   running  → Andando para esquerda/direita
 *   jumping  → Subindo (velocidade Y negativa)
 *   falling  → Descendo (velocidade Y positiva)
 *   dashing  → Dash rápido (invulnerável)
 *   hurt     → Tomando dano (knockback + i-frames)
 *   dead     → Morreu (health = 0, perde vida)
 *
 * O tiro (shooting) é tratado como um estado paralelo —
 * o player pode atirar enquanto anda, pula ou está parado.
 *
 * 🧠 Lógica pura — sem dependência do Phaser!
 */
import { createMachine, assign } from 'xstate';

// ─── Tipos ────────────────────────────────────────────────────────

/** Direção que o Player está olhando */
export type FacingDirection = 'left' | 'right';

/** Contexto (dados mutáveis) do Player */
export interface PlayerContext {
  /** Direção atual */
  facing: FacingDirection;
  /** Vida atual */
  health: number;
  /** Vida máxima */
  maxHealth: number;
  /** Vidas restantes */
  lives: number;
  /** Se está invulnerável (i-frames) */
  isInvulnerable: boolean;
  /** Se pode dar dash (cooldown) */
  canDash: boolean;
  /** Se pode atirar (cooldown) */
  canShoot: boolean;
  /** Se está atirando (estado paralelo) */
  isShooting: boolean;
}

/** Eventos que o Player aceita */
export type PlayerEvent =
  | { type: 'MOVE_LEFT' }
  | { type: 'MOVE_RIGHT' }
  | { type: 'STOP' }
  | { type: 'JUMP' }
  | { type: 'LAND' }
  | { type: 'FALL' }
  | { type: 'DASH' }
  | { type: 'DASH_END' }
  | { type: 'DASH_COOLDOWN_RESET' }
  | { type: 'SHOOT' }
  | { type: 'SHOOT_END' }
  | { type: 'SHOOT_COOLDOWN_RESET' }
  | { type: 'TAKE_DAMAGE'; damage: number }
  | { type: 'HEAL'; amount: number }
  | { type: 'HURT_END' }
  | { type: 'INVULNERABILITY_END' }
  | { type: 'RESPAWN' }
  | { type: 'PIT_DEATH' };

// ─── Contexto inicial ─────────────────────────────────────────────

const initialContext: PlayerContext = {
  facing: 'right',
  health: 16,
  maxHealth: 16,
  lives: 3,
  isInvulnerable: false,
  canDash: true,
  canShoot: true,
  isShooting: false,
};

// ─── Máquina de Estado ────────────────────────────────────────────

/**
 * Máquina de estado do Player.
 *
 * ```
 *            MOVE_LEFT/RIGHT
 *    Idle ◄──────────────────► Running
 *     │                           │
 *     │ JUMP                 JUMP │
 *     ▼                          ▼
 *   Jumping ──── FALL ────► Falling
 *                              │
 *                         LAND │
 *                              ▼
 *                            Idle
 *
 *   DASH (de qualquer terrestre) ──► Dashing ──► Idle
 *
 *   TAKE_DAMAGE ──► Hurt ──► Idle (com i-frames)
 *                    └── se health=0 ──► Dead
 *
 *   PIT_DEATH ──► Dead (perde 1 vida inteira)
 * ```
 */
export const playerMachine = createMachine({
  id: 'player',
  initial: 'idle',
  context: initialContext,
  // Eventos globais (funcionam em qualquer estado)
  on: {
    SHOOT: {
      guard: ({ context }) => context.canShoot,
      actions: assign({
        canShoot: false,
        isShooting: true,
      }),
    },
    SHOOT_END: {
      actions: assign({
        isShooting: false,
      }),
    },
    SHOOT_COOLDOWN_RESET: {
      actions: assign({
        canShoot: true,
      }),
    },
    DASH_COOLDOWN_RESET: {
      actions: assign({
        canDash: true,
      }),
    },
    INVULNERABILITY_END: {
      actions: assign({
        isInvulnerable: false,
      }),
    },
    HEAL: {
      actions: assign({
        health: ({ context, event }) =>
          Math.min(
            context.maxHealth,
            context.health + (event as { type: 'HEAL'; amount: number }).amount
          ),
      }),
    },
  },
  states: {
    /** Parado — animação de respiração */
    idle: {
      on: {
        MOVE_LEFT: {
          target: 'running',
          actions: assign({ facing: 'left' as FacingDirection }),
        },
        MOVE_RIGHT: {
          target: 'running',
          actions: assign({ facing: 'right' as FacingDirection }),
        },
        JUMP: { target: 'jumping' },
        DASH: {
          target: 'dashing',
          guard: ({ context }) => context.canDash,
        },
        TAKE_DAMAGE: {
          target: 'hurt',
          guard: ({ context }) => !context.isInvulnerable,
          actions: assign({
            health: ({ context, event }) =>
              Math.max(0, context.health - (event as { type: 'TAKE_DAMAGE'; damage: number }).damage),
            isInvulnerable: true,
          }),
        },
        PIT_DEATH: { target: 'dead' },
      },
    },

    /** Correndo para esquerda/direita */
    running: {
      on: {
        STOP: { target: 'idle' },
        MOVE_LEFT: {
          actions: assign({ facing: 'left' as FacingDirection }),
        },
        MOVE_RIGHT: {
          actions: assign({ facing: 'right' as FacingDirection }),
        },
        JUMP: { target: 'jumping' },
        DASH: {
          target: 'dashing',
          guard: ({ context }) => context.canDash,
        },
        FALL: { target: 'falling' },
        TAKE_DAMAGE: {
          target: 'hurt',
          guard: ({ context }) => !context.isInvulnerable,
          actions: assign({
            health: ({ context, event }) =>
              Math.max(0, context.health - (event as { type: 'TAKE_DAMAGE'; damage: number }).damage),
            isInvulnerable: true,
          }),
        },
        PIT_DEATH: { target: 'dead' },
      },
    },

    /** Subindo (velocidade Y negativa) */
    jumping: {
      on: {
        FALL: { target: 'falling' },
        LAND: { target: 'idle' },
        MOVE_LEFT: {
          actions: assign({ facing: 'left' as FacingDirection }),
        },
        MOVE_RIGHT: {
          actions: assign({ facing: 'right' as FacingDirection }),
        },
        TAKE_DAMAGE: {
          target: 'hurt',
          guard: ({ context }) => !context.isInvulnerable,
          actions: assign({
            health: ({ context, event }) =>
              Math.max(0, context.health - (event as { type: 'TAKE_DAMAGE'; damage: number }).damage),
            isInvulnerable: true,
          }),
        },
        PIT_DEATH: { target: 'dead' },
      },
    },

    /** Descendo (velocidade Y positiva) */
    falling: {
      on: {
        LAND: { target: 'idle' },
        MOVE_LEFT: {
          actions: assign({ facing: 'left' as FacingDirection }),
        },
        MOVE_RIGHT: {
          actions: assign({ facing: 'right' as FacingDirection }),
        },
        TAKE_DAMAGE: {
          target: 'hurt',
          guard: ({ context }) => !context.isInvulnerable,
          actions: assign({
            health: ({ context, event }) =>
              Math.max(0, context.health - (event as { type: 'TAKE_DAMAGE'; damage: number }).damage),
            isInvulnerable: true,
          }),
        },
        PIT_DEATH: { target: 'dead' },
      },
    },

    /** Dash rápido — temporário, invulnerável */
    dashing: {
      on: {
        DASH_END: {
          target: 'idle',
          actions: assign({ canDash: false }),
        },
        PIT_DEATH: { target: 'dead' },
      },
    },

    /** Tomando dano — knockback, sem controle */
    hurt: {
      always: [
        {
          target: 'dead',
          guard: ({ context }) => context.health <= 0,
        },
      ],
      on: {
        HURT_END: {
          target: 'idle',
        },
      },
    },

    /** Morreu — perde uma vida */
    dead: {
      entry: assign({
        lives: ({ context }) => Math.max(0, context.lives - 1),
      }),
      on: {
        RESPAWN: {
          target: 'idle',
          guard: ({ context }) => context.lives > 0,
          actions: assign({
            health: ({ context }) => context.maxHealth,
            isInvulnerable: true,
            canDash: true,
            canShoot: true,
            isShooting: false,
          }),
        },
      },
    },
  },
});
