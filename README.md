# AtletaHY

Aplicación web de planificación de entrenamiento híbrido orientada a la preparación de pruebas HYROX. AtletaHY reúne en una sola interfaz el perfil deportivo del atleta, su disponibilidad, material, lesiones, recuperación diaria, entrenamientos, marcas en tests y recomendaciones asistidas por IA.

> **Aviso:** AtletaHY es un proyecto independiente y no está afiliado oficialmente a HYROX. Las recomendaciones de la aplicación son orientativas y no sustituyen la valoración de un profesional sanitario o deportivo.

## Índice

- [Descripción general](#descripción-general)
- [Acceso de prueba para Brais](#acceso-de-prueba-para-brais)
- [Stack tecnológico](#stack-tecnológico)
- [Requisitos previos](#requisitos-previos)
- [Instalación y ejecución](#instalación-y-ejecución)
- [Variables de entorno](#variables-de-entorno)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Funcionalidades principales](#funcionalidades-principales)
- [Rutas principales](#rutas-principales)
- [Persistencia y Supabase](#persistencia-y-supabase)
- [Inteligencia artificial](#inteligencia-artificial)
- [Calidad y pruebas](#calidad-y-pruebas)
- [Build y despliegue en Vercel](#build-y-despliegue-en-vercel)
- [Seguridad y privacidad](#seguridad-y-privacidad)
- [Limitaciones conocidas](#limitaciones-conocidas)

## Descripción general

AtletaHY permite preparar una competición mediante una experiencia progresiva:

1. El atleta entra en la aplicación o abre la demo local.
2. Completa el onboarding con su objetivo, disponibilidad, métricas, material, lesiones y preferencias.
3. Consulta la planificación por semanas y días.
4. Registra su estado diario y el resultado de cada sesión.
5. Guarda resultados en tests específicos de carrera, fuerza y ergómetros.
6. Puede solicitar a la IA un plan estructurado o consejo contextual de entrenamiento.
7. Revisa y actualiza sus datos desde **Mi perfil**.

La aplicación funciona en dos contextos claramente separados:

- **Modo demo/guest:** utiliza almacenamiento local del navegador y permite explorar los flujos principales sin una cuenta.
- **Modo autenticado:** utiliza Supabase Auth y repositorios remotos protegidos por el identificador del usuario y políticas RLS.

La interfaz es una SPA responsive construida con React. Incluye rutas profundas, navegación móvil, protección ante borradores sin guardar, carga diferida de vistas y consideraciones de accesibilidad como enlace de salto, regiones vivas y compatibilidad con `prefers-reduced-motion`.

## Acceso de prueba para Brais

Esta cuenta ha sido creada exclusivamente para que **Brais**, profesor del proyecto, pueda probar la aplicación:

| Campo | Valor |
| --- | --- |
| Usuario | `davidglezarmas@gmail.com` |
| Contraseña | `hydeivi` |

> **Cuenta de prueba:** no debe utilizarse para almacenar información personal o sensible. Estas credenciales se incluyen deliberadamente por motivos académicos. Si el repositorio pasa a ser público o deja de utilizarse para la evaluación, se recomienda eliminar esta sección, desactivar la cuenta o cambiar la contraseña.

## Stack tecnológico

### Frontend

- **React 19** y **React DOM** para la interfaz.
- **TypeScript** con comprobación durante el build.
- **React Router DOM 7** para rutas públicas, demo y autenticadas.
- **Vite 8** como servidor de desarrollo y empaquetador.
- **Tailwind CSS 3**, PostCSS y Autoprefixer para estilos responsive.
- Componentes funcionales, hooks, lazy loading y separación por vistas.

### Backend y datos

- **Supabase JavaScript SDK 2**.
- **Supabase Auth** para registro, inicio y cierre de sesión.
- **PostgreSQL** para perfiles, métricas, disponibilidad, material, lesiones, nutrición, readiness, entrenamientos, tests, planes y cuotas.
- **Row Level Security (RLS)** para aislar los datos por usuario.
- **Supabase Edge Functions** sobre Deno para IA y eliminación de cuenta.
- Migraciones SQL versionadas y RPC PostgreSQL para operaciones atómicas.

### Inteligencia artificial

- **OpenAI Responses API** desde Edge Functions, nunca directamente desde el navegador.
- Modelo configurado en el código servidor: `gpt-4.1-mini`.
- Salidas JSON estructuradas, validación de contratos, timeout, cuotas y reglas deterministas de seguridad deportiva.

### Pruebas y calidad

- **Vitest 4** para pruebas unitarias y de integración de frontend.
- **Testing Library** y **jest-dom** para comportamiento accesible de componentes.
- **jsdom** como entorno de tests.
- **V8 Coverage** con umbrales mínimos.
- **Playwright 1.61** para flujos E2E críticos en Chromium.
- Tests SQL de Supabase/PostgreSQL, incluidas comprobaciones de atomicidad y concurrencia.

### Despliegue

- Build estático con Vite.
- Configuración SPA para **Vercel** mediante `vercel.json`.
- Edge Functions desplegables de forma independiente con Supabase CLI.

## Requisitos previos

Para ejecutar únicamente el frontend:

- **Node.js 20.19 o superior** (Vite 8 también admite Node 22.12+).
- **npm**.

Para trabajar con el backend local y los tests de base de datos:

- **Supabase CLI** disponible en el `PATH`.
- **Docker Desktop** o un runtime Docker compatible en ejecución.
- PostgreSQL se inicia dentro del stack local de Supabase; no es necesario instalarlo por separado.

Para los E2E:

- Chrome/Chromium compatible con Playwright.
- Si es necesario, instalar el navegador administrado por Playwright con `npx playwright install chromium`.

## Instalación y ejecución

Desde la raíz del proyecto:

```bash
npm ci
npm run dev
```

Vite mostrará en la terminal la URL local. Por defecto suele ser `http://localhost:5173`.

### Ejecución sin Supabase

Si no se definen las variables públicas de Supabase, la autenticación no estará disponible, pero se puede recorrer la aplicación mediante **Ver demo**. Los datos de demo se guardan en un namespace local independiente dentro de `localStorage`.

### Ejecución con Supabase local

1. Instalar Supabase CLI y arrancar Docker.
2. Iniciar el stack local:

   ```bash
   supabase start
   ```

3. Obtener del resultado de `supabase status` la URL de API y la clave pública local.
4. Configurar `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` en un archivo local ignorado por Git, por ejemplo `.env.local`.
5. Si se van a probar las funciones de IA, configurar sus secretos **solo en el runtime de Edge Functions**.
6. Ejecutar la aplicación:

   ```bash
   npm run dev
   ```

El archivo `supabase/config.toml` define, entre otros, los puertos locales de API (`54321`), base de datos (`54322`), Studio (`54323`) y correo de pruebas (`54324`).

### Vista previa del build de producción

```bash
npm run build
npm run preview
```

## Variables de entorno

No se deben versionar archivos `.env`, tokens ni claves privadas. Los nombres que utiliza el proyecto son los siguientes.

### Frontend (variables públicas de Vite)

| Variable | Obligatoria | Uso |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | Para autenticación/persistencia remota | URL pública del proyecto Supabase. |
| `VITE_SUPABASE_ANON_KEY` | Para autenticación/persistencia remota | Clave pública/anon de Supabase. Es visible en el navegador y su seguridad depende de RLS. |

Ejemplo sin valores reales:

```dotenv
VITE_SUPABASE_URL=<url-publica-de-supabase>
VITE_SUPABASE_ANON_KEY=<clave-publica-o-anon>
```

### Edge Functions

| Variable | Funciones | Uso |
| --- | --- | --- |
| `SUPABASE_URL` | Todas | URL del backend Supabase. |
| `SUPABASE_ANON_KEY` o `SUPABASE_PUBLISHABLE_KEY` | Todas | Validación de la sesión del usuario. La generación de planes también admite `SUPABASE_PUBLISHABLE_KEYS` por compatibilidad. |
| `OPENAI_API_KEY` | `generate-training-plan`, `generate-coach-advice` | Acceso servidor a OpenAI. Nunca debe exponerse con prefijo `VITE_`. |
| `SUPABASE_SERVICE_ROLE_KEY` | `delete-account` | Eliminación administrativa tras autenticar y reautenticar al usuario. Es un secreto crítico de servidor. |
| `ACCOUNT_DELETION_ALLOWED_ORIGIN` | `delete-account` | Origen web exacto autorizado por CORS para solicitar la eliminación. |

Supabase puede inyectar automáticamente parte de estas variables en sus Edge Functions. Los secretos adicionales deben configurarse con Supabase CLI o desde el panel del proyecto, nunca dentro del código fuente.

## Estructura del proyecto

```text
HyDeivi/
├── e2e/
│   └── critical-flows.spec.ts       # Flujos críticos con Playwright
├── scripts/
│   └── run-local-db-integration.mjs # Gate para tests PostgreSQL locales
├── src/
│   ├── components/
│   │   ├── account/                 # Perfil, privacidad, exportación y cuenta
│   │   ├── auth/                    # Login, registro y estado de sesión
│   │   ├── layout/                  # Shell y navegación global/mobile
│   │   ├── marketing/               # Home pública
│   │   ├── onboarding/              # Configuración inicial del atleta
│   │   ├── plans/                   # Generación y visualización de planes IA
│   │   ├── tests/                   # Catálogo, detalle y registro de tests
│   │   └── training/                # Espacio principal de entrenamiento
│   ├── data/                        # Datos iniciales, tests y semanas base
│   ├── errors/                      # Normalización de errores para UI
│   ├── lib/                         # Cliente Supabase
│   ├── privacy/                     # Exportación y eliminación de cuenta
│   ├── repositories/                # Contratos y persistencia local/remota
│   │   └── supabase/                # Implementaciones sobre Supabase
│   ├── security/                    # Comprobaciones contra secretos frontend
│   ├── services/                    # Orquestación de Coach y planes
│   ├── shared/                      # Contratos y safety compartidos
│   ├── test/                        # Setup y fixtures de Vitest
│   ├── types/                       # Tipos de dominio y base de datos
│   ├── utils/                       # Fechas, cálculos, validación y analítica
│   ├── App.tsx                      # Routing y composición principal
│   ├── index.css                    # Estilos globales y accesibilidad
│   └── main.tsx                     # Punto de entrada React
├── supabase/
│   ├── functions/
│   │   ├── _shared/                 # Handlers, esquemas y safety reutilizable
│   │   ├── delete-account/          # Eliminación segura de cuenta
│   │   ├── generate-coach-advice/   # Consejo contextual mediante IA
│   │   └── generate-training-plan/  # Generación de plan mediante IA
│   ├── migrations/                  # Migraciones SQL forward-only
│   ├── tests/database/              # Tests SQL atómicos y concurrentes
│   ├── config.toml                  # Configuración del stack local
│   └── schema.sql                   # Referencia del esquema
├── index.html                       # Documento HTML base
├── playwright.config.ts             # Configuración E2E offline/local
├── tailwind.config.js               # Tema Tailwind
├── tsconfig*.json                   # Configuración TypeScript
├── vercel.json                      # Rewrite SPA para Vercel
├── vite.config.ts                   # Vite, Vitest, coverage y code splitting
└── package.json                     # Dependencias y scripts
```

Los archivos `*.test.ts` y `*.test.tsx` están colocados junto al código que verifican.

## Funcionalidades principales

### Home pública y autenticación

- Landing page con propuesta de valor, explicación del flujo y aviso de independencia respecto a HYROX.
- Registro e inicio de sesión por email y contraseña mediante Supabase Auth.
- Acceso a demo sin credenciales.
- Redirección de rutas privadas a la home si no existe sesión.

### Onboarding

- Configuración guiada del perfil y objetivo deportivo.
- Disponibilidad semanal, duración de sesiones y preferencias horarias.
- Registro de métricas fisiológicas, material, lesiones y nutrición.
- Borrador aislado por identidad que sobrevive a recargas.
- Protección frente a navegación con cambios sin guardar.

### Entrenamientos

- Vista semanal y diaria de la planificación.
- Navegación por semanas y calendario.
- Bloques y secciones de trabajo estructurados.
- Registro del entrenamiento realizado y recuperación de logs persistidos.
- Analítica semanal a partir de las sesiones registradas.

### Tests & Ergs

- Catálogo de pruebas de rendimiento por categoría.
- Tests de carrera, ergómetros y capacidades específicas.
- Detalle de protocolo, introducción de resultados y cálculos asociados.
- Historial persistente y rutas profundas a un test concreto, por ejemplo `ski-2k`.

### Mi perfil

- Perfil básico y objetivo HYROX.
- Métricas fisiológicas y ritmos.
- Disponibilidad, equipamiento, lesiones y nutrición.
- Check-in diario de sueño, estrés, fatiga, dolor, agujetas, motivación e hidratación.
- Edición de la configuración inicial.
- Sección de privacidad, exportación local y eliminación de cuenta.

### Coach IA

- Consejo contextual basado en perfil, sesión activa, readiness, lesiones y logs recientes.
- Validación estricta del payload y de la respuesta estructurada.
- Timeout, cuota diaria y errores controlados.
- Reglas deterministas que prevalecen sobre la salida del modelo cuando existe riesgo deportivo.

### Generación de planes

- Generación de planificación personalizada a partir del estado completo del atleta.
- Plan organizado en semanas, días y bloques.
- Visualización de objetivo, supuestos y notas nutricionales.
- Persistencia del plan activo mediante una RPC atómica.
- Recuperación de un plan ya guardado sin volver a consumir IA.
- Safety deportivo aplicado también en el renderizado del plan.

### Privacidad y datos

- Namespaces locales separados para guest y cada usuario.
- Migración de datos locales a Supabase mediante una acción explícita.
- Exportación de datos locales sin tokens de autenticación.
- Eliminación definitiva de cuenta con sesión, confirmación exacta y reautenticación por contraseña.

## Rutas principales

| Ruta | Descripción |
| --- | --- |
| `/` | Home pública, acceso, registro y entrada a la demo. |
| `/demo/trainings` | Entrenamientos en modo local. |
| `/demo/tests` | Tests en modo local. |
| `/demo/tests/:testId` | Detalle de un test en demo. |
| `/demo/profile` | Perfil de demo. |
| `/demo/onboarding` | Onboarding de demo. |
| `/app/trainings` | Entrenamientos del usuario autenticado. |
| `/app/tests` | Tests del usuario autenticado. |
| `/app/tests/:testId` | Detalle de un test autenticado. |
| `/app/profile` | Perfil y privacidad del usuario. |
| `/app/onboarding` | Configuración inicial autenticada. |

Vercel redirige cualquier ruta al `index.html`; React Router resuelve la vista en el cliente.

## Persistencia y Supabase

### Tablas principales

Las migraciones crean y protegen, entre otras, estas tablas:

- `profiles`
- `athlete_metrics`
- `athlete_availability`
- `athlete_equipment`
- `injuries`
- `nutrition_preferences`
- `daily_readiness`
- `workout_logs`
- `training_test_results`
- `training_plans`
- `coach_advices`
- `ai_usage`

Las tablas de usuario tienen RLS habilitado y políticas de lectura, inserción, actualización y borrado basadas en `auth.uid()`.

### Operaciones atómicas

- `save_training_plan_atomic` / `set_active_training_plan_atomic`: evitan dejar al usuario sin plan activo o con varios planes activos durante un reemplazo.
- `consume_ai_quota`: consume de manera atómica la cuota correspondiente a generación de planes o Coach IA.

### Migraciones

Las migraciones de `supabase/migrations/` están ordenadas cronológicamente y deben revisarse y probarse en un entorno local o aislado antes de aplicarlas a cualquier proyecto remoto.

Comandos útiles para desarrollo local:

```bash
supabase start
supabase status
supabase test db
supabase stop
```

> No ejecutes `supabase db push` contra producción sin revisión, copia de seguridad y validación previa. La configuración local referencia `supabase/seed.sql`, pero ese archivo no está incluido actualmente; si el CLI requiere seed durante un reset, habrá que desactivar el seed o añadir uno específico en un cambio futuro.

## Inteligencia artificial

La IA se ejecuta en el servidor mediante estas Edge Functions:

- `generate-training-plan`
- `generate-coach-advice`

Ambas funciones:

1. Exigen una sesión autenticada válida.
2. Comprueban la cuota con PostgreSQL.
3. Validan el tamaño y la forma de los datos de entrada.
4. Llaman a OpenAI con una clave solo disponible en servidor.
5. Exigen una respuesta JSON conforme al contrato.
6. Aplican reglas deterministas de seguridad deportiva.
7. Devuelven errores normalizados ante timeout, cuota o respuesta inválida.

La Edge Function `delete-account` no usa IA. Requiere origen permitido, token de usuario, frase de confirmación y contraseña actual antes de crear el cliente con privilegios administrativos.

## Calidad y pruebas

### Scripts disponibles

| Comando | Descripción |
| --- | --- |
| `npm run dev` | Inicia Vite en modo desarrollo. |
| `npm run build` | Ejecuta `tsc -b` y genera el build de Vite en `dist/`. |
| `npm run preview` | Sirve localmente el build de producción. |
| `npm test` | Ejecuta una pasada de Vitest. |
| `npm run test:coverage` | Ejecuta Vitest con cobertura V8. |
| `npm run test:e2e` | Ejecuta los E2E de Playwright. |
| `npm run test:db` | Ejecuta tests SQL si el stack local está disponible; si no, informa de `SKIP`. |
| `npm run test:db:require` | Igual que el anterior, pero falla si Supabase/Docker/PostgreSQL no están disponibles. Recomendado como gate de CI. |

### Tests unitarios y de integración

```bash
npm test
npm run test:coverage
```

Los umbrales configurados son:

- Statements: 70 %
- Branches: 60 %
- Functions: 70 %
- Lines: 70 %

Los informes de coverage se escriben dentro de `node_modules/.coverage/`.

### E2E

```bash
npm run test:e2e
```

Playwright inicia Vite en `http://127.0.0.1:4173`, fuerza las variables de Supabase a vacío y comprueba flujos locales sin depender de servicios remotos. La suite cubre redirección de autenticación, entrada a demo, borrador de onboarding, recuperación de plan local, persistencia de workout logs y resultados SkiErg.

### Base de datos local

```bash
supabase start
npm run test:db:require
```

Los tests SQL verifican las operaciones atómicas de planes y cuotas, además de escenarios concurrentes mediante sesiones PostgreSQL independientes.

### Verificación recomendada antes de publicar

```bash
npm test
npm run test:coverage
npm run test:e2e
npm run test:db:require
npm run build
```

## Build y despliegue en Vercel

### Build local

```bash
npm ci
npm run build
```

El resultado se genera en `dist/`. Vite separa las dependencias de `node_modules` en un chunk `vendor` y las vistas secundarias se cargan de forma diferida.

### Configuración de Vercel

Configuración esperada del proyecto:

- **Framework preset:** Vite.
- **Install command:** `npm ci`.
- **Build command:** `npm run build`.
- **Output directory:** `dist`.
- Variables frontend: `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.

`vercel.json` contiene un rewrite hacia `/index.html` para que las rutas de la SPA funcionen al recargar o abrir un enlace profundo.

Las Edge Functions y migraciones de Supabase no se despliegan automáticamente por publicar el frontend en Vercel. Deben configurarse y desplegarse por separado, después de validarlas en local y proporcionar sus secretos en Supabase.

## Seguridad y privacidad

- Las claves privadas (`OPENAI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) permanecen en servidor.
- Solo las variables con prefijo `VITE_` llegan al bundle del navegador; por tanto, nunca debe usarse ese prefijo para secretos.
- La clave anon/pública de Supabase no es un secreto y requiere RLS correctamente configurado.
- El ownership de filas se deriva de `auth.uid()`.
- La persistencia local se separa por identidad para evitar mezclar datos entre cuentas.
- Las cuotas de IA se consumen mediante una función atómica y no son editables directamente por el cliente.
- Los payloads y las respuestas de IA se validan y tienen límites de tamaño/tiempo.
- La eliminación de cuenta requiere reautenticación y usa `service_role` únicamente dentro de la Edge Function.
- La exportación local excluye tokens de autenticación.
- Los mensajes de error de UI se normalizan para no mostrar detalles internos innecesarios.
- Las credenciales académicas de este README son deliberadamente públicas: deben considerarse temporales y no reutilizarse en otros servicios.

## Limitaciones conocidas

- Sin variables de Supabase, la autenticación y la persistencia remota quedan deshabilitadas; solo funciona la demo local.
- La generación real con IA requiere Edge Functions desplegadas, migraciones de cuotas aplicadas y `OPENAI_API_KEY` configurada en servidor.
- Las cuotas de IA limitan deliberadamente el número de solicitudes por usuario y día.
- Los tests E2E actuales se ejecutan en modo local/offline y no validan una integración real con Supabase u OpenAI.
- Los tests de base de datos requieren Supabase CLI, Docker y el stack local activo.
- `supabase/config.toml` declara un archivo `seed.sql` que actualmente no existe.
- La eliminación de cuenta implementada reautentica mediante contraseña; las cuentas creadas únicamente con OAuth necesitarían un flujo específico.
- No hay un script `lint` definido actualmente en `package.json`.
- No se incluye una licencia de uso en el repositorio.

---

Proyecto académico **AtletaHY** — planificación híbrida, seguimiento del atleta e IA aplicada con controles de seguridad.
