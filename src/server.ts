import express, { Request, Response, NextFunction } from 'express';
import ollama from 'ollama';
import fs from 'fs';
import path from 'path';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Logger utility
interface LogEntry {
  timestamp: string;
  level: 'INFO' | 'ERROR' | 'WARN';
  message: string;
  details?: any;
  endpoint?: string;
  method?: string;
  statusCode?: number;
}

const logDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const logFile = path.join(logDir, `server-${new Date().toISOString().split('T')[0]}.log`);

function writeLog(entry: LogEntry) {
  const logLine = JSON.stringify(entry) + '\n';
  fs.appendFileSync(logFile, logLine, 'utf8');
  console.log(`[${entry.level}] ${entry.timestamp} - ${entry.message}`);
  if (entry.details) {
    console.log('Details:', entry.details);
  }
}

function logError(message: string, error: unknown, req?: Request, statusCode?: number) {
  const errorDetails = {
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    name: error instanceof Error ? error.name : undefined,
  };

  writeLog({
    timestamp: new Date().toISOString(),
    level: 'ERROR',
    message,
    details: errorDetails,
    endpoint: req?.path,
    method: req?.method,
    statusCode,
  });
}

function logInfo(message: string, details?: any) {
  writeLog({
    timestamp: new Date().toISOString(),
    level: 'INFO',
    message,
    details,
  });
}

function logWarn(message: string, details?: any) {
  writeLog({
    timestamp: new Date().toISOString(),
    level: 'WARN',
    message,
    details,
  });
}

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

// CORS middleware - must be before all routes
app.use((req: Request, res: Response, next: NextFunction) => {
  // Set CORS headers for all responses
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
  
  // Handle preflight requests - respond immediately
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  next();
});

// Middleware
app.use(express.json());

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  
  // Log request
  logInfo(`Request: ${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('user-agent'),
    contentType: req.get('content-type'),
  });

  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const logLevel = res.statusCode >= 400 ? 'ERROR' : 'INFO';
    writeLog({
      timestamp: new Date().toISOString(),
      level: logLevel,
      message: `Response: ${req.method} ${req.path}`,
      details: {
        statusCode: res.statusCode,
        duration: `${duration}ms`,
      },
      endpoint: req.path,
      method: req.method,
      statusCode: res.statusCode,
    });
  });

  next();
});

// Health check endpoint
app.get('/health', (_req: Request, res: Response<HealthResponse>) => {
  res.json({ 
    status: 'ok', 
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// Handle OPTIONS for API routes explicitly
app.options('/api/chat', (_req: Request, res: Response) => {
  res.status(200).end();
});

app.options('/api/models', (_req: Request, res: Response) => {
  res.status(200).end();
});

// Main chat endpoint
app.post('/api/chat', async (req: Request<{}, ChatResponse, ChatRequestBody>, res: Response<ChatResponse>) => {
  try {
    const { message, model = 'llama3.1', messages } = req.body;

    // Validate request - support both single message and messages array
    if (!message && !messages) {
      logWarn('Validation error: Missing message or messages field', {
        body: req.body,
        endpoint: '/api/chat',
      });
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

    // Call Ollama API using official SDK
    // Note: Streaming is not supported in this simple API - always use non-streaming
    logInfo('Calling Ollama API', {
      model,
      messageCount: chatMessages.length,
      endpoint: '/api/chat',
    });

    const startTime = Date.now();
    const response = await ollama.chat({
      model: model,
      messages: chatMessages,
      stream: false
    });
    const duration = Date.now() - startTime;

    logInfo('Ollama API call successful', {
      model,
      duration: `${duration}ms`,
      evalCount: response.eval_count,
      promptEvalCount: response.prompt_eval_count,
    });

    // Return response in JSON format
    return res.json({
      success: true,
      model: model,
      response: response.message?.content || response.message?.toString(),
      done: response.done,
      created_at: response.created_at ? new Date(response.created_at).toISOString() : undefined,
      total_duration: response.total_duration,
      load_duration: response.load_duration,
      prompt_eval_count: response.prompt_eval_count,
      prompt_eval_duration: response.prompt_eval_duration,
      eval_count: response.eval_count,
      eval_duration: response.eval_duration
    });

  } catch (error) {
    // Handle errors from Ollama SDK
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    if (errorMessage.includes('connect') || errorMessage.includes('ECONNREFUSED') || errorMessage.includes('fetch failed')) {
      // Connection error
      logError('Ollama connection error', error, req, 503);
      return res.status(503).json({
        success: false,
        error: 'Ollama service unavailable',
        message: `Could not connect to Ollama. Make sure Ollama is running and accessible.`,
      });
    } else if (errorMessage.includes('model')) {
      // Model not found error
      logError('Model not found', error, req, 404);
      return res.status(404).json({
        success: false,
        error: 'Model not found',
        message: errorMessage
      });
    } else {
      // Other errors
      logError('Error calling Ollama API', error, req, 500);
      return res.status(500).json({
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
    logInfo('Fetching available models', { endpoint: '/api/models' });
    const response = await ollama.list();
    const modelCount = response.models?.length || 0;
    logInfo('Models fetched successfully', { count: modelCount });
    
    return res.json({
      success: true,
      models: (response.models || []).map(model => ({
        name: model.name,
        modified_at: model.modified_at ? new Date(model.modified_at).toISOString() : undefined,
        size: model.size,
        digest: model.digest
      }))
    });
  } catch (error) {
    logError('Error fetching models', error, req, 500);
    return res.status(500).json({
      success: false,
      error: 'Error fetching models',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

// 404 handler
app.use((req: Request, res: Response) => {
  logWarn('Route not found', {
    method: req.method,
    path: req.path,
    endpoint: req.path,
  });
  res.status(404).json({
    success: false,
    error: 'Not found',
    message: `Route ${req.method} ${req.path} not found`
  });
});

// Error handler
app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  logError('Unhandled error in Express middleware', err, req, 500);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: err.message
  });
});

// Check Ollama connectivity on startup
async function checkOllamaConnection() {
  try {
    await ollama.list();
    logInfo('Ollama connection verified');
    console.log(`✅ Ollama is accessible`);
  } catch (error) {
    logWarn('Ollama not accessible on startup', {
      error: error instanceof Error ? error.message : String(error),
    });
    console.log(`⚠️  Warning: Cannot connect to Ollama`);
    console.log(`   Make sure Ollama is running: ollama serve`);
  }
}

// Start server - listen on all interfaces (0.0.0.0) to accept external connections
const HOST = process.env.HOST || '0.0.0.0';
app.listen(PORT, HOST, async () => {
  logInfo('Server started', {
    host: HOST,
    port: PORT,
    logFile: logFile,
  });
  console.log(`🚀 Server is running on http://${HOST}:${PORT}`);
  console.log(`🌐 Accessible from network at http://localhost:${PORT} or http://[your-ip]:${PORT}`);
  console.log(`💚 Health check: http://localhost:${PORT}/health`);
  console.log(`💬 Chat endpoint: POST http://localhost:${PORT}/api/chat`);
  console.log(`📋 Models endpoint: GET http://localhost:${PORT}/api/models`);
  console.log(`📝 Logs are being written to: ${logFile}`);
  
  // Check Ollama connection
  await checkOllamaConnection();
});

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  logError('Uncaught Exception', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: unknown) => {
  const error = reason instanceof Error ? reason : new Error(String(reason));
  logError('Unhandled Promise Rejection', error);
});

