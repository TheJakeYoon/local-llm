import configData from '../config.json';

interface ServerConfig {
  host: string;
  port: number;
}

interface AppConfig {
  server: ServerConfig;
}

const config: AppConfig = configData as AppConfig;

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

