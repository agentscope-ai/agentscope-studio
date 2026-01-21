# AgentScope-Studio Code Review Guide

You should conduct a strict code review. Each requirement is labeled with priority:
- **[MUST]** must be satisfied or PR will be rejected
- **[SHOULD]** strongly recommended
- **[MAY]** optional suggestion

## 1. Code Quality

### [MUST] TypeScript Strict Mode
- All code must pass TypeScript strict type checking
- Avoid using `any` type; use proper type definitions or `unknown` with type guards
- Export types and interfaces from `packages/shared/src/types/`

### [MUST] Component Architecture
- **Separation of Concerns**: Data fetching and state management must be in Context providers (`packages/client/src/context/`)
- UI components should focus solely on rendering and user interaction
- Reusable components go in `packages/client/src/components/`
- Page-specific components go in `packages/client/src/pages/`

### [SHOULD] Code Conciseness
After understanding the code intent, check if it can be optimized:
- Avoid unnecessary temporary variables
- Merge duplicate code blocks
- Prioritize reusing existing utility functions from `utils/`
- Use custom hooks to extract reusable logic

### [MUST] Import Organization
- Group imports in order: React/Node built-ins → third-party → local imports
- Use path aliases (`@/`, `@shared/`) for cleaner imports
- Avoid circular dependencies between packages

## 2. [MUST] Code Security
- Prohibit hardcoding API keys/tokens/passwords
- Use environment variables for sensitive configuration
- Validate all user inputs on both client and server
- Use parameterized queries to prevent SQL injection (TypeORM handles this)
- Sanitize data before rendering to prevent XSS attacks

## 3. [MUST] Testing & Dependencies
- New features should include appropriate tests
- New dependencies must be added to the correct `package.json`:
  - Root `package.json` for shared/build dependencies
  - `packages/client/package.json` for frontend dependencies
  - `packages/server/package.json` for backend dependencies
- Avoid adding unnecessary dependencies; prefer existing solutions

## 4. Code Standards

### [MUST] Styling with Tailwind CSS
- All frontend styling must use **Tailwind CSS** utility classes
- Avoid inline styles (`style={{}}`) except for dynamic values
- Avoid separate CSS files for component-specific styling
- Use CSS variables for theme consistency (defined in `globals.css`)

```tsx
// ✅ DO: Use Tailwind classes
<div className="flex items-center justify-between p-4 bg-muted rounded-lg">
  <h2 className="text-xl font-semibold">Title</h2>
</div>

// ❌ DON'T: Inline styles
<div style={{ display: 'flex', padding: '16px' }}>...</div>
```

### [MUST] Component Library Usage
- Use **shadcn/ui** components from `packages/client/src/components/ui/`
- Use **Ant Design** components sparingly, prefer shadcn/ui for new code
- Follow existing patterns when extending UI components

### [MUST] API Design (tRPC)
- Define input schemas using Zod in `packages/shared/src/types/trpc.ts`
- Keep API handlers in `packages/server/src/trpc/router.ts`
- Use proper error handling with `TRPCError`
- Return consistent response format: `{ success, message, data }`

```typescript
// ✅ DO: Consistent API response
return {
    success: true,
    message: 'Data fetched successfully',
    data: result,
} as ResponseBody<DataType>;

// ✅ DO: Proper error handling
throw new TRPCError({
    code: 'INTERNAL_SERVER_ERROR',
    message: error instanceof Error ? error.message : 'Unknown error',
});
```

### [MUST] Database Operations
- All database operations go in DAO classes (`packages/server/src/dao/`)
- Use TypeORM query builder for complex queries
- Add proper JSDoc comments for DAO methods

### [MUST] Internationalization (i18n)
- All user-facing text must use i18n translation keys
- Add translations to both `en.json` and `zh.json`
- Use the `useTranslation` hook: `const { t } = useTranslation();`

```tsx
// ✅ DO: Use translation keys
<span>{t('common.save')}</span>

// ❌ DON'T: Hardcode text
<span>Save</span>
```

### [MUST] Code Formatting
- Run `npm run format` before committing
- Code must pass ESLint and Prettier checks
- Follow existing code patterns and conventions

---

## 5. Git Standards

### [MUST] Commit Message Format
- Follow [Conventional Commits](https://www.conventionalcommits.org/) specification
- Must use prefixes: `feat/fix/docs/ci/refactor/perf/test/chore`
- Format: `<type>(<scope>): <description>`

**Examples:**
```bash
feat(table): add pagination support to AsTable component
fix(trace): resolve orphan span display issue
refactor(context): unify table request params pattern
docs(readme): update installation instructions
```

### [SHOULD] PR Guidelines
- Keep PRs focused on a single feature or fix
- Provide clear description of changes
- Reference related issues when applicable
- Ensure CI checks pass before requesting review

---

## 6. Project Structure

### [MUST] Follow Directory Structure
```
packages/
    client/src/
        assets/          # Static assets (SVGs, images)
        components/      # Reusable React components
            ui/          # shadcn/ui base components
            tables/      # Table-related components
            buttons/     # Button components
            ...
        context/         # React Context providers
        hooks/           # Custom React hooks
        i18n/            # Translation files (en.json, zh.json)
        pages/           # Page components (routes)
        utils/           # Utility functions
        lib/             # Third-party library configurations
    server/src/
        dao/             # Data Access Objects
        migrations/      # Database migrations
        models/          # TypeORM entity models
        otel/            # OpenTelemetry setup
        trpc/            # tRPC router and handlers
        utils/           # Server utilities
    shared/src/
        types/           # Shared TypeScript types
        utils/           # Shared utility functions
        config/          # Configuration utilities
```

### [MUST] Shared Types
- Types used by both client and server must be in `packages/shared/src/types/`
- Export types through `packages/shared/src/index.ts`
