# Avaliação crítica da proposta técnica

Data: 13/11/2026. Avaliação do estudo em [`00-contexto-e-estudo-de-viabilidade.md`](00-contexto-e-estudo-de-viabilidade.md).

Convenção usada aqui:

- **[Fato]**: comportamento documentado de uma API, biblioteca ou norma. Mesmo assim, confira a documentação atual antes de implementar.
- **[Recomendação]**: minha opinião sobre o melhor caminho. Você ainda não aprovou.
- **[Hipótese]**: algo que parece provável mas precisa de experimento.

---

## 1. Resumo da avaliação

O estudo está bem fundamentado e evita as armadilhas mais comuns: separa afinação, letra e transmissão de voz; não promete coral remoto sincronizado; não trata a extração automática de músicas como resolvida; e diferencia servidor autoritativo de antifraude. A sequência "prova vocal → rodada online → palco → catálogo → importação" faz sentido.

Ainda assim, há **cinco pontos que o estudo subestima ou deixa de fora** e que podem mudar prioridades:

1. **O áudio da música vazando para o microfone** pode gerar pontos falsos. É o maior risco de justiça da pontuação.
2. **Fones Bluetooth e calibração no navegador** são mais difíceis do que o texto sugere.
3. **No modo Disputa, o sincronismo entre jogadores importa pouco para a justiça.** Isso permite simplificar a primeira rodada online.
4. **A conversa por voz entre as músicas** já exige transporte de mídia (WebRTC) na Entrega 2, não só na Entrega 3.
5. **Direitos das músicas e a LGPD** são riscos de produto tão grandes quanto os técnicos e precisam entrar no plano desde cedo.

---

## 2. O que está sólido e deve ser mantido

| Ponto do estudo | Por que está certo |
|---|---|
| Pontuação calculada **localmente**, a partir da posição da música, e não do momento em que os pacotes chegam | A rede passa a afetar só o placar exibido, não a nota. É a decisão de arquitetura mais importante. |
| Denominador da fórmula baseado na **duração esperada**, e não no trecho detectado | Impede que alguém pontue alto cantando só os trechos fáceis. |
| Afinação medida em **cents** e oitava equivalente como opção explícita | Escala correta para comparar afinação; acomoda vozes graves e agudas sem esconder a regra. |
| Não somar outra vez tempo e sustentação com pesos arbitrários | Evita punir o mesmo erro duas vezes. |
| Mapa vocal versionado + versão da regra no resultado | Sem isso, corrigir uma nota invalidaria rankings silenciosamente. |
| Modo Palco com **uma única mistura** (voz + base) gerada no aparelho do cantor | É a forma mais simples de o público ouvir voz e base alinhadas. Faixas separadas só valem a complexidade se houver motivo medido. |
| Não depender de baixar áudio do YouTube | Evita um problema de termos de uso e de direitos autorais. |
| Critério de aprovação capaz de **reprovar** a biblioteca | Protege contra adaptar o teste para aceitar uma ferramenta ruim. |

---

## 3. Riscos subestimados

### 3.1 A música vazando para o microfone (risco alto)

**[Fato]** Em `getUserMedia`, os navegadores costumam ligar por padrão o cancelamento de eco (`echoCancellation`), a supressão de ruído (`noiseSuppression`) e o controle automático de ganho (`autoGainControl`). Esses filtros foram feitos para chamadas de voz e podem distorcer notas sustentadas e vibrato.

O dilema:

- **Com os filtros desligados** (melhor para medir o canto), se a pessoa usar caixas de som em vez de fones, o microfone capta a própria música. Se a faixa tiver **vocal guia**, o detector vai "ouvir" o cantor original afinado e dar pontos para quem está calado.
- **Com os filtros ligados**, o cancelamento de eco pode remover parte do canto ou cortar notas longas. **[Hipótese]** O efeito varia por navegador e por microfone.

**[Recomendação]**

- Por padrão, tocar **apenas o instrumental** durante a pontuação, com vocal guia opcional e em volume baixo.
- Recomendar fones com fio no teste de microfone, sem tornar obrigatório.
- Medir no experimento um **detector de vazamento**: comparar o sinal captado com o sinal tocado (correlação). Se o microfone estiver basicamente reproduzindo a base, avisar o jogador e marcar a execução.
- Incluir no corpus de testes o cenário "caixa de som ligada, ninguém cantando". Ele precisa dar uma pontuação perto de zero.

### 3.2 Calibração e fones Bluetooth (risco alto)

**[Fato]** O Web Audio expõe `baseLatency` e `outputLatency`, mas o suporte e a precisão variam entre navegadores e dispositivos. Não existe uma propriedade padrão e confiável para a **latência de entrada** do microfone.

**[Fato]** Fones Bluetooth costumam somar um atraso de saída bem maior que fones com fio, e esse atraso nem sempre é informado corretamente ao navegador.

Consequências:

- Com fones, **não dá para medir automaticamente** o atraso total tocando um clique e gravando pelo microfone, porque o som do fone não chega ao microfone. A calibração precisa ser **feita pelo usuário**: bater palma, dizer "tá" ou cantar junto com uma marcação. Isso é menos preciso.
- Com caixas de som, a medição automática por eco é possível, mas aí entra o risco de vazamento do item 3.1.

**[Recomendação]**

- Desenhar a pontuação com uma **tolerância de tempo** generosa no modo casual. Assim, um erro de calibração de algumas dezenas de milissegundos não muda a nota de forma perceptível. **[Hipótese]** O tamanho dessa tolerância precisa ser medido.
- Testar dois métodos de calibração no experimento: (a) bater no ritmo de um metrônomo; (b) cantar uma frase curta e alinhar o atraso que maximiza o acerto. Comparar a estabilidade dos dois.
- Detectar a troca de dispositivo (`devicechange`) e pedir nova calibração.
- Tratar Bluetooth como um caso **suportado com aviso**, não como algo proibido nem como garantia.

### 3.3 Onde o detector de afinação roda

**[Fato]** O Pitchy é uma biblioteca JavaScript comum. Rodá-la dentro de um `AudioWorklet` exige empacotá-la para esse ambiente, que tem restrições próprias, e respeitar o orçamento de tempo de cada bloco de áudio.

**[Recomendação]** Usar uma arquitetura em três partes:

1. O AudioWorklet só **captura e acumula** amostras.
2. Ele envia janelas de amostras para um **Web Worker**, que roda o detector (Pitchy ou outro).
3. O Worker manda para a interface apenas resumos: tempo musical, frequência, clareza e acerto.

Assim a interface (React ou outra) nunca bloqueia a análise. O experimento deve comparar pelo menos **dois detectores** (por exemplo, Pitchy/McLeod e uma implementação de YIN). Com só uma opção, não há como reprovar uma biblioteca e escolher outra.

### 3.4 Sincronismo no modo Disputa é menos crítico do que parece

No modo Disputa, cada pessoa ouve **só a própria cópia** da música, e a nota é local. Se o jogador A começa 150 ms depois do jogador B, a pontuação dos dois continua justa. A diferença aparece apenas na barra de progresso dos amigos.

**[Recomendação]** Para a Entrega 2, um início agendado com uma estimativa simples de diferença de relógio (alguns pings de ida e volta ao servidor) é suficiente. Vale guardar a sincronização fina para quando houver uma necessidade medida, como reações em tempo real que precisem bater com a batida da música.

### 3.5 Conversa por voz entre as músicas já exige WebRTC

O estudo diz que, na Disputa, "a conversa volta no intervalo". Isso significa transporte de voz em tempo real **já na Entrega 2**, e não só no Palco.

**[Recomendação]** Escolher uma de duas opções, conscientemente:

- **(a)** Na Entrega 2, interação só por texto e reações, deixando a voz para a Entrega 3 junto com o Palco. É mais simples, mas o teste social fica mais pobre.
- **(b)** Antecipar o WebRTC para a Entrega 2, usando a mesma infraestrutura que depois servirá ao Palco.

Sugiro **(a)** se o objetivo é provar a rodada rápido. Sugiro **(b)** se o teste com amigos de verdade for o objetivo da Entrega 2. Na prática, muitos grupos podem usar Discord ou uma chamada em paralelo nos primeiros testes, o que torna (a) aceitável.

### 3.6 Transporte do modo Palco: LiveKit não é a única saída

Com no máximo 8 pessoas e **um único cantor transmitindo**, uma rede WebRTC ponto a ponto (o cantor envia direto para até 7 ouvintes) pode ser suficiente. **[Hipótese]** A conta do estudo para 128 kbit/s × 7 ouvintes dá cerca de 0,9 Mbit/s de envio. Isso é viável em muitas conexões domésticas, mas não em todas.

| Opção | Vantagem | Custo |
|---|---|---|
| WebRTC ponto a ponto + servidor TURN | Sem serviço de mídia pago no início; arquitetura simples para 1 emissor. | Upload do cantor cresce com o público; TURN ainda é necessário para redes restritivas; você implementa mais coisas. |
| SFU gerenciado (LiveKit ou similar) | O upload do cantor é único; recursos de áudio musical documentados; mais fácil de escalar. | Dependência e custo de tráfego; outra peça para operar. |

**[Recomendação]** Decidir depois de medir. Para qualquer opção, o experimento do Palco deve configurar o áudio para música, e não para chamada: filtros de voz desligados no cantor, taxa de bits maior e sem cortes de silêncio. Também deve verificar se o navegador respeita essas configurações.

### 3.7 Servidor de salas

Colyseus é uma escolha razoável e documentada. Como as salas são pequenas e o estado é simples (lista de jogadores, música, estado da rodada, placares), alternativas também servem: um servidor WebSocket próprio, serviços de "salas" gerenciados, ou plataformas de tempo real com banco embutido. **[Recomendação]** A escolha não é crítica para a prova vocal. Ela pode esperar o início da Entrega 2 e deve priorizar reconexão e facilidade de hospedar.

---

## 4. Lacunas não cobertas pelo estudo

### 4.1 Direitos das músicas (risco de produto)

O jogo só é divertido com músicas que as pessoas conhecem. Músicas comerciais envolvem vários direitos: gravação, composição e letra. "Músicas próprias ou autorizadas" resolve a parte legal, mas pode deixar o primeiro catálogo pouco atraente.

Alternativas que merecem análise jurídica antes do lançamento público:

- **Catálogo autorizado**: músicas de domínio público, artistas independentes parceiros ou faixas licenciadas.
- **"Traga seu arquivo"**: cada participante usa a própria cópia do áudio, e só o **mapa vocal** é compartilhado, identificado pela duração e por uma impressão digital do áudio. Isso evita redistribuir o arquivo, mas exige que todos tenham a mesma versão da gravação. Distribuir mapas com letra também pode envolver direitos sobre a letra.
- **Upload pelo anfitrião em sala privada**: é o mais prático, mas é redistribuição. É a opção com maior risco jurídico.

Isso **não é parecer jurídico**. É uma lista de perguntas para um advogado antes de abrir o jogo ao público.

### 4.2 LGPD e privacidade

**[Fato]** A voz pode ser um dado pessoal, e a LGPD se aplica a quem trata dados de pessoas no Brasil. Transmitir voz no Palco, guardar resultados e, no futuro, gravações exigem informação clara, base legal (como consentimento) e cuidado com menores de idade.

**[Recomendação]** Manter as decisões do estudo: não gravar por padrão, mostrar quem está transmitindo, analisar localmente. Somar a isso uma política de privacidade simples antes de qualquer teste com pessoas fora do círculo de desenvolvimento. O **corpus de vozes para testes** também precisa do consentimento de quem gravou.

### 4.3 Recursos do projeto

O estudo não diz quem vai desenvolver, com quanto tempo e com qual experiência. Isso muda as escolhas. Para uma pessoa sozinha, por exemplo, menos peças para operar (serviços gerenciados, uma única linguagem) vale mais do que flexibilidade. **[Recomendação]** Dar um **limite de tempo** à prova vocal, definido por você. Se ele estourar sem resultado coerente, o problema volta para a mesa antes de investir no resto.

### 4.4 Como criar mapas vocais na primeira versão

O estudo assume 3 a 5 músicas "preparadas e revisadas", mas não diz como prepará-las. As opções:

- Usar arquivos no formato UltraStar que já existem para músicas com direitos resolvidos, convertendo a base de tempo.
- Criar mapas à mão a partir de uma partitura ou MIDI da melodia.
- Gravar músicas próprias, com melodia conhecida desde o início. É o caminho mais simples para a prova vocal.

**[Recomendação]** Para a prova vocal, usar **material com melodia conhecida com exatidão**: tons sintéticos, uma música simples composta para o teste, ou uma canção de domínio público com MIDI da melodia. Sem isso, não dá para distinguir um erro do detector de um erro do mapa.

### 4.5 Celular

Celular está na visão, mas o estudo não aponta o principal risco: navegadores móveis, especialmente no iPhone, têm comportamentos próprios de áudio, como roteamento entre alto-falante e fone, interrupções por chamadas e suspensão da aba. **[Recomendação]** Fazer um **teste de sondagem** barato logo após a prova vocal no desktop, rodando o mesmo experimento num iPhone e num Android, só para saber o tamanho do problema. Não precisa ser suporte oficial.

---

## 5. Sobre a fórmula de pontuação

A fórmula base proposta é boa:

```
pontos = 10.000 × soma(duração × acerto) / soma(duração vocal esperada)
```

Sugestões para defini-la no experimento:

- **Unidade de análise:** quadros curtos de tamanho fixo (por exemplo, a cada ~10–20 ms). Cada quadro dentro de uma nota esperada recebe um `acerto` entre 0 e 1. O tamanho exato precisa ser medido.
- **Curva de acerto por afinação:** acerto total até uma tolerância (em cents), queda linear até um limite e zero depois disso. Os parâmetros variam por dificuldade e são **calibrados com o corpus**, não escolhidos no chute.
- **Clareza mínima:** quadros com baixa confiança do detector valem zero, e não "metade". Isso evita que ruído pontue.
- **Tolerância de tempo:** cada nota aceita voz um pouco antes ou depois dos limites do mapa (ver item 3.2).
- **Teste de sanidade obrigatório:** silêncio ≈ 0; base vazando sem canto ≈ 0; tom sintético exato ≈ máximo; tom desafinado em ±50 e ±100 cents gera uma ordem decrescente coerente.

---

## 6. Conclusão

A proposta é viável como **ponto de partida**, com uma ressalva: o primeiro experimento precisa testar o cenário de **vazamento da música para o microfone** e a **calibração com fones Bluetooth e com fio**, além da precisão do detector. Os outros ajustes (simplificar a sincronização da Disputa, decidir quando a voz entre músicas entra, comparar ponto a ponto com SFU) podem ser resolvidos nas etapas seguintes.

Os maiores riscos fora da engenharia são **direitos das músicas** e **privacidade**. Vale buscar orientação jurídica antes de qualquer lançamento público.
