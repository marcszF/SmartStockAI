# Plano inicial — RPG Clicker Infinito (HTML/CSS/JS)

## 1) Objetivo do projeto
Criar um jogo incremental estilo *Cookie Clicker* com tema de RPG, focado em progressão infinita, sessões curtas e sensação constante de crescimento.

## 2) Proposta de valor
- **Loop simples e viciante:** clicar, ganhar ouro/energia, comprar melhorias.
- **Fantasia RPG:** classes, atributos, equipamentos, monstros e mapas.
- **Escala infinita real:** crescimento por camadas (prestígio + meta-progressão + conteúdo procedural).

## 3) Pilar de design (MVP)
1. **Clareza:** jogador entende em segundos como evoluir.
2. **Ritmo:** ganhos ativos (clique) + passivos (auto-combate/produção).
3. **Escolhas:** builds com impacto (força, crítico, velocidade, sorte).
4. **Infinito sustentável:** sem “fim”, mas com marcos e ciclos.

## 4) Loop principal (core loop)
1. Jogador clica para causar dano / gerar recurso.
2. Derrota monstros e recebe ouro + XP + materiais.
3. Compra upgrades permanentes e temporários.
4. Desbloqueia habilidades automáticas e companheiros.
5. Avança para mapas mais difíceis (escala exponencial controlada).
6. Faz **Ascensão** (prestígio) para ganhar essência e reiniciar mais forte.

## 5) Sistemas do MVP
- **Recursos:** Ouro, XP, Essência (prestígio).
- **Atributos:** Ataque, Velocidade, Crítico, Vida, Sorte.
- **Combate simplificado:** alvo único com HP escalável.
- **Upgrades:**
  - Ativos (melhoram clique/dano direto).
  - Passivos (DPS automático).
  - Econômicos (multiplicadores de ganho).
- **Prestígio/Ascensão:** reset parcial com bônus permanentes.
- **Missões simples:** objetivos cíclicos para orientar progressão.

## 6) Como garantir que o jogo seja infinito
### Camada A — Escala matemática controlada
- Vida dos inimigos cresce por função exponencial suave por zona.
- Poder do jogador cresce por múltiplas fontes (aditivo + multiplicativo).
- Uso de “softcaps” para impedir quebra de balanceamento cedo demais.

### Camada B — Prestígio em ciclos
- Ao ascender, jogador perde progresso local e ganha moeda meta.
- Meta-upgrades aumentam eficiência da próxima run.
- Cada ciclo abre novos modificadores e desafios.

### Camada C — Conteúdo procedural leve
- Nomes/afixos de inimigos e itens gerados por tabela.
- Eventos aleatórios (baú, elite, multiplicador temporário).
- Rotação de “mutadores” para variar cada run.

### Camada D — Metas de longo prazo
- Conquistas cumulativas sem teto prático.
- Maestrias por classe/arma com progressão longa.
- Ranking local de marcos (maior zona, maior DPS, menor tempo por ascensão).

## 7) Arquitetura técnica (HTML/CSS/JS puro)
- **index.html:** estrutura de HUD, painel de upgrades e painel de combate.
- **style.css:** layout responsivo (desktop-first com adaptação mobile).
- **game.js:** estado do jogo, loop principal, balanceamento e save/load.
- **ui.js (opcional no MVP):** renderização e atualização de interface.
- **save system:** `localStorage` com versionamento de schema.

## 8) Estrutura de dados inicial
- `gameState`: recursos, atributos, progresso, upgrades, timers.
- `enemyState`: zona atual, tipo, HP atual/máximo, recompensas.
- `metaState`: essência, árvore de prestígio, conquistas.
- `config`: constantes de balanceamento e fórmulas.

## 9) Plano de execução em fases
### Fase 1 — Protótipo jogável (1–2 dias)
- Clique gera dano e ouro.
- Inimigos com HP e recompensa.
- Compra de 5–10 upgrades.
- Save/load local.

### Fase 2 — Incremental completo (2–4 dias)
- Auto-DPS.
- Sistema de XP e nível.
- Primeira versão de ascensão.
- Missões básicas.

### Fase 3 — Infinito de verdade (3–7 dias)
- Softcaps e rebalanceamento.
- Eventos aleatórios.
- Procedural simples de inimigos/itens.
- Mais camadas de meta-progressão.

### Fase 4 — Polimento (contínuo)
- Feedback visual, números abreviados, efeitos.
- UX de progressão e onboarding.
- Ajustes por telemetria local (tempo por marcos).

## 10) KPIs para validar se está divertido
- Tempo até primeiro upgrade: **< 30s**.
- Tempo até desbloquear automação: **3–8 min**.
- Tempo médio até 1ª ascensão: **20–40 min**.
- Sensação de ganho por sessão curta (5–10 min).

## 11) Riscos e mitigação
- **Risco:** progressão estagnar cedo.
  - **Mitigação:** custo dinâmico + bônus de catch-up.
- **Risco:** números explodirem e perder legibilidade.
  - **Mitigação:** notação abreviada (K, M, B, T, aa, ab...) e limites visuais.
- **Risco:** repetição excessiva.
  - **Mitigação:** eventos, mutadores, missões rotativas e escolhas de build.

## 12) Critérios de aprovação do plano
Você pode aprovar este plano se concordar com:
1. Escopo de MVP em HTML/CSS/JS puro.
2. Progressão infinita via ascensão + meta-progressão + procedural.
3. Entrega faseada (protótipo rápido e expansão progressiva).

Se aprovar, o próximo passo é eu montar o **documento de game design (GDD v1)** com fórmulas iniciais de balanceamento e já iniciar o esqueleto do projeto.
