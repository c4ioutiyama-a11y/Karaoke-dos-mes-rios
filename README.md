# Karaokê Online entre Amigos

Jogo independente de karaokê online: escolher uma música, chamar amigos (cada um na sua casa, pela internet), cantar e receber pontuação. A inspiração é o tipo de experiência de canto e pontuação do Fortnite Festival, sem copiar identidade visual, personagens ou recursos.

> **Estado atual:** fase de concepção. Ainda não existe código do jogo, nenhum teste de canto foi executado e nenhuma tecnologia foi aprovada. Este repositório guarda o contexto, a análise e o plano para começar.

## O que já está confirmado

- Foco: escolher música → chamar amigos → cantar → pontuação.
- Amigos jogam **pela internet, cada um em sua casa**.
- **Enviar músicas** faz parte da visão do produto (pode chegar por etapas).
- A referência é a *experiência* do Fortnite Festival, não sua aparência.

Todo o resto (navegador, React, Colyseus, LiveKit, limite de 8 pessoas, modos Disputa/Palco, fórmula de pontuação etc.) é **proposta a validar**. Veja [`docs/03-decisoes-em-aberto.md`](docs/03-decisoes-em-aberto.md).

## Documentos

| Arquivo | Conteúdo |
|---|---|
| [`docs/00-contexto-e-estudo-de-viabilidade.md`](docs/00-contexto-e-estudo-de-viabilidade.md) | Documento original: pedido, requisitos confirmados e estudo de viabilidade de 13/11/2026 (sem alterações). |
| [`docs/01-avaliacao-critica.md`](docs/01-avaliacao-critica.md) | Avaliação crítica da proposta técnica: o que é sólido, riscos subestimados, lacunas e alternativas. |
| [`docs/02-plano-de-desenvolvimento.md`](docs/02-plano-de-desenvolvimento.md) | Plano por etapas, começando pela prova vocal; primeira versão × versões posteriores. |
| [`docs/03-decisoes-em-aberto.md`](docs/03-decisoes-em-aberto.md) | Decisões que dependem de você, com recomendação e alternativas. |
| [`experimentos/01-prova-vocal/`](experimentos/01-prova-vocal/README.md) | Protocolo do primeiro experimento (captação, sincronismo e pontuação da voz). |

## Estrutura planejada

```
docs/           análise, plano e decisões
experimentos/   provas técnicas descartáveis, cada uma com protocolo e resultados
```

As pastas de código do jogo (cliente, servidor, pipeline de músicas) só serão criadas depois que a prova vocal for aprovada e as tecnologias forem escolhidas.

## Licença

Ainda não definida. Até lá, todos os direitos reservados ao autor.
