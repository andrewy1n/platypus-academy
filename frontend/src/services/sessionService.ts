import { apiClient } from '../lib/api';
import { SearchRequest } from '../types/session';
import { API_BASE_URL } from '../lib/config';

class SessionService {
  async createSession(
    searchRequest: SearchRequest,
    onProgress?: (data: any) => void
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const url = `${API_BASE_URL}/sessions/create`;
      
      fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
        },
        body: JSON.stringify(searchRequest),
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

                      if (data.status === 'final' && data.session_id) {
                        resolve(data.session_id);
                      }
                    } catch (e) {
                      // Skip invalid JSON
                    }
                  }
                }
              }
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

  async getSession(sessionId: string): Promise<any> {
    return apiClient.get(`/sessions/${sessionId}`);
  }

  async getSessionQuestions(sessionId: string): Promise<any> {
    return apiClient.get(`/sessions/${sessionId}/questions`);
  }
}

export const sessionService = new SessionService();
