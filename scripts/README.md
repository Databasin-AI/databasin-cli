# Scripts

Convenience scripts for developers. For build and test commands, use `bun run <script>`.

## dev-setup.sh

Links or unlinks the CLI globally for development.

```bash
# Make 'databasin' available in your PATH
./scripts/dev-setup.sh link

# Remove global link when done
./scripts/dev-setup.sh unlink
```

## package.json Scripts

| Command | Description |
|---------|-------------|
| `bun run dev` | Run CLI from source |
| `bun run build` | Full production build (multi-platform) |
| `bun run build:exe` | Quick local executable |
| `bun run test` | Run all tests |
| `bun run test:unit` | Unit tests only |
| `bun run test:smoke` | Verify CLI commands work |
| `bun run test:all` | Typecheck + unit tests + build + smoke |
| `bun run verify` | Full verification before commit |
| `bun run typecheck` | TypeScript validation |
| `bun run clean` | Remove dist/ |
