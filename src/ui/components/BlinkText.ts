/**
 * BlinkText.ts — Componente de Texto Piscante
 *
 * Cria um texto Phaser que pisca (aparece e some) em intervalo regular.
 * Usado para o "PRESS START" da Title Screen.
 *
 * 💡 Não depende de lógica de negócio — é um componente visual puro.
 */
import Phaser from 'phaser';

export interface BlinkTextConfig {
  /** Cena onde o texto será criado */
  scene: Phaser.Scene;
  /** Posição X (centro) */
  x: number;
  /** Posição Y (centro) */
  y: number;
  /** Texto a exibir */
  text: string;
  /** Estilo do texto */
  style?: Phaser.Types.GameObjects.Text.TextStyle;
  /** Intervalo de piscar em ms (default: 500) */
  blinkInterval?: number;
}

/**
 * Cria um texto que pisca na tela.
 *
 * @returns Objeto com o texto e um método `destroy()` para limpar o timer
 */
export function createBlinkText(config: BlinkTextConfig) {
  const {
    scene,
    x,
    y,
    text,
    style = {},
    blinkInterval = 500,
  } = config;

  // Cria o texto centralizado
  const textObject = scene.add
    .text(x, y, text, {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '8px',
      color: '#ffffff',
      ...style,
    })
    .setOrigin(0.5);

  // Timer que alterna visibilidade
  const timer = scene.time.addEvent({
    delay: blinkInterval,
    loop: true,
    callback: () => {
      textObject.setVisible(!textObject.visible);
    },
  });

  return {
    textObject,
    /** Para o piscar e remove o texto */
    destroy: () => {
      timer.destroy();
      textObject.destroy();
    },
    /** Para o piscar mas mantém o texto visível */
    stopBlinking: () => {
      timer.destroy();
      textObject.setVisible(true);
    },
  };
}
