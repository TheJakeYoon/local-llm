// Import config.json - Vite handles JSON imports automatically
import configData from '../config.json';

interface ServerConfig {
  host: string;
  port: number;
}

interface AppConfig {
  server: ServerConfig;
}

// Type assertion with runtime validation
const config: AppConfig = configData as AppConfig;

// Validate config structure
if (!config.server || !config.server.host || !config.server.port) {
  console.error('Invalid config.json structure. Using defaults.');
  config.server = {
    host: 'localhost',
    port: 3000
  };
}

export function getApiBaseUrl(): string {
  const { host, port } = config.server;
  return `http://${host}:${port}`;
}

export function getApiUrl(endpoint: string): string {
  const baseUrl = getApiBaseUrl();
  // Remove leading slash if present to avoid double slashes
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  return `${baseUrl}/${cleanEndpoint}`;
}

export default config;

