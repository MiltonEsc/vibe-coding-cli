# Migracion de schema v1 a v2

Vibe CLI v0.4 sigue ejecutando `doctor` y todos los comandos de workflow sobre proyectos v0.3 sin modificarlos. La migracion es explicita.

## Previsualizar

```bash
vibe migrate --dry-run
```

El comando encuentra el proyecto Vibe mas cercano y muestra los nueve movimientos previstos. No crea directorios ni modifica config, workflow o documentos.

## Aplicar

```bash
vibe migrate
vibe workflow verify
vibe doctor
```

La migracion mueve solamente los artefactos conocidos desde la raiz a `.vibe/artifacts/`, cambia `config.json` a schema v2 y transforma las rutas de evidencia aprobada. Los hashes SHA-256 y tamanos aprobados no cambian.

La operacion se detiene antes de mover archivos si falta un artefacto, existe un destino, aparece metadata de aprobacion insegura o una ruta usa traversal o symlinks. Ejecutarla otra vez sobre schema v2 solo informa que el proyecto ya esta migrado.
