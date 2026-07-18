# Setup Supabase para HyDeivi

Proyecto existente: `HyDeivi` (`baaolluzteatewpenojo`)
URL: `https://baaolluzteatewpenojo.supabase.co`

## 1. Obtener la anon/publishable key

En el dashboard de Supabase abre el proyecto existente y ve a **Project Settings -> API**. Copia la key publica de navegador (`anon`/`publishable`).

Nunca pegues `service_role` ni claves secretas en el frontend: Vite expone cualquier variable `VITE_*` al navegador.

## 2. Crear el archivo local `.env`

Copia `.env.example` a `.env` y completa solo la key publica:

```bash
VITE_SUPABASE_URL=https://baaolluzteatewpenojo.supabase.co
VITE_SUPABASE_ANON_KEY=tu_anon_o_publishable_key
```

Este repo solo incluye `.env.example`; no se guarda ningun secreto real.

## 3. Crear tablas y politicas

El proyecto remoto `baaolluzteatewpenojo` ya fue migrado con la cadena completa de migraciones del repo.

Para una instalacion manual o una restauracion en otro entorno, usa una de estas opciones:

1. Ejecuta `supabase/schema.sql` completo en el **SQL Editor** de Supabase.
2. O aplica todas las migraciones de `supabase/migrations/` en orden cronologico:
   - `20260708174027_create_hydeivi_core_schema.sql`
   - `20260708195000_align_hydeivi_schema_to_contract.sql`
   - `20260708195500_harden_updated_at_trigger_search_path.sql`

No apliques solo `supabase/migrations/20260708174027_create_hydeivi_core_schema.sql`: es una migracion historica inicial y no contiene el esquema final vigente.

## 4. Arrancar la app

```bash
npm install
npm run dev
```

## 5. Confirmar modo local vs Supabase

- Sin `.env` o sin key: Mi cuenta muestra `Modo local` y `Supabase no configurado. La app esta usando modo local.`
- Con URL + key, pero sin sesion: la app muestra `Supabase conectado`; puedes seguir usando localStorage.
- Con sesion iniciada: la app muestra `Sesion iniciada: email` y los guardados usan Supabase.

## 6. Login y sincronizacion

En **Mi cuenta** usa email/password para entrar o registrarte. Con sesion activa aparece el boton **Sincronizar datos locales con Supabase**. Ese boton sube perfil, check-ins, logs y consejos guardados desde localStorage sin borrar localStorage.
