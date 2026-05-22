'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState } from 'react'

export default function LandingPage() {
  return (
    <main style={{ background: '#fff', minHeight: '100vh', fontFamily: "'DM Sans', sans-serif" }}>

      {/* ── NAVBAR ── */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        height: '68px', padding: '0 48px',
        background: 'rgba(255,255,255,.95)', backdropFilter: 'blur(14px)',
        borderBottom: '1px solid #F0F0F0',
      }}>
        <Image src="/LOGO_ISALY.png" alt="ISALY" height={38} width={130} style={{ width: 'auto', height: '38px', objectFit: 'contain' }} />
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <Link href="/auth/login">
            <NavBtn ghost>Connexion</NavBtn>
          </Link>
          <Link href="/onboarding">
            <NavBtn>Commencer gratuitement</NavBtn>
          </Link>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section style={{
        background: 'linear-gradient(160deg, #f0fdf8 0%, #fff 55%)',
        padding: '100px 48px 80px',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Background blobs */}
        <div style={{
          position: 'absolute', top: '-80px', right: '-80px',
          width: '500px', height: '500px', borderRadius: '50%',
          background: 'radial-gradient(circle, #4ECBA015 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: '-60px', left: '-60px',
          width: '400px', height: '400px', borderRadius: '50%',
          background: 'radial-gradient(circle, #4ECBA010 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div style={{ position: 'relative', maxWidth: '760px', margin: '0 auto' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            background: '#E8F9F3', color: '#2AA87C',
            fontSize: '12px', fontWeight: 700, letterSpacing: '1.5px',
            textTransform: 'uppercase', padding: '6px 16px', borderRadius: '50px',
            marginBottom: '28px',
          }}>
            <span>✨</span> La colocation réinventée
          </div>

          <h1 style={{
            fontFamily: "'DM Serif Display', serif",
            fontSize: 'clamp(42px, 6vw, 72px)',
            lineHeight: 1.06,
            marginBottom: '24px',
            color: '#1A1A1A',
          }}>
            Trouve des colocataires<br />
            qui te <em style={{ color: '#4ECBA0', fontStyle: 'italic' }}>ressemblent vraiment.</em>
          </h1>

          <p style={{
            fontSize: '18px', lineHeight: 1.8, color: '#6B7280',
            maxWidth: '560px', margin: '0 auto 40px',
          }}>
            ISALY analyse tes habitudes, tes horaires et ta personnalité pour te connecter
            avec des colocataires vraiment compatibles. Pas de hasard, que des bonnes rencontres.
          </p>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/onboarding">
              <button style={{
                padding: '15px 32px', borderRadius: '50px',
                background: '#4ECBA0', color: '#fff',
                fontSize: '15px', fontWeight: 700, border: 'none', cursor: 'pointer',
                boxShadow: '0 8px 24px rgba(78,203,160,.35)',
                transition: 'all .2s',
              }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = '#2AA87C'
                  e.currentTarget.style.transform = 'translateY(-2px)'
                  e.currentTarget.style.boxShadow = '0 12px 32px rgba(78,203,160,.45)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = '#4ECBA0'
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(78,203,160,.35)'
                }}
              >
                Créer mon profil — c'est gratuit
              </button>
            </Link>
            <Link href="/auth/login">
              <button style={{
                padding: '15px 32px', borderRadius: '50px',
                background: 'transparent', color: '#1A1A1A',
                fontSize: '15px', fontWeight: 600,
                border: '1.5px solid #E5E7EB', cursor: 'pointer',
                transition: 'all .2s',
              }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = '#4ECBA0'
                  e.currentTarget.style.color = '#2AA87C'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = '#E5E7EB'
                  e.currentTarget.style.color = '#1A1A1A'
                }}
              >
                J'ai déjà un compte
              </button>
            </Link>
          </div>

          <p style={{ fontSize: '13px', color: '#9CA3AF', marginTop: '20px' }}>
            Rejoins 14 000+ colocataires · Sans carte bancaire
          </p>
        </div>

        {/* Hero cards */}
        <div style={{
          maxWidth: '900px', margin: '64px auto 0',
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px',
        }}>
          <ProfileCard
            emoji="👩‍🎨" name="Sophie M." age={24} city="Paris 11ème"
            rent={850} match={94} tags={['🌙 Couche-tard', '🎵 Musique']} color="#4ECBA0"
          />
          <ProfileCard
            emoji="👨‍💻" name="Thomas R." age={27} city="Lyon 2ème"
            rent={720} match={88} tags={['🌅 Lève-tôt', '🍳 Cuisine']} color="#6366F1"
            style={{ transform: 'translateY(-16px)' }}
          />
          <ProfileCard
            emoji="👩‍⚖️" name="Camille B." age={23} city="Paris 5ème"
            rent={700} match={81} tags={['📚 Studieux', '🐕 Chien ok']} color="#F59E0B"
          />
        </div>
      </section>

      {/* ── STATS ── */}
      <section style={{
        background: '#111827',
        padding: '72px 48px',
        display: 'flex', justifyContent: 'center', gap: '80px', flexWrap: 'wrap',
      }}>
        {[
          { num: '14k+', label: 'Colocataires actifs' },
          { num: '94%', label: 'Taux de satisfaction' },
          { num: '3 min', label: 'Pour créer ton profil' },
          { num: '0 €', label: 'Pour commencer' },
        ].map(s => (
          <div key={s.num} style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: '52px', color: '#4ECBA0' }}>{s.num}</div>
            <div style={{ fontSize: '14px', color: '#9CA3AF', marginTop: '6px' }}>{s.label}</div>
          </div>
        ))}
      </section>

      {/* ── COMMENT ÇA MARCHE ── */}
      <section style={{ maxWidth: '1000px', margin: '0 auto', padding: '100px 48px' }}>
        <div style={{ textAlign: 'center', marginBottom: '64px' }}>
          <Kicker>Comment ça marche</Kicker>
          <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: '44px', marginBottom: '14px', color: '#1A1A1A' }}>
            Trois étapes, une nouvelle vie.
          </h2>
          <p style={{ fontSize: '16px', color: '#6B7280', maxWidth: '480px', margin: '0 auto', lineHeight: 1.75 }}>
            Trouver la bonne coloc n'a jamais été aussi simple — ni aussi humain.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '28px' }}>
          {[
            {
              step: '01', icon: '🪄',
              title: 'Crée ton profil',
              desc: 'Réponds à quelques questions sur ton rythme de vie, tes passions et ton budget. 3 minutes chrono.',
            },
            {
              step: '02', icon: '💚',
              title: 'Swipe & matche',
              desc: "Notre algorithme te propose uniquement des profils vraiment compatibles. Lorsque c'est réciproque, c'est un match !",
            },
            {
              step: '03', icon: '🏠',
              title: 'Emménage serein',
              desc: 'Échangez en messagerie, partagez vos dossiers et gérez votre bail directement depuis ISALY.',
            },
          ].map(s => (
            <div key={s.step} style={{
              background: '#fff', borderRadius: '18px', padding: '32px',
              border: '1px solid #F0F0F0',
              boxShadow: '0 2px 20px rgba(0,0,0,.05)',
              position: 'relative', overflow: 'hidden',
            }}>
              <div style={{
                position: 'absolute', top: '16px', right: '20px',
                fontFamily: "'DM Serif Display', serif", fontSize: '52px',
                color: '#4ECBA008', fontWeight: 700, lineHeight: 1,
                userSelect: 'none',
              }}>{s.step}</div>
              <div style={{
                width: '52px', height: '52px', borderRadius: '14px',
                background: '#E8F9F3', display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: '24px', marginBottom: '18px',
              }}>{s.icon}</div>
              <h3 style={{ fontFamily: "'DM Serif Display', serif", fontSize: '20px', marginBottom: '10px', color: '#1A1A1A' }}>
                {s.title}
              </h3>
              <p style={{ fontSize: '14px', color: '#6B7280', lineHeight: 1.75 }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section style={{ background: '#F7F8FA', padding: '100px 48px' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '64px' }}>
            <Kicker>Tout en un</Kicker>
            <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: '44px', color: '#1A1A1A', marginBottom: '14px' }}>
              Simple. Intelligent. Sécurisé.
            </h2>
            <p style={{ fontSize: '16px', color: '#6B7280', lineHeight: 1.75 }}>
              ISALY résout les 3 grands problèmes de la colocation en France.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '20px' }}>
            {[
              { icon: '❤️', title: 'Matching intelligent', desc: "Algorithme basé sur tes habitudes, horaires et passions. Fini les colocations ratées." },
              { icon: '📁', title: 'Dossier sécurisé', desc: "Tes documents centralisés, certifiés et partageables en un clic. Zéro galère." },
              { icon: '🏠', title: 'Gestion du bail', desc: "Loyers, charges, états des lieux. Tout est suivi automatiquement depuis ton espace." },
              { icon: '💬', title: 'Messagerie intégrée', desc: "Discute avec tes matchs sans donner ton numéro. Sécurisé et instantané." },
              { icon: '🛡️', title: 'Assurance dossier', desc: "Dossier certifié ISALY. Rassure les propriétaires, accélère ta recherche." },
              { icon: '🚀', title: 'Annonces boostées', desc: "Loueurs : vos annonces touchent les candidats les plus compatibles en priorité." },
            ].map(f => (
              <FeatureCard key={f.title} icon={f.icon} title={f.title} desc={f.desc} />
            ))}
          </div>
        </div>
      </section>

      {/* ── TÉMOIGNAGES ── */}
      <section style={{ maxWidth: '1000px', margin: '0 auto', padding: '100px 48px' }}>
        <div style={{ textAlign: 'center', marginBottom: '56px' }}>
          <Kicker>Ils ont trouvé leur coloc</Kicker>
          <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: '44px', color: '#1A1A1A' }}>
            Des vraies rencontres.
          </h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '20px' }}>
          {[
            {
              quote: "J'ai trouvé ma colocataire en 4 jours. On a vraiment les mêmes horaires et les mêmes valeurs. ISALY a tout compris.",
              name: 'Léa D.', role: 'Étudiante en master', city: 'Paris', emoji: '👩‍🎓',
            },
            {
              quote: "En tant que loueur, j'ai reçu uniquement des candidatures sérieuses et compatibles. Plus de perte de temps.",
              name: 'Marc B.', role: 'Propriétaire', city: 'Lyon', emoji: '🏠',
            },
            {
              quote: "Le dossier certifié m'a ouvert des portes que je n'arrivais pas à franchir avant. Recommande à 100%.",
              name: 'Inès R.', role: 'Jeune actif', city: 'Bordeaux', emoji: '✨',
            },
          ].map(t => (
            <div key={t.name} style={{
              background: '#fff', borderRadius: '18px', padding: '28px',
              border: '1px solid #F0F0F0', boxShadow: '0 2px 20px rgba(0,0,0,.05)',
            }}>
              <div style={{ fontSize: '28px', marginBottom: '14px' }}>❝</div>
              <p style={{ fontSize: '14px', lineHeight: 1.8, color: '#374151', marginBottom: '20px', fontStyle: 'italic' }}>
                {t.quote}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '40px', height: '40px', borderRadius: '50%',
                  background: '#E8F9F3', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontSize: '20px', flexShrink: 0,
                }}>{t.emoji}</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '14px', color: '#1A1A1A' }}>{t.name}</div>
                  <div style={{ fontSize: '12px', color: '#9CA3AF' }}>{t.role} · {t.city}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── PRICING ── */}
      <section style={{ background: '#111827', padding: '100px 48px' }}>
        <div style={{ maxWidth: '780px', margin: '0 auto', textAlign: 'center' }}>
          <div style={{
            display: 'inline-block', fontSize: '11px', fontWeight: 800,
            textTransform: 'uppercase', letterSpacing: '2.5px',
            color: '#4ECBA0', marginBottom: '14px',
          }}>Tarifs</div>
          <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: '42px', color: '#fff', marginBottom: '12px' }}>
            Transparent & juste.
          </h2>
          <p style={{ fontSize: '16px', color: '#9CA3AF', marginBottom: '52px' }}>
            On ne gagne que quand tu trouves ta coloc.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            {/* Essentiel */}
            <div style={{ background: '#1F2937', borderRadius: '18px', padding: '36px', border: '1px solid #374151', textAlign: 'left' }}>
              <div style={{ fontSize: '11px', color: '#9CA3AF', fontWeight: 700, marginBottom: '8px' }}>Pour bien démarrer</div>
              <h3 style={{ fontFamily: "'DM Serif Display', serif", fontSize: '24px', color: '#fff', marginBottom: '16px' }}>Essentiel</h3>
              <div style={{ fontSize: '38px', fontWeight: 800, color: '#fff', marginBottom: '24px' }}>
                Gratuit
              </div>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '14px', color: '#D1D5DB', marginBottom: '28px' }}>
                <li style={{ display: 'flex', gap: '10px' }}><span style={{ color: '#4ECBA0' }}>✓</span> Swipe illimité</li>
                <li style={{ display: 'flex', gap: '10px' }}><span style={{ color: '#4ECBA0' }}>✓</span> Messagerie avec tes matchs</li>
                <li style={{ display: 'flex', gap: '10px' }}><span style={{ color: '#4ECBA0' }}>✓</span> Dossier de base</li>
                <li style={{ display: 'flex', gap: '10px', opacity: 0.4 }}><span>✗</span> Assurance dossier</li>
              </ul>
              <Link href="/onboarding">
                <button style={{
                  width: '100%', padding: '13px', borderRadius: '50px',
                  background: '#4ECBA0', color: '#fff', border: 'none',
                  fontSize: '14px', fontWeight: 700, cursor: 'pointer',
                }}>
                  Commencer gratuitement
                </button>
              </Link>
            </div>

            {/* Sécurisé */}
            <div style={{ background: '#fff', borderRadius: '18px', padding: '36px', border: '2px solid #4ECBA0', textAlign: 'left', position: 'relative' }}>
              <div style={{
                position: 'absolute', top: '-14px', left: '50%', transform: 'translateX(-50%)',
                background: '#4ECBA0', color: '#fff', fontSize: '10px', fontWeight: 800,
                padding: '4px 16px', borderRadius: '50px', letterSpacing: '.5px',
              }}>POPULAIRE</div>
              <div style={{ fontSize: '11px', color: '#6B7280', fontWeight: 700, marginBottom: '8px' }}>Pour aller plus loin</div>
              <h3 style={{ fontFamily: "'DM Serif Display', serif", fontSize: '24px', color: '#1A1A1A', marginBottom: '16px' }}>Sécurisé</h3>
              <div style={{ fontSize: '38px', fontWeight: 800, color: '#1A1A1A', marginBottom: '24px' }}>
                3% <span style={{ fontSize: '14px', fontWeight: 400, color: '#6B7280' }}>du loyer/mois</span>
              </div>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '14px', color: '#374151', marginBottom: '28px' }}>
                <li style={{ display: 'flex', gap: '10px' }}><span style={{ color: '#4ECBA0' }}>✓</span> Tout Essentiel inclus</li>
                <li style={{ display: 'flex', gap: '10px' }}><span style={{ color: '#4ECBA0' }}>✓</span> Dossier certifié ISALY</li>
                <li style={{ display: 'flex', gap: '10px' }}><span style={{ color: '#4ECBA0' }}>✓</span> Gestion bail complète</li>
                <li style={{ display: 'flex', gap: '10px' }}><span style={{ color: '#4ECBA0' }}>✓</span> Support prioritaire</li>
              </ul>
              <Link href="/onboarding">
                <button style={{
                  width: '100%', padding: '13px', borderRadius: '50px',
                  background: '#4ECBA0', color: '#fff', border: 'none',
                  fontSize: '14px', fontWeight: 700, cursor: 'pointer',
                }}>
                  Commencer avec Sécurisé
                </button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ── */}
      <section style={{
        background: 'linear-gradient(135deg, #E8F9F3 0%, #f0fdf8 100%)',
        padding: '100px 48px',
        textAlign: 'center',
      }}>
        <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: '48px', color: '#1A1A1A', marginBottom: '16px' }}>
          Ta prochaine coloc<br />commence <em style={{ color: '#4ECBA0' }}>ici.</em>
        </h2>
        <p style={{ fontSize: '17px', color: '#6B7280', marginBottom: '36px', lineHeight: 1.75 }}>
          Rejoins des milliers de personnes qui ont trouvé leur coloc idéale grâce à ISALY.
        </p>
        <Link href="/onboarding">
          <button style={{
            padding: '17px 44px', borderRadius: '50px',
            background: '#4ECBA0', color: '#fff',
            fontSize: '16px', fontWeight: 700, border: 'none', cursor: 'pointer',
            boxShadow: '0 10px 32px rgba(78,203,160,.4)',
            transition: 'all .2s',
          }}
            onMouseEnter={e => {
              e.currentTarget.style.background = '#2AA87C'
              e.currentTarget.style.transform = 'translateY(-2px)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = '#4ECBA0'
              e.currentTarget.style.transform = 'translateY(0)'
            }}
          >
            Créer mon profil gratuitement →
          </button>
        </Link>
        <p style={{ fontSize: '13px', color: '#9CA3AF', marginTop: '16px' }}>
          Aucune carte bancaire requise · Profil créé en 3 minutes
        </p>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{
        borderTop: '1px solid #F0F0F0', padding: '32px 48px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px',
      }}>
        <Image src="/LOGO_ISALY.png" alt="ISALY" height={28} width={100} style={{ width: 'auto', height: '28px', objectFit: 'contain', opacity: 0.7 }} />
        <div style={{ fontSize: '13px', color: '#9CA3AF' }}>© 2025 ISALY · Tous droits réservés</div>
        <div style={{ display: 'flex', gap: '20px' }}>
          {['Mentions légales', 'Confidentialité', 'Contact'].map(l => (
            <span key={l} style={{ fontSize: '13px', color: '#9CA3AF', cursor: 'pointer' }}>{l}</span>
          ))}
        </div>
      </footer>

    </main>
  )
}

/* ── Composants internes ── */

function NavBtn({ children, ghost }: { children: React.ReactNode; ghost?: boolean }) {
  return (
    <button style={{
      padding: '10px 22px', borderRadius: '50px',
      background: ghost ? 'transparent' : '#4ECBA0',
      color: ghost ? '#1A1A1A' : '#fff',
      border: ghost ? '1.5px solid #E5E7EB' : 'none',
      fontSize: '14px', fontWeight: 600, cursor: 'pointer',
      transition: 'all .2s',
    }}>
      {children}
    </button>
  )
}

function Kicker({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: '11px', fontWeight: 800, textTransform: 'uppercase',
      letterSpacing: '2.5px', color: '#2AA87C', marginBottom: '14px',
    }}>
      {children}
    </div>
  )
}

function ProfileCard({ emoji, name, age, city, rent, match, tags, color, style }: {
  emoji: string; name: string; age: number; city: string;
  rent: number; match: number; tags: string[]; color: string;
  style?: React.CSSProperties
}) {
  return (
    <div style={{
      background: '#fff', borderRadius: '18px', overflow: 'hidden',
      boxShadow: '0 8px 32px rgba(0,0,0,.10)',
      border: '1px solid #F0F0F0',
      transition: 'transform .3s',
      ...style,
    }}>
      <div style={{
        height: '130px', display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '54px', background: `linear-gradient(135deg, ${color}22, ${color}11)`,
      }}>{emoji}</div>
      <div style={{ padding: '16px 18px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '15px' }}>{name}, {age}</div>
            <div style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '2px' }}>{city} · {rent}€/mois</div>
          </div>
          <div style={{
            background: '#E8F9F3', color: '#2AA87C', fontSize: '11px',
            fontWeight: 800, padding: '4px 10px', borderRadius: '50px',
          }}>💚 {match}%</div>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
          {tags.map(t => (
            <span key={t} style={{
              background: '#F5F5F5', color: '#6B7280',
              fontSize: '11px', padding: '3px 9px', borderRadius: '50px', fontWeight: 500,
            }}>{t}</span>
          ))}
        </div>
      </div>
    </div>
  )
}

function FeatureCard({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div
      style={{
        background: '#fff', borderRadius: '16px', padding: '28px',
        border: '1px solid #EBEBEB',
        boxShadow: '0 2px 12px rgba(0,0,0,.04)',
        transition: 'all .25s',
        cursor: 'default',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-4px)'
        e.currentTarget.style.boxShadow = '0 12px 32px rgba(0,0,0,.10)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,.04)'
      }}
    >
      <div style={{
        width: '48px', height: '48px', borderRadius: '13px',
        background: '#E8F9F3', display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontSize: '22px', marginBottom: '16px',
      }}>{icon}</div>
      <h3 style={{ fontFamily: "'DM Serif Display', serif", fontSize: '18px', marginBottom: '8px', color: '#1A1A1A' }}>
        {title}
      </h3>
      <p style={{ fontSize: '13.5px', color: '#6B7280', lineHeight: 1.75 }}>{desc}</p>
    </div>
  )
}
