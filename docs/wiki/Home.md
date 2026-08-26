# Vibe CLI Wiki

Vibe CLI crea la estructura documental, las reglas para agentes y un workflow verificable para desarrollar software con IA sin acoplar el proyecto a un stack obligatorio.

## Inicio rapido

```bash
npm install -g @vibe-coding-cli/cli
vibe --version
vibe init mi-app
cd mi-app
vibe doctor
```

El proyecto generado incluye contratos como `requirements.md`, `architecture.md`, `AGENTS.md`, Skills especializadas y el ledger `.vibe/workflow.json`.

## Recorrido recomendado

1. Lee [Instalacion](Installation).
2. Crea un proyecto con [Primer proyecto](Getting-Started).
3. Decide si necesitas stacks con [Prompts y stacks](Prompts-and-Stacks).
4. Sigue las aprobaciones en [Workflow y aprobaciones](Workflow-and-Approvals).
5. Configura a tu equipo con [Trabajo en equipo](Team-Development).

## Version actual

La version `0.3.0` incorpora verificacion de integridad de aprobaciones, historial auditable y diagnosticos estructurados para CI.

Consulta [Novedades de v0.3.0](Release-0.3.0) para los detalles y ejemplos de migracion.
