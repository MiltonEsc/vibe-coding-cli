# Trabajo en equipo

Vibe funciona con varios desarrolladores y varias IAs cuando Git sigue siendo la fuente de verdad y cada cambio tiene propietario y revision.

## Modelo recomendado

1. Cada tarea usa una rama corta.
2. Cada persona o agente trabaja en un alcance explicito.
3. Los cambios se integran mediante pull request.
4. CI ejecuta `vibe doctor` y `vibe workflow verify`.
5. Una persona identificada aprueba cada etapa.

## Ejemplo de ramas

```bash
git switch -c feat/auth-api
# trabajo del desarrollador y su IA
git add .vibe/artifacts/backend.md src/
git commit -m "feat: implement authentication API"
git push -u origin feat/auth-api
```

Otro colaborador puede trabajar en paralelo:

```bash
git switch -c feat/login-ui
# trabajo sobre .vibe/artifacts/frontend.md y la interfaz
```

## Reglas practicas

- No compartan una misma carpeta de trabajo ni una misma rama activa.
- No permitan que dos agentes editen el mismo archivo sin coordinacion.
- Registren decisiones relevantes en los documentos, no solo en el chat de la IA.
- Usen `--approver` y `--actor` con identidades reconocibles.
- No aprueben una etapa solo porque compila; revisen sus criterios y evidencia.

## Antes de un pull request

```bash
vibe doctor
vibe workflow verify
npm test
git status
```

Adapta el comando de pruebas al stack real del proyecto.
