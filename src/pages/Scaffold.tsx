import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/ui/PageHeader';
import { ButtonLink } from '@/components/ui/Button';
import { usePageTitle } from '@/hooks/usePageTitle';

interface Props {
  title: string;
  description: string;
  phase: number;
  phaseLabel: string;
}

/**
 * Honest placeholder for pages whose functionality depends on later phases
 * (auth, cart, checkout, orders…). It performs no fake actions.
 */
export default function Scaffold({ title, description, phase, phaseLabel }: Props) {
  usePageTitle(title);
  return (
    <>
      <PageHeader title={title} crumbs={[{ label: title }]} />
      <div className="container-page py-16 text-center sm:py-24">
        <p className="eyebrow">Phase {phase} · {phaseLabel}</p>
        <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-muted">{description}</p>
        <div className="mt-8 flex justify-center gap-3">
          <ButtonLink to="/shop">Continue Shopping</ButtonLink>
          <Link to="/" className="inline-flex items-center px-4 text-xs uppercase tracking-[0.18em] text-primary link-underline">
            Home
          </Link>
        </div>
      </div>
    </>
  );
}
