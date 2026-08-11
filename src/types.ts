export type Role = 'owner' | 'admin' | 'manager' | 'staff' | 'vet' | 'finance' | 'viewer'

export interface Organization {
  id: string
  name: string
  slug: string
  city?: string | null
  state?: string | null
  logo_path?: string | null
}

export interface Membership {
  role: Role
  organization: Organization
}

export interface Horse {
  id: string
  organization_id: string
  name: string
  registration_number: string | null
  sex: 'male' | 'female' | 'gelding'
  breed: string
  birth_date: string | null
  coat: string | null
  sire_name: string | null
  dam_name: string | null
  microchip?: string | null
  owner_name?: string | null
  location_note?: string | null
  notes?: string | null
  status: 'active' | 'sold' | 'deceased' | 'transferred'
  created_at: string
}

export type HorseInput = Omit<Horse, 'id' | 'organization_id' | 'created_at'>
