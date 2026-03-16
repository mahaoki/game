# MASTER_SPEC.md: Projeto Pixel Game (Diretrizes de Alto Nível)

## 1. Visão Geral e Objetivo
* **Nome do Projeto:** [Definir Nome]
* **Objetivo:** Desenvolver um jogo 2D Pixel Art para plataformas Mobile e Web.
* **Público-alvo:** Casual / Educativo.
* **Filosofia:** O desenvolvimento deve ser colaborativo (Pai, Filho e IA), priorizando clareza conceitual, robustez de código e aprendizado de lógica de programação.

---

## 2. Stack Tecnológica Obrigatória
* **Linguagem:** TypeScript (Strict Mode ativado).
* **Engine:** Phaser 3 (Configurado para Pixel Art).
* **Bundler:** Vite.
* **Estado:** XState (Máquinas de Estado Finitas).
* **Validação:** Zod (Contratos de dados e configurações).
* **Testes:** Vitest (Test-Driven Development para lógica de core).
* **Deploy Mobile:** Capacitor.js.

---

## 3. Metodologia: Spec-Driven Design (SDD)
Este projeto segue a metodologia onde a especificação precede a implementação. O Agente deve:

1.  **Consultar a Spec:** Jamais iniciar uma funcionalidade sem um arquivo de especificação (.md ou .json) correspondente.
2.  **Schema-First:** Definir interfaces e contratos de dados antes da lógica.
3.  **TDD (Test-Driven Development):** * Escrever testes para falhar (Red).
    * Implementar código mínimo para passar (Green).
    * Refatorar mantendo a integridade (Refactor).
4.  **Single Source of Truth (SSOT):** O estado global do jogo e as configurações de balanceamento devem residir em arquivos de configuração centralizados, validados por schemas.

---

## 4. Arquitetura e Estrutura de Pastas
O projeto deve seguir uma separação rigorosa de preocupações (SoC):

* **/src/core:** Lógica pura, sistemas de pontuação, regras de negócio e máquinas de estado (Sem dependência da engine).
* **/src/entities:** Implementação visual e física de objetos do jogo no Phaser.
* **/src/specs:** Arquivos de definição de features e contratos.
* **/src/tests:** Suíte de testes unitários e de integração.
* **/src/ui:** Interface de usuário (HUD e Menus) desacoplada da cena de jogo.

---

## 5. Diretrizes Visuais (Pixel Art)
* **Resolução Base:** 320x180 (paisagem 16:9) — otimizada para side-scroller estilo MegaMan X.
* **Renderização:** `pixelArt: true`, suavização desativada (Nearest Neighbor).
* **Consistência:** Proibição de "Mixels" (pixels de tamanhos diferentes). Todos os assets devem respeitar o grid definido.

---

## 6. Diretrizes para o Agente (Instruções de Sistema)
* **Didática:** Explique as decisões técnicas de forma simples para que uma criança de 9 anos possa acompanhar o raciocínio.
* **Resiliência:** Implemente tratamento de erros em todas as entradas de dados e carregamento de assets.
* **Performance:** Otimize o uso de memória e draw calls, focando em dispositivos móveis.
* **Código Limpo:** Priorize funções pequenas, nomes de variáveis semânticos e documentação inline.

---

## 7. Critérios de Sucesso e Deploy
* **Compilação:** O código deve compilar sem erros de TypeScript.
* **Testes:** Cobertura de 100% na lógica crítica do core.
* **Mobile-Ready:** Interface adaptável para diferentes tamanhos de tela e inputs de toque (Touch).