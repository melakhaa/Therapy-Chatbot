# Dashboard - local rules

`apps/dashboard` is the active Sajiwa Next.js 16 App Router dashboard, using
workspace `@sajiwa/dashboard`. The Expo dashboard and temporary
`apps/dashboard-next` migration workspace have been retired.

## Commands

Run from the repository root:

```bash
npm run dashboard:dev
npm run dashboard:typecheck
npm run dashboard:lint
npm run dashboard:test
npm run dashboard:build
```

## Architecture and security

- Keep routes under `app/(admin)/` thin; place domain logic in `features/<domain>/`.
- Use existing API-client layers and preserve authentication and authorization.
- Keep user-facing strings in the central message catalog (Indonesian default, English secondary).
- Preserve existing security headers and CSP; never expose secrets via `NEXT_PUBLIC_*`.
- `NEXT_PUBLIC_API_URL` denotes the API origin; preview mode is for development only.
- Do not reintroduce Expo dashboard files or the old `dashboard-next` workspace.

## References

- [Next.js conventions](../../docs/nextjs-conventions.md)
- [TypeScript conventions](../../docs/typescript-conventions.md)
- [React conventions](../../docs/react-conventions.md)
- [Security conventions](../../docs/security-conventions.md)
