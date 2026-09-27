# Segurança e privacidade

## Estado atual (modo demonstração)
- Sem login real: qualquer pessoa com o link escolhe um perfil. **Não é seguro para dados reais.**
- Dados só no navegador de quem usa (localStorage). Nada é enviado a servidor.
- Dados de exemplo fictícios: telefones `(00) 9…`, e-mails `@exemplo.invalid`, nomes genéricos.
- Página marcada `noindex` para não aparecer no Google.

## O que já está protegido no código
- Permissão e unidade checadas em `executar()` antes de qualquer alteração (e testadas).
- Validação de telefone, e-mail, placa, datas e valores.
- CSV exportado neutraliza fórmulas (`=`, `+`, `-`, `@`) para evitar ataque via planilha.
- Exclusão de cliente remove também as interações; a auditoria registra a exclusão sem o nome.
- Não é possível remover o último administrador nem rebaixar a si mesmo.
- Headers de segurança (nosniff, bloqueio de iframe, HSTS, câmera/microfone/geolocalização desligados) em `next.config.ts`.
- `.env*` ignorado pelo git; só `.env.example` sem valores.

## LGPD — o que o sistema oferece
- Registro de consentimento de contato (data e origem) e marca "não contatar".
- Exportar os dados de um cliente (JSON) e excluir definitivamente.
- Campo de política de dados nas configurações.

## Pendências antes de usar com clientes reais
1. Ligar Supabase com RLS (`supabase/schema.sql`) e login individual.
2. Definir e publicar a política de privacidade (responsável, prazo de guarda, canal de pedidos).
3. Definir quem é o encarregado (DPO) ou responsável pelos dados.
4. Backup e plano de resposta a incidente.
5. Chave `service_role` só no servidor (Vercel), nunca no navegador.
