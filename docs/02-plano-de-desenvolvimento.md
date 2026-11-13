# Plano de desenvolvimento por etapas

Proposta de 13/11/2026. As decisões aprovadas estão em `03-decisoes-em-aberto.md`; o resto continua como proposta. Prazos não foram estimados de propósito: a maior incerteza (avaliar canto de forma justa em dispositivos variados) só fica mensurável depois da Etapa 1.

Cada etapa termina com uma **condição para avançar**. Se a condição não for atingida, o plano volta para revisão em vez de seguir adiante.

---

## Etapa 0 — Decisões mínimas para começar

Antes de escrever código, preciso que você decida (ver [`03-decisoes-em-aberto.md`](03-decisoes-em-aberto.md)):

- Plataforma do experimento (recomendação: navegador de computador).
- Linguagem do experimento (recomendação: TypeScript, sem framework de interface; React só quando houver telas de verdade).
- Limite de tempo para a Etapa 1.
- Material musical de teste com melodia conhecida (ver avaliação, item 4.4).

**Saída:** decisões registradas em `03-decisoes-em-aberto.md`.

---

## Etapa 1 — Prova vocal (captação, sincronismo e pontuação)

Objetivo: demonstrar que o jogo mede canto de forma **coerente, repetível e difícil de enganar sem querer**, em um único computador. Protocolo detalhado em [`../experimentos/01-prova-vocal/README.md`](../experimentos/01-prova-vocal/README.md).

| Passo | O que se faz | O que se mede |
|---|---|---|
| 1a. Detector offline | Rodar 2 detectores sobre arquivos WAV sintéticos e gravações de voz conhecidas, sem microfone ao vivo. | Erro em cents, taxa de falsos positivos em silêncio, ruído e respiração; custo de CPU. |
| 1b. Pontuação offline | Aplicar a fórmula aos resultados de 1a contra um mapa vocal conhecido. | Ordem correta: exato > ±50 cents > ±100 cents > silêncio; mesma entrada gera a mesma nota. |
| 1c. Captura ao vivo | Microfone → AudioWorklet → Worker → interface com o traço da voz. Testar filtros do navegador ligados e desligados. | Interface fluida; nenhum quadro perdido; efeito de cada filtro sobre notas longas. |
| 1d. Calibração | Comparar calibração por batida com a calibração por canto; testar fone com fio, Bluetooth e caixa de som. | Atraso recuperado e estabilidade entre repetições; diferença por tipo de dispositivo. |
| 1e. Vazamento | Tocar a base em caixas de som sem ninguém cantar, com e sem vocal guia. | Pontuação perto de zero; o detector de vazamento dispara. |
| 1f. Música completa | Cantar uma música curta do início ao fim com feedback visual (faixa de notas). | Pessoas que cantam bem e mal recebem notas que fazem sentido para elas; a sensação de atraso é aceitável. |

**Condição para avançar:** os critérios do protocolo são atingidos com pelo menos um detector, em pelo menos dois navegadores de desktop, com fone com fio. Bluetooth e caixa de som devem ter um comportamento **conhecido e sinalizado**, mesmo que não seja ótimo.

**Sondagem opcional:** rodar 1c–1f num iPhone e num Android só para conhecer os problemas, sem compromisso de suporte.

---

## Etapa 2 — Rodada entre amigos (Disputa)

- Servidor de salas (escolha feita no início desta etapa).
- Criar sala privada, link de convite, apelido, lista de presentes.
- Estados da sala: `aguardando → preparando → prontos → contagem → cantando → resultados`.
- Todos baixam a mesma versão do áudio e do mapa; o servidor agenda o início.
- Pontuação local; eventos com identificador da rodada e número de sequência; placar ao vivo e resultado final validado.
- Reconexão com prazo; quem entra no meio assiste.
- Revanche.
- Decisão consciente sobre a conversa por voz entre as músicas (ver avaliação, item 3.5).

**Condição para avançar:** dois ou mais jogadores, em redes diferentes, completam a mesma rodada e veem o mesmo resultado. Atrasar ou perder pacotes do placar de propósito não muda nenhuma nota.

---

## Etapa 3 — Experiência social (Palco)

- Fila de cantores, passar a vez, plateia.
- Mistura voz + base no aparelho do cantor, com a base atrasada pela latência medida.
- Transmissão para os ouvintes (ponto a ponto ou SFU, decidido por medição).
- Letra e placar dos ouvintes acompanham o som que eles ouvem, e não o último pacote recebido.
- Reações e aplausos, que não alteram a nota.
- Silenciar e remover participante; indicação clara de quem está no microfone.

**Condição para avançar:** ouvintes escutam voz e base alinhadas, sem base dupla nem retorno da própria voz para o cantor. O ciclo fila → canto → resultado roda sem intervenção técnica.

---

## Etapa 4 — Catálogo e operação

- Formato interno do pacote de música (`songId`, versão do arranjo, áudio, offsets, frases, notas, idioma, créditos, estado de revisão).
- Importador do formato UltraStar (com conversão da base de tempo).
- Editor interno simples para corrigir início, duração e altura de notas.
- Banco de dados (histórico, versões, resultados) e armazenamento de arquivos.
- Métricas de uso, limites e custos medidos.
- Política de privacidade e termos, revisados antes de abrir para pessoas de fora.

**Condição para avançar:** novas faixas entram sem quebrar nem misturar resultados anteriores.

---

## Etapa 5 — Envio de músicas (importação assistida)

Caminho em três níveis, do mais previsível ao mais difícil:

1. **Pacote pronto** (por exemplo, UltraStar + áudio): validação e conversão.
2. **Áudio + letra + melodia** (MIDI ou partitura): alinhamento e revisão.
3. **Só áudio**: separação de voz e acompanhamento → extração da melodia a partir da voz isolada → alinhamento da letra → revisão no editor.

- Cada etapa do processamento mostra seu estado real: em andamento, pronta ou precisa de correção.
- Faixas automáticas sem revisão funcionam só em modo experimental, fora de comparações competitivas.
- Antes de começar esta etapa, pesquisar e testar as ferramentas atuais de separação, transcrição de melodia e alinhamento de letra. O estudo cita o Basic Pitch, que funciona melhor com um instrumento por vez, então ele exigiria separar a voz primeiro.

**Condição para considerar entregue:** as faixas aceitas passam por critérios mínimos de alinhamento e de qualidade da melodia, definidos com um corpus de teste.

---

## Etapa 6 — Instalador (pedido em 13/11/2026)

O instalador pode começar assim que a Etapa 2 estiver estável. Não precisa esperar o envio de músicas.

- Escolher a ferramenta (recomendação: Electron; ver `03-decisoes-em-aberto.md`, item 16).
- Repetir a prova vocal **dentro do instalador**, no Windows e nos outros sistemas desejados.
- Instalador para Windows, com assinatura de código e atualização automática.
- Manter a versão web em paralelo para quem só quer entrar por link.

**Condição para considerar entregue:** um amigo baixa, instala, entra numa sala criada pela versão web ou pelo instalador e completa uma rodada, sem avisos de segurança inesperados.

---

## Primeira versão × versões posteriores

### Primeira versão (meta: Etapas 1 a 3 concluídas)

- Navegador de computador, interface em português.
- 3 a 5 músicas ou trechos com direitos resolvidos e mapas revisados.
- Treino solo com teste de microfone e calibração.
- Sala privada por link, apelido e avatar simples.
- Modo Disputa e modo Palco básico.
- Pontuação explicável (afinação, entradas e sustentação mostradas separadamente) e resultados.
- Revanche e próxima música.
- Estados claros para microfone negado ou ausente, desconexão e execução incompleta.
- Acessibilidade básica: tamanho de letra, menos movimento, cores com forma ou texto, teclado.

### Depois

- Instalador para computador (Etapa 6), podendo vir logo depois da primeira versão.
- Celular como plataforma suportada.
- Catálogo maior e importador UltraStar.
- Envio de músicas (Etapa 5), em níveis.
- Conta de usuário, histórico, evolução pessoal.
- Dificuldades adicionais e modos alternativos.
- Coro e dueto em tempo real (só em pesquisa; sem garantia de experiência uniforme).
- Avaliação de letra e pronúncia.
- Gravação, replays e clipes (sempre opcionais e explícitos).
- Ranking público (exige um projeto próprio de antifraude).
- Visual 3D, economia, loja.
