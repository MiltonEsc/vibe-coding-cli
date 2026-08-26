# Novedades de v0.3.0

Esta version fortalece el trabajo en equipo sin cambiar el formato principal del workflow.

## Cambios principales

- Verificacion SHA-256 de artefactos aprobados.
- Estados derivados `verified`, `drifted` e `invalid`.
- Nuevo comando `vibe workflow verify` para uso local y CI.
- Nuevo comando `vibe workflow history` para auditoria.
- Historial de aprobaciones, reemplazos, drift y reaperturas.
- Identidad opcional del actor al reabrir una etapa.
- Informacion Git opcional en las aprobaciones: commit, rama y limpieza del working tree.
- Diagnosticos JSON con codigos y acciones recomendadas.

## Compatibilidad

El `schemaVersion` del ledger permanece en `1`. Los campos Git son opcionales y los proyectos existentes pueden verificarse sin una migracion destructiva.

## Flujo recomendado al actualizar

```bash
npm install -g @vibe-coding-cli/cli@0.3.0
cd mi-proyecto
vibe doctor
vibe workflow verify
vibe workflow history
```

Si una aprobacion antigua no puede verificarse, revisa primero el reporte. Reabre solamente las etapas afectadas y conserva una razon auditable.
