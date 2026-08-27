# Workflow y aprobaciones

Las etapas avanzan en orden. Una aprobacion confirma que el artefacto actual fue revisado; no significa que el documento nunca pueda cambiar.

## Estado

```bash
vibe workflow status
vibe workflow status --json
vibe workflow verify
```

`verify` separa dos conceptos: integridad del ledger y avance. En un proyecto nuevo informa que la integridad de aprobaciones es valida, pero que el workflow esta incompleto con `0/8 stages approved; incomplete`.

## Siguiente accion

```bash
vibe next
```

Este comando conecta el estado con el trabajo del agente: indica el artefacto actual, la Skill sugerida, marcadores pendientes, un prompt y el siguiente comando.

## Aprobar una etapa

```bash
vibe workflow approve requirements --approver "Milton"
vibe workflow approve architecture --approver "Laura"
```

Antes de persistir la aprobacion, Vibe vuelve a comprobar:

- que el artefacto no tenga marcadores requeridos;
- que las etapas anteriores conserven su integridad;
- que el ledger no haya cambiado durante la operacion;
- el SHA-256 del contenido aprobado.

`--approver` registra la identidad declarada; Vibe no autentica personas ni configura protecciones de GitHub. La regla operativa recomendada es que una persona responsable distinta del agente autor revise y apruebe. CI puede hacerlo solo si el equipo lo establecio explicitamente como gate.

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
