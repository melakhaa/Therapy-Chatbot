import type { ReactNode } from 'react';

export function PageShell({ title, actions, filters, children }: { title?: string; actions?: ReactNode; filters?: ReactNode; children: ReactNode }) {
  return <div className="page-shell">{(title || actions) && <header className="page-header">{title && <h1>{title}</h1>}{actions && <div className="page-actions">{actions}</div>}</header>}{filters && <div className="page-filters">{filters}</div>}<div className="page-content">{children}</div></div>;
}
