export interface TestResult {
  percentage: number;
  total_points: number;
  points_earned: number;
  summary: string;
  improvements: string[];
}

export interface AutoGradeResponse {
  is_correct: boolean;
  points_earned: number;
  max_points: number;
  explanation: string;
  correct_answer: string;
}

export interface GradeRequest {
  question: any; // AgentGeneratedQuestion
  student_answer: string | boolean | number | [number, number][] | string[];
}

export interface GradeResponse {
  status: string;
  step: string;
  message: string;
  data?: any;
  error?: string;
}
