# Troubleshooting Guide

## Connection Issues

### "Cannot connect to API server" Error

If you're getting connection errors from the React app, check the following:

#### 1. Verify Server is Running
```bash
# Check if server is running
lsof -ti:3000

# Test server connectivity
curl http://192.168.5.214:3000/health
```

#### 2. Verify Server is Listening on All Interfaces
The server should be listening on `0.0.0.0` (all interfaces), not just `localhost`.

Check the server startup logs. You should see:
```
🚀 Server is running on http://0.0.0.0:3000
```

If it says `localhost` only, restart the server:
```bash
npm run dev
```

#### 3. Check CORS Configuration
The server should respond to OPTIONS requests with CORS headers:

```bash
curl -X OPTIONS http://192.168.5.214:3000/api/chat \
  -H "Origin: http://localhost:5173" \
  -H "Access-Control-Request-Method: POST" \
  -v
```

You should see:
```
< HTTP/1.1 200 OK
< Access-Control-Allow-Origin: *
< Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
```

#### 4. Check Firewall
Ensure port 3000 is not blocked by firewall:

```bash
# macOS
sudo pfctl -sr | grep 3000

# Linux
sudo iptables -L | grep 3000
```

#### 5. Verify Network Connectivity
From the React app's machine, test if the server is reachable:

```bash
ping 192.168.5.214
telnet 192.168.5.214 3000
```

#### 6. Check Browser Console
Open browser DevTools (F12) and check:
- **Console tab**: Look for CORS errors or network errors
- **Network tab**: Check the failed request and see the error details
- **Response headers**: Verify CORS headers are present

### Common CORS Errors

#### "Access to fetch at '...' from origin '...' has been blocked by CORS policy"
- **Solution**: Ensure CORS middleware is enabled and server is restarted

#### "OPTIONS request returns 404"
- **Solution**: CORS middleware must be placed before all route handlers

#### "No 'Access-Control-Allow-Origin' header"
- **Solution**: Verify CORS headers are being set in the response

### Server Issues

#### Server returns 500 errors
Check if Ollama is running:
```bash
# Check Ollama service
curl http://localhost:11434/api/tags

# Start Ollama if needed
ollama serve
```

#### Check Server Logs
Logs are written to: `logs/server-YYYY-MM-DD.log`

View recent errors:
```bash
tail -f logs/server-$(date +%Y-%m-%d).log | grep ERROR
```

### React App Issues

#### Config.json not loading
- Ensure `config.json` exists in `client/` directory
- Check browser console for import errors
- Verify JSON syntax is valid

#### Wrong API URL
Check the server URL displayed in the chat header. It should match your server's IP.

Update `client/config.json` if needed:
```json
{
  "server": {
    "host": "192.168.5.214",
    "port": 3000
  }
}
```

## Quick Fixes

1. **Restart the server**:
   ```bash
   # Stop current server (Ctrl+C)
   npm run dev
   ```

2. **Clear browser cache** and reload

3. **Check both servers are running**:
   - Express API: `http://192.168.5.214:3000`
   - React app: `http://localhost:5173`

4. **Verify Ollama is running**:
   ```bash
   ollama list
   ```

