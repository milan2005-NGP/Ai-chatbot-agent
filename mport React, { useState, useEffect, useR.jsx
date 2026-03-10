mport React, { useState, useEffect, useRef } from 'react';
import { Send, Trash2, Download, Upload, Zap, Brain, Sparkles, MessageSquare, Settings, Moon, Sun, Copy, Check } from 'lucide-react';

const AIChatbotAgent = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [personality, setPersonality] = useState('helpful');
  const [showSettings, setShowSettings] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const chatEndRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    loadMessages();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadMessages = async () => {
    try {
      const result = await window.storage.get('chatbot-messages', false);
      const settingsResult = await window.storage.get('chatbot-settings', false);
      
      if (result) {
        setMessages(JSON.parse(result.value));
      } else {
        const welcomeMsg = {
          role: 'assistant',
          content: getWelcomeMessage('helpful'),
          timestamp: new Date().toISOString()
        };
        setMessages([welcomeMsg]);
        await window.storage.set('chatbot-messages', JSON.stringify([welcomeMsg]), false);
      }

      if (settingsResult) {
        const settings = JSON.parse(settingsResult.value);
        setPersonality(settings.personality || 'helpful');
        setDarkMode(settings.darkMode !== undefined ? settings.darkMode : true);
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };

  const saveMessages = async (newMessages) => {
    try {
      await window.storage.set('chatbot-messages', JSON.stringify(newMessages), false);
    } catch (error) {
      console.error('Failed to save messages:', error);
    }
  };

  const saveSettings = async () => {
    try {
      await window.storage.set('chatbot-settings', JSON.stringify({ personality, darkMode }), false);
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  };

  const getWelcomeMessage = (personalityType) => {
    const welcomes = {
      helpful: "👋 Hello! I'm your AI assistant. I'm here to help you with anything you need - from answering questions to creative brainstorming, coding help, or just having a conversation. What would you like to talk about?",
      professional: "Good day. I am an AI assistant configured for professional interactions. I can assist with business analysis, technical documentation, strategic planning, and professional correspondence. How may I be of service?",
      friendly: "Hey there! 😊 I'm so excited to chat with you! I love helping people with all sorts of things - whether you need advice, want to learn something new, or just want to have a fun conversation. What's on your mind today?",
      creative: "✨ Greetings, creative soul! I'm your AI companion for all things imaginative. Together we can write stories, brainstorm ideas, explore wild concepts, or dive into artistic projects. Ready to create something amazing?",
      technical: "System initialized. I am an AI assistant specialized in technical domains including software development, system architecture, debugging, and technology consultation. Please specify your technical requirements.",
      coach: "🎯 Hey champion! I'm your personal AI coach, here to motivate, guide, and support you in reaching your goals. Whether it's productivity, learning, or personal growth - we're in this together. What are we working on today?"
    };
    return welcomes[personalityType] || welcomes.helpful;
  };

  const getSystemPrompt = () => {
    const prompts = {
      helpful: "You are a helpful, friendly, and knowledgeable AI assistant. Provide clear, accurate, and useful responses. Be conversational but informative.",
      professional: "You are a professional AI consultant. Maintain a formal tone, provide well-structured responses, and focus on business value and actionable insights. Use proper formatting and be concise.",
      friendly: "You are a warm, enthusiastic, and supportive AI friend. Be encouraging, use emojis occasionally, show empathy, and make conversations feel personal and engaging. Be upbeat and positive!",
      creative: "You are a creative AI companion. Think outside the box, use vivid language, embrace imagination, and help users explore innovative ideas. Be inspirational and artistic in your responses.",
      technical: "You are a technical AI expert. Provide precise, detailed technical information. Use proper terminology, include code examples when relevant, and explain complex concepts clearly. Be thorough and accurate.",
      coach: "You are a motivational AI coach. Be encouraging, ask thought-provoking questions, celebrate progress, and help users develop action plans. Use motivational language and focus on growth mindset."
    };
    return prompts[personality] || prompts.helpful;
  };

  const sendMessage = async () => {
    const messageText = input.trim();
    if (!messageText || isTyping) return;

    const userMessage = {
      role: 'user',
      content: messageText,
      timestamp: new Date().toISOString()
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    saveMessages(updatedMessages);
    setInput('');
    setIsTyping(true);

    try {
      const conversationHistory = updatedMessages.slice(-10).map(m => ({
        role: m.role,
        content: m.content
      }));

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 2000,
          system: getSystemPrompt(),
          messages: conversationHistory
        })
      });

      if (!response.ok) {
        throw new Error('AI response failed');
      }

      const data = await response.json();
      const aiResponse = data.content.find(c => c.type === 'text')?.text || 'Sorry, I could not generate a response.';

      const assistantMessage = {
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date().toISOString()
      };

      const finalMessages = [...updatedMessages, assistantMessage];
      setMessages(finalMessages);
      saveMessages(finalMessages);
    } catch (error) {
      console.error('AI Error:', error);
      const errorMessage = {
        role: 'assistant',
        content: '⚠️ Oops! I encountered an error connecting to my AI systems. Please check your connection and try again.',
        timestamp: new Date().toISOString()
      };
      const finalMessages = [...updatedMessages, errorMessage];
      setMessages(finalMessages);
      saveMessages(finalMessages);
    } finally {
      setIsTyping(false);
    }
  };

  const clearChat = async () => {
    const welcomeMsg = {
      role: 'assistant',
      content: getWelcomeMessage(personality),
      timestamp: new Date().toISOString()
    };
    setMessages([welcomeMsg]);
    await window.storage.set('chatbot-messages', JSON.stringify([welcomeMsg]), false);
  };

  const exportChat = () => {
    const chatText = messages.map(m => 
      `[${new Date(m.timestamp).toLocaleString()}] ${m.role === 'user' ? 'You' : 'AI'}: ${m.content}`
    ).join('\n\n');
    
    const blob = new Blob([chatText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-export-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importChat = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      const lines = text.split('\n\n');
      const importedMessages = lines.map(line => {
        const match = line.match(/\[(.*?)\] (You|AI): (.*)/s);
        if (match) {
          return {
            role: match[2] === 'You' ? 'user' : 'assistant',
            content: match[3],
            timestamp: new Date(match[1]).toISOString()
          };
        }
        return null;
      }).filter(Boolean);

      if (importedMessages.length > 0) {
        setMessages(importedMessages);
        saveMessages(importedMessages);
      }
    } catch (error) {
      console.error('Import failed:', error);
    }
  };

  const changePersonality = async (newPersonality) => {
    setPersonality(newPersonality);
    const welcomeMsg = {
      role: 'assistant',
      content: getWelcomeMessage(newPersonality),
      timestamp: new Date().toISOString()
    };
    setMessages([welcomeMsg]);
    await window.storage.set('chatbot-messages', JSON.stringify([welcomeMsg]), false);
    await saveSettings();
  };

  const copyToClipboard = (text, index) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const theme = {
    bg: darkMode ? '#0f172a' : '#f8fafc',
    secondary: darkMode ? '#1e293b' : '#ffffff',
    border: darkMode ? '#334155' : '#e2e8f0',
    text: darkMode ? '#f1f5f9' : '#0f172a',
    textSecondary: darkMode ? '#94a3b8' : '#64748b',
    accent: darkMode ? '#3b82f6' : '#2563eb',
    userBubble: darkMode ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' : 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
    aiBubble: darkMode ? 'linear-gradient(135deg, #1e293b 0%, #334155 100%)' : 'linear-gradient(135deg, #ffffff 0%, #f1f5f9 100%)',
    inputBg: darkMode ? '#1e293b' : '#ffffff'
  };

  const personalities = [
    { id: 'helpful', icon: '🤝', name: 'Helpful', desc: 'Balanced and knowledgeable' },
    { id: 'professional', icon: '💼', name: 'Professional', desc: 'Formal and business-focused' },
    { id: 'friendly', icon: '😊', name: 'Friendly', desc: 'Warm and encouraging' },
    { id: 'creative', icon: '✨', name: 'Creative', desc: 'Imaginative and artistic' },
    { id: 'technical', icon: '⚙️', name: 'Technical', desc: 'Expert and precise' },
    { id: 'coach', icon: '🎯', name: 'Coach', desc: 'Motivational and supportive' }
  ];

  const quickPrompts = [
    "Tell me an interesting fact",
    "Help me brainstorm ideas",
    "Explain something complex simply",
    "Write a creative story",
    "Give me coding help",
    "Motivate me"
  ];

  return (
    <div style={{
      minHeight: '100vh',
      background: theme.bg,
      color: theme.text,
      fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
      transition: 'all 0.3s ease'
    }}>
      {/* Header */}
      <div style={{
        background: theme.secondary,
        borderBottom: `2px solid ${theme.border}`,
        padding: '20px 30px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: darkMode ? '0 4px 20px rgba(0,0,0,0.3)' : '0 4px 20px rgba(0,0,0,0.08)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{
            width: '50px',
            height: '50px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 15px rgba(59, 130, 246, 0.4)'
          }}>
            <Brain size={28} color="white" />
          </div>
          <div>
            <h1 style={{ 
              margin: 0, 
              fontSize: '24px', 
              fontWeight: '700',
              background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              AI Chatbot Agent
            </h1>
            <div style={{ fontSize: '13px', color: theme.textSecondary, marginTop: '2px' }}>
              {personalities.find(p => p.id === personality)?.icon} {personalities.find(p => p.id === personality)?.name} Mode
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            onClick={() => setShowSettings(!showSettings)}
            style={{
              background: theme.inputBg,
              border: `2px solid ${theme.border}`,
              borderRadius: '10px',
              padding: '10px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              transition: 'all 0.3s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <Settings size={20} color={theme.text} />
          </button>
          <button
            onClick={() => { setDarkMode(!darkMode); saveSettings(); }}
            style={{
              background: theme.inputBg,
              border: `2px solid ${theme.border}`,
              borderRadius: '10px',
              padding: '10px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              transition: 'all 0.3s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            {darkMode ? <Sun size={20} color="#fbbf24" /> : <Moon size={20} color="#3b82f6" />}
          </button>
          <button
            onClick={exportChat}
            style={{
              background: theme.inputBg,
              border: `2px solid ${theme.border}`,
              borderRadius: '10px',
              padding: '10px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              transition: 'all 0.3s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <Download size={20} color={theme.text} />
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            style={{
              background: theme.inputBg,
              border: `2px solid ${theme.border}`,
              borderRadius: '10px',
              padding: '10px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              transition: 'all 0.3s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <Upload size={20} color={theme.text} />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt"
            style={{ display: 'none' }}
            onChange={importChat}
          />
          <button
            onClick={clearChat}
            style={{
              background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
              border: 'none',
              borderRadius: '10px',
              padding: '10px 20px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: 'white',
              fontWeight: '600',
              fontSize: '14px',
              boxShadow: '0 4px 15px rgba(239, 68, 68, 0.3)',
              transition: 'all 0.3s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <Trash2 size={18} />
            Clear Chat
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div style={{
          background: theme.secondary,
          borderBottom: `2px solid ${theme.border}`,
          padding: '25px 30px',
          animation: 'slideDown 0.3s ease'
        }}>
          <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', fontWeight: '600' }}>
            Choose AI Personality
          </h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '15px'
          }}>
            {personalities.map(p => (
              <button
                key={p.id}
                onClick={() => changePersonality(p.id)}
                style={{
                  background: personality === p.id ? 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)' : theme.inputBg,
                  border: `2px solid ${personality === p.id ? '#3b82f6' : theme.border}`,
                  borderRadius: '12px',
                  padding: '15px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.3s',
                  color: personality === p.id ? 'white' : theme.text
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-3px)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>{p.icon}</div>
                <div style={{ fontWeight: '600', marginBottom: '4px' }}>{p.name}</div>
                <div style={{ fontSize: '12px', opacity: 0.8 }}>{p.desc}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '30px',
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 140px)'
      }}>
        {/* Messages Area */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          marginBottom: '20px',
          paddingRight: '10px'
        }}>
          {messages.length === 1 && (
            <div style={{ marginBottom: '30px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '15px', color: theme.textSecondary }}>
                Quick Start Prompts
              </h3>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '12px'
              }}>
                {quickPrompts.map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => setInput(prompt)}
                    style={{
                      background: theme.secondary,
                      border: `2px solid ${theme.border}`,
                      borderRadius: '10px',
                      padding: '12px 16px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      color: theme.text,
                      fontSize: '14px',
                      transition: 'all 0.3s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = theme.accent;
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = theme.border;
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    <Sparkles size={14} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, index) => (
            <div
              key={index}
              style={{
                display: 'flex',
                justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                marginBottom: '20px',
                animation: 'fadeIn 0.4s ease'
              }}
            >
              <div style={{
                maxWidth: '75%',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}>
                <div style={{
                  background: msg.role === 'user' ? theme.userBubble : theme.aiBubble,
                  color: msg.role === 'user' ? 'white' : theme.text,
                  padding: '16px 20px',
                  borderRadius: msg.role === 'user' ? '20px 20px 4px 20px' : '20px 20px 20px 4px',
                  boxShadow: darkMode ? '0 4px 15px rgba(0,0,0,0.3)' : '0 4px 15px rgba(0,0,0,0.1)',
                  border: msg.role === 'assistant' ? `1px solid ${theme.border}` : 'none',
                  position: 'relative'
                }}>
                  <div style={{
                    whiteSpace: 'pre-wrap',
                    lineHeight: '1.6',
                    fontSize: '15px'
                  }}>
                    {msg.content}
                  </div>
                  
                  {msg.role === 'assistant' && (
                    <button
                      onClick={() => copyToClipboard(msg.content, index)}
                      style={{
                        position: 'absolute',
                        top: '10px',
                        right: '10px',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '5px',
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        opacity: 0.5,
                        transition: 'opacity 0.3s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                      onMouseLeave={(e) => e.currentTarget.style.opacity = '0.5'}
                    >
                      {copiedIndex === index ? (
                        <Check size={16} color="#10b981" />
                      ) : (
                        <Copy size={16} color={theme.text} />
                      )}
                    </button>
                  )}
                </div>
                <div style={{
                  fontSize: '11px',
                  color: theme.textSecondary,
                  paddingLeft: msg.role === 'user' ? '0' : '8px',
                  paddingRight: msg.role === 'user' ? '8px' : '0',
                  textAlign: msg.role === 'user' ? 'right' : 'left'
                }}>
                  {new Date(msg.timestamp).toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))}

          {isTyping && (
            <div style={{
              display: 'flex',
              justifyContent: 'flex-start',
              marginBottom: '20px'
            }}>
              <div style={{
                background: theme.aiBubble,
                padding: '16px 20px',
                borderRadius: '20px 20px 20px 4px',
                boxShadow: darkMode ? '0 4px 15px rgba(0,0,0,0.3)' : '0 4px 15px rgba(0,0,0,0.1)',
                border: `1px solid ${theme.border}`,
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <div className="typing-dot" style={{ background: theme.accent }}></div>
                <div className="typing-dot" style={{ background: theme.accent, animationDelay: '0.2s' }}></div>
                <div className="typing-dot" style={{ background: theme.accent, animationDelay: '0.4s' }}></div>
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Input Area */}
        <div style={{
          background: theme.secondary,
          border: `2px solid ${theme.border}`,
          borderRadius: '16px',
          padding: '16px',
          display: 'flex',
          gap: '12px',
          boxShadow: darkMode ? '0 -4px 20px rgba(0,0,0,0.3)' : '0 -4px 20px rgba(0,0,0,0.08)'
        }}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && !isTyping && sendMessage()}
            placeholder="Type your message here..."
            disabled={isTyping}
            style={{
              flex: 1,
              background: theme.inputBg,
              border: `2px solid ${theme.border}`,
              borderRadius: '12px',
              padding: '14px 18px',
              color: theme.text,
              fontSize: '15px',
              outline: 'none',
              transition: 'border-color 0.3s'
            }}
            onFocus={(e) => e.target.style.borderColor = theme.accent}
            onBlur={(e) => e.target.style.borderColor = theme.border}
          />
          <button
            onClick={sendMessage}
            disabled={isTyping || !input.trim()}
            style={{
              background: isTyping || !input.trim() 
                ? theme.border
                : 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
              border: 'none',
              borderRadius: '12px',
              padding: '14px 28px',
              cursor: isTyping || !input.trim() ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: 'white',
              fontWeight: '600',
              fontSize: '15px',
              boxShadow: isTyping || !input.trim() ? 'none' : '0 4px 15px rgba(59, 130, 246, 0.4)',
              transition: 'all 0.3s',
              opacity: isTyping || !input.trim() ? 0.5 : 1
            }}
            onMouseEnter={(e) => !isTyping && input.trim() && (e.currentTarget.style.transform = 'translateY(-2px)')}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            {isTyping ? (
              <>
                <div className="spinner" />
                Thinking...
              </>
            ) : (
              <>
                <Send size={18} />
                Send
              </>
            )}
          </button>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes typing {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-10px); }
        }
        
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        .typing-dot {
          width: 8px;
          height: 8px;
          borderRadius: 50%;
          animation: typing 1.4s infinite;
        }
        
        .spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        
        * {
          scrollbar-width: thin;
          scrollbar-color: ${theme.accent} ${theme.bg};
        }
        
        *::-webkit-scrollbar {
          width: 10px;
        }
        
        *::-webkit-scrollbar-track {
          background: ${theme.bg};
          border-radius: 10px;
        }
        
        *::-webkit-scrollbar-thumb {
          background: ${theme.accent};
          border-radius: 10px;
        }
        
        *::-webkit-scrollbar-thumb:hover {
          background: ${darkMode ? '#2563eb' : '#1d4ed8'};
        }
      `}</style>
    </div>
  );
};

export default AIChatbotAgent;