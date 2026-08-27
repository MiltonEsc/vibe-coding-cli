# Prompts y stacks

Los stacks son opcionales. Sirven para registrar decisiones, ajustar instrucciones y agregar Skills especializadas cuando la tecnologia ya esta decidida. No crean carpetas de aplicacion, instalan dependencias ni limitan las tecnologias que puede documentar o usar el proyecto.

## Sin stack

```bash
vibe init producto --prompt-file ./prompt.md
```

Usa esta modalidad cuando primero quieres definir requisitos y arquitectura. El resultado conserva los contratos, workflow y Skills generales.

## Preset conocido

```bash
vibe init tienda --preset full-stack --prompt-file ./tienda.md
```

El preset `full-stack` selecciona Next.js, FastAPI, Supabase y GitHub Actions.

## Stacks conocidos

```bash
vibe init api --stack fastapi,supabase,github-actions
vibe init web --stack nextjs,supabase
vibe init mobile --stack flutter,supabase
```

Selectores incluidos: `nextjs`, `react`, `fastapi`, `nestjs`, `supabase`, `flutter` y `github-actions`.

## Tecnologia no incluida

Puedes registrar identificadores personalizados en minusculas:

```bash
vibe init realtime-app --stack react,vite,hono,postgresql,redis,websockets --package-manager bun
```

Vibe registra esas decisiones, pero no inventa una Skill especializada ni comandos de validacion para una tecnologia desconocida. El equipo debe definirlos en `.vibe/artifacts/architecture.md`, `AGENTS.md` y los documentos de etapa.

## Cambiar el stack despues

No edites una aprobacion silenciosamente. Actualiza la arquitectura, reabre la etapa afectada y vuelve a aprobarla tras la revision:

```bash
vibe workflow reopen architecture --reason "Migracion de REST a eventos" --actor "Ana"
vibe workflow approve architecture --approver "Carlos"
```
