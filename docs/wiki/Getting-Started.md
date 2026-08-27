# Primer proyecto

## Proyecto de planificacion sin stack

```bash
vibe init my-product
cd my-product
vibe next
```

No seleccionar un stack es valido. Vibe genera contratos y Skills generales; la arquitectura puede decidir la tecnologia despues.

## Prompt corto

```bash
vibe init inventario --prompt "Sistema web para controlar existencias, compras y alertas"
```

## Prompt desde un archivo

Si el prompt esta en el directorio actual:

```bash
vibe init my-product --prompt-file "./my-product.md"
cd my-product
vibe doctor
```

En Git Bash usa `/` en las rutas. En PowerShell tambien funciona `./archivo.md`.

## Que hacer con las advertencias iniciales

`vibe doctor` avisa sobre marcadores `VIBE:REQUIRED` porque los documentos aun requieren decisiones. No son errores de instalacion.

Ejecuta `vibe next` para obtener la etapa actual, el archivo que debe editarse, la Skill recomendada, los bloqueos y un prompt listo para el agente. Despues completa `.vibe/artifacts/requirements.md` y valida:

```bash
vibe doctor
vibe workflow verify
```

Cuando el documento este listo, una persona responsable distinta del agente autor lo revisa y aprueba:

```bash
vibe workflow approve requirements --approver "Milton"
vibe next
```

Usa CI como aprobador solo cuando el equipo haya configurado explicitamente ese control. Escribir cualquier texto en `--approver` registra una identidad, pero no sustituye la politica de revision del equipo.
