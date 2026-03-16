/**
 * menuMachine.test.ts — Testes da Máquina de Estado do Menu
 *
 * Verifica que as transições acontecem na ordem correta:
 *   Boot → Title → WaitingInput → TransitionOut → GameScene
 *
 * 🧪 TDD: estes testes foram escritos ANTES da implementação (Red → Green)
 */
import { describe, it, expect } from 'vitest';
import { createActor } from 'xstate';
import { menuMachine } from '../core/machines/menuMachine';

describe('menuMachine', () => {
  /** Helper: cria um ator e retorna o estado atual */
  function getState(actor: ReturnType<typeof createActor<typeof menuMachine>>) {
    return actor.getSnapshot().value;
  }

  it('deve iniciar no estado "boot"', () => {
    const actor = createActor(menuMachine);
    actor.start();
    expect(getState(actor)).toBe('boot');
    actor.stop();
  });

  it('deve transicionar de boot → title ao receber ASSETS_LOADED', () => {
    const actor = createActor(menuMachine);
    actor.start();
    actor.send({ type: 'ASSETS_LOADED' });
    expect(getState(actor)).toBe('title');
    actor.stop();
  });

  it('deve transicionar de title → waitingInput ao receber ENTER_TITLE', () => {
    const actor = createActor(menuMachine);
    actor.start();
    actor.send({ type: 'ASSETS_LOADED' });
    actor.send({ type: 'ENTER_TITLE' });
    expect(getState(actor)).toBe('waitingInput');
    actor.stop();
  });

  it('deve transicionar de waitingInput → transitionOut ao receber START_PRESSED', () => {
    const actor = createActor(menuMachine);
    actor.start();
    actor.send({ type: 'ASSETS_LOADED' });
    actor.send({ type: 'ENTER_TITLE' });
    actor.send({ type: 'START_PRESSED' });
    expect(getState(actor)).toBe('transitionOut');
    actor.stop();
  });

  it('deve transicionar de transitionOut → gameScene ao receber TRANSITION_DONE', () => {
    const actor = createActor(menuMachine);
    actor.start();
    actor.send({ type: 'ASSETS_LOADED' });
    actor.send({ type: 'ENTER_TITLE' });
    actor.send({ type: 'START_PRESSED' });
    actor.send({ type: 'TRANSITION_DONE' });
    expect(getState(actor)).toBe('gameScene');
    actor.stop();
  });

  it('gameScene deve ser um estado final', () => {
    const actor = createActor(menuMachine);
    actor.start();
    actor.send({ type: 'ASSETS_LOADED' });
    actor.send({ type: 'ENTER_TITLE' });
    actor.send({ type: 'START_PRESSED' });
    actor.send({ type: 'TRANSITION_DONE' });
    expect(actor.getSnapshot().status).toBe('done');
    actor.stop();
  });

  // ─── Testes de eventos inválidos ───────────────────────────

  it('deve ignorar START_PRESSED no estado boot', () => {
    const actor = createActor(menuMachine);
    actor.start();
    actor.send({ type: 'START_PRESSED' });
    expect(getState(actor)).toBe('boot'); // Não mudou!
    actor.stop();
  });

  it('deve ignorar ASSETS_LOADED no estado waitingInput', () => {
    const actor = createActor(menuMachine);
    actor.start();
    actor.send({ type: 'ASSETS_LOADED' });
    actor.send({ type: 'ENTER_TITLE' });
    actor.send({ type: 'ASSETS_LOADED' }); // Evento inválido neste estado
    expect(getState(actor)).toBe('waitingInput'); // Não voltou para title
    actor.stop();
  });

  it('deve ignorar ENTER_TITLE no estado transitionOut', () => {
    const actor = createActor(menuMachine);
    actor.start();
    actor.send({ type: 'ASSETS_LOADED' });
    actor.send({ type: 'ENTER_TITLE' });
    actor.send({ type: 'START_PRESSED' });
    actor.send({ type: 'ENTER_TITLE' }); // Evento inválido neste estado
    expect(getState(actor)).toBe('transitionOut'); // Não voltou
    actor.stop();
  });

  // ─── Fluxo completo ───────────────────────────────────────

  it('deve completar o fluxo inteiro: boot → title → waitingInput → transitionOut → gameScene', () => {
    const actor = createActor(menuMachine);
    actor.start();

    expect(getState(actor)).toBe('boot');
    actor.send({ type: 'ASSETS_LOADED' });
    expect(getState(actor)).toBe('title');
    actor.send({ type: 'ENTER_TITLE' });
    expect(getState(actor)).toBe('waitingInput');
    actor.send({ type: 'START_PRESSED' });
    expect(getState(actor)).toBe('transitionOut');
    actor.send({ type: 'TRANSITION_DONE' });
    expect(getState(actor)).toBe('gameScene');
    expect(actor.getSnapshot().status).toBe('done');

    actor.stop();
  });
});
