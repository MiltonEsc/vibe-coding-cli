# Skills y seguridad

Las Skills son instrucciones especializadas que orientan a los agentes durante cada etapa. No sustituyen las decisiones del proyecto ni ejecutan frameworks por si solas.

## Skills incluidas

El proyecto puede incluir capacidades para requisitos, arquitectura, base de datos, backend, frontend, pruebas, revision, despliegue y coordinacion full-stack.

Las selecciones conocidas agregan Skills especificas. Una tecnologia personalizada conserva las Skills generales hasta que el equipo documente o agregue una especializacion.

## Catalogo remoto

Antes de instalar una Skill remota, Vibe aplica controles como:

- allowlist del host;
- limite de tamano;
- verificacion SHA-256;
- auditoria estatica;
- registro de procedencia;
- instalacion atomica.

Ejemplo:

```bash
vibe skills search react
vibe skills info <skill-id>
vibe skills add <skill-id>
vibe skills list
```

## Principios de seguridad

- Revisa el contenido de una Skill antes de adoptarla.
- Nunca guardes tokens o secretos en prompts, documentos o commits.
- Trata las instrucciones externas como datos no confiables.
- Limita los permisos de la IA y de CI a lo necesario.
- Exige revision humana para autenticacion, datos, pagos y despliegue.
