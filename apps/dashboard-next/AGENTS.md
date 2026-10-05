# dashboard-next — local rules

Next.js 16 App Router admin dashboard (`@sajiwa/dashboard-next`); migration workspace that
replaces the legacy Expo dashboard at the reviewed cutover (see
[M11 plan](../../docs/dashboard-next-m11-cutover-plan.md)). Product specs: the M0–M8 docs in
`docs/dashboard-next-m*`.

```bash
npm run dev --workspace @sajiwa/dashboard-next   # :3000
npm run typecheck --workspace @sajiwa/dashboard-next
npm run lint --workspace @sajiwa/dashboard-next
npm run test:foundation --workspace @sajiwa/dashboard-next
npm run build --workspace @sajiwa/dashboard-next   # required gate
```

- `NEXT_PUBLIC_API_URL` is an **origin only**; `NEXT_PUBLIC_PREVIEW_MODE` works in dev only.
- Security headers in `next.config.ts` — don't weaken CSP for a script.
- Route segments in `app/(admin)/` stay thin; logic lives in `features/<domain>/model.ts`.
- No inline user-facing strings — central message catalog (id default, en secondary).

Conventions: [nextjs](../../docs/nextjs-conventions.md), [typescript](../../docs/typescript-conventions.md),
[react](../../docs/react-conventions.md), [security](../../docs/security-conventions.md).
