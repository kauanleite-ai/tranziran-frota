# Tranziran Frota — Sistema de Checklist e Auditoria

Sistema web para controle de frota com foco em **estado atual do veículo**, checklist base, fotos, histórico imutável, templates dinâmicos e preparação para auditorias quinzenais.

## Tecnologias

- Next.js 16 com App Router
- React 19
- TypeScript
- Supabase PostgreSQL, Auth e Storage
- TailwindCSS
- Deploy futuro na Vercel

## Como abrir no VS Code

```bash
cd tranziran-frota
code .
```

## Como rodar localmente

### 1. Instalar dependências

```bash
npm install
```

### 2. Criar o arquivo de ambiente

Linux/macOS:

```bash
cp .env.example .env.local
```

Windows PowerShell:

```powershell
Copy-Item .env.example .env.local
```

Preencha o `.env.local` com as credenciais do seu projeto Supabase:

```env
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-anon-key
SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=Tranziran Frota
```

### 3. Rodar as migrations no Supabase

No Supabase Dashboard > SQL Editor, execute os arquivos nesta ordem:

| Ordem | Arquivo | Descrição |
|---|---|---|
| 001 | `001_enums.sql` | Tipos e enums do banco |
| 002 | `002_cadastros.sql` | Empresas, unidades, usuários, motoristas, veículos e trigger de perfil |
| 003 | `003_templates.sql` | Templates dinâmicos de checklist |
| 004 | `004_checklists.sql` | Checklists, respostas, fotos e assinaturas |
| 005 | `005_estado_veiculo.sql` | Estado atual e histórico do veículo |
| 006 | `006_auditorias.sql` | Auditorias quinzenais e agendamentos |
| 007 | `007_ocorrencias.sql` | Ocorrências e histórico de movimentação |
| 008 | `008_telemetria_futura.sql` | Estrutura preparada para telemetria futura |
| 009 | `009_rls_policies.sql` | Políticas de Row Level Security |
| 010 | `010_seed_inicial.sql` | Empresa, unidade e template padrão REG.047 |
| 011 | `011_storage_buckets.sql` | Buckets privados de fotos/assinaturas |
| 012 | `012_rls_checklist_fix.sql` | Ajustes de RLS para finalizar checklist base |

### 4. Criar o primeiro usuário admin

Depois das migrations, crie ou convide o usuário pelo Supabase Dashboard em:

`Authentication > Users`

Depois execute no SQL Editor, trocando o e-mail:

```sql
UPDATE usuarios_perfis
SET perfil = 'admin', nome = 'Administrador', ativo = TRUE
WHERE email = 'seu@email.com';
```

### 5. Rodar o projeto

```bash
npm run dev
```

Acesse:

```text
http://localhost:3000
```

## Comandos úteis

```bash
npm run lint
npm run build
```

## Módulos prontos nesta entrega

- Fundação do sistema com login, layout protegido, sidebar e dashboard.
- Cadastros de veículos, motoristas, empresas e unidades.
- Detalhe do veículo com vínculo de motorista.
- Templates de checklist, categorias e itens configuráveis.
- Checklist base com wizard por categoria, respostas, observações e upload de fotos.
- Salvamento do estado atual do veículo e histórico inicial.
- Criação automática de ocorrência quando item fica `A / Não está OK`.
- Agendamento da próxima auditoria para 15 dias após checklist base.

## Legenda do checklist

| Código | Sigla | Significado |
|---|---|---|
| `ok` | X | OK — item em bom estado |
| `nao_tem` | N | Não tem — item inexistente no veículo |
| `nao_ok` | A | Não está OK — item com problema |
| `nao_aplica` | N/A | Não se aplica — não pertence a este tipo |

## Etapas do projeto

- [x] Etapa 1 — Fundação
- [x] Etapa 2 — Cadastros
- [x] Etapa 3 — Templates de checklist
- [x] Etapa 4 — Checklist base
- [ ] Etapa 5 — Auditoria quinzenal
- [ ] Etapa 6 — Ocorrências completas
- [ ] Etapa 7 — Dashboard e relatórios
- [ ] Etapa 8 — Telemetria via API

## Observações técnicas

- Fotos são enviadas para o Supabase Storage. O banco guarda apenas o caminho do arquivo.
- O checklist é dinâmico por template; não foi criado com colunas fixas para cada pergunta.
- A integração com telemetria ficou apenas preparada no banco e deve ser feita na última fase.
- Os clientes Supabase foram mantidos sem generic `<Database>` por compatibilidade com a versão atual do `@supabase/supabase-js`. Os tipos manuais continuam disponíveis em `src/types/database.ts` como documentação e apoio.
