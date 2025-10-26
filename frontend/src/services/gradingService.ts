import { apiClient } from '../lib/api';
import { API_BASE_URL } from '../lib/config';
import { TestResult, AutoGradeResponse } from '../types/grading';

class GradingService {
  async gradeSession(sessionId: string): Promise<TestResult> {
    return apiClient.post<TestResult>(`/grade/session/${sessionId}`);
  }

  async gradeQuestion(questionId: string): Promise<AutoGradeResponse> {
    return apiClient.post<AutoGradeResponse>(`/grade/question/${questionId}`);
  }

  async gradeFreeResponse(
    questionId: string,
    onProgress?: (data: any) => void
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const url = `${API_BASE_URL}/grade/free-response/${questionId}`;
      
      fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
        },
        mode: 'cors',
      })
        .then(response => {
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const reader = response.body?.getReader();
          const decoder = new TextDecoder();

          if (!reader) {
            reject(new Error('No reader available'));
            return;
          }

          const readStream = async () => {
            try {
              while (true) {
                const { done, value } = await reader.read();
                
                if (done) {
                  break;
                }

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n');

                for (const line of lines) {
                  if (line.startsWith('data: ')) {
                    try {
                      const data = JSON.parse(line.slice(6));
                      
                      if (onProgress) {
                        onProgress(data);
                      }

                      if (data.status === 'final') {
                        resolve();
                      }
                    } catch (e) {
                      // Skip invalid JSON
                    }
                  }
                }
              }
              resolve();
            } catch (error) {
              reject(error);
            }
          };

          readStream();
        })
        .catch(error => {
          reject(error);
        });
    });
  }
}

export const gradingService = new GradingService();
