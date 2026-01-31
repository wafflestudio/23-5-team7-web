export interface SignupRequest {
  email: string;
  password?: string;
  nickname: string;
  social_type: 'LOCAL' | 'GOOGLE' | 'KAKAO';
  social_id?: string | null;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface User {
  id: number;
  email: string;
  nickname: string;
}
export interface SignupResponse extends User {}

// Login returns tokens + user
export interface LoginResponse {
  access_token: string;
  refresh_token?: string;
  user: User;
}

export type UUID = string;

export type EventStatus = 'READY' | 'OPEN' | 'CLOSED' | 'SETTLED' | 'CANCELLED';

export type Cursor = string;

// ===== Step 3: Events =====
export interface EventOptionSummary {
  option_id: string;
  name: string;
  // 2-4/2-5 API uses option_total_amount
  option_total_amount?: number;
  participant_count?: number;
  odds?: number;
  is_winner?: boolean | null;
  option_image_url?: string;
}

export interface EventImage {
  image_url: string;
  display_order?: number;
}

// List item
export interface EventSummary {
  event_id: UUID;
  title: string;
  description: string;
  status: EventStatus;
  total_participants?: number;
  end_at: string; // ISO datetime string
  options: EventOptionSummary[];
  images?: EventImage[];
}

// Detail
export interface EventDetail {
  event_id: UUID;
  title: string;
  description: string;
  status: EventStatus;
  total_participants_count?: number;
  options: EventOptionSummary[];
  images: EventImage[];
  end_at: string;
}

export interface CreateEventRequest {
  title: string;
  description?: string;
  start_at: string; // ISO datetime string
  end_at: string; // ISO datetime string
  options: Array<{ name: string; option_image_index: number }>;
  images?: Array<{ image_index: number }>;
}

export interface CreateEventResponse {
  event_id: UUID;
  creator_id?: UUID;
  title: string;
  description?: string;
  status: EventStatus;
  created_at?: string;
  start_at?: string;
  end_at?: string;
  options: Array<
    Pick<EventOptionSummary, 'option_id' | 'name' | 'participant_count' | 'option_total_amount' | 'is_winner'> & {
      order?: number;
    }
  >;
}

export interface UpdateEventStatusRequest {
  status: EventStatus;
}

// 2-3) POST /api/events/{event_id}/settle
export interface SettleEventRequest {
  winner_option_id: string[];
}

// ===== Step 3: Bets =====
export interface CreateBetRequest {
  option_id: string;
  bet_amount: number;
}

export interface CreateBetResponse {
  bet_id: UUID;
  user_id?: string;
  event_id: UUID;
  option_id: string;
  option_name?: string;
  bet_amount: number;
  created_at?: string;
  status?: 'PENDING' | 'CANCELLED' | 'SETTLED' | string;
}
