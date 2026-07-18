# Configurar Coach IA real con Supabase Edge Function

## Dónde va la clave de OpenAI

La clave de OpenAI debe vivir como **secret de Supabase Edge Functions**. No debe guardarse en `.env.local` de Vite/React ni exponerse con variables `VITE_*`.

## Configurar secret remoto

```bash
supabase secrets set OPENAI_API_KEY="tu_clave"
```

No ejecutes comandos que impriman secretos en consola ni los pegues en código frontend.

## Desplegar la función

```bash
supabase functions deploy generate-coach-advice --project-ref baaolluzteatewpenojo
```

Si el proyecto ya está enlazado localmente, también puedes usar:

```bash
supabase functions deploy generate-coach-advice
```

## Servir en local

```bash
supabase functions serve generate-coach-advice
```

Para desarrollo local, proporciona los secrets al runtime de Supabase Functions sin moverlos al bundle frontend.

## Cómo funciona el fallback

- Si Supabase no está configurado en el frontend, se genera consejo local.
- Si no hay sesión autenticada, se genera consejo local.
- Si la Edge Function falla, devuelve error o responde con JSON inválido, el frontend genera un respaldo local y muestra un aviso discreto.
- Solo el resultado remoto válido se marca como `Coach IA`; el resto aparece como `Coach local` o `Respaldo local`.
