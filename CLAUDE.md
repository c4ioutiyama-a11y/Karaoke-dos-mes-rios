# Instruções para o Claude Code neste repositório

Projeto: jogo independente de karaokê online entre amigos (cada um na sua casa), com pontuação da voz. Várias pessoas trabalham aqui, cada uma com o seu Claude Code. **Responda sempre em português do Brasil**, de forma clara para quem não é programador.

## Leia antes de mudar algo

1. `README.md`: estado atual e como rodar.
2. `docs/03-decisoes-em-aberto.md`: o que **já foi decidido** (✅) e o que ainda é proposta (⏳).
3. `docs/02-plano-de-desenvolvimento.md`: etapas e condições para avançar.
4. `docs/01-avaliacao-critica.md`: riscos conhecidos (vazamento da música no microfone, calibração, direitos, LGPD).
5. `experimentos/01-prova-vocal/README.md`: o experimento em andamento e seus resultados.

## Regras do projeto

- **Não trate propostas como decisões.** Só o dono do repositório aprova itens em `docs/03-decisoes-em-aberto.md`. Se uma tarefa depende de uma decisão ⏳, diga isso e proponha, sem decidir sozinho.
- **Diferencie fato, recomendação e hipótese** em documentos e respostas. Não prometa sincronismo perfeito, extração automática de músicas resolvida nem antifraude completa.
- **Nada de dados pessoais:** nunca suba gravações de voz (a pasta `gravacoes/` é ignorada), e-mails, nomes ou tokens.
- **Músicas:** só material com direitos resolvidos ou domínio público. Não baixe nem separe áudio do YouTube.
- **Regras de pontuação são versionadas:** mudar qualquer parâmetro em `RULES` (`src/core/scoring.ts`) exige aumentar `version` e registrar o motivo no README do experimento.
- **Resultados honestos:** se um teste falhar, mostre a saída. Não ajuste critérios só para um detector ou biblioteca passar.

## Como trabalhar em equipe

- **Nunca faça commit direto na `main`.** Crie um branch `nome-da-pessoa/assunto` (ex.: `ana/detector-vazamento`), faça commits pequenos e abra um pull request.
- Antes de abrir o pull request, rode os testes e a checagem de tipos (abaixo) e diga o resultado na descrição.
- Se houver uma issue no GitHub para a tarefa, cite-a. Se não houver, sugira criar uma, para dois amigos não fazerem a mesma coisa.
- Atualize a documentação quando mudar comportamento: o README do experimento, e as decisões quando o dono aprovar algo.

## Comandos (experimento atual)

```bash
cd experimentos/01-prova-vocal
npm install
npm test            # testes de sanidade (~20 s)
npm run typecheck   # checagem de tipos TypeScript
npm run bench       # medições sintéticas → resultados/sinteticos.md (~1 min)
npm run dev         # página de teste em http://localhost:5173
npm run build       # build de produção em dist/
```

Sem microfone (por exemplo, numa sessão na nuvem), use a fonte **"Voz simulada"** na página. No navegador automático, as funções `window.__ultimoResultado` e `window.__ultimasLeituras` expõem o último resultado e as leituras do detector.

## Organização do código

- `src/core/`: lógica pura e testável, sem DOM (detectores, pontuação, mapa, sintetizador). Ela será reaproveitada no jogo.
- `src/audio/`: Web Audio, AudioWorklet e Worker de detecção. A interface nunca fica no caminho do áudio.
- `src/ui/`: página de teste.
- `public/capture-worklet.js`: AudioWorklet em JavaScript puro.
- O código precisa continuar funcionando com caminhos relativos (`base: "./"`), porque o projeto vai virar um instalador (Etapa 6).
