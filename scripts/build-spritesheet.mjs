/**
 * build-spritesheet.mjs — Monta um spritesheet a partir de frames individuais
 *
 * Pega as imagens geradas por IA (640x640 cada), redimensiona para 32x32
 * usando nearest-neighbor (para manter o estilo pixel art) e monta
 * tudo lado a lado em um único PNG transparente.
 *
 * Uso: node scripts/build-spritesheet.mjs
 *
 * Resultado:
 *   public/assets/player_sheet.png  → 256×32 (8 frames de 32×32)
 *   public/assets/bullet_sheet.png  → 32×16 (2 frames de 16×16)
 */
import sharp from 'sharp';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const artifactsDir = '/Users/mahaoki/.gemini/antigravity/brain/a68bbce0-088f-4c20-9bd3-1df740626e3b';
const outputDir = path.resolve(rootDir, 'public/assets');

// ─── Configuração ──────────────────────────────────────────────────

const FRAME_SIZE = 32;   // Tamanho de cada frame no spritesheet
const BULLET_SIZE = 16;  // Tamanho do frame do bullet

// Frames do player (na ordem do spritesheet)
const PLAYER_FRAMES = [
  'frame_idle1',   // Frame 0: Idle 1
  'frame_idle2',   // Frame 1: Idle 2
  'frame_run1',    // Frame 2: Run 1
  'frame_run2',    // Frame 3: Run 2
  'frame_jump',    // Frame 4: Jump
  'frame_fall',    // Frame 5: Fall
  'frame_shoot',   // Frame 6: Shoot
  'frame_dash',    // Frame 7: Dash
];

/**
 * Encontra o arquivo de frame correspondente ao nome
 * (os nomes de arquivo incluem um timestamp da geração)
 */
async function findFrameFile(frameName) {
  const fs = await import('node:fs/promises');
  const files = await fs.readdir(artifactsDir);
  const match = files.find(f => f.startsWith(frameName + '_') && f.endsWith('.png'));
  if (!match) {
    throw new Error(`Frame "${frameName}" not found in ${artifactsDir}`);
  }
  return path.join(artifactsDir, match);
}

/**
 * Redimensiona uma imagem para o tamanho alvo usando nearest-neighbor
 * e remove o fundo (torna pixels escuros transparentes)
 */
async function processFrame(inputPath, size) {
  // Lê a imagem e redimensiona
  const resized = await sharp(inputPath)
    .resize(size, size, {
      kernel: sharp.kernel.nearest,
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  // Remove o background escuro (pixels com luminância < 25)
  const { data, info } = resized;
  const pixels = Buffer.from(data);

  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];

    // Se o pixel é muito escuro, torna transparente
    const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
    if (luminance < 25) {
      pixels[i + 3] = 0; // Alpha = 0 (transparente)
    }
  }

  return {
    buffer: pixels,
    width: info.width,
    height: info.height,
  };
}

/**
 * Monta o spritesheet do player
 */
async function buildPlayerSpritesheet() {
  console.log('🎨 Montando spritesheet do player...');

  const frameCount = PLAYER_FRAMES.length;
  const sheetWidth = frameCount * FRAME_SIZE;
  const sheetHeight = FRAME_SIZE;

  // Processa cada frame
  const processedFrames = [];
  for (const frameName of PLAYER_FRAMES) {
    const filePath = await findFrameFile(frameName);
    console.log(`  📷 ${frameName} → ${path.basename(filePath)}`);
    const frame = await processFrame(filePath, FRAME_SIZE);
    processedFrames.push(frame);
  }

  // Cria o buffer do spritesheet (RGBA)
  const sheetBuffer = Buffer.alloc(sheetWidth * sheetHeight * 4, 0);

  for (let f = 0; f < processedFrames.length; f++) {
    const frame = processedFrames[f];
    const offsetX = f * FRAME_SIZE;

    for (let y = 0; y < frame.height; y++) {
      for (let x = 0; x < frame.width; x++) {
        const srcIdx = (y * frame.width + x) * 4;
        const dstIdx = (y * sheetWidth + (offsetX + x)) * 4;

        sheetBuffer[dstIdx] = frame.buffer[srcIdx];
        sheetBuffer[dstIdx + 1] = frame.buffer[srcIdx + 1];
        sheetBuffer[dstIdx + 2] = frame.buffer[srcIdx + 2];
        sheetBuffer[dstIdx + 3] = frame.buffer[srcIdx + 3];
      }
    }
  }

  // Salva o spritesheet
  const outputPath = path.join(outputDir, 'player_sheet.png');
  await sharp(sheetBuffer, {
    raw: {
      width: sheetWidth,
      height: sheetHeight,
      channels: 4,
    },
  })
    .png()
    .toFile(outputPath);

  console.log(`  ✅ Salvo em: ${outputPath} (${sheetWidth}×${sheetHeight}, ${frameCount} frames)`);
}

// ─── Main ──────────────────────────────────────────────────────────

async function main() {
  console.log('═══════════════════════════════════════════');
  console.log('  Spritesheet Builder — MegaMan X Style    ');
  console.log('═══════════════════════════════════════════');
  console.log('');

  try {
    await buildPlayerSpritesheet();
    console.log('');
    console.log('✅ Tudo pronto! Spritesheets gerados com sucesso.');
  } catch (error) {
    console.error('❌ Erro:', error);
    process.exit(1);
  }
}

main();
