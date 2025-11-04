import { useState, useRef, useEffect } from 'react';
import './App.css';
import { getApiUrl, getApiBaseUrl } from './config';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
}

interface ChatResponse {
  success: boolean;
  model?: string;
  response?: string;
  error?: string;
  message?: string;
}

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [model, setModel] = useState('llama3.1');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    setError(null);

    try {
      const apiUrl = getApiUrl('/api/chat');
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage.content,
          model: model,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || errorData.error || `Server error: ${response.status} ${response.statusText}`
        );
      }

      const data: ChatResponse = await response.json();

      if (data.success && data.response) {
        const assistantMessage: Message = {
          role: 'assistant',
          content: data.response,
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } else {
        setError(data.error || data.message || 'Failed to get response');
      }
    } catch (err) {
      let errorMessage = 'Network error occurred';
      
      if (err instanceof TypeError) {
        if (err.message.includes('Failed to fetch') || err.message.includes('Load failed')) {
          errorMessage = `Cannot connect to API server at ${getApiBaseUrl()}. 
          
Possible issues:
- Server is not running
- CORS is blocking the request
- Network connectivity issue
- Firewall blocking the connection

Please check:
1. The Express server is running on ${getApiBaseUrl()}
2. CORS is enabled on the server
3. Your network allows connections to this IP`;
        } else {
          errorMessage = `Network error: ${err.message}`;
        }
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      console.error('API Error:', err);
      console.error('Error details:', {
        message: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
        apiUrl: getApiUrl('/api/chat'),
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setMessages([]);
    setError(null);
  };

  return (
    <div className="app">
      <div className="chat-container">
        <div className="chat-header">
          <div>
            <h1>Local LLM Chat</h1>
            <div className="server-info">Server: {getApiBaseUrl()}</div>
          </div>
          <div className="header-controls">
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="model-select"
              disabled={loading}
            >
              <option value="llama3.1">Llama 3.1</option>
              <option value="llama2">Llama 2</option>
              <option value="mistral">Mistral</option>
              <option value="codellama">CodeLlama</option>
            </select>
            <button onClick={clearChat} className="clear-btn" disabled={loading}>
              Clear
            </button>
          </div>
        </div>

        <div className="messages-container">
          {messages.length === 0 && (
            <div className="welcome-message">
              <p>👋 Welcome to Local LLM Chat!</p>
              <p>Start a conversation by typing a message below.</p>
            </div>
          )}

          {messages.map((message, index) => (
            <div
              key={index}
              className={`message ${message.role === 'user' ? 'user-message' : 'assistant-message'}`}
            >
              <div className="message-content">
                <div className="message-role">
                  {message.role === 'user' ? '👤 You' : '🤖 Assistant'}
                </div>
                <div className="message-text">{message.content}</div>
              </div>
            </div>
          ))}

          {loading && (
            <div className="message assistant-message">
              <div className="message-content">
                <div className="message-role">🤖 Assistant</div>
                <div className="message-text loading">
                  <span className="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </span>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="error-message">
              <span>⚠️</span> {error}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <div className="input-container">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message here... (Press Enter to send)"
            className="message-input"
            rows={3}
            disabled={loading}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || loading}
            className="send-button"
          >
            {loading ? 'Sending...' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;

