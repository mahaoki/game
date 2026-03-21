# 🎮 Mega Pixel X

Jogo 2D side-scroller estilo MegaMan X com pixel art, feito com **Phaser 3**, **XState** e **TypeScript**.

## Requisitos

- **Node.js** 18+
- **npm** 9+

## Instalação

```bash
npm install
```

## Gerar Spritesheets

Os sprites são gerados a partir de imagens com fundo magenta, processados para transparência:

```bash
node scripts/build-spritesheet.mjs
```

> Os assets finais são salvos em `public/assets/`.

## Executar (dev)

```bash
npm run dev
```

Acesse **http://localhost:5173** no navegador.

## Controles

| Tecla | Ação |
|---|---|
| ← → | Mover |
| Z | Pular |
| X | Tiro |
| C | Dash |
| A | Trocar arma |
| Enter / Space | Confirmar (menus e diálogos) |

## Scripts

| Comando | Descrição |
|---|---|
| `npm run dev` | Servidor de desenvolvimento (Vite) |
| `npm run build` | Build de produção |
| `npm run test` | Rodar testes (Vitest) |
| `npm run test:watch` | Testes em modo watch |
| `npm run typecheck` | Verificação TypeScript |

## Stack

- **Phaser 3** — engine de jogo
- **XState** — state machines (player, inimigos, menus)
- **Zod** — validação de configuração
- **Vite** — bundler/dev server
- **Vitest** — testes unitários
- **Sharp** — processamento de sprites (build script)