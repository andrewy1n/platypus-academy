import { apiClient } from '../lib/api';
import { Question, StudentAnswer } from '../types/question';

class QuestionService {
  async getQuestion(questionId: string): Promise<Question> {
    return apiClient.get<Question>(`/questions/${questionId}`);
  }

  async saveAnswer(questionId: string, answer: StudentAnswer): Promise<{ message: string }> {
    return apiClient.post(`/questions/${questionId}/save-answer`, answer);
  }
}

export const questionService = new QuestionService();
