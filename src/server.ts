import express, { Request, Response, NextFunction } from 'express';
import ollama from 'ollama';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Request body types
interface ChatRequestBody {
  message?: string;
  messages?: Array<{ role: string; content: string }>;
  model?: string;
  stream?: boolean;
  system?: string;
}

interface ChatResponse {
  success: boolean;
  model?: string;
  response?: string;
  done?: boolean;
  created_at?: string;
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
  error?: string;
  message?: string;
  host?: string;
}

interface HealthResponse {
  status: string;
  message: string;
  timestamp: string;
}

interface ModelsResponse {
  success: boolean;
  models?: Array<{
    name: string;
    modified_at?: string;
    size?: number;
    digest?: string;
  }>;
  error?: string;
  message?: string;
}

// Middleware
app.use(express.json());

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (req: Request, res: Response<HealthResponse>) => {
  res.json({ 
    status: 'ok', 
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// Main chat endpoint
app.post('/api/chat', async (req: Request<{}, ChatResponse, ChatRequestBody>, res: Response<ChatResponse>) => {
  try {
    const { message, model = 'llama3.1', stream = false, messages } = req.body;

    // Validate request - support both single message and messages array
    if (!message && !messages) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: message or messages'
      });
    }

    // Prepare messages array
    let chatMessages: Array<{ role: string; content: string }> = [];
    if (messages && Array.isArray(messages)) {
      // Use provided messages array
      chatMessages = messages;
    } else if (message) {
      // Single message format
      chatMessages = [
        {
          role: 'user',
          content: message
        }
      ];
    }

    // Prepare request to Ollama
    const chatRequest: {
      model: string;
      messages: Array<{ role: string; content: string }>;
      stream: boolean;
      system?: string;
    } = {
      model: model,
      messages: chatMessages,
      stream: stream
    };

    // Call Ollama API using official SDK
    const response = await ollama.chat(chatRequest);

    // Return response in JSON format
    res.json({
      success: true,
      model: model,
      response: response.message?.content || response.message?.toString(),
      done: response.done,
      created_at: response.created_at,
      total_duration: response.total_duration,
      load_duration: response.load_duration,
      prompt_eval_count: response.prompt_eval_count,
      prompt_eval_duration: response.prompt_eval_duration,
      eval_count: response.eval_count,
      eval_duration: response.eval_duration
    });

  } catch (error) {
    console.error('Error calling Ollama:', error instanceof Error ? error.message : String(error));
    if (error instanceof Error) {
      console.error(error.stack);
    }
    
    // Handle errors from Ollama SDK
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    if (errorMessage.includes('connect') || errorMessage.includes('ECONNREFUSED')) {
      // Connection error
      res.status(503).json({
        success: false,
        error: 'Ollama service unavailable',
        message: 'Could not connect to Ollama. Make sure Ollama is running and accessible.',
      });
    } else if (errorMessage.includes('model')) {
      // Model not found error
      res.status(404).json({
        success: false,
        error: 'Model not found',
        message: errorMessage
      });
    } else {
      // Other errors
      res.status(500).json({
        success: false,
        error: 'Error calling Ollama',
        message: errorMessage || 'Unknown error occurred'
      });
    }
  }
});

// Get available models endpoint
app.get('/api/models', async (req: Request, res: Response<ModelsResponse>) => {
  try {
    const response = await ollama.list();
    res.json({
      success: true,
      models: response.models || []
    });
  } catch (error) {
    console.error('Error fetching models:', error instanceof Error ? error.message : String(error));
    res.status(500).json({
      success: false,
      error: 'Error fetching models',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Not found',
    message: `Route ${req.method} ${req.path} not found`
  });
});

// Error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: err.message
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
  console.log(`💚 Health check: http://localhost:${PORT}/health`);
  console.log(`💬 Chat endpoint: POST http://localhost:${PORT}/api/chat`);
  console.log(`📋 Models endpoint: GET http://localhost:${PORT}/api/models`);
});

