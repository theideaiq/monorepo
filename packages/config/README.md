# Shared Configuration

This package contains shared configuration files for the monorepo.

## Contents

- **TypeScript**: Shared `tsconfig.json` used as a base for other packages.
- **Biome**: Shared `biome.json` for linting and formatting rules.
- **Tailwind**: (If applicable) Shared Tailwind configuration.

## Usage

Extend the configuration in your workspace:

### TypeScript
```json
// tsconfig.json
{
  "extends": "@repo/config/tsconfig.json"
}
```

### Biome
```json
// biome.json
{
  "extends": ["@repo/config/biome.json"]
}
```
