import React, { useState, useRef, useEffect } from 'react';
import { Settings, Send, Bot, User, AlertTriangle, Image as ImageIcon, X, Monitor, MonitorOff } from 'lucide-react';
import SettingsModal from './SettingsModal';
import { callLLMStream } from './api';
import { marked } from 'marked';

const renderer = new marked.Renderer();
const originalLink = renderer.link.bind(renderer);
renderer.link = (token) => {
  const html = originalLink(token);
  return html.replace(/^<a /, '<a target="_blank" rel="noopener noreferrer" ');
};
marked.use({ renderer });

function App() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(true);
  const [settings, setSettings] = useState({
    provider: 'nvidia',
    modelName: 'qwen/qwen3.5-397b-a17b',
    apiKey: '',
    systemPrompt: 'You are an expert Teacher specializing in Ethical Hacking, Digital Marketing, and Sales. Your goal is to educate the user on cybersecurity concepts, modern marketing strategies, and effective sales techniques.\n\nFor cybersecurity: You must NEVER provide actionable exploits, payloads, or instructions for attacking real targets. Always emphasize defense, ethics, and authorization.\nFor marketing & sales: Provide actionable, modern strategies, psychological insights, and conversion techniques.\n\nRULES:\n1. Always teach step-by-step in a structured format.\n2. Suggest exact YouTube search queries and provide relevant educational links.\n3. If the user uploads a screenshot, analyze it carefully and provide relevant advice.'
  });
  
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const startScreenShare = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // Need to play the video to capture frames
        videoRef.current.play();
      }
      streamRef.current = stream;
      setIsScreenSharing(true);
      
      stream.getVideoTracks()[0].onended = () => {
        stopScreenShare();
      };
    } catch (err) {
      console.error("Error sharing screen:", err);
      alert("Could not start screen share. Please check permissions.");
    }
  };

  const stopScreenShare = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsScreenSharing(false);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSend = async () => {
    // Check if we need to grab a frame from the live screen
    let currentImage = selectedImage;
    if (isScreenSharing && videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      if (video.videoWidth > 0 && video.videoHeight > 0) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        // Compress the image so the payload isn't too massive
        currentImage = canvas.toDataURL('image/jpeg', 0.5); 
      }
    }

    if (!inputValue.trim() && !currentImage) return;
    
    if (!settings.apiKey) {
      alert("Please enter an API Key in settings first.");
      setIsSettingsOpen(true);
      return;
    }

    let userContent = inputValue;
    if (currentImage) {
      userContent = [
        { type: "text", text: inputValue || "Please analyze this screen/image." },
        { type: "image_url", image_url: { url: currentImage } }
      ];
    }

    const userMessage = { role: 'user', content: userContent };
    // Create an empty assistant message to stream into
    const assistantMessage = { role: 'assistant', content: '' };
    
    setMessages([...messages, userMessage, assistantMessage]);
    setInputValue('');
    setSelectedImage(null);
    setIsLoading(true);

    try {
      await callLLMStream(
        settings.provider, 
        settings.apiKey, 
        settings.systemPrompt, 
        [...messages, userMessage], 
        settings.modelName,
        (chunk) => {
          assistantMessage.content += chunk;
          // Trigger re-render by updating the state with the modified object
          setMessages(prev => [...prev.slice(0, prev.length - 1), { ...assistantMessage }]);
        }
      );
    } catch (error) {
      assistantMessage.content += `\n\n**Error:** ${error.message}`;
      assistantMessage.isError = true;
      setMessages(prev => [...prev.slice(0, prev.length - 1), { ...assistantMessage }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#0f111a] text-gray-200 font-sans">
      {/* Header */}
      <header className="flex-none bg-[#1a1d27] border-b border-gray-800 p-4 flex justify-between items-center shadow-md z-10">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-blue-500 to-green-500 p-2 rounded-lg">
            <Bot size={24} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-wide">Nexus Edu Tutor</h1>
            <p className="text-xs text-gray-400">Cybersecurity, Marketing & Sales</p>
          </div>
        </div>
        <button 
          onClick={() => setIsSettingsOpen(true)}
          className="p-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg transition-colors flex items-center gap-2"
        >
          <Settings size={18} className="text-gray-300" />
          <span className="hidden sm:inline text-sm font-medium">Settings</span>
        </button>
      </header>

      {/* Chat Area */}
      <div className="flex-grow overflow-y-auto p-4 sm:p-6 space-y-6">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center opacity-70">
            <Bot size={64} className="text-gray-600 mb-4" />
            <h2 className="text-2xl font-semibold mb-2">Multi-Disciplinary Teacher</h2>
            <p className="text-gray-500 max-w-md">
              Learn ethical hacking, marketing strategies, and sales techniques. Enter your API key in the settings to begin your lesson.
            </p>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div key={idx} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''} max-w-4xl mx-auto`}>
              <div className={`flex-none w-10 h-10 rounded-full flex items-center justify-center shadow-lg ${
                msg.role === 'user' ? 'bg-blue-600' : (msg.isError ? 'bg-red-600' : 'bg-purple-600')
              }`}>
                {msg.role === 'user' ? <User size={20} /> : (msg.isError ? <AlertTriangle size={20}/> : <Bot size={20} />)}
              </div>
              <div className={`p-4 rounded-2xl max-w-[80%] shadow-md ${
                msg.role === 'user' 
                  ? 'bg-blue-600/20 border border-blue-500/30 text-blue-100' 
                  : (msg.isError ? 'bg-red-900/30 border border-red-500/50 text-red-200' : 'bg-[#1e2230] border border-gray-700 text-gray-300')
              }`}>
                <div className="prose prose-invert max-w-none break-words">
                  {Array.isArray(msg.content) ? (
                    <div>
                      {msg.content.map((part, i) => (
                        part.type === 'text' ? (
                           <div key={i} dangerouslySetInnerHTML={{ __html: marked(part.text) }} />
                        ) : (
                           <img key={i} src={part.image_url.url} alt="Uploaded" className="max-w-xs rounded-lg mt-2 mb-2 border border-gray-600" />
                        )
                      ))}
                    </div>
                  ) : (
                    <div dangerouslySetInnerHTML={{ __html: marked(msg.content) }} />
                  )}
                </div>
              </div>
            </div>
          ))
        )}
        
        {isLoading && (
          <div className="flex gap-4 max-w-4xl mx-auto">
            <div className="flex-none w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center shadow-lg">
              <Bot size={20} className="animate-pulse" />
            </div>
            <div className="p-4 rounded-2xl bg-[#1e2230] border border-gray-700 flex items-center gap-2">
              <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce delay-100"></div>
              <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce delay-200"></div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="flex-none p-4 bg-[#1a1d27] border-t border-gray-800">
        
        {/* Hidden elements for screen capture */}
        <video ref={videoRef} className="hidden" muted playsInline />
        <canvas ref={canvasRef} className="hidden" />

        <div className="max-w-4xl mx-auto relative">
          {selectedImage && !isScreenSharing && (
            <div className="mb-2 relative inline-block">
              <img src={selectedImage} alt="Preview" className="h-20 rounded-lg border border-gray-600" />
              <button 
                onClick={() => setSelectedImage(null)}
                className="absolute -top-2 -right-2 bg-red-500 rounded-full p-1 text-white hover:bg-red-600 shadow-lg"
              >
                <X size={14} />
              </button>
            </div>
          )}
          {isScreenSharing && (
            <div className="mb-2 flex items-center gap-2 text-sm text-green-400 bg-green-900/20 px-3 py-1.5 rounded-lg border border-green-800/50 inline-flex">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
              Live Screen Sharing Active. The AI will capture your screen when you send a message.
            </div>
          )}
          <div className="flex items-center gap-2">
            <button
              onClick={isScreenSharing ? stopScreenShare : startScreenShare}
              className={`p-3 border rounded-xl transition-colors ${
                isScreenSharing 
                  ? 'bg-green-600/20 border-green-500/50 text-green-400 hover:bg-green-600/30' 
                  : 'bg-[#0f111a] hover:bg-gray-800 border-gray-700 text-gray-400 hover:text-white'
              }`}
              title={isScreenSharing ? "Stop Screen Share" : "Share Screen"}
            >
              {isScreenSharing ? <MonitorOff size={20} /> : <Monitor size={20} />}
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isScreenSharing}
              className={`p-3 bg-[#0f111a] border border-gray-700 rounded-xl transition-colors ${
                isScreenSharing ? 'opacity-50 cursor-not-allowed text-gray-600' : 'hover:bg-gray-800 text-gray-400 hover:text-white'
              }`}
              title="Upload Image"
            >
              <ImageIcon size={20} />
            </button>
            <input 
              type="file"
              accept="image/*"
              className="hidden"
              ref={fileInputRef}
              onChange={handleImageUpload}
            />
            <div className="relative flex-grow">
              <textarea 
                className="w-full bg-[#0f111a] border border-gray-700 rounded-xl py-3 pl-4 pr-14 text-white focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                rows="1"
                placeholder={isScreenSharing ? "Ask about your live screen..." : "Ask your teacher or upload a screenshot..."}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
              />
              <button 
                onClick={handleSend}
                disabled={isLoading || (!inputValue.trim() && !selectedImage && !isScreenSharing)}
                className="absolute right-2 top-2 p-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:hover:bg-green-600 text-white rounded-lg transition-colors"
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        </div>
        <p className="text-center text-xs text-gray-600 mt-2">
          Responses are generated directly by the LLM via API. You are responsible for your usage.
        </p>
      </div>

      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        settings={settings}
        setSettings={setSettings}
      />
    </div>
  );
}

export default App;
