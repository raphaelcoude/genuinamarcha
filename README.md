# Genuína Marcha

Plataforma comercial para gestão de haras e conexão com o mercado do cavalo Mangalarga Marchador.

## Estado atual

Esta primeira fundação apresenta o painel operacional do haras. Os arquivos do antigo piloto estão preservados em `legacy/`.

## Desenvolvimento local

Requisitos instalados: Git, Node.js LTS e pnpm.

```powershell
pnpm install
pnpm dev
```

## Banco e autenticação

O sistema utiliza Supabase (PostgreSQL + autenticação). Para conectar um ambiente:

1. Crie um projeto no Supabase.
2. Execute o conteúdo de `supabase/migrations/202608100001_initial.sql` no SQL Editor.
3. Copie `.env.example` para `.env.local`.
4. Preencha `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` com os valores públicos de **Project Settings > API**.
5. Execute `pnpm dev`.

Nunca coloque a chave `service_role` no navegador ou em arquivos versionados. A chave pública `anon` é protegida pelas políticas de acesso do banco.

### Primeiro acesso

Crie uma conta na tela inicial, confirme o e-mail e entre. O assistente criará o primeiro haras e atribuirá ao usuário o papel de proprietário. Os cadastros de cavalos ficam isolados por haras no próprio banco.

O terminal mostrará o endereço local da aplicação. Para conferir a versão de produção:

```powershell
pnpm build
pnpm preview
```

Para atualizar as ferramentas instaladas na máquina:

```powershell
scoop update
scoop update git nodejs-lts pnpm
```

Após uma atualização do Node, execute novamente `pnpm install` no projeto.

## Direção do produto

- Área de gestão: plantel, baias, alimentação, estoque, saúde, manejo, agenda e financeiro.
- Área pública: animais, coberturas, haras, eventos e conteúdo.
- Modelo comercial multi-haras: cada organização mantém seus dados isolados e seus próprios usuários e permissões.

Consulte `docs/ARQUITETURA.md` para as decisões e fases planejadas.
