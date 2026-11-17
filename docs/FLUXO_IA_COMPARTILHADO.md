# Fluxo compartilhado de desenvolvimento — ChatGPT + Codex

## Objetivo

Permitir continuar a mesma tarefa no ChatGPT (via GitHub) ou Codex (VS Code), mesmo quando o limite de uso de uma ferramenta for atingido. Este procedimento utiliza o ciclo de engenharia inspirado no [Everything Claude Code (ECC)](https://github.com/affaan-m/ECC), **não instala o ECC no ChatGPT e não cria agentes extras automaticamente**. As regras de trabalho estão no arquivo [AGENTS.md](../AGENTS.md).

## A realidade das três cópias

| Ambiente | O que enxerga | Restrições |
| --- | --- | --- |
| VS Code local | Arquivos da pasta aberta, inclusive alterações não commitadas | Código local pode ser diferente do GitHub |
| GitHub | Commits e branches enviados | Não contém modificações locais não enviadas |
| ChatGPT com GitHub | Arquivos e branches acessíveis pelo conector | Não executa automaticamente seu servidor local nem seus testes |

**Importante:** na configuração realizada em 17/11/2026, o GitHub remoto mostrou somente a branch main. Há indicação de trabalho local em staging; esse conteúdo não foi sincronizado nem foi alterado por este PR. O README remoto pode estar defasado.

## Antes de trabalhar com IA

No terminal PowerShell, dentro da pasta correta do projeto:

    git status --short --branch
    git branch --show-current
    git remote -v

Se houver arquivos modificados ou não rastreados, preservar antes de trocar branch. Não executar git reset --hard, git clean -fd, force-push ou git checkout descartando alterações. Se não souber diferenciar arquivos, pedir revisão do status antes de executar comandos de sincronização.

Para mudanças novas, partir da branch atual verificada e criar uma branch de trabalho dedicada. Não usar main para desenvolvimento.

## Pedido padrão ao ChatGPT

> Analise a branch [NOME] do repositório kauanleite-ai/tranziran-frota no GitHub. Leia AGENTS.md antes de propor alterações. Primeiro apresente diagnóstico, riscos e plano; em seguida, caso autorizado, prepare mudanças mínimas em branch separada e abra PR. Não edite main, não faça merge, deploy ou SQL de escrita em produção. Registre validações que realmente executou e destaque o que ainda precisa ser homologado no VS Code.

## Pedido padrão ao Codex do VS Code

> Leia AGENTS.md e docs/FLUXO_IA_COMPARTILHADO.md. Verifique git status e branch antes de qualquer alteração. Preserve todo o trabalho local não commitado. Siga o fluxo entender → planejar → proteger → implementar → revisar → verificar → registrar. Não modifique main/produção, não execute migrations de escrita nem faça deploy sem aprovação. No fim, entregue resumo de arquivos, resultados reais de lint/typecheck/build/testes e próximos passos.

## Como transferir uma tarefa entre as ferramentas

1. **Codex → ChatGPT:** enviar ao GitHub apenas o que deseja compartilhar, em uma branch de desenvolvimento. Informar branch, commit ou PR; problema, estado atual, arquivos alterados e verificações executadas.
2. **ChatGPT → Codex:** solicitar ao Codex que confira primeiro as alterações locais. Somente depois revisar a branch/PR criada no GitHub e integrar as mudanças de forma segura, resolvendo conflitos sem perder trabalho.
3. **Sem sincronizar:** quando não for seguro enviar o trabalho atual, compartilhar arquivos ou ZIP sem credenciais e sem .env. Não assumir que a versão no GitHub representa a versão local.

Formato recomendado de passagem de contexto:

    Projeto:
    Branch/commit ou PR:
    Objetivo:
    Problema reproduzido:
    Arquivos alterados:
    Verificações realizadas e resultados:
    Pendências / riscos:
    Próximo passo:
    Produção alterada? (sim/não):

## Critérios mínimos de revisão

- **Autorização:** acesso por perfil checado no servidor e, quando aplicável, por RLS do Supabase.
- **Dados:** erros explícitos, sem converter falhas silenciosamente em zeros; preservar histórico e evidências.
- **Desempenho:** alterações sustentadas por diagnóstico, não por hipótese apresentada como fato.
- **Mobile:** garantir feedback de carregamento, erro e confirmação, com fluxo acessível.
- **Banco:** migrations isoladas, compatíveis, com rollback planejado e nunca executadas em produção sem aprovação.
- **Qualidade:** executar npm run lint, npx.cmd tsc --noEmit e npm run build quando dependências/ambiente permitirem; nunca declarar execução sem evidência.
- **Deploy:** requer revisão do PR, homologação em ambiente seguro e autorização explícita para produção.

## Observação sobre ECC

Este repositório não precisa ter centenas de skills copiadas para funcionar com as diretrizes acima. As práticas escolhidas refletem as fases de planejamento, testes, revisão, segurança e validação do ECC. A instalação local e a disponibilidade de skills nativas no Codex são uma etapa independente. Não instalar hooks ou plugins globais durante a preparação deste fluxo compartilhado.
