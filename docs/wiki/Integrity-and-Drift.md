# Integridad y drift

Una etapa aprobada puede estar en uno de estos estados derivados:

- `verified`: el contenido coincide con el SHA aprobado.
- `drifted`: el archivo existe, pero cambio despues de aprobarse.
- `invalid`: faltan datos de aprobacion o el artefacto no puede verificarse.

El estado de integridad se calcula; no se guarda como verdad permanente en el ledger.

## Verificacion manual

```bash
vibe workflow verify
vibe workflow verify --json
```

El comando termina con codigo distinto de cero cuando encuentra drift o un ledger invalido, por lo que puede usarse en CI.

## Ejemplo de drift

```bash
vibe workflow approve requirements --approver "Ana"
# Se modifica .vibe/artifacts/requirements.md despues de la aprobacion
vibe workflow verify
vibe doctor
```

La etapa sigue mostrando que fue aprobada, pero su integridad aparece como `drifted`. Esto preserva la historia en vez de fingir que la aprobacion nunca existio.

Para continuar:

```bash
vibe workflow reopen requirements --reason "Se agrego recuperacion de cuenta" --actor "Ana"
# Revision humana del nuevo contenido
vibe workflow approve requirements --approver "Pedro"
```
