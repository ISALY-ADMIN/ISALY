export type UserRole = 'locataire' | 'loueur'
export type CertificationStatus = 'pending' | 'verified' | 'rejected'
export type DocumentType = 'identity_front' | 'identity_back' | 'selfie' | 'payslip' | 'domicile' | 'guarantor'

export interface UserCertification {
  id: string
  user_id: string
  level: 1 | 2 | 3
  status: CertificationStatus
  verified_at: string | null
  created_at: string
}

export interface UserDocument {
  id: string
  user_id: string
  type: DocumentType
  file_url: string | null
  status: CertificationStatus
  uploaded_at: string
}

export interface UserReview {
  id: string
  reviewer_id: string
  reviewed_id: string
  rating: 1 | 2 | 3 | 4 | 5
  comment: string | null
  created_at: string
}

export interface UserStats {
  id: string
  user_id: string
  response_rate: number
  avg_response_time: number
  reliability_score: number
  member_since: string
}

export interface DossierShare {
  id: string
  user_id: string
  token: string
  expires_at: string
  view_count: number
  created_at: string
}
export type Schedule = 'leve-tot' | 'couche-tard' | 'variable' | 'flexible'
export type Vibe = 'calme' | 'festif' | 'studieux' | 'detendu'
export type BoostType = 'standard' | 'featured' | 'priority'
export type LeaseStatus = 'active' | 'ended' | 'pending'
export type PaymentStatus = 'pending' | 'succeeded' | 'failed'
export type PlanType = 'assurance' | 'featured' | 'priority'
export type SwipeDirection = 'left' | 'right' | 'super'

export interface Profile {
  id: string
  email: string | null
  first_name: string | null
  last_name: string | null
  avatar_url: string | null
  role: UserRole | null
  city: string | null
  budget_max: number | null
  schedule: Schedule | null
  vibe: Vibe | null
  passions: string[] | null
  bio: string | null
  phone: string | null
  profile_complete: number
  is_visible: boolean
  onboarding_completed?: boolean
  is_admin?: boolean
  suspended?: boolean
  created_at: string
  /** Extended matching vector stored as JSONB. Populated from the full questionnaire. */
  matching_data?: import('@/lib/matching').MatchingData | null
}

export interface Listing {
  id: string
  owner_id: string | null
  title: string | null
  description: string | null
  city: string | null
  neighborhood: string | null
  rent: number | null
  charges: number | null
  surface: number | null
  rooms_available: number | null
  /** Personnes actuellement dans l'appart. */
  occupants_current: number
  /** Capacité totale de la colocation (null = déduite de rooms_available). */
  capacity_total: number | null
  /** Critères de vie (null = non renseigné par le loueur). */
  meuble: boolean | null
  animaux_ok: boolean | null
  non_fumeur: boolean | null
  latitude: number | null
  longitude: number | null
  photos: string[] | null
  boost_type: BoostType
  is_active: boolean
  created_at: string
}

export interface Swipe {
  id: string
  swiper_id: string | null
  swiped_id: string | null
  direction: SwipeDirection
  created_at: string
}

export interface Match {
  id: string
  user1_id: string | null
  user2_id: string | null
  created_at: string
}

export interface Conversation {
  id: string
  match_id: string | null
  created_at: string
}

export interface Message {
  id: string
  conversation_id: string | null
  sender_id: string | null
  content: string | null
  read: boolean
  created_at: string
}

export interface Dossier {
  id: string
  user_id: string | null
  identity_doc_url: string | null
  identity_verified: boolean
  income_monthly: number | null
  contract_type: string | null
  payslips_urls: string[] | null
  rent_receipts_urls: string[] | null
  insurance_url: string | null
  guarantor_name: string | null
  guarantor_doc_url: string | null
  completion_percent: number
  updated_at: string
}

export interface Lease {
  id: string
  tenant_id: string | null
  owner_id: string | null
  address: string | null
  city: string | null
  monthly_rent: number | null
  start_date: string | null
  end_date: string | null
  nb_roommates: number
  lease_doc_url: string | null
  status: LeaseStatus
  created_at: string
}

export interface Payment {
  id: string
  user_id: string | null
  stripe_payment_intent_id: string | null
  amount: number | null
  plan_type: PlanType | null
  status: PaymentStatus | null
  created_at: string
}

// Generic Supabase-compatible Database type
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: Partial<Profile> & { id: string }
        Update: Partial<Profile>
      }
      listings: {
        Row: Listing
        Insert: Partial<Listing>
        Update: Partial<Listing>
      }
      swipes: {
        Row: Swipe
        Insert: Partial<Swipe>
        Update: Partial<Swipe>
      }
      matches: {
        Row: Match
        Insert: Partial<Match>
        Update: Partial<Match>
      }
      conversations: {
        Row: Conversation
        Insert: Partial<Conversation>
        Update: Partial<Conversation>
      }
      messages: {
        Row: Message
        Insert: Partial<Message>
        Update: Partial<Message>
      }
      dossiers: {
        Row: Dossier
        Insert: Partial<Dossier>
        Update: Partial<Dossier>
      }
      leases: {
        Row: Lease
        Insert: Partial<Lease>
        Update: Partial<Lease>
      }
      payments: {
        Row: Payment
        Insert: Partial<Payment>
        Update: Partial<Payment>
      }
    }
  }
}
