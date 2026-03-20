/**
 * bossMachine.ts — Máquina de Estado do Boss (XState 5)
 *
 * Vulcan Lord — 3 fases baseadas em HP:
 *   Phase 1 (100–60%): pula e atira 3 projéteis
 *   Phase 2 (60–30%): adiciona ground slam
 *   Phase 3 (<30%): enrage, velocidade +50%
 *
 * 🧠 Lógica pura — sem dependência do Phaser!
 */
import { createMachine, assign } from 'xstate';

export interface BossContext {
  health: number;
  maxHealth: number;
  phase: 1 | 2 | 3;
  facing: 'left' | 'right';
  damage: number;
}

export type BossEvent =
  | { type: 'TAKE_DAMAGE'; damage: number }
  | { type: 'INTRO_DONE' }
  | { type: 'JUMP' }
  | { type: 'LAND' }
  | { type: 'SHOOT' }
  | { type: 'SHOOT_DONE' }
  | { type: 'SLAM' }
  | { type: 'SLAM_DONE' }
  | { type: 'HURT_END' }
  | { type: 'DEATH_ANIM_DONE' };

function getPhase(health: number, maxHealth: number): 1 | 2 | 3 {
  const pct = health / maxHealth;
  if (pct > 0.6) return 1;
  if (pct > 0.3) return 2;
  return 3;
}

export const bossMachine = createMachine({
  id: 'boss',
  initial: 'intro',
  context: {
    health: 20,
    maxHealth: 20,
    phase: 1 as 1 | 2 | 3,
    facing: 'left' as 'left' | 'right',
    damage: 3,
  },
  states: {
    /** Cutscene de entrada do boss */
    intro: {
      on: {
        INTRO_DONE: { target: 'idle' },
      },
    },

    /** Parado — decide próxima ação */
    idle: {
      on: {
        JUMP: { target: 'jumping' },
        SHOOT: { target: 'shooting' },
        SLAM: {
          target: 'slamming',
          guard: ({ context }) => context.phase >= 2,
        },
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
              health: ({ context, event }) => {
                const newHP = context.health - (event as unknown as { damage: number }).damage;
                return Math.max(0, newHP);
              },
              phase: ({ context, event }) => {
                const newHP = context.health - (event as unknown as { damage: number }).damage;
                return getPhase(Math.max(0, newHP), context.maxHealth);
              },
            }),
          },
        ],
      },
    },

    /** Pulando */
    jumping: {
      on: {
        LAND: { target: 'idle' },
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
              health: ({ context, event }) => {
                const newHP = context.health - (event as unknown as { damage: number }).damage;
                return Math.max(0, newHP);
              },
              phase: ({ context, event }) => {
                const newHP = context.health - (event as unknown as { damage: number }).damage;
                return getPhase(Math.max(0, newHP), context.maxHealth);
              },
            }),
          },
        ],
      },
    },

    /** Atirando projéteis */
    shooting: {
      on: {
        SHOOT_DONE: { target: 'idle' },
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
              health: ({ context, event }) => {
                const newHP = context.health - (event as unknown as { damage: number }).damage;
                return Math.max(0, newHP);
              },
              phase: ({ context, event }) => {
                const newHP = context.health - (event as unknown as { damage: number }).damage;
                return getPhase(Math.max(0, newHP), context.maxHealth);
              },
            }),
          },
        ],
      },
    },

    /** Ground slam (fase 2+) */
    slamming: {
      on: {
        SLAM_DONE: { target: 'idle' },
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
              health: ({ context, event }) => {
                const newHP = context.health - (event as unknown as { damage: number }).damage;
                return Math.max(0, newHP);
              },
              phase: ({ context, event }) => {
                const newHP = context.health - (event as unknown as { damage: number }).damage;
                return getPhase(Math.max(0, newHP), context.maxHealth);
              },
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
