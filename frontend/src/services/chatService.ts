import { API_BASE_URL, CHAT_ENDPOINT } from '../lib/config';

class ChatService {
  async sendMessage(
    practiceSessionId: string,
    message: string,
    userId?: string,
    onStatusUpdate?: (status: string) => void
  ): Promise<string> {
    const url = `${API_BASE_URL}${CHAT_ENDPOINT.path}`;
    
    const payload = {
      user_question: message,
    //   session_id: practiceSessionId,
      user_id: userId || '',
    };
    
    console.log('Sending chat message to:', url);
    console.log('Payload:', payload);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
      },
      body: JSON.stringify(payload),
      mode: 'cors',
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      console.error('Chat API error:', errorText);
      throw new Error(errorText || `HTTP error! status: ${response.status}`);
    }

    // Try streaming (SSE or chunked JSON). Fallback to plain JSON/text.
    const reader = response.body?.getReader();
    const decoder = new TextDecoder('utf-8'); // Explicitly use UTF-8
    let finalText = '';

    if (reader) {
      console.log('📡 Streaming response detected, reading chunks...');
      let chunkCount = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          console.log('✅ Stream complete');
          console.log('✅ Total chunks received:', chunkCount);
          console.log('✅ Final accumulated text:', finalText);
          break;
        }

        chunkCount++;
        const chunk = decoder.decode(value);
        console.log(`📦 Chunk #${chunkCount}:`, chunk);

        // Handle typical SSE lines: `data: { ... }` possibly multiple per chunk
        const lines = chunk.split('\n');
        for (const rawLine of lines) {
          const line = rawLine.trim();
          if (!line) continue;

          let payloadStr = line;
          if (line.startsWith('data:')) {
            payloadStr = line.slice(5).trim();
          }

          try {
            const json = JSON.parse(payloadStr);
            console.log('📄 Parsed JSON:', json);
            
            // Check for tool results and show them as status updates
            if (json.status === 'tool_result') {
              const toolName = json.tool_id || 'tool';
              const toolResult = json.result || '';
              
              // Create a professional status message based on the tool
              let statusText = '';
              if (toolName.includes('wolfram') || toolResult.includes('wolframalpha')) {
                statusText = 'Computing solution with WolframAlpha...';
              } else if (toolName.includes('search') || toolResult.includes('search')) {
                statusText = 'Searching knowledge base...';
              } else if (toolName.includes('elastic') || toolResult.includes('elasticsearch')) {
                statusText = 'Querying Elasticsearch database...';
              } else {
                statusText = `Processing with ${toolName}...`;
              }
              
              console.log('🔧 Tool result:', statusText);
              if (onStatusUpdate) {
                onStatusUpdate(statusText);
              }
            }
            
            // Check for error status
            if (json.status === 'error') {
              console.error('❌ Backend error:', json.message);
              console.error('❌ Error details:', json.error);
              const errorMsg = json.error ? `${json.message}: ${json.error}` : json.message;
              throw new Error(errorMsg || 'Backend error occurred');
            }
            
            // Common field names to carry partial or final content
            // Check 'data' field first as it contains the actual response
            const token = 
              json.data ??        // <- ACTUAL RESPONSE CONTENT
              json.token ?? 
              json.delta ?? 
              json.chunk ?? 
              json.content ?? 
              json.text ??
              json.response ??
              '';
              
            // Check if this is a status message (has step/message but no data)
            const isStatusMessage = json.step && json.message && !json.data;
            
            // Also check if the message field itself is a status update
            const messageIsStatus = json.message && !json.data && 
              (json.message.includes('Starting') || 
               json.message.includes('Processing') || 
               json.message.includes('agent:') ||
               json.message.includes('Connecting') ||
               json.message.includes('Searching') ||
               json.message.includes('Accessing') ||
               json.message.includes('Querying') ||
               json.message.includes('WolframAlpha') ||
               json.message.includes('tool_result') ||
               json.message.includes('calling'));
            
            if (isStatusMessage || messageIsStatus) {
              const statusText = json.message || token;
              console.log('⏭️ Status update:', statusText);
              // Send status updates to the UI
              if (onStatusUpdate && typeof statusText === 'string') {
                onStatusUpdate(statusText);
              }
            } else if (typeof token === 'string' && token.length > 0) {
              console.log('✍️ Content token:', token);
              // Only add if it's not already in the final text to prevent duplication
              if (!finalText.includes(token)) {
                finalText += token;
              } else {
                console.log('⚠️ Skipping duplicate token:', token);
              }
            }
            
            // Check if this is the final message or completion status
            if (json.status === 'final' || 
                json.status === 'complete' || 
                json.status === 'completed' ||
                json.final === true || 
                json.done === true ||
                (typeof json.message === 'string' && json.message.includes('completed'))) {
              console.log('🏁 Final/completion status received');
              console.log('🏁 Accumulated text so far:', finalText);
              
              // If there's a final message field, use that instead of accumulated text
              const finalMessage = json.data ?? json.message ?? json.response ?? json.answer ?? finalText;
              
              if (typeof finalMessage === 'string' && finalMessage.length > 0 && finalMessage !== finalText) {
                console.log('🏁 Using final message:', finalMessage);
                return finalMessage;
              }
              
              // Don't return yet if we haven't accumulated any text - keep reading
              if (finalText.length === 0) {
                console.log('⚠️ No text accumulated yet, continuing to read...');
                continue;
              }
              return finalText;
            }
          } catch (_) {
            // Not JSON – treat as plain text token
            console.log('📝 Plain text chunk:', payloadStr);
            finalText += payloadStr;
          }
        }
      }

      console.log('💬 Final assembled text:', finalText);
      return finalText;
    }

    // No stream: try JSON first
    console.log('📄 Non-streaming response, reading as text...');
    const rawText = await response.text();
    console.log('📥 Raw response text:', rawText);
    
    try {
      const json = JSON.parse(rawText);
      console.log('📄 Parsed JSON response:', json);
      
      // Try multiple possible field names for the response content
      // Check 'data' field first as it contains the actual response
      const content =
        json.data ??              // <- ACTUAL RESPONSE CONTENT
        json.answer ?? 
        json.response ?? 
        json.content ?? 
        json.assistant_response ??
        json.reply ??
        json.text ??
        json.output ??
        json.message ??           // <- Status messages, check last
        '';
      
      console.log('💬 Extracted content:', content);
      console.log('💬 Content type:', typeof content);
      console.log('💬 Content length:', content.length);
      
      if (typeof content === 'string' && content.length > 0) {
        return content;
      }
      
      // If no content found in known fields, return the whole JSON as string
      console.log('⚠️ No content in known fields, returning full JSON');
      return JSON.stringify(json, null, 2);
    } catch (_) {
      console.log('⚠️ Not JSON, returning raw text');
      return rawText;
    }
  }
}

export const chatService = new ChatService();


