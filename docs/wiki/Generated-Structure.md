# Estructura generada

La estructura exacta depende del preset y los stacks, pero el nucleo contiene:

```text
mi-proyecto/
|-- .gitignore
|-- AGENTS.md
|-- README.md
|-- .agents/
|   `-- skills/
`-- .vibe/
    |-- config.json
    |-- workflow.json
    |-- workflow-history.jsonl
    `-- artifacts/
        |-- requirements.md
        |-- architecture.md
        |-- database.md
        |-- backend.md
        |-- design.md
        |-- frontend.md
        |-- testing.md
        |-- review.md
        `-- deployment.md
```

Las unicas carpetas creadas en la raiz son `.agents/` y `.vibe/`. Vibe no anticipa `apps/`, `packages/`, `tests/`, `supabase/`, `.github/` ni otra topologia de implementacion: el equipo la crea despues de aprobar requisitos y arquitectura.

Los unicos archivos generales creados inicialmente en la raiz son `.gitignore`, `AGENTS.md` y `README.md`. `CONTRIBUTING.md`, `SECURITY.md` y `.env.example` se crean despues, cuando la arquitectura y las politicas reales del equipo permitan escribirlos sin contenido especulativo.

## Responsabilidad de los archivos

| Archivo | Proposito |
| --- | --- |
| `.vibe/artifacts/requirements.md` | Alcance, usuarios, criterios de aceptacion y restricciones. |
| `.vibe/artifacts/architecture.md` | Componentes, dependencias, limites y decisiones tecnicas. |
| `.vibe/artifacts/database.md` | Modelo, migraciones, seguridad e integridad de datos. |
| `.vibe/artifacts/backend.md` | Contratos, logica, autenticacion y manejo de errores. |
| `.vibe/artifacts/design.md` | Experiencia, accesibilidad, estados y comportamiento visual. |
| `.vibe/artifacts/frontend.md` | Implementacion de interfaz y consumo de contratos. |
| `.vibe/artifacts/testing.md` | Estrategia, casos criticos y evidencias. |
| `.vibe/artifacts/review.md` | Hallazgos, riesgos y aceptacion tecnica. |
| `.vibe/artifacts/deployment.md` | Entornos, secretos, despliegue y rollback. |
| `AGENTS.md` | Instrucciones operativas para agentes de IA y colaboradores. |
| `.agents/skills/` | Skills locales que el agente puede invocar para cada etapa. |

Los marcadores `VIBE:REQUIRED` indican decisiones pendientes. Deben resolverse con evidencia, no borrarse solo para silenciar `doctor`.
