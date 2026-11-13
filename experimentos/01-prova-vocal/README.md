# Experimento 01: prova vocal

**Status (13/11/2026):** os passos 1a e 1b (detector e pontuação offline) rodaram com **sinais sintéticos**. A página de captura ao vivo (1c) foi construída e testada num navegador automático, com uma voz simulada e com um microfone falso que tocava um arquivo de áudio. **Ainda não houve teste com voz humana nem com microfone real.** Também faltam a calibração por batida (1d), o detector de vazamento (1e) e o teste com pessoas cantando (1f).

## Pergunta

É possível capturar a voz no navegador, alinhá-la à música com uma calibração e pontuá-la de forma **coerente, repetível e resistente a acertos falsos**?

## Como rodar

Pré-requisito: [Node.js](https://nodejs.org/) 20 ou mais recente.

```bash
cd experimentos/01-prova-vocal
npm install
npm run dev        # abre a página de teste em http://localhost:5173
npm test           # testes de sanidade (cerca de 20 s)
npm run bench      # medições sintéticas → resultados/sinteticos.md (cerca de 1 min)
```

Na página:
1. Escolha **Microfone** (ou **Voz simulada**, para testar sem microfone) e clique em **Ativar entrada**. Deixe os filtros do navegador desligados.
2. Use **fones de ouvido com fio**, se puder.
3. Clique em **Cantar** e acompanhe as barras azuis. Os pontos mostram a sua voz: verde = afinado, amarelo = perto, vermelho = longe.
4. **Calibração:** cante a música inteira uma vez e clique em **Calibrar com a última execução**. Essa execução serve só para medir o atraso. Depois, cante de novo para valer.

## O que foi construído

| Parte | Arquivo | Observação |
|---|---|---|
| Detector YIN | `src/core/pitch/yin.ts` | Implementação própria. |
| Detector MPM | `src/core/pitch/mpm.ts` | Usa a biblioteca Pitchy 4.1.0. |
| Pontuação | `src/core/scoring.ts` | Fórmula do estudo, regras versionadas `casual` v1 e `dificil` v1, calibração por canto, detecção de falhas de captura. |
| Mapa de teste | `src/core/songmap.ts` | "Brilha, brilha, estrelinha" (melodia de domínio público), 4 frases. A letra são os nomes das notas. |
| Sintetizador de teste | `src/core/synth.ts` | Voz com harmônicos, base instrumental, ruído. Determinístico. |
| Captura | `public/capture-worklet.js` | AudioWorklet que só acumula amostras e as envia direto ao Worker. |
| Detecção ao vivo | `src/audio/detector-worker.ts` | Web Worker; a interface não fica no caminho do áudio. |
| Motor de áudio | `src/audio/engine.ts` | Microfone com filtros configuráveis, música agendada no relógio de áudio, mensagens de erro de microfone. |
| Página | `index.html`, `src/ui/` | Faixa de notas em Canvas, placar parcial, resultado detalhado. |

## Resultados até agora

Números completos em [`resultados/sinteticos.md`](resultados/sinteticos.md). Interpretação:

**1. Os dois detectores são precisos com sinais limpos.** O erro mediano ficou abaixo de 0,1 cent, sem erros de oitava, de mi2 a dó6. Isso é esperado com sinais sintéticos; **voz real vai ser bem pior**, e é ela que decide.

**2. O MPM (Pitchy) é cerca de 5× mais rápido que o YIN**: aproximadamente 0,14 ms contra 0,8 ms por análise neste servidor. As duas opções cabem com folga em 100 análises por segundo.

**3. A ordem da pontuação está correta.** Afinado (10.000) > +50 cents > −75 > +100 > +200 > silêncio (0). Silêncio, ruído e base instrumental sozinha dão **0**. Cantar metade das notas dá cerca de metade dos pontos. Notas cortadas perdem pontos. Vibrato e voz uma oitava abaixo não são punidos. A mesma entrada sempre gera a mesma nota.

**4. ⚠️ O risco do vazamento se confirmou.** Com a base e o **vocal guia** saindo pela caixa de som, **sem ninguém cantando**, a pontuação ficou entre 5.000 e 6.200. Já a base sozinha, sem vocal guia, deu 0. Isso confirma a recomendação de deixar o vocal guia desligado por padrão e mostra que um detector de vazamento é necessário antes de testar com caixas de som.

**5. A calibração por canto recupera o atraso.** Com YIN, o atraso exato. Com MPM, há um viés de cerca de −20 ms, que precisa ser investigado. Com ruído, ela corretamente não se declara confiável.

**6. A música de teste esconde erros de ritmo.** Um atraso de 150 ms sem calibração custa só cerca de 3%, porque a melodia repete notas iguais e a folga é de ±120 ms. Uma música com mais mudanças de nota vai cobrar mais. **É preciso uma segunda música de teste**, mais rápida e com saltos.

**7. A regra "casual" pode estar generosa demais.** Um semitom inteiro desafinado ainda vale 50%. É um parâmetro a calibrar com pessoas reais.

**8. A captura ao vivo funciona no Chromium (navegador automático).** Os filtros desligados foram respeitados. Um microfone falso tocando lá3 foi lido como 220,0 Hz. A voz simulada fez 10.000 pontos com os dois detectores, com a execução completa e sem buracos na captura.

## Próximos passos deste experimento

1. **Teste com microfone e voz reais**, que você pode fazer agora com `npm run dev`. Anote os resultados no fim deste arquivo.
2. Detector de vazamento: comparar o sinal do microfone com a música tocada.
3. Calibração por batida, para comparar com a calibração por canto.
4. Segunda música de teste, com ritmo mais exigente.
5. Gravar um corpus de vozes, com consentimento, e rodar o benchmark sobre ele.
6. Repetir no Firefox (e no Edge, que deve se comportar como o Chrome).
7. Investigar o viés de −20 ms do MPM na calibração.

## Protocolo completo

### Escopo
Incluído: um computador, uma música de teste, detecção de afinação, calibração de atraso e pontuação local.
Fora: rede, salas, múltiplos jogadores, letra e pronúncia, celular (só sondagem opcional).

### Material necessário
- **Sinais sintéticos**: ✅ gerados por `src/core/synth.ts`.
- **Mapa vocal de teste** com melodia exata: ✅ `src/core/songmap.ts`.
- **Base instrumental** com e sem vocal guia: ✅ sintetizada.
- **Gravações de voz** de pessoas diferentes (grave, agudo, com e sem vibrato, quem canta bem e quem canta mal), **com consentimento por escrito**: ⏳ pendente. Não suba gravações para o repositório; a pasta `gravacoes/` é ignorada pelo git.
- **Dispositivos:** fone com fio, fone Bluetooth, caixas de som; microfone embutido e externo: ⏳.
- **Navegadores:** pelo menos dois de desktop: ⏳ (só Chromium automatizado até agora).

### Critérios de aprovação (rascunho)

Os valores numéricos (`X`, `Y`…) devem ser definidos com os **primeiros dados de voz real**, antes de comparar os detectores, e não ajustados depois para aprovar uma biblioteca.

| Critério | Evidência | Situação |
|---|---|---|
| Precisão | Erro mediano ≤ X cents em tons sintéticos; ≤ Y cents em voz real. | Sintético ✅ (< 0,1 cent); voz real ⏳ |
| Silêncio e ruído | Silêncio, ruído e respiração ≤ Z% do máximo. | Silêncio e ruído ✅ (0); respiração ⏳ |
| Ordem | Exato > ±50 > ±100 > silêncio, sempre. | ✅ sintético |
| Repetibilidade | A mesma gravação gera a mesma nota. | ✅ idêntico |
| Ritmo | Entradas atrasadas e notas cortadas reduzem a nota; pausas não penalizam. | ✅ parcial; precisa de uma música mais exigente |
| Calibração | Um atraso conhecido é recuperado com erro ≤ V ms. | ✅ sintético (YIN 0 ms, MPM ≈ 20 ms) |
| Vazamento | Base nas caixas sem canto gera nota perto de zero ou aviso. | ❌ com vocal guia; ✅ sem vocal guia |
| Desempenho | Sem perda de leituras com a interface animando. | ✅ Chromium automatizado; aparelhos reais ⏳ |
| Falhas | Permissão negada, microfone ausente, cabo removido e aba suspensa geram estados claros e execução incompleta. | Implementado; testado só "parado antes do fim" e "buraco na captura" |

## Registro de testes manuais

_Preencha a cada teste: data, navegador, sistema, microfone, fone/caixa, filtros, detector, regra, atraso calibrado, pontuação e impressão pessoal._

| Data | Navegador / sistema | Microfone e saída | Detector / regra | Atraso | Pontos | Observações |
|---|---|---|---|---|---|---|
| | | | | | | |
