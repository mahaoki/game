/**
 * build-spritesheet.mjs — Monta um spritesheet a partir de frames individuais
 *
 * Pega as imagens geradas por IA (com fundo magenta #FF00FF),
 * redimensiona para 32x32 usando nearest-neighbor (pixel art) e
 * faz chroma-key do magenta para transparência.
 *
 * Uso: node scripts/build-spritesheet.mjs
 *
 * Resultado:
 *   public/assets/player_sheet.png  → 256×32 (8 frames de 32×32)
 *   public/assets/bullet.png        → 16×16 (1 frame, transparente)
 */
import sharp from 'sharp';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const artifactsDir = '/Users/mahaoki/.gemini/antigravity/brain/a68bbce0-088f-4c20-9bd3-1df740626e3b';
const outputDir = path.resolve(rootDir, 'public/assets');

// ─── Configuração ──────────────────────────────────────────────────

const FRAME_SIZE = 32;

// Frames do player (na ordem do spritesheet)
// Usa os nomes "ref_*" que foram gerados com referência consistente
const PLAYER_FRAMES = [
  'ref_idle',    // Frame 0: Idle 1
  'ref_idle2',   // Frame 1: Idle 2
  'ref_run1',    // Frame 2: Run 1
  'ref_run2',    // Frame 3: Run 2
  'ref_jump',    // Frame 4: Jump
  'ref_fall',    // Frame 5: Fall
  'ref_shoot',   // Frame 6: Shoot
  'ref_dash',    // Frame 7: Dash
];

/**
 * Encontra o arquivo de frame correspondente ao nome
 * (os nomes de arquivo incluem um timestamp da geração)
 */
async function findFrameFile(frameName) {
  const fs = await import('node:fs/promises');
  const files = await fs.readdir(artifactsDir);
  // Procura arquivos que começam com o nome do frame e terminam com .png
  const matches = files
    .filter(f => f.startsWith(frameName + '_') && f.endsWith('.png'))
    .sort(); // Ordena para pegar o mais recente por timestamp
  
  if (matches.length === 0) {
    throw new Error(`Frame "${frameName}" not found in ${artifactsDir}`);
  }
  
  // Pega o último (mais recente por timestamp)
  const match = matches[matches.length - 1];
  return path.join(artifactsDir, match);
}

/**
 * Redimensiona uma imagem para o tamanho alvo usando nearest-neighbor
 * e faz chroma-key do magenta (#FF00FF) para transparência.
 *
 * Detecção de magenta:
 *   - R > 200, G < 80, B > 200 → transparente
 *   - Isso captura o magenta e variações próximas
 *   - Também remove pixels quase-preto (luminância < 15) para limpar bordas
 */
async function processFrame(inputPath, size) {
  // Lê a imagem e redimensiona com nearest-neighbor
  const resized = await sharp(inputPath)
    .resize(size, size, {
      kernel: sharp.kernel.nearest,
      fit: 'contain',
      background: { r: 255, g: 0, b: 255, alpha: 1 }, // Magenta padding
    })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { data, info } = resized;
  const pixels = Buffer.from(data);

  let transparentCount = 0;
  let totalPixels = pixels.length / 4;

  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];

    // Chroma-key: magenta (#FF00FF) e variações próximas
    const isMagenta = r > 180 && g < 100 && b > 180;

    // Também remove pixels quase-preto (resíduos de borda)
    const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
    const isNearBlack = luminance < 15;

    if (isMagenta || isNearBlack) {
      pixels[i] = 0;     // R
      pixels[i + 1] = 0; // G
      pixels[i + 2] = 0; // B
      pixels[i + 3] = 0; // Alpha = 0 (transparente)
      transparentCount++;
    }
  }

  console.log(`    → ${transparentCount}/${totalPixels} pixels transparentes (${Math.round(transparentCount/totalPixels*100)}%)`);

  return {
    buffer: pixels,
    width: info.width,
    height: info.height,
  };
}


/**
 * Monta spritesheet genérico (N frames → horizontal strip)
 */
async function buildSpritesheet(name, frameNames, frameSize, outputName) {
  console.log(`\n🎨 Montando spritesheet: ${name}...`);

  const sheetWidth = frameNames.length * frameSize;
  const sheetHeight = frameSize;
  const processedFrames = [];

  for (const frameName of frameNames) {
    const filePath = await findFrameFile(frameName);
    console.log(`  📷 ${frameName} → ${path.basename(filePath)}`);
    const frame = await processFrame(filePath, frameSize);
    processedFrames.push(frame);
  }

  const sheetBuffer = Buffer.alloc(sheetWidth * sheetHeight * 4, 0);

  for (let f = 0; f < processedFrames.length; f++) {
    const frame = processedFrames[f];
    const offsetX = f * frameSize;
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

  const outputPath = path.join(outputDir, outputName);
  await sharp(sheetBuffer, {
    raw: { width: sheetWidth, height: sheetHeight, channels: 4 },
  })
    .png()
    .toFile(outputPath);

  console.log(`  ✅ Salvo em: ${outputPath} (${sheetWidth}×${sheetHeight}, ${frameNames.length} frames)`);
}

/**
 * Monta sprite único (1 frame)
 */
async function buildSingleSprite(name, frameName, size, outputName) {
  console.log(`\n💥 Montando sprite: ${name}...`);

  const filePath = await findFrameFile(frameName);
  console.log(`  📷 ${frameName} → ${path.basename(filePath)}`);

  const frame = await processFrame(filePath, size);

  const outputPath = path.join(outputDir, outputName);
  await sharp(frame.buffer, {
    raw: { width: frame.width, height: frame.height, channels: 4 },
  })
    .png()
    .toFile(outputPath);

  console.log(`  ✅ Salvo em: ${outputPath} (${size}×${size})`);
}

// ─── Main ──────────────────────────────────────────────────────────

async function main() {
  console.log('═══════════════════════════════════════════');
  console.log('  Spritesheet Builder — MegaMan X Style    ');
  console.log('═══════════════════════════════════════════');
  console.log('');

  try {
    // Player (8 frames de 32×32)
    await buildSpritesheet('Player', PLAYER_FRAMES, FRAME_SIZE, 'player_sheet.png');

    // Player bullet (16×16)
    await buildSingleSprite('Player Bullet', 'ref_bullet', 16, 'bullet.png');

    // Met enemy (2 frames de 32×32)
    await buildSpritesheet('Met Enemy', ['ref_met_walk1', 'ref_met_walk2'], FRAME_SIZE, 'enemy_met_sheet.png');

    // Turret enemy (2 frames de 32×32)
    await buildSpritesheet('Turret Enemy', ['ref_turret_idle', 'ref_turret_shoot'], FRAME_SIZE, 'enemy_turret_sheet.png');

    // Enemy bullet (16×16)
    await buildSingleSprite('Enemy Bullet', 'ref_enemy_bullet', 16, 'enemy_bullet.png');

    console.log('\n✅ Tudo pronto! Todos os spritesheets gerados com sucesso.');
  } catch (error) {
    console.error('❌ Erro:', error);
    process.exit(1);
  }
}

main();

