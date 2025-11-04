# Local LLM Chat Client

A React-based chat interface for interacting with the Local LLM Express API.

## Features

- 💬 Real-time chat interface
- 🎨 Modern, responsive UI
- 🤖 Support for multiple LLM models
- ⚡ Fast and lightweight
- 📱 Mobile-friendly design

## Prerequisites

- Node.js (v18 or higher)
- The Express API server running on `http://localhost:3000`

## Installation

1. Install dependencies:
```bash
npm install
```

## Usage

1. Make sure the Express API server is running (from the parent directory):
```bash
cd ..
npm start
```

2. Start the React development server:
```bash
npm run dev
```

3. Open your browser to `http://localhost:5173`

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## Configuration

The app uses Vite's proxy configuration to forward API requests to the Express server. The proxy is configured in `vite.config.ts` to forward `/api` requests to `http://localhost:3000`.

