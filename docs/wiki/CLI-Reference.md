# Referencia del CLI

## Proyecto

```text
vibe init <nombre> [opciones]
vibe doctor [directorio] [--json]
vibe --version
vibe --help
```

Opciones comunes de `init`:

| Opcion | Uso |
| --- | --- |
| `--prompt <texto>` | Brief corto en la terminal. |
| `--prompt-file <ruta>` | Prompt extenso desde un archivo. |
| `--preset <nombre>` | Seleccion coordinada de stacks. |
| `--stack <lista>` | Stacks conocidos o personalizados separados por coma. |
| `--package-manager <nombre>` | Gestor registrado para el proyecto. |

## Workflow

```text
vibe workflow status [directorio] [--json]
vibe workflow verify [directorio] [--json]
vibe workflow history [etapa] [directorio] [--json]
vibe workflow approve <etapa> --by <persona> [directorio]
vibe workflow reopen <etapa> --reason <motivo> [--actor <persona>] [directorio]
```

Etapas: `requirements`, `architecture`, `database`, `backend`, `design`, `frontend`, `testing`, `review` y `deployment`.

## Skills remotas

```text
vibe skills search <consulta>
vibe skills info <id>
vibe skills add <id>
vibe skills list
```

Consulta la ayuda instalada para opciones exactas:

```bash
vibe --help
vibe workflow --help
```
