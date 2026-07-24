import type { CandidatureStatus, EmploiSituation } from '@/types/database'

/**
 * Source de vérité partagée pour les libellés et options de candidature.
 * Utilisée par le formulaire locataire (CandidatureModal) ET le centre de
 * décision loueur (/app/mes-annonces/[id]/candidatures).
 */

// ─── Situation professionnelle ───────────────────────────────
export const EMPLOI_OPTIONS: { value: EmploiSituation; label: string; emoji: string }[] = [
  { value: 'salarie', label: 'Salarié·e', emoji: '💼' },
  { value: 'etudiant', label: 'Étudiant·e', emoji: '🎓' },
  { value: 'independant', label: 'Indépendant·e', emoji: '🧑‍💻' },
  { value: 'autre', label: 'Autre', emoji: '✨' },
]

export function emploiLabel(v: EmploiSituation | null | undefined): string | null {
  if (!v) return null
  return EMPLOI_OPTIONS.find(o => o.value === v)?.label ?? null
}

// ─── Durée de bail envisagée ─────────────────────────────────
export const LEASE_DURATION_OPTIONS: { value: string; label: string }[] = [
  { value: '3', label: '3 mois' },
  { value: '6', label: '6 mois' },
  { value: '9', label: '9 mois' },
  { value: '12', label: '1 an' },
  { value: '18', label: '18 mois' },
  { value: '24', label: '2 ans' },
  { value: '36', label: '3 ans et +' },
  { value: 'flexible', label: 'Flexible' },
]

export function leaseDurationLabel(v: string | null | undefined): string | null {
  if (!v) return null
  return LEASE_DURATION_OPTIONS.find(o => o.value === v)?.label ?? v
}

// ─── Statut de décision ──────────────────────────────────────
export interface StatusMeta {
  label: string
  color: string       // texte + accent
  bg: string          // fond du badge
  border: string
}

export const STATUS_META: Record<CandidatureStatus, StatusMeta> = {
  pending: {
    label: 'En attente',
    color: '#F59E0B', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.35)',
  },
  accepted: {
    label: 'Acceptée',
    color: '#10B981', bg: 'rgba(16,185,129,0.14)', border: 'rgba(16,185,129,0.38)',
  },
  rejected: {
    label: 'Refusée',
    color: '#F87171', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.35)',
  },
  waitlisted: {
    label: 'En réserve',
    color: '#818CF8', bg: 'rgba(129,140,248,0.14)', border: 'rgba(129,140,248,0.38)',
  },
  visit_proposed: {
    label: 'Visite proposée',
    color: '#34D399', bg: 'rgba(52,211,153,0.12)', border: 'rgba(52,211,153,0.35)',
  },
}

export function statusMeta(s: CandidatureStatus | null | undefined): StatusMeta {
  return STATUS_META[(s ?? 'pending') as CandidatureStatus] ?? STATUS_META.pending
}

/** Notification envoyée au locataire quand le loueur change son statut. */
export function statusNotification(s: CandidatureStatus): { title: string; body: string } {
  switch (s) {
    case 'accepted':
      return { title: 'Candidature acceptée 🎉', body: 'Le loueur a retenu votre candidature. Ouvrez la conversation pour la suite.' }
    case 'rejected':
      return { title: 'Candidature non retenue', body: "Le loueur n'a pas retenu votre candidature cette fois-ci." }
    case 'waitlisted':
      return { title: 'Candidature en réserve', body: 'Le loueur a placé votre candidature en réserve — il peut revenir vers vous.' }
    case 'visit_proposed':
      return { title: 'Visite proposée 🗓️', body: 'Le loueur vous propose une visite — choisissez un créneau.' }
    default:
      return { title: 'Mise à jour de votre candidature', body: 'Le statut de votre candidature a changé.' }
  }
}
