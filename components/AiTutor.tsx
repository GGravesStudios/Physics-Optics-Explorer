import React, { useState, useRef, useEffect } from 'react';
import { generateExplanation, generateDiagram, generatePracticeProblem } from '../services/geminiService';
import { ChatMessage, Topic, AppMode } from '../types';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import MathDisplay from './MathDisplay';

interface AiTutorProps {
  mode: AppMode;
  currentTopic: Topic;
}

const AiTutor: React.FC<AiTutorProps> = ({ mode, currentTopic }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [examTimer, setExamTimer] = useState(0);
  const [solutionRevealed, setSolutionRevealed] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize
  useEffect(() => {
    setMessages([{
      role: 'model',
      text: mode === AppMode.EXAM
        ? `**EXAM SESSION STARTED**\n\nI will present a problem. Do not ask for the solution immediately. Use your paper and calculator.`
        : `Hello! I'm your AI Tutor. Topic: **${currentTopic}**.\n\nAsk me anything or say "Draw a diagram of..."`,
      timestamp: Date.now()
    }]);

    if (mode === AppMode.EXAM) {
      setExamTimer(0);
      handleGenerateProblem();
    }
  }, [mode, currentTopic]);

  // Exam Timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (mode === AppMode.EXAM) {
      interval = setInterval(() => setExamTimer(t => t + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [mode]);

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleGenerateProblem = async () => {
    setLoading(true);
    setSolutionRevealed(false);
    const problem = await generatePracticeProblem(currentTopic);

    // Parse response to separate solution if possible (heuristic split)
    const parts = problem.split("**Solution:**");
    const questionText = parts[0];
    const solutionText = parts.length > 1 ? "**Solution:**" + parts[1] : "";

    setMessages(prev => {
      const newMsgs: ChatMessage[] = [
        ...prev,
        { role: 'model', text: questionText, timestamp: Date.now() }
      ];

      if (solutionText) {
        newMsgs.push({ role: 'model', text: solutionText, timestamp: Date.now(), isHiddenSolution: true });
      }
      return newMsgs;
    });
    setLoading(false);
  };

  const revealSolution = () => {
    setSolutionRevealed(true);
    setMessages(prev => prev.map(m => m.isHiddenSolution ? { ...m, isHiddenSolution: false } : m));
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg: ChatMessage = { role: 'user', text: input, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      // Image Generation Check
      const lowerInput = input.toLowerCase();
      if (lowerInput.includes('draw') || lowerInput.includes('diagram') || lowerInput.includes('sketch')) {
        const imgData = await generateDiagram(input + ` context: ${currentTopic}`);
        if (imgData) {
          setMessages(prev => [...prev, {
            role: 'model',
            text: `![Generated Diagram](${imgData})`,
            isImage: true,
            timestamp: Date.now()
          }]);
          setLoading(false);
          return;
        }
      }

      // Exam Mode Logic
      let prompt = input;
      if (mode === AppMode.EXAM && !solutionRevealed) {
        prompt = `User is in EXAM MODE. They asked: "${input}". 
            Do NOT give the full answer. Give a hint or guide them to the next step. 
            If they are completely stuck, tell them to use the 'Reveal Solution' button.`;
      }

      const responseText = await generateExplanation(prompt, currentTopic);

      setMessages(prev => [...prev, {
        role: 'model',
        text: responseText,
        timestamp: Date.now()
      }]);

    } catch (e) {
      setMessages(prev => [...prev, {
        role: 'model',
        text: "⚠️ Network error. Please check your connection and try again.",
        timestamp: Date.now()
      }]);
    }
    setLoading(false);
  };

  const renderMessage = (text: string) => (
    <ReactMarkdown
      remarkPlugins={[remarkMath]}
      components={{
        p: ({ children }) => <p className="my-1 leading-relaxed">{children}</p>,
        strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
        em: ({ children }) => <em className="italic">{children}</em>,
        // @ts-expect-error - remark-math adds these nodes but react-markdown types don't know them yet
        math: ({ value }: { value: string }) => (
          <MathDisplay
            latex={value}
            block
            className="my-3 bg-transparent border-none shadow-none ring-0 p-0"
          />
        ),
        inlineMath: ({ value }: { value: string }) => <MathDisplay latex={value} inline className="mx-0.5" />,
      }}
    >
      {text}
    </ReactMarkdown>
  );

  return (
    <div className="flex flex-col h-[650px] bg-white rounded-xl shadow-lg overflow-hidden border border-slate-200">

      {/* Header */}
      <div className={`p-4 text-white font-semibold flex justify-between items-center ${mode === AppMode.EXAM ? 'bg-slate-800' : 'bg-amber-600'}`}>
        <div className="flex items-center gap-2">
          <span>{mode === AppMode.EXAM ? '📝 Exam Session' : '🎓 AI Tutor'}</span>
          {mode === AppMode.EXAM && (
            <span className="bg-slate-700 px-2 py-0.5 rounded text-xs font-mono text-amber-400 border border-slate-600">
              {formatTime(examTimer)}
            </span>
          )}
        </div>

        <div className="flex gap-2">
          {mode === AppMode.EXAM && !solutionRevealed && (
            <button
              onClick={revealSolution}
              className="text-xs bg-slate-600 hover:bg-slate-500 border border-slate-500 px-3 py-1.5 rounded transition"
            >
              Reveal Solution
            </button>
          )}
          {mode !== AppMode.EXPLORE && (
            <button
              onClick={handleGenerateProblem}
              className="text-xs bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded transition border border-white/20"
            >
              Next Problem
            </button>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-slate-50">
        {messages.map((msg, idx) => {
          if (msg.isHiddenSolution) return null;

          return (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[90%] md:max-w-[80%] rounded-2xl px-5 py-4 ${msg.role === 'user'
                ? 'bg-amber-600 text-white rounded-br-none shadow-md'
                : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none shadow-sm'
                }`}>
                <div className="prose prose-sm max-w-none dark:prose-invert leading-relaxed">
                  {renderMessage(msg.text)}
                </div>
              </div>
            </div>
          );
        })}
        {loading && (
          <div className="flex justify-start animate-pulse">
            <div className="bg-white border border-slate-200 px-4 py-3 rounded-2xl rounded-bl-none shadow-sm text-slate-400 text-sm">
              Thinking...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-slate-100">
        <div className="text-[10px] text-slate-400 text-center mb-2">
          AI can make mistakes. Verify important information.
        </div>
        {mode === AppMode.EXAM && !solutionRevealed && (
          <div className="text-xs text-center text-amber-700 mb-2 bg-amber-50 py-1 rounded border border-amber-100">
            ⚠️ Solutions are hidden. Ask for hints if stuck.
          </div>
        )}
        <div className="flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={mode === AppMode.EXAM ? "Ask for a hint..." : "Ask a question or request a diagram..."}
            className="flex-1 border border-slate-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-slate-50 text-base"
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="bg-amber-600 hover:bg-amber-700 disabled:bg-slate-300 text-white rounded-xl px-4 w-14 flex items-center justify-center transition shadow-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
              <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AiTutor;
