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

  // ─── Dano → Hurt ────────────────────────────────────────────

  it('deve transicionar para hurt ao tomar dano', () => {
    const actor = createActor(playerMachine);
    actor.start();
    actor.send({ type: 'TAKE_DAMAGE', damage: 3 });
    expect(getState(actor)).toBe('hurt');
    expect(getContext(actor).health).toBe(13);
    expect(getContext(actor).isInvulnerable).toBe(true);
    actor.stop();
  });

  it('não deve tomar dano durante invulnerabilidade', () => {
    const actor = createActor(playerMachine);
    actor.start();
    actor.send({ type: 'TAKE_DAMAGE', damage: 3 });
    expect(getState(actor)).toBe('hurt');
    actor.send({ type: 'HURT_END' });
    // Ainda invulnerável (i-frames)
    actor.send({ type: 'TAKE_DAMAGE', damage: 5 });
    expect(getState(actor)).toBe('idle'); // Não transitou para hurt de novo
    expect(getContext(actor).health).toBe(13); // Dano não aplicado
    actor.stop();
  });

  it('deve voltar para idle após HURT_END', () => {
    const actor = createActor(playerMachine);
    actor.start();
    actor.send({ type: 'TAKE_DAMAGE', damage: 2 });
    expect(getState(actor)).toBe('hurt');
    actor.send({ type: 'HURT_END' });
    expect(getState(actor)).toBe('idle');
    actor.stop();
  });

  it('deve desligar invulnerabilidade após INVULNERABILITY_END', () => {
    const actor = createActor(playerMachine);
    actor.start();
    actor.send({ type: 'TAKE_DAMAGE', damage: 2 });
    actor.send({ type: 'HURT_END' });
    actor.send({ type: 'INVULNERABILITY_END' });
    expect(getContext(actor).isInvulnerable).toBe(false);
    // Agora pode tomar dano novamente
    actor.send({ type: 'TAKE_DAMAGE', damage: 3 });
    expect(getState(actor)).toBe('hurt');
    expect(getContext(actor).health).toBe(11);
    actor.stop();
  });

  // ─── Morte (Dead) ──────────────────────────────────────────

  it('deve transicionar para dead quando health chega a 0', () => {
    const actor = createActor(playerMachine);
    actor.start();
    actor.send({ type: 'TAKE_DAMAGE', damage: 16 });
    expect(getState(actor)).toBe('dead');
    expect(getContext(actor).health).toBe(0);
    actor.stop();
  });

  it('deve perder 1 vida ao morrer', () => {
    const actor = createActor(playerMachine);
    actor.start();
    expect(getContext(actor).lives).toBe(3);
    actor.send({ type: 'TAKE_DAMAGE', damage: 16 });
    expect(getState(actor)).toBe('dead');
    expect(getContext(actor).lives).toBe(2);
    actor.stop();
  });

  // ─── Pit Death ─────────────────────────────────────────────

  it('deve transicionar para dead ao cair no buraco', () => {
    const actor = createActor(playerMachine);
    actor.start();
    actor.send({ type: 'PIT_DEATH' });
    expect(getState(actor)).toBe('dead');
    expect(getContext(actor).lives).toBe(2);
    actor.stop();
  });

  it('deve permitir pit death de qualquer estado', () => {
    const actor = createActor(playerMachine);
    actor.start();
    actor.send({ type: 'JUMP' });
    actor.send({ type: 'FALL' });
    actor.send({ type: 'PIT_DEATH' });
    expect(getState(actor)).toBe('dead');
    actor.stop();
  });

  // ─── Respawn ───────────────────────────────────────────────

  it('deve fazer respawn se tem vidas restantes', () => {
    const actor = createActor(playerMachine);
    actor.start();
    actor.send({ type: 'PIT_DEATH' }); // lives: 3 → 2
    expect(getState(actor)).toBe('dead');
    actor.send({ type: 'RESPAWN' });
    expect(getState(actor)).toBe('idle');
    expect(getContext(actor).health).toBe(16); // Full HP
    expect(getContext(actor).isInvulnerable).toBe(true);
    expect(getContext(actor).lives).toBe(2);
    actor.stop();
  });

  it('não deve permitir respawn sem vidas', () => {
    const actor = createActor(playerMachine);
    actor.start();
    // Morre 3 vezes
    actor.send({ type: 'PIT_DEATH' }); // lives 3 → 2
    actor.send({ type: 'RESPAWN' });
    actor.send({ type: 'INVULNERABILITY_END' });
    actor.send({ type: 'PIT_DEATH' }); // lives 2 → 1
    actor.send({ type: 'RESPAWN' });
    actor.send({ type: 'INVULNERABILITY_END' });
    actor.send({ type: 'PIT_DEATH' }); // lives 1 → 0
    expect(getContext(actor).lives).toBe(0);
    actor.send({ type: 'RESPAWN' }); // Deve ser bloqueado
    expect(getState(actor)).toBe('dead'); // Permanece dead
    actor.stop();
  });

  // ─── Cura ────────────────────────────────────────────────

  it('deve curar até o máximo', () => {
    const actor = createActor(playerMachine);
    actor.start();
    actor.send({ type: 'TAKE_DAMAGE', damage: 5 });
    actor.send({ type: 'HURT_END' });
    actor.send({ type: 'INVULNERABILITY_END' });
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

  it('deve completar ciclo de vida: dano → hurt → idle → dano mortal → dead → respawn', () => {
    const actor = createActor(playerMachine);
    actor.start();

    // Sofre dano
    actor.send({ type: 'TAKE_DAMAGE', damage: 5 });
    expect(getState(actor)).toBe('hurt');
    expect(getContext(actor).health).toBe(11);

    // Recupera do hurt
    actor.send({ type: 'HURT_END' });
    expect(getState(actor)).toBe('idle');

    // Fim da invulnerabilidade
    actor.send({ type: 'INVULNERABILITY_END' });
    expect(getContext(actor).isInvulnerable).toBe(false);

    // Dano mortal
    actor.send({ type: 'TAKE_DAMAGE', damage: 11 });
    expect(getState(actor)).toBe('dead');
    expect(getContext(actor).health).toBe(0);
    expect(getContext(actor).lives).toBe(2);

    // Respawn
    actor.send({ type: 'RESPAWN' });
    expect(getState(actor)).toBe('idle');
    expect(getContext(actor).health).toBe(16);

    actor.stop();
  });
});

