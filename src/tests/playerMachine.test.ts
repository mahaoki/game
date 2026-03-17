/**
 * playerMachine.test.ts — Testes da Máquina de Estado do Player
 *
 * Verifica que as transições de estado funcionam corretamente:
 *   - Movimentação (idle ↔ running)
 *   - Pulo (idle/running → jumping → falling → idle)
 *   - Dash (com cooldown)
 *   - Tiro (global, com cooldown)
 *   - Dano e cura
 *
 * 🧪 TDD: lógica pura, sem Phaser!
 */
import { describe, it, expect } from 'vitest';
import { createActor } from 'xstate';
import { playerMachine } from '../core/machines/playerMachine';

describe('playerMachine', () => {
  function getState(actor: ReturnType<typeof createActor<typeof playerMachine>>) {
    return actor.getSnapshot().value;
  }

  function getContext(actor: ReturnType<typeof createActor<typeof playerMachine>>) {
    return actor.getSnapshot().context;
  }

  // ─── Estado inicial ─────────────────────────────────────────

  it('deve iniciar no estado "idle"', () => {
    const actor = createActor(playerMachine);
    actor.start();
    expect(getState(actor)).toBe('idle');
    expect(getContext(actor).facing).toBe('right');
    expect(getContext(actor).health).toBe(16);
    actor.stop();
  });

  // ─── Movimentação ────────────────────────────────────────────

  it('deve transicionar idle → running ao mover', () => {
    const actor = createActor(playerMachine);
    actor.start();
    actor.send({ type: 'MOVE_RIGHT' });
    expect(getState(actor)).toBe('running');
    expect(getContext(actor).facing).toBe('right');
    actor.stop();
  });

  it('deve trocar facing ao mudar de direção', () => {
    const actor = createActor(playerMachine);
    actor.start();
    actor.send({ type: 'MOVE_LEFT' });
    expect(getContext(actor).facing).toBe('left');
    actor.send({ type: 'MOVE_RIGHT' });
    expect(getContext(actor).facing).toBe('right');
    actor.stop();
  });

  it('deve transicionar running → idle ao parar', () => {
    const actor = createActor(playerMachine);
    actor.start();
    actor.send({ type: 'MOVE_RIGHT' });
    actor.send({ type: 'STOP' });
    expect(getState(actor)).toBe('idle');
    actor.stop();
  });

  // ─── Pulo ───────────────────────────────────────────────────

  it('deve transicionar idle → jumping ao pular', () => {
    const actor = createActor(playerMachine);
    actor.start();
    actor.send({ type: 'JUMP' });
    expect(getState(actor)).toBe('jumping');
    actor.stop();
  });

  it('deve transicionar running → jumping ao pular correndo', () => {
    const actor = createActor(playerMachine);
    actor.start();
    actor.send({ type: 'MOVE_RIGHT' });
    actor.send({ type: 'JUMP' });
    expect(getState(actor)).toBe('jumping');
    actor.stop();
  });

  it('deve transicionar jumping → falling', () => {
    const actor = createActor(playerMachine);
    actor.start();
    actor.send({ type: 'JUMP' });
    actor.send({ type: 'FALL' });
    expect(getState(actor)).toBe('falling');
    actor.stop();
  });

  it('deve transicionar falling → idle ao pousar', () => {
    const actor = createActor(playerMachine);
    actor.start();
    actor.send({ type: 'JUMP' });
    actor.send({ type: 'FALL' });
    actor.send({ type: 'LAND' });
    expect(getState(actor)).toBe('idle');
    actor.stop();
  });

  it('deve permitir mudar facing no ar', () => {
    const actor = createActor(playerMachine);
    actor.start();
    actor.send({ type: 'JUMP' });
    actor.send({ type: 'MOVE_LEFT' });
    expect(getContext(actor).facing).toBe('left');
    expect(getState(actor)).toBe('jumping'); // Não muda de estado
    actor.stop();
  });

  // ─── Dash ───────────────────────────────────────────────────

  it('deve transicionar idle → dashing ao dar dash', () => {
    const actor = createActor(playerMachine);
    actor.start();
    actor.send({ type: 'DASH' });
    expect(getState(actor)).toBe('dashing');
    actor.stop();
  });

  it('deve transicionar dashing → idle ao terminar dash', () => {
    const actor = createActor(playerMachine);
    actor.start();
    actor.send({ type: 'DASH' });
    actor.send({ type: 'DASH_END' });
    expect(getState(actor)).toBe('idle');
    expect(getContext(actor).canDash).toBe(false); // Cooldown ativo
    actor.stop();
  });

  it('não deve permitir dash durante cooldown', () => {
    const actor = createActor(playerMachine);
    actor.start();
    actor.send({ type: 'DASH' });
    actor.send({ type: 'DASH_END' }); // canDash = false
    actor.send({ type: 'DASH' }); // Deve ser ignorado
    expect(getState(actor)).toBe('idle'); // Não deu dash
    actor.stop();
  });

  it('deve reabilitar dash após cooldown reset', () => {
    const actor = createActor(playerMachine);
    actor.start();
    actor.send({ type: 'DASH' });
    actor.send({ type: 'DASH_END' });
    actor.send({ type: 'DASH_COOLDOWN_RESET' });
    expect(getContext(actor).canDash).toBe(true);
    actor.send({ type: 'DASH' }); // Agora funciona
    expect(getState(actor)).toBe('dashing');
    actor.stop();
  });

  // ─── Tiro (global) ─────────────────────────────────────────

  it('deve atualizar isShooting ao atirar', () => {
    const actor = createActor(playerMachine);
    actor.start();
    actor.send({ type: 'SHOOT' });
    expect(getContext(actor).isShooting).toBe(true);
    expect(getContext(actor).canShoot).toBe(false); // Cooldown
    actor.stop();
  });

  it('deve permitir tiro em qualquer estado terrestre', () => {
    const actor = createActor(playerMachine);
    actor.start();

    // Tiro parado
    actor.send({ type: 'SHOOT' });
    expect(getContext(actor).isShooting).toBe(true);
    expect(getState(actor)).toBe('idle'); // Não muda de estado

    actor.send({ type: 'SHOOT_END' });
    actor.send({ type: 'SHOOT_COOLDOWN_RESET' });

    // Tiro correndo
    actor.send({ type: 'MOVE_RIGHT' });
    actor.send({ type: 'SHOOT' });
    expect(getContext(actor).isShooting).toBe(true);
    expect(getState(actor)).toBe('running'); // Continua correndo

    actor.stop();
  });

  it('não deve permitir tiro durante cooldown', () => {
    const actor = createActor(playerMachine);
    actor.start();
    actor.send({ type: 'SHOOT' }); // canShoot = false
    actor.send({ type: 'SHOOT_END' });
    actor.send({ type: 'SHOOT' }); // Ainda em cooldown
    expect(getContext(actor).isShooting).toBe(false);
    actor.stop();
  });

  // ─── Dano e Cura ────────────────────────────────────────────

  it('deve reduzir health ao tomar dano', () => {
    const actor = createActor(playerMachine);
    actor.start();
    actor.send({ type: 'TAKE_DAMAGE', damage: 3 });
    expect(getContext(actor).health).toBe(13);
    actor.stop();
  });

  it('health não deve ficar abaixo de 0', () => {
    const actor = createActor(playerMachine);
    actor.start();
    actor.send({ type: 'TAKE_DAMAGE', damage: 100 });
    expect(getContext(actor).health).toBe(0);
    actor.stop();
  });

  it('deve curar até o máximo', () => {
    const actor = createActor(playerMachine);
    actor.start();
    actor.send({ type: 'TAKE_DAMAGE', damage: 5 });
    actor.send({ type: 'HEAL', amount: 3 });
    expect(getContext(actor).health).toBe(14);
    actor.stop();
  });

  it('cura não deve ultrapassar maxHealth', () => {
    const actor = createActor(playerMachine);
    actor.start();
    actor.send({ type: 'HEAL', amount: 100 });
    expect(getContext(actor).health).toBe(16);
    actor.stop();
  });

  // ─── Fluxo completo ────────────────────────────────────────

  it('deve completar um ciclo: andar → pular → cair → pousar → atirar → dash', () => {
    const actor = createActor(playerMachine);
    actor.start();

    // Andar
    actor.send({ type: 'MOVE_RIGHT' });
    expect(getState(actor)).toBe('running');

    // Pular
    actor.send({ type: 'JUMP' });
    expect(getState(actor)).toBe('jumping');

    // Cair
    actor.send({ type: 'FALL' });
    expect(getState(actor)).toBe('falling');

    // Pousar
    actor.send({ type: 'LAND' });
    expect(getState(actor)).toBe('idle');

    // Atirar
    actor.send({ type: 'SHOOT' });
    expect(getContext(actor).isShooting).toBe(true);
    actor.send({ type: 'SHOOT_END' });
    actor.send({ type: 'SHOOT_COOLDOWN_RESET' });

    // Dash
    actor.send({ type: 'DASH' });
    expect(getState(actor)).toBe('dashing');
    actor.send({ type: 'DASH_END' });
    expect(getState(actor)).toBe('idle');

    actor.stop();
  });
});
