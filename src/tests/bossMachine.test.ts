/**
 * bossMachine.test.ts — Testes do Boss State Machine
 */
import { describe, it, expect } from 'vitest';
import { createActor } from 'xstate';
import { bossMachine } from '../core/machines/bossMachine';

describe('bossMachine', () => {
  function createBoss() {
    const actor = createActor(bossMachine);
    actor.start();
    return actor;
  }

  it('starts in intro state', () => {
    const actor = createBoss();
    expect(actor.getSnapshot().value).toBe('intro');
    actor.stop();
  });

  it('transitions from intro to idle', () => {
    const actor = createBoss();
    actor.send({ type: 'INTRO_DONE' });
    expect(actor.getSnapshot().value).toBe('idle');
    actor.stop();
  });

  it('can jump from idle', () => {
    const actor = createBoss();
    actor.send({ type: 'INTRO_DONE' });
    actor.send({ type: 'JUMP' });
    expect(actor.getSnapshot().value).toBe('jumping');
    actor.stop();
  });

  it('lands after jumping', () => {
    const actor = createBoss();
    actor.send({ type: 'INTRO_DONE' });
    actor.send({ type: 'JUMP' });
    actor.send({ type: 'LAND' });
    expect(actor.getSnapshot().value).toBe('idle');
    actor.stop();
  });

  it('can shoot from idle', () => {
    const actor = createBoss();
    actor.send({ type: 'INTRO_DONE' });
    actor.send({ type: 'SHOOT' });
    expect(actor.getSnapshot().value).toBe('shooting');
    actor.stop();
  });

  it('returns to idle after shoot done', () => {
    const actor = createBoss();
    actor.send({ type: 'INTRO_DONE' });
    actor.send({ type: 'SHOOT' });
    actor.send({ type: 'SHOOT_DONE' });
    expect(actor.getSnapshot().value).toBe('idle');
    actor.stop();
  });

  it('takes damage and transitions to hurt', () => {
    const actor = createBoss();
    actor.send({ type: 'INTRO_DONE' });
    actor.send({ type: 'TAKE_DAMAGE', damage: 3 } as any);
    expect(actor.getSnapshot().value).toBe('hurt');
    expect(actor.getSnapshot().context.health).toBe(17);
    actor.stop();
  });

  it('phase changes from 1 to 2 at 60% HP', () => {
    const actor = createBoss();
    actor.send({ type: 'INTRO_DONE' });
    // HP 20 → 12 (60%) = phase 2
    actor.send({ type: 'TAKE_DAMAGE', damage: 8 } as any);
    expect(actor.getSnapshot().context.phase).toBe(2);
    actor.stop();
  });

  it('phase changes to 3 at 30% HP', () => {
    const actor = createBoss();
    actor.send({ type: 'INTRO_DONE' });
    // HP 20 → 6 (30%) = phase 3
    actor.send({ type: 'TAKE_DAMAGE', damage: 14 } as any);
    expect(actor.getSnapshot().context.phase).toBe(3);
    actor.stop();
  });

  it('slam is blocked in phase 1', () => {
    const actor = createBoss();
    actor.send({ type: 'INTRO_DONE' });
    actor.send({ type: 'SLAM' });
    // Should stay in idle (guard blocks)
    expect(actor.getSnapshot().value).toBe('idle');
    actor.stop();
  });

  it('slam allowed in phase 2', () => {
    const actor = createBoss();
    actor.send({ type: 'INTRO_DONE' });
    // Get to phase 2
    actor.send({ type: 'TAKE_DAMAGE', damage: 9 } as any);
    actor.send({ type: 'HURT_END' });
    actor.send({ type: 'SLAM' });
    expect(actor.getSnapshot().value).toBe('slamming');
    actor.stop();
  });

  it('dies when HP reaches 0', () => {
    const actor = createBoss();
    actor.send({ type: 'INTRO_DONE' });
    actor.send({ type: 'TAKE_DAMAGE', damage: 20 } as any);
    expect(actor.getSnapshot().value).toBe('dying');
    actor.send({ type: 'DEATH_ANIM_DONE' });
    expect(actor.getSnapshot().value).toBe('dead');
    actor.stop();
  });

  it('starts with correct initial values', () => {
    const actor = createBoss();
    const ctx = actor.getSnapshot().context;
    expect(ctx.health).toBe(20);
    expect(ctx.maxHealth).toBe(20);
    expect(ctx.phase).toBe(1);
    expect(ctx.damage).toBe(3);
    actor.stop();
  });
});
