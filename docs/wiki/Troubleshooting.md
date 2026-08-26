# Solucion de problemas

## No Vibe project found

El comando se ejecuto fuera del proyecto generado.

```bash
vibe init world-button
cd world-button
vibe doctor
```

Si estas en una subcarpeta, Vibe busca hacia arriba. Si estas en la carpeta padre del proyecto, debes entrar en el directorio creado o pasar su ruta.

## Unresolved VIBE:REQUIRED markers

Es una advertencia normal en un proyecto nuevo. Completa la decision solicitada en el documento y conserva evidencia verificable.

## Stacks: not selected

No es un error. El proyecto se creo en modo neutral para decidir tecnologias durante arquitectura.

## Integrity: drifted

El contenido aprobado cambio. Consulta la diferencia en Git, reabre la etapa con una razon y solicita una nueva revision.

```bash
git diff -- requirements.md
vibe workflow reopen requirements --reason "Alcance actualizado" --actor "Milton"
```

## `vibe` no se reconoce en Windows

Comprueba el binario y la ruta global de npm:

```powershell
vibe.cmd --version
npm prefix -g
```

Reabre la terminal despues de instalar globalmente si npm acaba de modificar el `PATH`.

## Obtener diagnostico estructurado

```bash
vibe doctor --json
vibe workflow status --json
vibe workflow verify --json
```
