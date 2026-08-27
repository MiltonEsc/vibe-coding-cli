# Novedades de v0.4.0

Vibe CLI v0.4 organiza los contratos del workflow bajo `.vibe/artifacts/` y mantiene compatibilidad con proyectos anteriores.

## Proyectos nuevos

```bash
vibe init my-product
```

Los nueve documentos de etapas se crean dentro de `.vibe/artifacts/`. Los archivos estandar del repositorio permanecen en la raiz.

Las unicas carpetas creadas en la raiz son `.agents/` y `.vibe/`; la arquitectura aprobada determina despues si hacen falta `apps/`, `packages/`, infraestructura u otra organizacion.

## Guia operativa

```bash
vibe next
vibe doctor
vibe workflow verify
```

`vibe next` entrega el artefacto actual, Skill recomendada, bloqueos y prompt para el agente. `verify` separa integridad de progreso para que un ledger valido con cero aprobaciones no parezca un workflow terminado. La ayuda de subcomandos y las descripciones de presets tambien fueron ampliadas.

## Migrar un proyecto v0.3

```bash
vibe migrate --dry-run
vibe migrate
vibe workflow verify
```

El dry-run de migracion enumera los movimientos sin modificar archivos. La migracion conserva los checksums aprobados, transforma las rutas de evidencia y rechaza colisiones o rutas inseguras.

En `vibe init`, el dry-run muestra primero un resumen orientado a decisiones. Usa `--verbose` para enumerar cada archivo planeado.

Los proyectos schema v1 siguen funcionando sin migrar. Las funciones de multiples aplicaciones y workflows independientes quedan reservadas para v0.5.
