# Liqueur Solutions - Dev Guidelines

## Build & Test Commands

- `yarn dev` - Start development server
- `yarn build` - Build for production
- `yarn lint` - Run ESLint and Prettier checks
- `yarn format` - Fix formatting issues
- `yarn test` - Run Playwright tests
- `yarn test:unit` - Run Vitest unit tests
- `yarn test:unit src/lib/mixture.test.ts` - Run specific test file
- `yarn test:unit -t "can add one ingredient"` - Run specific test
- `yarn check:all` - Run type check, unit tests, and e2e tests

## Code Style Guidelines

- **Typescript**: Use strict type checking and proper interfaces
- **Formatting**: Use tabs, single quotes, 100 max line width
- **Imports**: Group by external/internal, sort alphabetically
- **Components**: Svelte 5 with runes, strongly typed props
- **Naming**: camelCase for variables/functions, PascalCase for components/classes
- **Error Handling**: Use explicit error types and proper propagation
- **Testing**: Each module should have unit tests, use descriptive test names
- **State Management**: Use Svelte stores for global state
