-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 41 : date de disponibilité d'une annonce
--
-- Usage : date à partir de laquelle le logement est libre. Elle est affichée
-- sur la carte de swipe de la page « Trouver » (bloc « Autres infos ») et sur
-- la fiche annonce publique /annonce/[id].
--
-- NULLABLE, et c'est volontaire : beaucoup d'annonces sont publiées sans date
-- ferme (« dès que le locataire actuel part »). Une annonce sans date reste
-- parfaitement valide et se publie sans blocage — l'information est alors
-- simplement absente de l'affichage, jamais remplacée par un tiret ni par une
-- date par défaut qui serait un engagement inventé à la place du loueur.
--
-- Type DATE et non TIMESTAMPTZ : un emménagement se décide au jour près, une
-- heure n'aurait aucun sens et ferait basculer la date d'un jour selon le
-- fuseau de qui la lit.
--
-- Le formatage « Disponible maintenant » (date passée ou du jour) contre
-- « Disponible à partir du … » (date future) est fait côté application, dans
-- formatAvailability() (lib/utils.ts) : la base stocke le fait, pas sa
-- formulation, et une date d'hier redevient donc « maintenant » toute seule
-- sans qu'aucune écriture ne soit nécessaire.
--
-- À exécuter dans Supabase Dashboard > SQL Editor.
-- Idempotent : ré-exécutable sans effet de bord. Aucune suppression de donnée.
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE listings ADD COLUMN IF NOT EXISTS available_from DATE;

COMMENT ON COLUMN listings.available_from IS
  'Date a partir de laquelle le logement est disponible. NULL = non renseignee par le loueur (annonce valide malgre tout). Affichee sur la carte de swipe et sur la fiche annonce publique.';

-- Index partiel : les futurs filtres « disponible avant le … » ne trieront que
-- les annonces qui portent une date, jamais les NULL.
CREATE INDEX IF NOT EXISTS idx_listings_available_from
  ON listings(available_from) WHERE available_from IS NOT NULL;
