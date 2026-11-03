import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

interface Props {
  title: string;
  description?: string;
  crumbs?: { label: string; to?: string }[];
}

export function PageHeader({ title, description, crumbs = [] }: Props) {
  return (
    <div className="border-b border-line bg-secondary">
      <div className="container-page py-10 sm:py-14">
        <nav aria-label="Breadcrumb" className="mb-4 flex flex-wrap items-center gap-1.5 text-xs text-muted">
          <Link to="/" className="hover:text-primary">Home</Link>
          {crumbs.map((c) => (
            <span key={c.label} className="flex items-center gap-1.5">
              <ChevronRight size={12} aria-hidden="true" />
              {c.to ? <Link to={c.to} className="hover:text-primary">{c.label}</Link> : <span className="text-primary">{c.label}</span>}
            </span>
          ))}
        </nav>
        <h1 className="text-4xl font-medium sm:text-5xl">{title}</h1>
        {description && <p className="mt-3 max-w-2xl text-sm text-muted sm:text-base">{description}</p>}
      </div>
    </div>
  );
}
