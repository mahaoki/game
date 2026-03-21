/**
 * scaleConstants.ts — Constantes Centrais de Escala
 *
 * Fator de escala que controla a resolução interna do jogo.
 * Alterar S aqui escala todo o jogo proporcionalmente.
 *
 * 🎮 S=1 → 320×180 (original), S=2 → 640×360 (HD)
 */

/** Fator de escala global */
export const S = 2;

/** Resolução interna escalada */
export const GAME_WIDTH = 320 * S;   // 640
export const GAME_HEIGHT = 180 * S;  // 360

/** Zoom inverso (mantém a mesma tela final: 1280×720) */
export const GAME_ZOOM = 4 / S;     // 2

/**
 * Helper: converte um tamanho de fonte base para a escala atual.
 * @param basePx - Tamanho em pixels na escala original (320×180)
 * @returns String formatada para Phaser (ex: '16px')
 */
export function fontSize(basePx: number): string {
  return `${basePx * S}px`;
}
