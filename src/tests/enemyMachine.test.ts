/**
 * enemyMachine.test.ts — Testes da Máquina de Estado dos Inimigos
 *
 * 🧪 TDD: lógica pura, sem Phaser!
 */
import { describe, it, expect } from 'vitest';
import { createActor } from 'xstate';
import { patrolMachine, turretMachine } from '../core/machines/enemyMachine';

describe('patrolMachine', () => {
  function getState(actor: ReturnType<typeof createActor<typeof patrolMachine>>) {
    return actor.getSnapshot().value;
  }
  function getContext(actor: ReturnType<typeof createActor<typeof patrolMachine>>) {
    return actor.getSnapshot().context;
  }

  it('deve iniciar patrulhando', () => {
    const actor = createActor(patrolMachine);
    actor.start();
    expect(getState(actor)).toBe('patrolling');
    expect(getContext(actor).facing).toBe('left');
    actor.stop();
  });

  it('deve inverter direção ao detectar borda', () => {
    const actor = createActor(patrolMachine);
    actor.start();
    expect(getContext(actor).facing).toBe('left');
    actor.send({ type: 'EDGE_DETECTED' });
    expect(getContext(actor).facing).toBe('right');
    actor.send({ type: 'EDGE_DETECTED' });
    expect(getContext(actor).facing).toBe('left');
    actor.stop();
  });

  it('deve inverter ao bater na parede', () => {
    const actor = createActor(patrolMachine);
    actor.start();
    actor.send({ type: 'WALL_HIT' });
    expect(getContext(actor).facing).toBe('right');
    actor.stop();
  });

  it('deve ir para hurt ao tomar dano não mortal', () => {
    const actor = createActor(patrolMachine);
    actor.start();
    actor.send({ type: 'TAKE_DAMAGE', damage: 1 });
    expect(getState(actor)).toBe('hurt');
    expect(getContext(actor).health).toBe(1);
    actor.stop();
  });

  it('deve voltar a patrulhar após hurt', () => {
    const actor = createActor(patrolMachine);
    actor.start();
    actor.send({ type: 'TAKE_DAMAGE', damage: 1 });
    actor.send({ type: 'HURT_END' });
    expect(getState(actor)).toBe('patrolling');
    actor.stop();
  });

  it('deve morrer ao tomar dano mortal', () => {
    const actor = createActor(patrolMachine);
    actor.start();
    actor.send({ type: 'TAKE_DAMAGE', damage: 2 });
    expect(getState(actor)).toBe('dying');
    expect(getContext(actor).health).toBe(0);
    actor.send({ type: 'DEATH_ANIM_DONE' });
    expect(getState(actor)).toBe('dead');
    actor.stop();
  });
});

describe('turretMachine', () => {
  function getState(actor: ReturnType<typeof createActor<typeof turretMachine>>) {
    return actor.getSnapshot().value;
  }
  function getContext(actor: ReturnType<typeof createActor<typeof turretMachine>>) {
    return actor.getSnapshot().context;
  }

  it('deve iniciar em idle', () => {
    const actor = createActor(turretMachine);
    actor.start();
    expect(getState(actor)).toBe('idle');
    expect(getContext(actor).health).toBe(3);
    actor.stop();
  });

  it('deve mirar quando player entra em range', () => {
    const actor = createActor(turretMachine);
    actor.start();
    actor.send({ type: 'PLAYER_IN_RANGE' });
    expect(getState(actor)).toBe('aiming');
    actor.stop();
  });

  it('deve atirar e voltar a mirar', () => {
    const actor = createActor(turretMachine);
    actor.start();
    actor.send({ type: 'PLAYER_IN_RANGE' });
    actor.send({ type: 'SHOOT' });
    expect(getState(actor)).toBe('shooting');
    actor.send({ type: 'SHOOT_COOLDOWN_DONE' });
    expect(getState(actor)).toBe('aiming');
    actor.stop();
  });

  it('deve voltar ao idle quando player sai do range', () => {
    const actor = createActor(turretMachine);
    actor.start();
    actor.send({ type: 'PLAYER_IN_RANGE' });
    actor.send({ type: 'PLAYER_OUT_OF_RANGE' });
    expect(getState(actor)).toBe('idle');
    actor.stop();
  });

  it('deve morrer com dano mortal', () => {
    const actor = createActor(turretMachine);
    actor.start();
    actor.send({ type: 'TAKE_DAMAGE', damage: 3 });
    expect(getState(actor)).toBe('dying');
    actor.send({ type: 'DEATH_ANIM_DONE' });
    expect(getState(actor)).toBe('dead');
    actor.stop();
  });

  it('deve tomar dano parcial e se recuperar', () => {
    const actor = createActor(turretMachine);
    actor.start();
    actor.send({ type: 'TAKE_DAMAGE', damage: 1 });
    expect(getState(actor)).toBe('hurt');
    expect(getContext(actor).health).toBe(2);
    actor.send({ type: 'HURT_END' });
    expect(getState(actor)).toBe('idle');
    actor.stop();
  });
});
