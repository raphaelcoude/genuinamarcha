# Arquitetura do produto

## Princípios

1. **Multi-haras desde a origem:** toda informação operacional pertence a uma organização (`haras_id`).
2. **Separação público/privado:** o portal comercial não acessa diretamente os dados internos de gestão.
3. **Histórico auditável:** estoque, saúde, manejo e finanças são lançamentos; alterações importantes preservam autor, data e contexto.
4. **Permissões por função:** proprietário, administrador, gerente, tratador, veterinário, financeiro e consulta.
5. **Uso no campo:** telas responsivas, ações rápidas e funcionamento confortável no celular.

## Domínios principais

- Organizações, unidades, usuários e permissões.
- Cavalos, genealogia, documentos, fotos, propriedade e situação.
- Baias, piquetes, ocupações, limpeza e manutenção.
- Produtos, lotes, estoque, fornecedores, entradas, saídas e inventário.
- Planos alimentares, consumo de feno, ração e suplementos.
- Prontuário, vacinas, medicamentos, exames e veterinários.
- Casqueamento, ferrageamento e outros manejos recorrentes.
- Agenda, tarefas, responsáveis, recorrência e alertas.
- Centros de custo, despesas, receitas, contas e relatórios.
- Anúncios, coberturas, eventos e perfis públicos.

## Fases

### 1. Fundação

Identidade visual, navegação, modelo multi-haras, autenticação, permissões e base de dados.

### 2. Operação essencial

Cadastro de cavalos, baias, agenda, saúde e manejo.

### 3. Insumos e financeiro

Estoque, alimentação, fornecedores, custos, receitas e relatórios.

### 4. Comercial

Perfis públicos, anúncios, coberturas, eventos e planos de assinatura.

### 5. Escala

Auditoria avançada, exportações, integrações, notificações e indicadores comparativos.

## Base técnica adotada

- Interface: React, TypeScript e Vite.
- Banco: PostgreSQL gerenciado pelo Supabase.
- Autenticação: Supabase Auth com e-mail e senha.
- Autorização: políticas de segurança no banco por organização e função.
- Hospedagem da interface: compatível com Cloudflare Pages.
- Desenvolvimento: Node.js LTS e pnpm, com dependências travadas em `pnpm-lock.yaml`.

O esquema inicial está em uma migração SQL versionada. Isso permite reconstruir o banco, auditar alterações e levar a aplicação para outro PostgreSQL compatível no futuro.
