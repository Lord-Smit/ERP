import apiClient from './client';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatResponse {
  reply: string;
}

const aiApi = {
  chat: (messages: ChatMessage[], message: string): Promise<ChatResponse> =>
    apiClient.post<ChatResponse>('/ai/chat/', { messages, message }).then((r) => r.data),
};

export default aiApi;
