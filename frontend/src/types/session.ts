import { Subject } from './question';

export type SessionStatus = 'in_progress' | 'completed';
export type SessionMode = 'practice' | 'test';

export interface SearchRequest {
  subject: string;
  topics: string[];
  num_questions_range: [number, number];
  mode: SessionMode;
  special_instructions?: string;
  user_id?: string;
}

export interface Session {
  id: string;
  subject: Subject;
  topics: string[];
  questions: string[]; // question ids
  num_questions: number;
  num_questions_answered: number;
  status: SessionStatus;
  created_at: Date;
  mode: SessionMode;
  score?: number;
}

export interface SessionData extends Omit<Session, 'created_at'> {
  created_at: string;
}
