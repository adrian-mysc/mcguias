
# Integração Supabase — mcguias

## Recursos incluídos

- Autenticação
- Cloud sync
- Ranking global
- Conquistas
- Perfil usuário
- Persistência offline-first
- Sync automático
- Estrutura PostgreSQL
- RLS (segurança)

## 1. Criar projeto Supabase

https://supabase.com

## 2. Executar SQL

Abra:
SQL Editor -> cole sql/schema.sql

## 3. Criar projeto frontend

Instale:

npm install @supabase/supabase-js

## 4. Configure credenciais

Edite:
js/supabase/config.js

## 5. Importar módulos

import './js/supabase/auth.js';
import './js/supabase/sync.js';

## 6. Estrutura offline-first

Fluxo:
localStorage -> IndexedDB -> Sync Supabase

O app continua funcionando offline.
