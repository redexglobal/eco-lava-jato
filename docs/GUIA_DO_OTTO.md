# Guia do Otto — seu primeiro sistema com Claude Code

Otto, este guia explica **como este sistema nasceu**, **como você conversa com o Claude Code** e **como você cria os próximos** (inclusive as outras frentes do ecossistema). Leia com calma; não precisa decorar nada.

---

## 1. Como este sistema foi criado (a receita)

Foram 7 passos. Todo sistema novo segue quase a mesma receita:

| Passo | O que aconteceu | O que você faz na próxima vez |
|---|---|---|
| 1. Ideia | Reunião dos sócios virou um **prompt mestre** (PDF) dizendo o que o sistema precisa fazer e o que **não** pode fazer | Escreva (ou grave em áudio e transcreva) o que quer. Quanto mais claro o "não pode", melhor |
| 2. Identidade | Logo enviada; o Claude tirou dela as cores e o ícone | Mande a logo e diga o nome definitivo logo no começo |
| 3. Decisões rápidas | Repositório público, subdomínio grátis da Vercel, nome "Eco Lava Jato" | Responda as perguntas do Claude — ele pergunta só o que muda o resultado |
| 4. Regras primeiro | Antes das telas, o Claude escreveu as **regras do negócio** (`src/lib/`) e **20 testes** automáticos | Peça sempre: "escreve testes para isso" |
| 5. Telas | 12 telas usando as regras | Teste no celular e diga o que achou estranho |
| 6. Verificação | `typecheck`, `lint`, `test`, `build` — tudo verde | Nunca publique com vermelho |
| 7. Publicação | Commit → GitHub → Vercel → link no ar | Cada `push` publica sozinho |

**Palavras que você vai ouvir:**
- **Repositório (repo):** a pasta do projeto guardada no GitHub, com todo o histórico.
- **Commit:** uma "foto" salva das mudanças, com uma mensagem dizendo o que mudou.
- **Push:** enviar os commits para o GitHub.
- **Deploy:** colocar o sistema no ar. Aqui a Vercel faz isso sozinha a cada push.
- **Build:** a "montagem" do sistema. Se o build quebra, o deploy não sai.
- **Banco de dados (Supabase):** onde os dados ficam guardados de verdade, compartilhados entre todos. **Ainda não está ligado** neste sistema.
- **Modo demonstração:** hoje os dados ficam só no navegador de quem usa. Serve para testar, não para cliente real.

---

## 2. Como conversar com o Claude Code

O Claude Code roda no terminal, **dentro da pasta do projeto**. Ele lê os arquivos, edita, roda comandos e explica.

### Começando uma sessão
```bash
cd ~/projetos/eco-lava-jato
claude
```
Ele lê sozinho o `CLAUDE.md` (as regras da casa deste projeto).

### A fórmula de um bom pedido
> **Contexto + O que quero + Como sei que ficou pronto + O que NÃO fazer**

Exemplo ruim: *"melhora a agenda"*

Exemplo bom:
> *"Na tela Agenda, quero ver o mês inteiro além da semana. Pronto é: um botão alterna semana/mês e os agendamentos aparecem nos dias certos. Não muda nada no banco nem nas regras de conflito."*

### Dicas que fazem diferença
- **Pode falar normal, em português, até por áudio transcrito.** Não precisa de termo técnico.
- **Um assunto por vez.** Terminou uma coisa, commita, depois pede a próxima.
- **Peça explicação sempre que quiser:** *"me explica o que você mudou como se eu nunca tivesse programado"*.
- **Peça para ele mostrar antes de publicar:** *"me mostra o que vai subir antes do push"*.
- **Se deu errado, cole o erro inteiro** (ou tire print) e diga o que você estava fazendo.
- **`Esc`** interrompe o Claude no meio. **`Esc Esc`** volta para uma mensagem anterior.
- **`!comando`** roda um comando seu direto (ex.: `! npm run dev`).
- **`/clear`** começa conversa nova (use ao trocar de assunto grande).

### O que ele faz sozinho × o que precisa de você
| Ele faz | Você decide/faz |
|---|---|
| Escrever e corrigir código, testes, documentação | Regras do negócio (preço, horário, quem acessa o quê) |
| Rodar verificações e o build | Aprovar o push para produção |
| Criar repositório e deploy (com as contas já logadas) | Criar contas, pagar planos, fazer login (`! gh auth login`) |
| Sugerir próximos passos | Testar no celular como usuário de verdade |
| Avisar sobre riscos (dados pessoais, segurança) | Aceitar ou não o risco |

**Regra de ouro:** nunca cole senha, chave ou token na conversa. Se precisar, ele te explica onde colocar (na Vercel ou no `.env.local`).

---

## 3. Os níveis de interação (até onde você pode chegar)

Suba um nível por vez. Não tem pressa.

### Nível 1 — Usuário que testa
Abra https://eco-lava-jato.vercel.app, entre com cada perfil e siga o roteiro em `docs/PLANO_DE_TESTES.md`. Anote tudo que achar confuso.

### Nível 2 — Pedidos de ajuste (textos, cores, campos)
- *"Troca o texto do botão 'Nova OS' para 'Novo atendimento'."*
- *"No cadastro de cliente, adiciona o campo 'modelo do carro favorito'."*
- *"Me mostra como fica rodando no meu computador"* → ele roda `npm run dev` e você abre `http://localhost:3000`.

### Nível 3 — Funcionalidades novas
- *"Cria um relatório mensal de serviços entregues por tipo."*
- *"Na operação, quero tirar foto do carro antes e depois."* (ele vai perguntar onde guardar as fotos — isso é decisão de vocês)
- Sempre peça: *"escreve teste para a regra nova"*.

### Nível 4 — Infraestrutura
- Ligar o **Supabase** (banco real + login). Receita no README.
- Domínio próprio (`ecolavajato.com.br`).
- Aqui você precisa das contas e do OK dos sócios.

### Nível 5 — Criar sistemas novos do zero
Igual este: prompt mestre → Claude cria repositório, código, testes, deploy. O modelo abaixo ajuda.

---

## 4. Modelo para pedir um sistema novo

Copie, preencha e cole no Claude Code dentro de uma pasta nova (`mkdir ~/projetos/nome && cd ~/projetos/nome && claude`):

```
Quero criar o sistema <NOME>.
Para quem: <quem vai usar>
Problema que resolve: <o que hoje é bagunçado>
Telas/funções que preciso: <lista>
O que NÃO pode ter: <ex.: pagamento, dados sensíveis, WhatsApp automático>
Dados pessoais envolvidos: <quais; tem criança? então não>
Logo/cores: <anexo>
Publicação: repositório <público/privado> na conta redexglobal, Vercel no subdomínio grátis.
Antes de publicar, me mostra o resumo do que vai subir.
Me explica cada passo porque estou aprendendo.
```

---

## 5. Próximos passos sugeridos para você executar

Em ordem de dificuldade. Cada um é uma sessão com o Claude.

1. **Testar tudo** (Nível 1) e montar uma lista "estranho / faltou / gostei".
2. **Levar `docs/DECISOES_PENDENTES.md` para os sócios** e preencher preços, horário, capacidade. Depois peça: *"atualiza os dados de exemplo com os preços decididos"*.
3. **Ajuste pequeno sozinho:** escolha um texto da tela e peça para mudar. Veja o commit e o deploy acontecerem.
4. **Relatório semanal** na visão geral (serviços entregues, tempo médio por serviço).
5. **Fotos antes/depois** na ordem de serviço (exige banco — combine com o passo 7).
6. **Frente Oficinas:** inscrições em oficinas com lista de presença (sem dados de crianças).
7. **Ligar Supabase + login real** — passo que libera o uso com clientes de verdade.
8. **Frente Meliponicultura:** controle de caixas/colmeias (espécie, local, revisões, colheita).
9. **Domínio próprio** e política de privacidade publicada.
10. **Testes de tela automáticos** (Playwright) para não quebrar nada ao crescer.

Bom trabalho, Otto. Errar faz parte — tudo fica no histórico do git e dá para voltar atrás.
