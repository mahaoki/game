/**
 * enemyMachine.ts — Máquina de Estado dos Inimigos (XState 5)
 *
 * Lógica pura para os tipos de inimigo:
 *   - Patrol (Met): anda ← → na plataforma, inverte na borda
 *   - Turret (Cannon): fixo, detecta player, atira
 *
 * 🧠 Lógica pura — sem dependência do Phaser!
 */
import { createMachine, assign } from 'xstate';

// ─── Tipos ────────────────────────────────────────────────────────

export type EnemyType = 'patrol' | 'turret';
export type EnemyFacing = 'left' | 'right';

export interface EnemyContext {
  type: EnemyType;
  health: number;
  maxHealth: number;
  facing: EnemyFacing;
  damage: number;
}

export type EnemyEvent =
  | { type: 'TAKE_DAMAGE'; damage: number }
  | { type: 'EDGE_DETECTED' }
  | { type: 'WALL_HIT' }
  | { type: 'PLAYER_IN_RANGE' }
  | { type: 'PLAYER_OUT_OF_RANGE' }
  | { type: 'SHOOT' }
  | { type: 'SHOOT_COOLDOWN_DONE' }
  | { type: 'HURT_END' }
  | { type: 'DEATH_ANIM_DONE' };

// ─── Patrol Machine ──────────────────────────────────────────────

const patrolInitialContext: EnemyContext = {
  type: 'patrol',
  health: 2,
  maxHealth: 2,
  facing: 'left',
  damage: 2,
};

export const patrolMachine = createMachine({
  id: 'patrol',
  initial: 'patrolling',
  context: patrolInitialContext,
  states: {
    /** Andando de um lado ao outro */
    patrolling: {
      on: {
        EDGE_DETECTED: {
          actions: assign({
            facing: ({ context }) =>
              context.facing === 'left' ? 'right' as EnemyFacing : 'left' as EnemyFacing,
          }),
        },
        WALL_HIT: {
          actions: assign({
            facing: ({ context }) =>
              context.facing === 'left' ? 'right' as EnemyFacing : 'left' as EnemyFacing,
          }),
        },
        TAKE_DAMAGE: [
          {
            target: 'dying',
            guard: ({ context, event }) =>
              context.health - (event as unknown as { damage: number }).damage <= 0,
            actions: assign({
              health: 0,
            }),
          },
          {
            target: 'hurt',
            actions: assign({
              health: ({ context, event }) =>
                context.health - (event as unknown as { damage: number }).damage,
            }),
          },
        ],
      },
    },

    /** Tomando dano (flash) */
    hurt: {
      on: {
        HURT_END: { target: 'patrolling' },
      },
    },

    /** Animação de morte */
    dying: {
      on: {
        DEATH_ANIM_DONE: { target: 'dead' },
      },
    },

    /** Morto — remove do jogo */
    dead: {
      type: 'final',
    },
  },
});

// ─── Turret Machine ──────────────────────────────────────────────

const turretInitialContext: EnemyContext = {
  type: 'turret',
  health: 3,
  maxHealth: 3,
  facing: 'left',
  damage: 3,
};

export const turretMachine = createMachine({
  id: 'turret',
  initial: 'idle',
  context: turretInitialContext,
  states: {
    /** Inativo — player fora do range */
    idle: {
      on: {
        PLAYER_IN_RANGE: { target: 'aiming' },
        TAKE_DAMAGE: [
          {
            target: 'dying',
            guard: ({ context, event }) =>
              context.health - (event as unknown as { damage: number }).damage <= 0,
            actions: assign({ health: 0 }),
          },
          {
            target: 'hurt',
            actions: assign({
              health: ({ context, event }) =>
                context.health - (event as unknown as { damage: number }).damage,
            }),
          },
        ],
      },
    },

    /** Mirando no player */
    aiming: {
      on: {
        SHOOT: { target: 'shooting' },
        PLAYER_OUT_OF_RANGE: { target: 'idle' },
        TAKE_DAMAGE: [
          {
            target: 'dying',
            guard: ({ context, event }) =>
              context.health - (event as unknown as { damage: number }).damage <= 0,
            actions: assign({ health: 0 }),
          },
          {
            target: 'hurt',
            actions: assign({
              health: ({ context, event }) =>
                context.health - (event as unknown as { damage: number }).damage,
            }),
          },
        ],
      },
    },

    /** Atirando */
    shooting: {
      on: {
        SHOOT_COOLDOWN_DONE: { target: 'aiming' },
        PLAYER_OUT_OF_RANGE: { target: 'idle' },
        TAKE_DAMAGE: [
          {
            target: 'dying',
            guard: ({ context, event }) =>
              context.health - (event as unknown as { damage: number }).damage <= 0,
            actions: assign({ health: 0 }),
          },
          {
            target: 'hurt',
            actions: assign({
              health: ({ context, event }) =>
                context.health - (event as unknown as { damage: number }).damage,
            }),
          },
        ],
      },
    },

    /** Tomando dano */
    hurt: {
      on: {
        HURT_END: { target: 'idle' },
      },
    },

    /** Morrendo */
    dying: {
      on: {
        DEATH_ANIM_DONE: { target: 'dead' },
      },
    },

    /** Morto */
    dead: {
      type: 'final',
    },
  },
});
