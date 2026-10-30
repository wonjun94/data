export type Category = 'sight' | 'food' | 'cafe' | 'activity'
export type Budget = 'low' | 'mid' | 'high'

export interface Trip {
  id: string
  owner_id: string
  destination: string
  country: string | null
  lat: number
  lon: number
  days: number
  budget: Budget
  style_tags: string[]
  invite_code: string
  created_at: string
}

export interface Member {
  trip_id: string
  user_id: string
  nickname: string
  role: 'owner' | 'member'
  status: 'pending' | 'approved' | 'rejected'
  joined_at: string
}

export interface Opinion {
  id: string
  place_id: string
  user_id: string
  vote: 'up' | 'down' | null
  comment: string | null
  created_at: string
}

export interface Place {
  id: string
  trip_id: string
  name: string
  name_local: string | null
  category: Category
  area: string | null
  reason: string | null
  source: 'ai' | 'user'
  added_by: string | null
  link: string | null
  lat: number | null
  lon: number | null
  geo_verified: boolean | null
  status: 'candidate' | 'confirmed' | 'excluded'
  created_at: string
}

export type PlaceWithOpinions = Place & { opinions: Opinion[] }

export interface Destination {
  id: string
  name: string
  country: string
  lat: number
  lon: number
  themes: string[]
  desc: string
  tip: string
}

export interface GeoHit {
  name: string
  display: string
  lat: number
  lon: number
  country: string
  area: string
}
