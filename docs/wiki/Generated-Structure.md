# Estructura generada

La estructura exacta depende del preset y los stacks, pero el nucleo contiene:

```text
mi-proyecto/
|-- AGENTS.md
|-- requirements.md
|-- architecture.md
|-- database.md
|-- backend.md
|-- design.md
|-- frontend.md
|-- testing.md
|-- review.md
|-- deployment.md
|-- SECURITY.md
|-- skills/
`-- .vibe/
    |-- config.json
    |-- workflow.json
    `-- workflow-history.jsonl
```

## Responsabilidad de los archivos

| Archivo | Proposito |
| --- | --- |
| `requirements.md` | Alcance, usuarios, criterios de aceptacion y restricciones. |
| `architecture.md` | Componentes, dependencias, limites y decisiones tecnicas. |
| `database.md` | Modelo, migraciones, seguridad e integridad de datos. |
| `backend.md` | Contratos, logica, autenticacion y manejo de errores. |
| `design.md` | Experiencia, accesibilidad, estados y comportamiento visual. |
| `frontend.md` | Implementacion de interfaz y consumo de contratos. |
| `testing.md` | Estrategia, casos criticos y evidencias. |
| `review.md` | Hallazgos, riesgos y aceptacion tecnica. |
| `deployment.md` | Entornos, secretos, despliegue y rollback. |
| `AGENTS.md` | Instrucciones operativas para agentes de IA y colaboradores. |

Los marcadores `VIBE:REQUIRED` indican decisiones pendientes. Deben resolverse con evidencia, no borrarse solo para silenciar `doctor`.
