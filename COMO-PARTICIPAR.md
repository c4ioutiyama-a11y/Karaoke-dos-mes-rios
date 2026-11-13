# Como participar do projeto (com o Claude Code)

Guia para amigos que vão trabalhar no projeto usando o Claude Code.

## 1. Acesso ao repositório

1. Tenha uma conta no GitHub e mande o seu **nome de usuário** para o dono do repositório.
2. Ele vai te convidar como colaborador. Aceite o convite que chega por e-mail ou em https://github.com/notifications.

Sem o convite você consegue ver o projeto, porque ele é público, mas não consegue enviar mudanças.

## 2. Usar o Claude Code

Você precisa de uma conta do Claude com um plano que inclua o Claude Code. Há dois jeitos de usar.

### Na nuvem (sem instalar nada além do navegador ou do app)
1. Conecte a sua conta do GitHub ao Claude em https://claude.ai/connect-github.
2. Abra o Claude Code em https://claude.ai/code (ou no app do Claude), comece uma sessão nova e selecione o repositório `Karaoke-dos-mes-rios`.
3. Se o repositório não aparecer, avise o dono. Pode ser preciso ajustar o acesso do app do Claude no GitHub dele.

Observação: na nuvem não há microfone. Para testar a captura, use a fonte **"Voz simulada"**. O teste com voz de verdade é feito no seu computador.

### No seu computador
1. Instale o [Node.js](https://nodejs.org/) (versão 20 ou mais recente) e o [Git](https://git-scm.com/).
2. Instale o Claude Code seguindo https://code.claude.com/docs.
3. Baixe o projeto e abra o Claude Code dentro da pasta:

```bash
git clone https://github.com/c4ioutiyama-a11y/Karaoke-dos-mes-rios.git
```

```bash
cd Karaoke-dos-mes-rios
```

```bash
claude
```

## 3. Como pedir as coisas ao Claude

O arquivo `CLAUDE.md` já explica as regras do projeto para o Claude. Bons pedidos:

- *"Leia o README e me explique em que pé está o projeto."*
- *"Crie um branch com meu nome, implemente o detector de vazamento descrito no README do experimento, rode os testes e abra um pull request."*
- *"Rode a prova vocal com voz simulada e me diga se os resultados batem com os de `resultados/sinteticos.md`."*

## 4. Combinados da equipe

- **Ninguém mexe direto na `main`.** Cada mudança vai num branch próprio e entra por pull request, que outra pessoa revisa.
- **Antes de começar algo, veja as [Issues](https://github.com/c4ioutiyama-a11y/Karaoke-dos-mes-rios/issues)**, ou crie uma, para dois amigos não fazerem a mesma tarefa.
- **Decisões do projeto** (tecnologias, modos de jogo, regras de pontuação) ficam em `docs/03-decisoes-em-aberto.md` e são aprovadas pelo dono. Sugestões são bem-vindas numa issue.
- **Nunca suba gravações de voz** suas ou de outras pessoas, nem senhas ou chaves.
- **Testou com microfone de verdade?** Anote no "Registro de testes manuais" do `experimentos/01-prova-vocal/README.md`. Esses dados são o que mais ajuda agora.

## Tarefas abertas para começar

Lista no fim de `experimentos/01-prova-vocal/README.md` ("Próximos passos deste experimento"). As mais úteis agora:

1. Testar com microfone e voz reais (qualquer pessoa pode).
2. Detector de vazamento da música no microfone.
3. Calibração por batida.
4. Segunda música de teste, com ritmo mais exigente.
