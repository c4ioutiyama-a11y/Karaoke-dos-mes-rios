# Resultados sintéticos — prova vocal

Gerado por `npm run bench` em 2026-11-13T05:39:07.684Z (linux, Intel(R) Xeon(R) Processor @ 2.10GHz).

Música: Brilha, brilha, estrelinha (teste), 28 notas, 28.0 s. Taxa: 48000 Hz, janela 2048, passo 10 ms.

> Sinais **sintéticos**: provam que a lógica se comporta como esperado, mas não substituem vozes reais nem microfones reais.

## 1a. Precisão do detector (notas isoladas, voz sintética com harmônicos)

| Detector | Faixa testada | Erro mediano (cents) | Erro p95 (cents) | Erros de oitava | Leituras sem altura | Tempo por janela |
|---|---|---:|---:|---:|---:|---:|
| yin | midi 40–84 (mi2–dó6) | 0.03 | 0.25 | 0/1817 | 0/1817 | 872 µs |
| mpm | midi 40–84 (mi2–dó6) | 0.00 | 0.07 | 0/1817 | 0/1817 | 143 µs |

## 1b. Pontuação por cenário (0 a 10.000)

Regras: `casual` v1 (100% até 50 cents, zero a partir de 150, folga ±120 ms) e `dificil` v1 (100% até 25, zero a partir de 100, folga ±60 ms). Ambas aceitam oitava equivalente.

| Cenário | yin casual | yin difícil | mpm casual | mpm difícil | cobertura (yin) |
|---|---:|---:|---:|---:|---:|
| Voz sintética exatamente afinada | 10000 | 10000 | 10000 | 10000 | 100% |
| Desafinada +25 cents | 10000 | 9998 | 10000 | 10000 | 100% |
| Desafinada +50 cents | 9999 | 6664 | 10000 | 6668 | 100% |
| Desafinada −75 cents | 7661 | 3393 | 7595 | 3373 | 100% |
| Desafinada +100 cents (um semitom) | 5037 | 0 | 5054 | 2 | 100% |
| Desafinada +200 cents (um tom) | 221 | 0 | 311 | 0 | 100% |
| Cantor amador: ±60 cents aleatórios por nota | 9960 | 8908 | 9956 | 8904 | 100% |
| Afinada, uma oitava abaixo (voz grave) | 10000 | 10000 | 10000 | 10000 | 100% |
| Afinada com vibrato ±40 cents a 5,5 Hz | 10000 | 10000 | 10000 | 10000 | 100% |
| Atraso de 150 ms sem calibração | 9672 | 9123 | 9826 | 9286 | 100% |
| Atraso de 150 ms com calibração correta | 10000 | 10000 | 10000 | 10000 | 100% |
| Atraso de 300 ms sem calibração (ex.: Bluetooth) | 8523 | 7854 | 8676 | 8018 | 99% |
| Sustenta só 50% de cada nota | 7200 | 6004 | 7324 | 5988 | 74% |
| Canta só as notas de índice par | 5365 | 5005 | 5434 | 5000 | 56% |
| Afinada com ruído de fundo (−35 dBFS) | 10000 | 10000 | 10000 | 10000 | 100% |
| Silêncio total | 0 | 0 | 0 | 0 | 0% |
| Só ruído branco (−25 dBFS) | 0 | 0 | 0 | 0 | 0% |
| Base instrumental vazando no microfone, ninguém canta | 0 | 0 | 0 | 0 | 0% |
| Base + vocal guia vazando no microfone, ninguém canta | 6194 | 5756 | 5256 | 4974 | 77% |

## Calibração por canto (recuperar um atraso conhecido)

| Detector | Atraso inserido | Atraso estimado | Confiável? |
|---|---:|---:|---|
| yin | 0 ms | 0 ms | sim |
| yin | 80 ms | 80 ms | sim |
| yin | 150 ms | 150 ms | sim |
| yin | 300 ms | 300 ms | sim |
| yin | (só ruído) | -100 ms | não (correto) |
| mpm | 0 ms | -20 ms | sim |
| mpm | 80 ms | 65 ms | sim |
| mpm | 150 ms | 135 ms | sim |
| mpm | 300 ms | 280 ms | sim |
| mpm | (só ruído) | -100 ms | não (correto) |

## Repetibilidade

- yin: mesma entrada pontuada duas vezes → 9960 e 9960 (idêntico).
- mpm: mesma entrada pontuada duas vezes → 9956 e 9956 (idêntico).

## Leitura dos resultados

Ver a seção "Resultados" em `../README.md` para a interpretação e os próximos passos.
