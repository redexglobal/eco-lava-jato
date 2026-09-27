# Requisitos — Eco Lava Jato (MVP)

Origem: prompt mestre da reunião de fundação (documento "Sistema Bio Wash"; nome definido depois como **Eco Lava Jato**).

## Objetivo
Um painel único para organizar a operação do lava-jato ecológico e acompanhar as outras frentes do ecossistema (oficinas, meliponicultura), sem virar sistema contábil nem de pagamentos.

## Requisitos funcionais (status no MVP)

| # | Requisito | Status |
|---|---|---|
| RF01 | Separar dados por unidade/frente; cada pessoa vê só as unidades vinculadas (admin vê todas) | ✅ |
| RF02 | Papéis de acesso com matriz ler/editar por módulo | ✅ (sugestão inicial) |
| RF03 | Cadastro de clientes com origem, indicação, estágio, observações | ✅ |
| RF03b | Funil: novo → contatado → interessado → agendado → convertido / não prosseguir | ✅ |
| RF04 | Consentimento de contato + "não contatar" + histórico de interações | ✅ |
| RF05 | Exportar e excluir dados de um cliente (direitos LGPD) | ✅ |
| RF06 | Catálogo de serviços com duração e preço opcional ("não definido") | ✅ |
| RF07 | Agenda semanal com aviso de conflito conforme capacidade simultânea configurável | ✅ |
| RF08 | Converter agendamento em ordem de serviço, sem duplicar | ✅ |
| RF09 | Ordem de serviço com etapas, checklist e histórico de quem mudou o quê | ✅ |
| RF10 | Placa do veículo opcional (configurável) | ✅ |
| RF11 | Estoque com mínimo, validade, lote, fornecedor; movimentos com motivo obrigatório | ✅ |
| RF12 | Alertas de estoque baixo e validade próxima | ✅ |
| RF13 | Equipe, organograma (reporta-se a) | ✅ |
| RF14 | Tarefas por projeto, responsável, prazo, prioridade, comentários | ✅ |
| RF15 | Compromissos (reuniões, oficinas, operacionais) | ✅ |
| RF16 | Checklists de abertura/fechamento | ✅ |
| RF17 | Financeiro gerencial com estados separados (estimativa/proposta/aprovado/realizado) e marca de demonstrativo | ✅ |
| RF18 | Exportar financeiro em CSV sem injeção de fórmula | ✅ |
| RF19 | Projetos das frentes com registro de decisões | ✅ |
| RF20 | Configurações: capacidade, horário, contatos, regras do espaço (rascunho), política de dados | ✅ |
| RF21 | Valor de referência de R$ 15.000 exibido só se ligado, sempre como "não aprovado" | ✅ |
| RF22 | Auditoria de ações administrativas sem dados pessoais | ✅ |
| RF24 | Visão geral: contatos a atender, agenda do dia, OS, estoque, tarefas vencidas, cada uma com o cálculo explicado | ✅ |
| RF25 | Ações rápidas (contato, agendamento, OS, tarefa) conforme permissão | ✅ |
| RF26 | Indicadores ecológicos exibidos como "não medido" até haver medição real | ✅ |
| RF27 | Próxima tarefa vinculada a cada contato | ❌ Backlog |
| RF28 | Anexos (evidência de produtos, notas fiscais de compra) | ❌ Depende de armazenamento seguro |
| RF23 | Login real e dados compartilhados entre dispositivos | ❌ Pendente (Supabase) |

## Requisitos não funcionais
- Interface em português, funciona no celular (layout responsivo, PWA instalável).
- Acessível: navegação por teclado, rótulos em campos, foco visível, respeita "reduzir movimento".
- Dinheiro em centavos inteiros; nenhuma soma mistura estados financeiros.
- Nenhum segredo no repositório.

## Fora de escopo (decisão do prompt mestre)
Pagamentos, PIX, nota fiscal, contabilidade/impostos/folha, disparo automático de WhatsApp/SMS/e-mail, raspagem de dados, geolocalização, dados de crianças.
