/**
 * menuMachine.ts — Máquina de Estado do Menu (XState 5)
 *
 * Controla o fluxo: Boot → Title → WaitingInput → TransitionOut → GameScene
 *
 * 🧠 Lógica pura — sem dependência do Phaser!
 * Isso permite testar 100% da lógica de menu sem renderização.
 */
import { createMachine } from 'xstate';

/**
 * Eventos que a máquina aceita.
 * Cada evento representa algo que aconteceu no jogo.
 */
export type MenuEvent =
  | { type: 'ASSETS_LOADED' }     // Assets terminaram de carregar
  | { type: 'ENTER_TITLE' }       // Animação de entrada do título terminou
  | { type: 'START_PRESSED' }     // Jogador pressionou Start
  | { type: 'TRANSITION_DONE' };  // Animação de saída terminou

/**
 * Estados possíveis do menu
 */
export type MenuState = 'boot' | 'title' | 'waitingInput' | 'transitionOut' | 'gameScene';

/**
 * Máquina de estado do fluxo de menus.
 *
 * ```
 * Boot ──ASSETS_LOADED──► Title ──ENTER_TITLE──► WaitingInput
 *                                                    │
 *                                              START_PRESSED
 *                                                    │
 *                                                    ▼
 *                                              TransitionOut
 *                                                    │
 *                                             TRANSITION_DONE
 *                                                    │
 *                                                    ▼
 *                                                GameScene
 * ```
 */
export const menuMachine = createMachine({
  id: 'menu',
  initial: 'boot',
  states: {
    /** Carregando assets (sprites, sons, fontes) */
    boot: {
      on: {
        ASSETS_LOADED: { target: 'title' },
      },
    },

    /** Logo aparecendo com animação */
    title: {
      on: {
        ENTER_TITLE: { target: 'waitingInput' },
      },
    },

    /** "Press Start" piscando — aguardando input do jogador */
    waitingInput: {
      on: {
        START_PRESSED: { target: 'transitionOut' },
      },
    },

    /** Animação de saída (fade-out) */
    transitionOut: {
      on: {
        TRANSITION_DONE: { target: 'gameScene' },
      },
    },

    /** Cena do jogo — estado final do menu */
    gameScene: {
      type: 'final',
    },
  },
});
