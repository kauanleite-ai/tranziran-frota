<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Tranziran Frota — diretrizes compartilhadas para assistentes

Este documento orienta o Codex no VS Code, o ChatGPT ao atuar pelo GitHub e outros agentes que leiam este repositório. Adota o método do ECC — planejar, testar, implementar, revisar, verificar e registrar — **sem presumir que o plugin ECC, suas skills ou hooks estejam instalados no ambiente**.

## Contexto e fonte de verdade

- Sistema corporativo de checklist, auditoria, ocorrências e gestão de frota. Preservar integridade do histórico e usabilidade operacional.
- Stack confirmada no GitHub: Next.js 16 (App Router), React 19, TypeScript estrito, Tailwind CSS e Supabase (PostgreSQL, Auth, Storage e RLS). Publicação na Vercel exige homologação.
- Conferir a autenticação e perfis em src/proxy.ts e src/app/(authenticated)/layout.tsx; cliente Supabase em src/lib/supabase/server.ts; consultas do dashboard em src/app/(authenticated)/dashboard/page.tsx.
- O código e as migrations da branch em trabalho são a referência. README, main e projeto local podem estar em versões diferentes.
- O computador local pode conter alterações ainda não enviadas ao GitHub. Antes de sugerir sincronização, verificar branch, git status e diferenças. Não assumir que o remoto contém todo o trabalho.

## Proteção da produção (obrigatória)

1. Começar por inspeção somente leitura. Não editar main, fazer merge, deploy ou push de produção sem autorização explícita.
2. Desenvolver em branch própria, com PR revisável. Não usar reset --hard, clean -fd, force-push nem descartar modificações locais.
3. Não inserir credenciais reais, tokens, service role, dados pessoais ou documentos sensíveis em código, commits, logs ou prompts. Não publicar arquivos de ambiente.
4. Não executar migrations, SQL de escrita ou mudanças de RLS em banco produtivo sem aprovação específica, plano de impacto, backup e reversão. Preferir migrations incrementais compatíveis.
5. Aplicar autorização no backend e RLS; esconder botões no frontend não é controle de segurança. Nunca disponibilizar SUPABASE_SERVICE_ROLE_KEY no cliente.
6. Não enviar mensagens, e-mails, notificações ou acionar integrações externas durante testes sem autorização e ambiente apropriado.

## Fluxo de engenharia (inspirado no ECC)

Para tarefas não triviais, seguir as fases abaixo e resumir seus resultados na entrega:

1. **Entender:** reproduzir o problema e identificar fluxo, arquivos, consultas, permissões e evidências.
2. **Planejar:** explicitar diagnóstico ou hipótese, solução mínima, riscos, arquivos afetados e critérios de aceite.
3. **Proteger:** definir teste de regressão ou verificação reproduzível antes de modificar lógica.
4. **Implementar:** pequena mudança coerente, tipada, sem refatoração ampla não solicitada.
5. **Revisar:** examinar o diff quanto a segurança, autorização, consistência de dados, performance e interface.
6. **Verificar:** executar validações disponíveis; jamais declarar teste executado sem executá-lo.
7. **Registrar:** reportar resultado, arquivos, validações, riscos, pendências, homologação e rollback.

Usar skills/agentes do ECC somente se estiverem efetivamente disponíveis na ferramenta em uso. Caso contrário, aplicar o método sem simular execução de agentes, hooks ou validações.

## Cuidados específicos

### Supabase e dados
- Inspecionar tabelas, FKs, triggers, policies RLS e migrations antes de gerar SQL.
- Preservar checklists, evidências, fotos, ocorrências e auditorias; não apagar histórico como atalho.
- Considerar compatibilidade com dados antigos e permissões por perfil.
- Erro de consulta não equivale a indicador zero. Exibir estado de erro e investigar permissões e logs em vez de ocultar falhas.

### Next.js e desempenho
- Respeitar a documentação da versão instalada e o bloco obrigatório de regras Next.js que abre este arquivo.
- Medir ou identificar evidências de lentidão antes de otimizar: waterfalls, buscas repetidas, payloads, cache e renderizações.
- Exibir estados de carregamento, vazio e falha; evitar ações silenciosas, especialmente no mobile.

### Interface e fluxo
- Interface corporativa, neutra, dados em primeiro plano, poucas cores de destaque e cores semânticas para estados.
- Preservar responsividade mobile, acessibilidade, formulários claros e confirmação de operações destrutivas.
- Não supor que a integração de telemetria esteja ativa; antes de substituir o KM manual, verificar fonte, precisão e atualização. Não inventar KM.

## Validações reais

Quando o ambiente permitir, de acordo com o escopo:

- npm run lint
- npx tsc --noEmit (PowerShell: npx.cmd tsc --noEmit)
- npm run build
- Testes automatizados apenas se existirem/configurados. O package.json verificado em main não possui script test; não declarar testes inexistentes como executados.
- Para alterações em autenticação, RLS, checklist, fotos ou navegação, executar também smoke tests em ambiente não produtivo.

Se estiver atuando apenas por ferramentas de edição remota sem executar o projeto, declarar claramente que lint, typecheck, build e smoke tests **não foram executados**.

## Continuidade ChatGPT ↔ Codex

- O GitHub é fonte compartilhada apenas para conteúdo commitado. Mudanças locais não enviadas continuam invisíveis no ChatGPT.
- Passar entre ferramentas: nome da branch, commit/PR, objetivo, arquivos alterados, testes e próximos passos.
- Conferir diferenças antes de misturar branches ou atualizar a cópia local.
- Guia prático de continuidade: docs/FLUXO_IA_COMPARTILHADO.md.
