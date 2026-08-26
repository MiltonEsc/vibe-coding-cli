# Primer proyecto

## Proyecto de planificacion sin stack

```bash
vibe init world-button
cd world-button
vibe doctor
```

No seleccionar un stack es valido. Vibe genera contratos y Skills generales; la arquitectura puede decidir la tecnologia despues.

## Prompt corto

```bash
vibe init inventario --prompt "Sistema web para controlar existencias, compras y alertas"
```

## Prompt desde un archivo

Si el prompt esta en el directorio actual:

```bash
vibe init world-button --prompt-file "./Prompt para desarrollar World Button.md"
cd world-button
vibe doctor
```

En Git Bash usa `/` en las rutas. En PowerShell tambien funciona `./archivo.md`.

## Que hacer con las advertencias iniciales

`vibe doctor` avisa sobre marcadores `VIBE:REQUIRED` porque los documentos aun requieren decisiones. No son errores de instalacion.

Completa primero `requirements.md`, revisalo con el equipo y apruebalo:

```bash
vibe workflow approve requirements --by "Milton"
vibe workflow status
```
