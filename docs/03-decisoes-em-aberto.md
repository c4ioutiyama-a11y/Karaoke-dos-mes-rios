# Decisões em aberto

Cada item traz uma recomendação, as alternativas e o motivo. Quando uma decisão é tomada, o status vira ✅ com a escolha e a data. Itens ⏳ continuam em aberto.

**Em 13/11/2026 você aprovou as recomendações iniciais (itens 1, 2, 3 e 5) e pediu que o jogo vire um instalador mais tarde (item 16).**

| # | Decisão | Recomendação | Alternativas | Status |
|---|---|---|---|---|
| 1 | Plataforma da prova vocal e da primeira versão | Navegador de computador | App desktop (mais controle de áudio, convite mais difícil); celular desde o início (maior risco de áudio) | ✅ Navegador de computador para a prova vocal e o desenvolvimento, depois instalador (item 16), 13/11/2026 |
| 2 | Linguagem e ferramentas do experimento | TypeScript + Vite, sem framework de interface | React desde já; JavaScript puro | ✅ TypeScript 6 + Vite 8, 13/11/2026 |
| 3 | Detectores a comparar | Pitchy (McLeod) e uma implementação de YIN | Modelos de aprendizado de máquina (mais pesados), se os dois falharem | ✅ Os dois implementados, 13/11/2026 |
| 4 | Limite de tempo da Etapa 1 | Definido por você | — | ⏳ |
| 5 | Material musical de teste | Tons sintéticos + uma melodia simples com MIDI exato | Música própria gravada; canção de domínio público | ✅ Sintéticos + "Brilha, brilha, estrelinha" (domínio público), 13/11/2026 |
| 6 | Conversa por voz entre músicas na Etapa 2 | Fica para a Etapa 3 (usar chat ou chamada externa nos testes) | Antecipar o WebRTC para a Etapa 2 | ⏳ |
| 7 | Prioridade entre Disputa e Palco | Disputa primeiro, Palco em seguida, ambos na primeira versão | Palco primeiro (mais próximo de "ouvir os amigos") | ⏳ |
| 8 | Servidor de salas | Decidir no início da Etapa 2 (Colyseus é um bom candidato) | WebSocket próprio; serviço de salas gerenciado | ⏳ |
| 9 | Transporte do Palco | Decidir por medição: ponto a ponto + TURN × SFU gerenciado | — | ⏳ |
| 10 | Tamanho das salas | Testar com 2 a 8 | Outro limite | ⏳ |
| 11 | Repertório inicial | 3 a 5 faixas com direitos resolvidos | "Traga seu arquivo" com mapa compartilhado (exige análise jurídica) | ⏳ |
| 12 | Política para músicas enviadas | Só em salas privadas, modo experimental até revisão | Catálogo público com moderação | ⏳ |
| 13 | Nível de competição | Placar entre amigos; sem ranking global na primeira versão | Ranking global (exige projeto de antifraude) | ⏳ |
| 14 | Licença do código | Decidir antes de aceitar contribuições externas | Privado/todos os direitos; MIT; AGPL etc. | ⏳ |
| 15 | Visibilidade do repositório | Privado durante a concepção | Público | ⏳ |
| 16 | Distribuição como instalador | Manter o código web e empacotar depois; decidir a ferramenta ao fim da Etapa 2, com medições (ver abaixo) | Electron; Tauri; app nativo | ✅ Objetivo confirmado em 13/11/2026; ferramenta ⏳ |

## Sobre o instalador (item 16)

Você quer que o jogo vire um programa instalável. O código atual já foi preparado para isso: a página usa caminhos relativos (`base: "./"` no Vite) e funciona sem servidor próprio. As opções:

| Opção | Como funciona | Vantagem | Cuidado |
|---|---|---|---|
| **Electron** | Leva um Chromium dentro do instalador. | O áudio se comporta igual em Windows, macOS e Linux, e igual ao Chrome, onde o experimento está sendo testado. Ferramentas de instalador e atualização automática são maduras. | Instalador grande (na casa de 100 MB). |
| **Tauri** | Usa o navegador embutido do sistema e um núcleo em Rust. | Instalador bem menor. | O navegador embutido muda por sistema: no Windows é o WebView2, baseado no Chromium; no macOS e no Linux é o WebKit. O áudio teria de ser validado de novo em cada um. |
| **App nativo** | Áudio pelas interfaces do sistema (no Windows, WASAPI/ASIO). | Menor latência possível. | Muito mais trabalho. Só vale se as medições mostrarem que o navegador não basta. |

**Recomendação:** começar pelo **Electron**, pela consistência do áudio, e reavaliar o Tauri se o tamanho do instalador incomodar. Pontos a resolver:

- **Convite entre amigos:** exigir instalação aumenta a fricção. Dá para manter **as duas portas**: o instalador para quem quer, e a versão web para entrar rápido por link. O código é o mesmo.
- **Assinatura de código no Windows:** sem um certificado, o Windows mostra um aviso de "editor desconhecido" ao instalar. O certificado tem custo anual.
- **Atualizações:** o jogo online precisa que todos tenham versões compatíveis. O instalador deve se atualizar sozinho ou avisar quando estiver desatualizado.
- **Microfone:** o instalador precisa pedir a permissão do sistema operacional e tratar a recusa, como a versão web já faz.
