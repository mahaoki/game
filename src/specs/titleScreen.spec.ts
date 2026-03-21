/**
 * titleScreen.spec.ts — Schema de configuração da Title Screen
 *
 * Define o contrato de dados para a tela inicial.
 * Validação com Zod garante que os textos e timings estão corretos.
 */
import { z } from 'zod';
import { S } from '../config/scaleConstants';

/** Schema de configuração da animação de entrada */
const TitleAnimationSchema = z.object({
  /** Duração do logo descendo (ms) */
  logoBounceMs: z.number().positive().default(800),
  /** Easing da animação do logo */
  logoEasing: z.string().default('Bounce.easeOut'),
  /** Posição Y de onde o logo começa (fora da tela) */
  logoStartY: z.number().default(-50 * S),
  /** Posição Y final do logo */
  logoEndY: z.number().default(50 * S),
  /** Intervalo de piscar do "Press Start" (ms) */
  blinkIntervalMs: z.number().positive().default(500),
  /** Duração do fade-out ao iniciar (ms) */
  fadeOutMs: z.number().positive().default(600),
});

/** Schema completo da Title Screen */
export const TitleScreenConfigSchema = z.object({
  /** Texto principal de ação */
  startText: z.string().default('PRESS START'),
  /** Texto de versão */
  versionText: z.string().default('v0.1.0'),
  /** Configuração de animações */
  animation: TitleAnimationSchema.default({}),
  /** Cor do texto */
  textColor: z.string().default('#ffffff'),
  /** Cor do texto de versão */
  versionColor: z.string().default('#666666'),
});

/** Tipo derivado do schema */
export type TitleScreenConfig = z.infer<typeof TitleScreenConfigSchema>;

/**
 * Retorna a configuração padrão validada da Title Screen.
 * Use overrides para customizar valores individuais.
 */
export function getTitleScreenConfig(
  overrides: Partial<TitleScreenConfig> = {}
): TitleScreenConfig {
  return TitleScreenConfigSchema.parse(overrides);
}
