import { Link, useParams } from 'react-router-dom';
import { PageHeader } from '@/components/ui/PageHeader';
import NotFound from '@/pages/NotFound';
import { useAsync } from '@/hooks/useAsync';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useSeo } from '@/hooks/useSeo';
import { fetchBlogPost, fetchBlogPosts } from '@/lib/contentApi';
import { clip } from '@/lib/seo';
import { parseContent, safeUrl } from '@/lib/siteContent';

const fmt = (iso: string) => (iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '');

export function BlogList() {
  usePageTitle('Blog');
  const { data, loading, error } = useAsync(() => fetchBlogPosts(), []);
  return (
    <>
      <PageHeader title="Blog" description="Style notes, guides and news." crumbs={[{ label: 'Blog' }]} />
      <div className="container-page py-12 sm:py-16">
        {loading && <p role="status" className="text-sm text-muted">Loading…</p>}
        {error && <p role="alert" className="text-sm text-red-700">We could not load the articles. Please try again.</p>}
        {data && data.length === 0 && <p className="text-sm text-muted">No articles yet. Please check back soon.</p>}
        <ul className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {data?.map((p) => {
            const img = safeUrl(p.coverImage);
            return (
              <li key={p.slug}>
                <Link to={`/blog/${p.slug}`} className="group block">
                  <div className="aspect-[16/10] overflow-hidden bg-secondary">
                    {img && <img src={img} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />}
                  </div>
                  <p className="mt-4 text-xs uppercase tracking-[0.14em] text-muted">{fmt(p.date)}</p>
                  <h2 className="mt-1 text-2xl font-medium text-primary group-hover:text-accent-dark">{p.title}</h2>
                  {p.excerpt && <p className="mt-2 text-sm leading-relaxed text-muted">{clip(p.excerpt, 160)}</p>}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </>
  );
}

export function BlogPostPage() {
  const { slug = '' } = useParams();
  const { data, loading } = useAsync(() => fetchBlogPost(slug), [slug]);
  usePageTitle(data ? data.seoTitle || data.title : 'Blog');
  useSeo(data ? { type: 'article', description: data.seoDescription || clip(data.excerpt || data.content.replace(/^## /gm, ''), 160), image: safeUrl(data.coverImage) || undefined } : null);
  if (loading && data === null) return <div className="container-page py-16"><p role="status" className="text-sm text-muted">Loading…</p></div>;
  if (!data) return <NotFound />;
  const img = safeUrl(data.coverImage);
  return (
    <>
      <PageHeader title={data.title} description={fmt(data.date)} crumbs={[{ label: 'Blog', to: '/blog' }, { label: data.title }]} />
      <article className="container-page py-12 sm:py-16">
        <div className="mx-auto max-w-3xl space-y-5 text-[15px] leading-relaxed text-ink [&_h2]:mt-8 [&_h2]:text-2xl [&_h2]:font-medium">
          {img && <img src={img} alt="" className="mb-8 w-full object-cover" />}
          {parseContent(data.content).map((b, i) => (b.type === 'h2' ? <h2 key={i}>{b.text}</h2> : <p key={i} className="whitespace-pre-line">{b.text}</p>))}
          <p className="pt-6"><Link to="/blog" className="link-underline text-sm">← All articles</Link></p>
        </div>
      </article>
    </>
  );
}
