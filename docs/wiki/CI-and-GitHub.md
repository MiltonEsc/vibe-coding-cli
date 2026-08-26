# CI y GitHub

## Validacion minima

Agrega estos pasos al workflow de CI del proyecto generado:

```yaml
- name: Install Vibe CLI
  run: npm install -g @vibe-coding-cli/cli

- name: Validate project contracts
  run: vibe doctor

- name: Verify approved artifacts
  run: vibe workflow verify
```

`doctor` encuentra documentos incompletos y problemas estructurales. `workflow verify` comprueba que lo aprobado siga coincidiendo con el contenido actual.

## Salida JSON

Para automatizaciones que necesitan detalles:

```bash
vibe doctor --json > vibe-doctor.json
vibe workflow verify --json > vibe-integrity.json
```

No ignores el codigo de salida al redirigir. Un reporte JSON puede generarse aunque el comando detecte un error.

## Proteccion de la rama principal

Configura en GitHub:

- pull requests obligatorios;
- al menos una revision humana;
- CI requerido antes de integrar;
- conversaciones resueltas;
- restriccion de push directo a `main`.

Vibe aporta evidencia y trazabilidad, pero las reglas del repositorio siguen siendo la barrera de integracion.
