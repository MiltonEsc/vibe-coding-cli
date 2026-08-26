# Workflow y aprobaciones

Las etapas avanzan en orden. Una aprobacion confirma que el artefacto actual fue revisado; no significa que el documento nunca pueda cambiar.

## Estado

```bash
vibe workflow status
vibe workflow status --json
```

## Aprobar una etapa

```bash
vibe workflow approve requirements --by "Milton"
vibe workflow approve architecture --by "Laura"
```

Antes de persistir la aprobacion, Vibe vuelve a comprobar:

- que el artefacto no tenga marcadores requeridos;
- que las etapas anteriores conserven su integridad;
- que el ledger no haya cambiado durante la operacion;
- el SHA-256 del contenido aprobado.

## Reabrir una etapa

```bash
vibe workflow reopen architecture --reason "Cambio de proveedor de autenticacion" --actor "Laura"
```

La razon es obligatoria. Las etapas dependientes se invalidan para que el equipo revise el impacto.

## Historial

```bash
vibe workflow history
vibe workflow history architecture
vibe workflow history --json
```

Los eventos se guardan en `.vibe/workflow-history.jsonl`, incluyendo aprobaciones, reemplazos, reaperturas y drift detectado.
