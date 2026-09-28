import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ARTICLES, getArticle, getAdjacent, readingTime } from '@/content/blog/articles'
import type { Block } from '@/content/blog/types'
import ShareButtons from '@/components/blog/ShareButtons'
import { Art, Bubble, COL, Icon, Pill } from '@/components/ui-v2'
import { PublicLayout } from '@/components/ui-v2/public'
import { Toc } from '@/components/ui-v2/public/Toc'

export function generateStaticParams() {
  return ARTICLES.map(a => ({ slug: a.slug }))
}

interface Props {
  params: { slug: string }
}

export function generateMetadata({ params }: Props): Metadata {
  const article = getArticle(params.slug)
  if (!article) return {}
  return {
    title: article.title,
    description: article.excerpt,
    keywords: article.keywords,
    alternates: { canonical: `https://isaly.fr/blog/${article.slug}` },
    openGraph: {
      title: article.title,
      description: article.excerpt,
      url: `https://isaly.fr/blog/${article.slug}`,
      siteName: 'ISALY',
      images: [{ url: '/og-image.png', width: 1200, height: 630 }],
      locale: 'fr_FR',
      type: 'article',
      publishedTime: article.date,
      modifiedTime: article.updated ?? article.date,
    },
  }
}

function slugifyHeading(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

/** Rendu des blocs de l'article : les styles viennent de .prose (maquette). */
function renderBlock(block: Block, i: number) {
  switch (block.type) {
    case 'h2':
      return <h2 key={i} id={slugifyHeading(block.text)} style={{ scrollMarginTop: 96 }}>{block.text}</h2>
    case 'h3':
      return <h3 key={i}>{block.text}</h3>
    case 'ul':
      return (
        <ul key={i}>
          {block.items.map((item, j) => <li key={j}>{item}</li>)}
        </ul>
      )
    case 'quote':
      return <blockquote key={i}>{block.text}</blockquote>
    default:
      return <p key={i}>{block.text}</p>
  }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function BlogArticlePage({ params }: Props) {
  const article = getArticle(params.slug)
  if (!article) notFound()

  const { prev, next } = getAdjacent(article.slug)
  const url = `https://isaly.fr/blog/${article.slug}`
  const toc = article.blocks.filter((b): b is Extract<Block, { type: 'h2' }> => b.type === 'h2')
  const related = article.related.map(getArticle).filter((a): a is NonNullable<typeof a> => !!a)

  // Place de la carte d'appel à l'action : avant le dernier intertitre.
  const lastH2 = article.blocks.map(b => b.type).lastIndexOf('h2')
  const ctaAt = lastH2 > 0 ? lastH2 : article.blocks.length

  const cta = (
    <div className="cta-card" key="cta">
      <span className="ico brand" style={{ width: 52, height: 52, borderRadius: 18 }}><Icon name="spark" size={24} /></span>
      <div className="grow">
        <b>Des colocs sur la même longueur d’onde</b>
        <span>Le test ISALY compare vos habitudes, y compris sur le partage.</span>
      </div>
      <Link className="btn btn-main" href="/auth/register">Faire le test</Link>
    </div>
  )

  // Données structurées de l'article (« < » échappé : rien ne ferme la balise).
  const ld = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: article.title,
    description: article.excerpt,
    datePublished: article.date,
    dateModified: article.updated ?? article.date,
    mainEntityOfPage: url,
    author: { '@type': 'Organization', name: 'ISALY Immo' },
    publisher: { '@type': 'Organization', name: 'ISALY' },
    keywords: article.keywords.join(', '),
  }).replace(/</g, String.fromCharCode(92) + 'u003c')

  return (
    <PublicLayout>
      <div className="wrap">
        <header className="art-head">
          <nav className="crumbs" aria-label="Fil d’Ariane" style={{ justifyContent: 'center' }}>
            <Link href="/blog">Blog</Link>
            <Icon name="chevron" />
            <Link href={`/blog?cat=${encodeURIComponent(article.category)}`}>{article.category}</Link>
          </nav>
          <h1 className="h1">{article.title}</h1>
          <div className="meta">
            <Bubble name="I" color={COL.violet} size={28} />
            <span>ISALY Immo</span>
            <span>{formatDate(article.date)}</span>
            <span>{readingTime(article)} min de lecture</span>
          </div>
        </header>

        <Art id={article.slug} className="cover" />

        <div className="art-lay">
          {toc.length > 1 ? (
            <Toc items={toc.map(h => ({ id: slugifyHeading(h.text), t: h.text }))}>
              <div className="share" style={{ marginTop: 14 }}>
                <Pill tone="brand">{article.category}</Pill>
              </div>
            </Toc>
          ) : <span />}

          <article className="prose">
            {article.blocks.slice(0, ctaAt).map(renderBlock)}
            {cta}
            {article.blocks.slice(ctaAt).map((b, i) => renderBlock(b, i + ctaAt))}

            <h3>Partager cet article</h3>
            <ShareButtons url={url} title={article.title} />

            {(prev || next) && (
              <nav className="v-grid g2" aria-label="Autres articles" style={{ marginTop: 32 }}>
                {prev ? (
                  <Link className="panel" href={`/blog/${prev.slug}`} style={{ textDecoration: 'none' }}>
                    <span className="s" style={{ display: 'flex', gap: 6, alignItems: 'center' }}><Icon name="back" size={16} />Article précédent</span>
                    <b style={{ display: 'block', marginTop: 6 }}>{prev.title}</b>
                  </Link>
                ) : <span />}
                {next ? (
                  <Link className="panel" href={`/blog/${next.slug}`} style={{ textDecoration: 'none', textAlign: 'right' }}>
                    <span className="s" style={{ display: 'flex', gap: 6, alignItems: 'center', justifyContent: 'flex-end' }}>Article suivant<Icon name="arrow" size={16} /></span>
                    <b style={{ display: 'block', marginTop: 6 }}>{next.title}</b>
                  </Link>
                ) : <span />}
              </nav>
            )}
          </article>
        </div>

        {related.length > 0 && (
          <section className="sec">
            <h2>À lire aussi</h2>
            <div className="posts">
              {related.slice(0, 3).map(q => (
                <Link key={q.slug} className="post" href={`/blog/${q.slug}`} style={{ textDecoration: 'none' }}>
                  <Art id={q.slug} />
                  <div className="in">
                    <div className="meta">
                      <Pill>{q.category}</Pill>
                      <span>{readingTime(q)} min</span>
                    </div>
                    <h3>{q.title}</h3>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ld }} />
    </PublicLayout>
  )
}

/* [HIDDEN] Ancienne version (avant le site v2), conservée pour référence :
import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { ARTICLES, getArticle, getAdjacent, readingTime } from '@/content/blog/articles'
import type { Block } from '@/content/blog/types'
import ShareButtons from '@/components/blog/ShareButtons'
import Emoji from '@/components/ui/Emoji'
import RiseText from '@/components/motion/RiseText'

export function generateStaticParams() {
  return ARTICLES.map(a => ({ slug: a.slug }))
}

interface Props {
  params: { slug: string }
}

export function generateMetadata({ params }: Props): Metadata {
  const article = getArticle(params.slug)
  if (!article) return {}
  return {
    title: article.title,
    description: article.excerpt,
    keywords: article.keywords,
    alternates: { canonical: `https://isaly.fr/blog/${article.slug}` },
    openGraph: {
      title: article.title,
      description: article.excerpt,
      url: `https://isaly.fr/blog/${article.slug}`,
      siteName: 'ISALY',
      images: [{ url: '/og-image.png', width: 1200, height: 630 }],
      locale: 'fr_FR',
      type: 'article',
      publishedTime: article.date,
      modifiedTime: article.updated ?? article.date,
    },
  }
}

function slugifyHeading(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

function renderBlock(block: Block, i: number) {
  switch (block.type) {
    case 'h2':
      return (
        <h2 key={i} id={slugifyHeading(block.text)} style={{ fontSize: '26px', fontWeight: 700, color: '#10B981', margin: '44px 0 16px', letterSpacing: '-0.5px', scrollMarginTop: '80px' }}>
          {block.text}
        </h2>
      )
    case 'h3':
      return (
        <h3 key={i} style={{ fontSize: '20px', fontWeight: 700, color: '#fff', margin: '30px 0 12px' }}>
          {block.text}
        </h3>
      )
    case 'ul':
      return (
        <ul key={i} style={{ margin: '0 0 20px', paddingLeft: '22px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {block.items.map((item, j) => (
            <li key={j} style={{ fontSize: '17px', color: 'rgba(255,255,255,0.72)', lineHeight: 1.7 }}>{item}</li>
          ))}
        </ul>
      )
    case 'quote':
      return (
        <blockquote key={i} style={{
          margin: '24px 0', padding: '16px 20px', borderLeft: '3px solid #10B981',
          background: 'rgba(16,185,129,0.06)', borderRadius: '0 12px 12px 0',
          fontSize: '16px', color: 'rgba(255,255,255,0.8)', lineHeight: 1.7, fontStyle: 'italic',
        }}>
          {block.text}
        </blockquote>
      )
    default:
      return (
        <p key={i} style={{ fontSize: '18px', color: 'rgba(255,255,255,0.72)', lineHeight: 1.7, margin: '0 0 20px' }}>
          {block.text}
        </p>
      )
  }
}

export default function BlogArticlePage({ params }: Props) {
  const article = getArticle(params.slug)
  if (!article) notFound()

  const { prev, next } = getAdjacent(article.slug)
  const url = `https://isaly.fr/blog/${article.slug}`
  const toc = article.blocks.filter((b): b is Extract<Block, { type: 'h2' }> => b.type === 'h2')
  const related = article.related.map(getArticle).filter(Boolean)

  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0A', fontFamily: "'Outfit', sans-serif", color: '#fff' }}>

      {/* Navbar * /}
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(10,10,10,0.9)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '0 24px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" aria-label="ISALY — accueil">
          <Image src="/LOGO_ISALY.png" alt="ISALY" height={24} width={76} style={{ width: 'auto', height: '24px', objectFit: 'contain' }} />
        </Link>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <Link href="/blog" style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', textDecoration: 'none' }}>
            ← ISALY Immo
          </Link>
          <Link href="/auth/register" style={{ padding: '8px 18px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, color: '#fff', textDecoration: 'none', background: 'linear-gradient(135deg, #10B981, #059669)' }}>
            Inscription gratuite
          </Link>
        </div>
      </nav>

      <div style={{ maxWidth: '1080px', margin: '0 auto', padding: '48px 24px 80px' }}>

        {/* En-tête article * /}
        <header style={{ maxWidth: '760px', marginBottom: '40px' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '2px', color: '#10B981', marginBottom: '14px' }}>
            {article.category} · {readingTime(article)} min de lecture
          </div>
          <h1 style={{ fontSize: 'clamp(30px, 4.5vw, 44px)', fontWeight: 700, lineHeight: 1.15, letterSpacing: '-1px', margin: '0 0 14px' }}>
            <RiseText mode="load" text={article.title} />
          </h1>
          <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>
            Publié le {new Date(article.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
        </header>

        {/* Layout 2 colonnes * /}
        <div className="article-layout" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 7fr) 3fr', gap: '48px', alignItems: 'start' }}>

          {/* Contenu * /}
          <article>
            {article.blocks.map(renderBlock)}

            {/* Partage * /}
            <div style={{ marginTop: '48px', paddingTop: '28px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: '12px' }}>Partager cet article</div>
              <ShareButtons url={url} title={article.title} />
            </div>

            {/* CTA fin d'article * /}
            <div style={{ marginTop: '40px', padding: '32px', textAlign: 'center', background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '20px' }}>
              <div style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>Trouvez votre coloc idéale sur ISALY</div>
              <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)', margin: '0 0 20px' }}>
                Matching de compatibilité, dossiers vérifiés, bail en ligne — gratuit pour les locataires.
              </p>
              <Link href="/auth/register" style={{ display: 'inline-block', background: 'linear-gradient(135deg, #10B981, #059669)', color: '#fff', textDecoration: 'none', fontSize: '14.5px', fontWeight: 700, padding: '13px 30px', borderRadius: '12px', boxShadow: '0 4px 20px rgba(16,185,129,0.35)' }}>
                Créer mon profil gratuit →
              </Link>
            </div>

            {/* Précédent / suivant * /}
            {(prev || next) && (
              <nav style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginTop: '32px' }}>
                {prev ? (
                  <Link href={`/blog/${prev.slug}`} style={{ textDecoration: 'none', padding: '16px 18px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px' }}>
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '5px' }}>← Article précédent</div>
                    <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#fff', lineHeight: 1.4 }}>{prev.title}</div>
                  </Link>
                ) : <span />}
                {next ? (
                  <Link href={`/blog/${next.slug}`} style={{ textDecoration: 'none', padding: '16px 18px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', textAlign: 'right' }}>
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '5px' }}>Article suivant →</div>
                    <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#fff', lineHeight: 1.4 }}>{next.title}</div>
                  </Link>
                ) : <span />}
              </nav>
            )}
          </article>

          {/* Sidebar * /}
          <aside className="article-sidebar" style={{ position: 'sticky', top: '84px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {/* Table des matières * /}
            {toc.length > 1 && (
              <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '20px' }}>
                <div style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1.5px', color: 'rgba(255,255,255,0.4)', marginBottom: '14px' }}>
                  Sommaire
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {toc.map(h => (
                    <a key={h.text} href={`#${slugifyHeading(h.text)}`} className="toc-link" style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', textDecoration: 'none', lineHeight: 1.5, transition: 'color 0.15s' }}>
                      {h.text}
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* CTA sidebar * /}
            <div style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '16px', padding: '22px', textAlign: 'center' }}>
              <div style={{ fontSize: '30px', marginBottom: '10px' }}><Emoji native={article.emoji} size="30px" /></div>
              <div style={{ fontSize: '14.5px', fontWeight: 700, marginBottom: '6px' }}>Ta coloc idéale existe déjà</div>
              <p style={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.5)', margin: '0 0 16px', lineHeight: 1.6 }}>
                Matching sur 40+ critères, gratuit pour les locataires.
              </p>
              <Link href="/auth/register" style={{ display: 'block', background: 'linear-gradient(135deg, #10B981, #059669)', color: '#fff', textDecoration: 'none', fontSize: '13px', fontWeight: 700, padding: '11px', borderRadius: '10px' }}>
                Essayer ISALY →
              </Link>
            </div>

            {/* Articles liés * /}
            {related.length > 0 && (
              <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '20px' }}>
                <div style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1.5px', color: 'rgba(255,255,255,0.4)', marginBottom: '14px' }}>
                  À lire aussi
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {related.map(r => (
                    <Link key={r!.slug} href={`/blog/${r!.slug}`} className="toc-link" style={{ fontSize: '13px', fontWeight: 600, color: 'rgba(255,255,255,0.7)', textDecoration: 'none', lineHeight: 1.5, transition: 'color 0.15s' }}>
                      {r!.title}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>

      <style>{`
        .toc-link:hover { color: #10B981 !important; }
        @media (max-width: 900px) {
          .article-layout { grid-template-columns: 1fr !important; }
          .article-sidebar { position: static !important; }
        }
      `}</style>
    </div>
  )
}
*/
