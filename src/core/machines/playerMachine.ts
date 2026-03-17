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
  | { type: 'HEAL'; amount: number };

// ─── Contexto inicial ─────────────────────────────────────────────

const initialContext: PlayerContext = {
  facing: 'right',
  health: 16,
  maxHealth: 16,
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
 * ```
 *
 * O tiro é tratado no contexto (isShooting) e pode acontecer
 * em qualquer estado — não é um estado exclusivo.
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
    TAKE_DAMAGE: {
      actions: assign({
        health: ({ context, event }) =>
          Math.max(0, context.health - (event as { type: 'TAKE_DAMAGE'; damage: number }).damage),
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
      },
    },

    /** Dash rápido — temporário, invulnerável */
    dashing: {
      on: {
        DASH_END: {
          target: 'idle',
          actions: assign({ canDash: false }),
        },
      },
    },
  },
});
