import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const ChatApp = () => {
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState('naive');
  const [availableModes, setAvailableModes] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchModes();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchModes = async () => {
    try {
      const response = await axios.get('http://localhost:8000/modes');
      setAvailableModes(response.data);
    } catch (error) {
      console.error('Error fetching modes:', error);
    }
  };

  const streamText = async (text, messageIndex) => {
    setIsTyping(true);
    const words = text.split(' ');
    let currentText = '';

    for (let i = 0; i < words.length; i++) {
      currentText += words[i] + ' ';
      setMessages(prevMessages =>
        prevMessages.map((msg, idx) =>
          idx === messageIndex ? { ...msg, text: currentText.trim() } : msg
        )
      );
      await new Promise(resolve => setTimeout(resolve, Math.min(50, 20 + words[i].length * 2)));
    }
    setIsTyping(false);
  };

  const sendQuery = async (e) => {
    e?.preventDefault();
    if (question.trim() === '' || isTyping) return;

    setLoading(true);
    const currentQuestion = question;
    setQuestion('');
    setMessages(prev => [...prev, { type: 'user', text: currentQuestion }]);

    try {
      const response = await axios.get('http://localhost:8000/query', {
        params: {
          question: currentQuestion,
          mode: mode
        }
      });

      if (response.data.status === 'error') {
        throw new Error(response.data.error);
      }

      const newMessageIndex = messages.length + 1;
      setMessages(prev => [...prev, {
        type: 'bot',
        text: '',
        mode: response.data.mode
      }]);

      await streamText(response.data.response, newMessageIndex);

    } catch (error) {
      console.error('Query error:', error);
      setMessages(prev => [...prev, {
        type: 'bot',
        text: error.message || 'Sorry, something went wrong. Please try again.',
        error: true
      }]);
    } finally {
      setLoading(false);
    }
  };

  const LoadingAnimation = () => (
    <div className="flex justify-start animate-fade-in">
      <div className="bg-[hsl(var(--card))] rounded-lg px-4 py-2 shadow-md">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-[hsl(var(--primary))] rounded-full animate-bounce" />
          <div className="w-2 h-2 bg-[hsl(var(--primary))] rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
          <div className="w-2 h-2 bg-[hsl(var(--primary))] rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
        </div>
      </div>
    </div>
  );

  return (
    <div className="dark flex justify-center items-center min-h-screen bg-[url('/opoy7.png')] bg-cover bg-center h-screen w-screen text-[hsl(var(--foreground))] p-10">
      <div className="w-full max-w-3xl h-[800px] bg-[hsl(var(--card))] rounded-lg shadow-lg flex flex-col border border-[hsl(var(--border))] overflow-hidden animate-fade-in">
        {/* Header Section */}
        <div className="bg-[hsl(var(--card))] p-4 border-b border-[hsl(var(--border))]">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-semibold text-[hsl(var(--primary))] animate-slide-down">University Info Bot</h1>
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium">Mode:</label>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value)}
                disabled={isTyping}
                className="border rounded-lg px-3 py-2 bg-[hsl(var(--input))] text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] transition-transform transform hover:scale-105"
              >
                {availableModes.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
              <button
                onClick={() => setShowInfo(true)}
                className="border px-3 py-2 rounded-lg bg-[hsl(var(--primary))] text-white font-medium hover:bg-[hsl(var(--primary-hover))] transition-transform transform hover:scale-105"
              >
                Info
              </button>
            </div>
          </div>
        </div>

        {/* Messages Section */}
        <div
          className={`flex-1 overflow-y-auto p-4 space-y-4 ${messages.length === 0 && 'justify-center items-center flex'}`}
          style={{ scrollbarColor: 'rgba(100, 100, 100, 0.5) rgba(0, 0, 0, 0.1)', scrollbarWidth: 'thin' }}
        >
          {messages.length === 0 ? (
            <div className="text-center animate-fade-in">
              <h2 className="text-xl font-medium mb-4">Welcome to the University Info Bot!</h2>
              <form onSubmit={sendQuery} className="space-y-4">
                <input
                  type="text"
                  placeholder="Type your question..."
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  className="w-full border rounded-lg px-4 py-2 text-[hsl(var(--foreground))] bg-[hsl(var(--input))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] transition-transform transform hover:scale-105"
                />
                <button
                  type="submit"
                  className="bg-[hsl(var(--primary))] text-white px-6 py-2 rounded-lg font-medium hover:bg-[hsl(var(--primary-hover))] transition-transform transform hover:scale-105"
                >
                  Start Chat
                </button>
              </form>
            </div>
          ) : (
            <>
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'} animate-slide-in`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-4 py-2 transition-all duration-300 shadow-md backdrop-blur-sm ${message.type === 'user'
                        ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]'
                        : message.error
                          ? 'bg-[hsl(var(--destructive))] text-[hsl(var(--destructive-foreground))]'
                          : 'bg-[hsl(var(--card))]/90 text-[hsl(var(--card-foreground))] border border-[hsl(var(--border))]'
                      }`}
                  >
                    <div className="whitespace-pre-wrap">{message.text}</div>
                    {message.mode && (
                      <div className="text-xs opacity-75 mt-1">
                        Mode: {availableModes.find(m => m.id === message.mode)?.name || message.mode}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {loading && !isTyping && <LoadingAnimation />}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Section */}
        {messages.length > 0 && (
          <div className="p-4 bg-[hsl(var(--card))] border-t border-[hsl(var(--border))] animate-fade-in">
            <form onSubmit={sendQuery}>
              <div className="flex items-center gap-4">
                <input
                  type="text"
                  placeholder={isTyping ? "Bot is typing..." : "Ask a question..."}
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  disabled={isTyping}
                  className="flex-1 bg-[hsl(var(--input))] rounded-lg border px-4 py-2 text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] transition-transform transform hover:scale-102 disabled:opacity-70"
                />
                <button
                  type="submit"
                  disabled={isTyping || question.trim() === ''}
                  className="text-white bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary-hover))] rounded-lg px-4 py-2 focus:outline-none transition-transform transform hover:scale-105"
                >
                  Send
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Info Modal */}
        {showInfo && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-[hsl(var(--card))] p-6 rounded-lg max-w-md shadow-lg animate-fade-in relative">
              <h2 className="text-2xl font-bold mb-4">Project Info</h2>
              <p className="mb-4"><strong>Technologies Used:</strong> LightRAG, uvicorn, fastAPI, React, Tailwind</p>
              <p className="mb-4"><strong>Programming Languages:</strong> JavaScript, Python</p>
              <p className="mb-4"><strong>Developers:</strong></p>
              <ul className="list-disc list-inside">
                <li>Oahed Noor Forhad</li>
                <li>Md Tohedul Islam Nirzon</li>
                <li>Saiful Islam Rumi</li>
              </ul>
              <button
                onClick={() => setShowInfo(false)}
                className="absolute top-2 right-2 text-xl font-bold text-[hsl(var(--destructive))] hover:opacity-75"
              >
                &times;
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatApp;
