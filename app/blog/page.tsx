import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { ARTICLES, CATEGORIES, readingTime } from '@/content/blog/articles'
import type { BlogCategory } from '@/content/blog/types'
import Emoji from '@/components/ui/Emoji'

export const metadata: Metadata = {
  title: 'ISALY Immo — Conseils, droits et guides colocation',
  description: 'Conseils, droits et guides pour bien coloquer : prix, bail, colocataires, quartiers. Le blog colocation d’ISALY.',
  alternates: { canonical: 'https://isaly.fr/blog' },
  openGraph: {
    title: 'ISALY Immo — Le blog de la colocation',
    description: 'Conseils, droits et guides pour bien coloquer.',
    url: 'https://isaly.fr/blog',
    siteName: 'ISALY',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
    locale: 'fr_FR',
    type: 'website',
  },
}

const CATEGORY_COLORS: Record<BlogCategory, string> = {
  Guides: '#10B981',
  Droits: '#6366F1',
  Conseils: '#F59E0B',
  Marché: '#EC4899',
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function BlogPage({ searchParams }: { searchParams: { cat?: string } }) {
  const activeCat = CATEGORIES.includes(searchParams.cat as BlogCategory) ? (searchParams.cat as BlogCategory) : null
  const articles = activeCat ? ARTICLES.filter(a => a.category === activeCat) : ARTICLES

  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0A', fontFamily: "'Outfit', sans-serif", color: '#fff' }}>

      {/* Navbar */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(10,10,10,0.9)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '0 24px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" aria-label="ISALY — accueil">
          <Image src="/LOGO_ISALY.png" alt="ISALY" height={24} width={76} style={{ width: 'auto', height: '24px', objectFit: 'contain' }} />
        </Link>
        <div style={{ display: 'flex', gap: '10px' }}>
          <Link href="/auth/login" style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '13px', color: 'rgba(255,255,255,0.6)', textDecoration: 'none', border: '1px solid rgba(255,255,255,0.1)' }}>
            Se connecter
          </Link>
          <Link href="/auth/register" style={{ padding: '8px 18px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, color: '#fff', textDecoration: 'none', background: 'linear-gradient(135deg, #10B981, #059669)' }}>
            Inscription gratuite
          </Link>
        </div>
      </nav>

      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '56px 24px 80px' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '3px', color: '#10B981', marginBottom: '16px' }}>LE BLOG</div>
          <h1 style={{ fontSize: 'clamp(34px, 5vw, 52px)', fontWeight: 700, margin: '0 0 14px', letterSpacing: '-1px' }}>ISALY Immo</h1>
          <p style={{ fontSize: '16px', color: 'rgba(255,255,255,0.5)', margin: 0 }}>
            Conseils, droits et guides pour bien coloquer
          </p>
        </div>

        {/* Filtres catégorie */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '40px' }}>
          <Link href="/blog" style={{
            padding: '8px 18px', borderRadius: '20px', fontSize: '13px', fontWeight: 600, textDecoration: 'none',
            background: !activeCat ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.04)',
            border: `1px solid ${!activeCat ? '#10B981' : 'rgba(255,255,255,0.1)'}`,
            color: !activeCat ? '#10B981' : 'rgba(255,255,255,0.6)',
          }}>
            Tous
          </Link>
          {CATEGORIES.map(cat => (
            <Link key={cat} href={`/blog?cat=${cat}`} style={{
              padding: '8px 18px', borderRadius: '20px', fontSize: '13px', fontWeight: 600, textDecoration: 'none',
              background: activeCat === cat ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${activeCat === cat ? '#10B981' : 'rgba(255,255,255,0.1)'}`,
              color: activeCat === cat ? '#10B981' : 'rgba(255,255,255,0.6)',
            }}>
              {cat}
            </Link>
          ))}
        </div>

        {/* Grille articles */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: '20px' }}>
          {articles.map(a => (
            <Link key={a.slug} href={`/blog/${a.slug}`} style={{ textDecoration: 'none' }}>
              <article className="blog-card" style={{
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '20px', overflow: 'hidden', height: '100%', display: 'flex', flexDirection: 'column',
              }}>
                {/* Visuel placeholder mint */}
                <div style={{
                  height: '150px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'linear-gradient(135deg, rgba(16,185,129,0.18), rgba(5,150,105,0.06))',
                  fontSize: '52px', position: 'relative',
                }}>
                  <Emoji native={a.emoji} size="52px" />
                  <span style={{
                    position: 'absolute', top: 12, left: 12,
                    fontSize: '10.5px', fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase',
                    padding: '4px 10px', borderRadius: '12px',
                    background: 'rgba(10,10,10,0.75)', color: CATEGORY_COLORS[a.category], backdropFilter: 'blur(4px)',
                  }}>
                    {a.category}
                  </span>
                </div>
                <div style={{ padding: '18px 20px 20px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                  <h2 style={{ fontSize: '16.5px', fontWeight: 700, color: '#fff', margin: '0 0 8px', lineHeight: 1.4 }}>
                    {a.title}
                  </h2>
                  <p style={{
                    fontSize: '13px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.6, margin: '0 0 14px', flex: 1,
                    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                  }}>
                    {a.excerpt}
                  </p>
                  <div style={{ fontSize: '11.5px', color: 'rgba(255,255,255,0.35)' }}>
                    {formatDate(a.date)} · {readingTime(a)} min de lecture
                  </div>
                </div>
              </article>
            </Link>
          ))}
        </div>

        {/* CTA */}
        <div style={{ textAlign: 'center', marginTop: '64px', padding: '48px 24px', background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: '20px' }}>
          <h2 style={{ fontSize: '24px', margin: '0 0 12px' }}>Prêt à passer de la théorie à la pratique ?</h2>
          <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.5)', margin: '0 0 24px' }}>
            Trouvez votre coloc idéale avec le matching intelligent ISALY — gratuit pour les locataires.
          </p>
          <Link href="/auth/register" style={{ display: 'inline-block', background: 'linear-gradient(135deg, #10B981, #059669)', color: '#fff', textDecoration: 'none', fontSize: '15px', fontWeight: 700, padding: '14px 32px', borderRadius: '12px', boxShadow: '0 4px 20px rgba(16,185,129,0.35)' }}>
            Commencer gratuitement →
          </Link>
        </div>
      </div>

      <style>{`
        .blog-card { transition: transform 0.15s, border-color 0.15s; }
        .blog-card:hover { transform: translateY(-3px); border-color: rgba(16,185,129,0.35) !important; }
      `}</style>
    </div>
  )
}
