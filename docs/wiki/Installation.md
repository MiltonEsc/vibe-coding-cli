# Instalacion

## Requisitos

- Node.js 22 o superior.
- npm disponible en la terminal.
- Git es recomendable para registrar la procedencia de las aprobaciones.

## Desde npm

```bash
npm install -g @vibe-coding-cli/cli
vibe --version
```

En Windows tambien puedes comprobar el ejecutable con:

```powershell
vibe.cmd --version
```

## Desde GitHub

```bash
npm install -g git+https://github.com/MiltonEsc/vibe-coding-cli.git
vibe --version
```

## Desarrollo local del CLI

```bash
git clone https://github.com/MiltonEsc/vibe-coding-cli.git
cd vibe-coding-cli
npm install
npm run check
npm link
```

## Actualizacion

```bash
npm install -g @vibe-coding-cli/cli@latest
vibe --version
```
