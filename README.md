# Karaokê Online entre Amigos

Jogo independente de karaokê online: escolher uma música, chamar amigos (cada um na sua casa, pela internet), cantar e receber pontuação. A inspiração é o tipo de experiência de canto e pontuação do Fortnite Festival, sem copiar identidade visual, personagens ou recursos.

> **Estado atual (13/11/2026):** Etapa 1, a prova vocal, em andamento. Já existe uma **página de teste** que capta a voz, detecta a afinação e dá pontos numa música de teste. As medições com sinais sintéticos estão em [`experimentos/01-prova-vocal/`](experimentos/01-prova-vocal/README.md). **Ainda não houve teste com voz humana nem com microfone real.** O jogo em si (salas, amigos, modos) ainda não começou.

## Testar a prova vocal

Precisa do [Node.js](https://nodejs.org/) 20 ou mais recente:

```bash
cd experimentos/01-prova-vocal
npm install
npm run dev
```

Depois, abra http://localhost:5173 no Chrome ou no Edge, ative o microfone (com fones de ouvido com fio, se puder) e cante.

## O que já está confirmado

- Foco: escolher música → chamar amigos → cantar → pontuação.
- Amigos jogam **pela internet, cada um em sua casa**.
- **Enviar músicas** faz parte da visão do produto (pode chegar por etapas).
- A referência é a *experiência* do Fortnite Festival, não sua aparência.

- Desenvolvimento e prova vocal no **navegador de computador**, com **TypeScript + Vite**. Detectores YIN e MPM (Pitchy). Música de teste com melodia conhecida.
- O jogo deve virar um **instalador** mais tarde.

O resto (Colyseus, LiveKit, limite de 8 pessoas, modos Disputa/Palco, parâmetros da pontuação etc.) continua **proposta a validar**. Veja [`docs/03-decisoes-em-aberto.md`](docs/03-decisoes-em-aberto.md).

## Quer participar?

Veja [`COMO-PARTICIPAR.md`](COMO-PARTICIPAR.md). Quem usa o Claude Code recebe as regras do projeto automaticamente pelo [`CLAUDE.md`](CLAUDE.md).

## Documentos

| Arquivo | Conteúdo |
|---|---|
| [`docs/00-contexto-e-estudo-de-viabilidade.md`](docs/00-contexto-e-estudo-de-viabilidade.md) | Documento original: pedido, requisitos confirmados e estudo de viabilidade de 13/11/2026 (sem alterações). |
| [`docs/01-avaliacao-critica.md`](docs/01-avaliacao-critica.md) | Avaliação crítica da proposta técnica: o que é sólido, riscos subestimados, lacunas e alternativas. |
| [`docs/02-plano-de-desenvolvimento.md`](docs/02-plano-de-desenvolvimento.md) | Plano por etapas, começando pela prova vocal; primeira versão × versões posteriores. |
| [`docs/03-decisoes-em-aberto.md`](docs/03-decisoes-em-aberto.md) | Decisões que dependem de você, com recomendação e alternativas. |
| [`experimentos/01-prova-vocal/`](experimentos/01-prova-vocal/README.md) | Primeiro experimento: código, protocolo, como rodar e resultados. |

## Estrutura planejada

```
docs/           análise, plano e decisões
experimentos/   provas técnicas descartáveis, cada uma com protocolo e resultados
```

As pastas de código do jogo (cliente, servidor, pipeline de músicas, instalador) só serão criadas depois que a prova vocal for aprovada. As partes que funcionarem (detector, pontuação, captura) serão reaproveitadas a partir de `experimentos/01-prova-vocal/src/core`.

## Licença

Ainda não definida. Até lá, todos os direitos reservados ao autor.
