# AI Search Agent 🤖🔍

An intelligent search-enabled chatbot that combines conversational AI with real-time web search capabilities. Built with a Next.js frontend and Python backend using LangGraph, this application provides users with an interactive chat interface powered by Google's Gemini AI with integrated Tavily web search.

## Features

- 🗣️ **Interactive Chat Interface** - Clean, modern chat UI built with Next.js and TypeScript
- 🌐 **Real-time Web Search** - Integrated Tavily search for up-to-date information
- 🤖 **Gemini AI Integration** - Powered by Google's Gemini 2.5 Flash Lite model
- 🔄 **Streaming Responses** - Real-time message streaming with Server-Sent Events
- 📚 **Conversation Memory** - Persistent chat history using LangGraph checkpoints
- ⚡ **Agentic Workflow** - Intelligent decision-making on when to search vs. respond directly
- 🎨 **Modern UI/UX** - Responsive design with Tailwind CSS

## Tech Stack

### Frontend (Client)
- **Next.js 15** - React framework with App Router
- **TypeScript** - Type-safe JavaScript development
- **Tailwind CSS** - Utility-first CSS framework
- **React Components** - Modular UI architecture
- **Server-Sent Events** - Real-time streaming communication

### Backend (Server)
- **Python 3.8+** - Core backend language
- **FastAPI** - High-performance web framework
- **LangGraph** - Workflow orchestration and state management
- **LangChain** - AI framework for LLM integration
- **Google Gemini AI** - Large language model (gemini-2.5-flash-lite)
- **Tavily Search** - Web search API integration
- **Memory Saver** - Conversation persistence

## Architecture

The application uses an **agentic architecture** where the AI agent:
1. Receives user input
2. Decides whether to search the web or respond directly
3. If search is needed, executes web search via Tavily
4. Processes search results and generates contextual responses
5. Streams responses back to the frontend in real-time

## Project Structure

```
AiSearchAgent/
├── client/                 # Next.js frontend
│   ├── app/               # Next.js 13+ app directory
│   │   ├── favicon.ico    # App icon
│   │   ├── globals.css    # Global styles
│   │   ├── layout.tsx     # Root layout component
│   │   └── page.tsx       # Main chat page
│   ├── components/        # React components
│   │   ├── Header.tsx     # App header component
│   │   ├── InputBar.tsx   # Message input component
│   │   └── MessageArea.tsx # Chat messages display
│   ├── public/           # Static assets
│   ├── package.json      # Node.js dependencies
│   ├── tsconfig.json     # TypeScript configuration
│   ├── next.config.ts    # Next.js configuration
│   ├── postcss.config.mjs # PostCSS configuration
│   └── eslint.config.mjs  # ESLint configuration
├── server/               # Python backend
│   ├── app.py           # Main FastAPI application
│   └── app.ipynb        # Jupyter notebook for development
├── .gitignore           # Git ignore rules
├── LICENSE              # Project license
└── README.md           # This file
```

## Getting Started

### Prerequisites

- **Node.js** (v18 or higher)
- **Python** (v3.8 or higher)
- **npm** or **yarn**
- **pip** (Python package manager)

### API Keys Required

- **Google Gemini API Key** - Get from [Google AI Studio](https://aistudio.google.com/)
- **Tavily Search API Key** - Get from [Tavily](https://tavily.com/)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Shirshadas24/search-enabled-chatbot.git
   cd search-enabled-chatbot
   ```

2. **Set up the Backend (Server)**
   ```bash
   cd server
   
   # Install Python dependencies
   pip install fastapi uvicorn python-dotenv
   pip install langchain langchain-google-genai langchain-community
   pip install langgraph tavily-python
   
   # Create .env file
   touch .env
   ```

3. **Configure Environment Variables (Server)**
   
   Create `server/.env` file:
   ```env
   GEMINI_API_KEY=your_google_gemini_api_key
   TAVILY_API_KEY=your_tavily_api_key
   ```

4. **Set up the Frontend (Client)**
   ```bash
   cd ../client
   
   # Install Node.js dependencies
   npm install
   
   # Create environment file
   touch .env.local
   ```

5. **Configure Environment Variables (Client)**
   
   Create `client/.env.local` file:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:8000
   ```

### Running the Application

1. **Start the Backend Server**
   ```bash
   cd server
   uvicorn app:app --host 0.0.0.0 --port 8000 --reload
   ```
   
   Or simply:
   ```bash
   python app.py
   ```

2. **Start the Frontend (in a new terminal)**
   ```bash
   cd client
   npm run dev
   ```

3. **Access the Application**
   - Frontend: `http://localhost:3000`
   - Backend API: `http://localhost:8000`
   - API Docs: `http://localhost:8000/docs` (FastAPI auto-generated)

## API Endpoints

### Chat Stream Endpoint
```
GET /chat_stream/{message}?checkpoint_id={optional_checkpoint_id}
```

**Parameters:**
- `message` (path): The user's chat message
- `checkpoint_id` (query, optional): Conversation thread ID for context

**Response:** Server-Sent Events stream with:
- `checkpoint` - New conversation ID (for new chats)
- `content` - AI response content chunks
- `search_start` - When web search begins (with query)
- `search_results` - Search result URLs
- `end` - Stream completion

## Usage Examples

### Basic Chat
```javascript
// Frontend: Connect to streaming endpoint
const eventSource = new EventSource(`/chat_stream/Hello, how are you?`);

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  // Handle different event types: checkpoint, content, search_start, etc.
};
```

### Continuing Conversation
```javascript
// Use checkpoint_id to maintain conversation context
const eventSource = new EventSource(
  `/chat_stream/What's the weather like?checkpoint_id=abc-123-def`
);
```

## Key Features Explained

### Agentic Workflow
The backend uses LangGraph to create an intelligent agent that:
- Analyzes user queries
- Decides when web search is necessary
- Executes searches via Tavily API
- Combines search results with AI reasoning
- Maintains conversation context

### Streaming Architecture
- **Real-time responses** via Server-Sent Events
- **Progressive loading** of AI-generated content
- **Search transparency** - users see when searches are performed
- **Non-blocking UI** - smooth user experience

### Memory Management
- **Conversation persistence** using LangGraph checkpoints
- **Thread-based context** - each conversation has unique ID
- **State management** - maintains message history and context

## Development

### Backend Development
```bash
cd server

# Start with auto-reload
uvicorn app:app --reload

# Or use the Jupyter notebook for interactive development
jupyter notebook app.ipynb
```

### Frontend Development
```bash
cd client

# Development server with hot reload
npm run dev

# Build for production
npm run build

# Production server
npm run start

# Linting
npm run lint
```

### Environment Setup for Development

Create a `server/requirements.txt` file:
```txt
fastapi==0.104.1
uvicorn==0.24.0
python-dotenv==1.0.0
langchain==0.1.0
langchain-google-genai==1.0.0
langchain-community==0.0.10
langgraph==0.0.20
tavily-python==0.3.0
```

## Deployment

### Backend Deployment (Railway/Render/Heroku)
```bash
cd server

# Create requirements.txt if not exists
pip freeze > requirements.txt

# Deploy according to your platform's instructions
# Make sure to set environment variables in your hosting platform
```

### Frontend Deployment (Vercel/Netlify)
```bash
cd client

# Build the application
npm run build

# Deploy to Vercel
npx vercel

# Or deploy to Netlify
npm run build && netlify deploy --prod --dir=.next
```

### Environment Variables for Production
Make sure to set these in your hosting platform:
- `GEMINI_API_KEY`
- `TAVILY_API_KEY`
- `NEXT_PUBLIC_API_URL` (your backend URL)

## Troubleshooting

### Common Issues

1. **CORS Errors**
   - Ensure backend CORS is configured for your frontend domain
   - Check that `NEXT_PUBLIC_API_URL` points to correct backend URL

2. **API Key Issues**
   - Verify API keys are correctly set in environment variables
   - Check API key permissions and quotas

3. **Streaming Issues**
   - Ensure your hosting platform supports Server-Sent Events
   - Check firewall/proxy settings

### Development Tips

- Use the Jupyter notebook (`app.ipynb`) for testing LangGraph workflows
- Monitor FastAPI logs for debugging API issues
- Use browser developer tools to inspect Server-Sent Events

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- **LangChain & LangGraph** - For the agentic AI framework
- **Google Gemini** - For the powerful language model
- **Tavily** - For the web search capabilities
- **FastAPI** - For the high-performance backend framework
- **Next.js** - For the modern React framework

## Support

If you encounter any issues:

1. Check the [Issues](https://github.com/Shirshadas24/search-enabled-chatbot/issues) page
2. Review the troubleshooting section above
3. Create a new issue with:
   - Steps to reproduce the problem
   - Error messages (if any)
   - Your environment details

---

**Made with ❤️ by [Shirshadas24](https://github.com/Shirshadas24)**

*An agentic AI chatbot that intelligently combines conversation with web search capabilities.*
