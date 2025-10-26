export type Subject = 'math' | 'chemistry' | 'physics' | 'biology' | 'computer science';
export type Difficulty = 'easy' | 'medium' | 'hard';

export interface MCQ {
  type: 'mcq';
  choices: string[];
  answer: string;
}

export interface TF {
  type: 'tf';
  answer: boolean;
}

export interface Numeric {
  type: 'numeric';
  answer: number;
}

export interface FIB {
  type: 'fib';
  answer: string;
}

export interface ShortAnswer {
  type: 'short_answer';
  answer: string;
}

export interface Matching {
  type: 'matching';
  left: string[];
  right: string[];
  answer: [number, number][];
}

export interface Ordering {
  type: 'ordering';
  choices: string[];
  answer: string[];
}

export interface FR {
  type: 'fr';
  answer: string;
  points: number;
  rubric: string;
}

export type QuestionData = MCQ | TF | Numeric | FIB | ShortAnswer | Matching | Ordering | FR;

export interface AgentGeneratedQuestion {
  data: QuestionData;
  text: string;
  subject: Subject;
  topic: string;
  source_url?: string;
  difficulty: Difficulty;
  image_url?: string;
}

export interface Question {
  id: string;
  question: AgentGeneratedQuestion;
  student_answer?: any;
  is_completed: boolean;
  points: number;
  points_earned?: number;
}

export interface QuestionWithOptionalCompletion extends Omit<Question, 'is_completed'> {
  is_completed?: boolean;
}

export interface StudentAnswer {
  answer: string | boolean | number | [number, number][] | string[];
}
