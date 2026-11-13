# Experimento 01 — Prova vocal

**Status:** protocolo proposto, ainda não executado. Nenhuma medição foi feita.

## Pergunta

É possível capturar a voz no navegador, alinhá-la à música com uma calibração e pontuá-la de forma **coerente, repetível e resistente a acertos falsos**?

## Escopo

Incluído: um computador, uma música de teste, detecção de afinação, calibração de atraso e pontuação local.

Fora: rede, salas, múltiplos jogadores, letra e pronúncia, celular (só sondagem opcional).

## Material necessário

- **Sinais sintéticos** (gerados por script): tons exatos, tons desafinados em ±25, ±50 e ±100 cents, glissando, vibrato, silêncio, ruído branco e ruído de ambiente.
- **Mapa vocal de teste** com melodia conhecida com exatidão (por exemplo, gerado a partir de MIDI).
- **Base instrumental** dessa melodia, com e sem vocal guia.
- **Gravações de voz** de pessoas diferentes (grave, agudo, com e sem vibrato, quem canta bem e quem canta mal), **com consentimento por escrito** para uso em testes.
- **Dispositivos:** fone com fio, fone Bluetooth, caixas de som; microfone embutido e microfone externo.
- **Navegadores:** pelo menos dois de desktop.

## Procedimento resumido

1. **Detector offline**: rodar os detectores candidatos sobre os sinais sintéticos e as gravações.
2. **Pontuação offline**: aplicar a fórmula contra o mapa de teste.
3. **Captura ao vivo**: microfone → AudioWorklet (captura) → Worker (detecção) → interface (traço da voz). Repetir com os filtros do navegador (`echoCancellation`, `noiseSuppression`, `autoGainControl`) ligados e desligados.
4. **Calibração**: método por batida × método por canto, em cada tipo de fone e caixa.
5. **Vazamento**: base em caixas de som, sem ninguém cantando, com e sem vocal guia.
6. **Música completa**: pessoas reais cantam e comentam se a nota fez sentido.

## Critérios de aprovação (rascunho)

Os valores numéricos (`X`, `Y`…) serão definidos **antes** de rodar o experimento, com base nos primeiros dados sintéticos, e não ajustados depois para aprovar uma biblioteca.

| Critério | Evidência |
|---|---|
| Precisão | Erro mediano do detector em tons sintéticos ≤ X cents; em voz real ≤ Y cents. |
| Silêncio e ruído | Silêncio, ruído e respiração geram pontuação ≤ Z% do máximo. |
| Ordem | Exato > ±50 cents > ±100 cents > silêncio, em todas as repetições. |
| Repetibilidade | A mesma gravação gera a mesma nota (variação ≤ W pontos). |
| Ritmo | Entradas atrasadas e notas cortadas reduzem a nota; pausas instrumentais não penalizam. |
| Calibração | Um atraso conhecido inserido artificialmente é recuperado com erro ≤ V ms. |
| Vazamento | Base nas caixas sem canto gera uma nota perto de zero e dispara o aviso. |
| Desempenho | A análise não perde quadros com a interface animando; CPU dentro do orçamento definido. |
| Falhas | Permissão negada, microfone ausente, cabo removido e aba suspensa geram estados claros, e a execução é marcada como incompleta. |

## Resultados

_Ainda não executado._ Registrar aqui: data, navegador, sistema, dispositivo, configuração, métricas e conclusão (aprovado ou reprovado, e por quê).
