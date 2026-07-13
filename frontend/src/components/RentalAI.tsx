import { useState, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import aiApi from '../api/ai';
import type { ChatMessage } from '../api/ai';
import { useAuthStore } from '../store/authStore';

// ── Constants ──────────────────────────────────────────────────────────────
const QUICK_PROMPTS = [
  { label: '📦 Available Equipment', value: 'Show me all available equipment right now.' },
  { label: '💰 Overdue Invoices',     value: 'List all overdue invoices and total outstanding amount.' },
  { label: '📊 Dashboard Summary',    value: "Give me a summary of today's ERP dashboard." },
  { label: '🔑 Expiring Certs',       value: 'Show all operator licenses and equipment certificates expiring in the next 30 days.' },
];

const MIN_W = 340;
const MAX_W = 820;
const MIN_H = 420;
const MAX_H = window.innerHeight - 40;

const DEFAULT_W = 440;
const DEFAULT_H = 640;

// Position: bottom-right anchored
function defaultPos() {
  return {
    x: window.innerWidth  - DEFAULT_W - 24,
    y: window.innerHeight - DEFAULT_H - 24,
  };
}

// ── Styled Markdown Renderer ───────────────────────────────────────────────
function AIMessage({ content }: { content: string }) {
  return (
    <div className="text-sm text-gray-700 leading-relaxed">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => <h1 className="text-base font-bold text-gray-900 mb-2 mt-3 first:mt-0">{children}</h1>,
          h2: ({ children }) => <h2 className="text-xs font-bold uppercase tracking-wide text-indigo-700 mb-1.5 mt-3 first:mt-0">{children}</h2>,
          h3: ({ children }) => <h3 className="text-sm font-semibold text-gray-800 mb-1 mt-2 first:mt-0">{children}</h3>,
          p:  ({ children }) => <p  className="text-sm text-gray-700 leading-relaxed mb-2 last:mb-0">{children}</p>,
          strong: ({ children }) => <strong className="font-semibold text-gray-900">{children}</strong>,
          em:     ({ children }) => <em className="italic text-gray-600">{children}</em>,
          ul: ({ children }) => <ul className="my-2 space-y-1 pl-1">{children}</ul>,
          ol: ({ children }) => <ol className="my-2 space-y-1 pl-4 list-decimal">{children}</ol>,
          li: ({ children }) => (
            <li className="flex items-start gap-2 text-sm text-gray-700">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
              <span className="flex-1">{children}</span>
            </li>
          ),
          hr: () => <hr className="my-3 border-gray-100" />,
          blockquote: ({ children }) => (
            <div className="my-2 flex gap-2.5 bg-indigo-50 border border-indigo-100 rounded-xl px-3.5 py-3">
              <span className="text-indigo-400 shrink-0 mt-0.5">💡</span>
              <div className="text-sm text-indigo-800 leading-relaxed">{children}</div>
            </div>
          ),
          code: ({ inline, children, ...props }: any) =>
            inline
              ? <code className="px-1.5 py-0.5 bg-gray-100 text-indigo-700 rounded text-xs font-mono" {...props}>{children}</code>
              : <pre className="my-2 p-3 bg-gray-50 border border-gray-100 rounded-xl overflow-x-auto"><code className="text-xs font-mono text-gray-700">{children}</code></pre>,
          table: ({ children }) => (
            <div className="my-3 w-full overflow-x-auto rounded-xl border border-gray-100 shadow-sm">
              <table className="w-full text-xs border-collapse">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-indigo-50 border-b border-indigo-100">{children}</thead>,
          tbody: ({ children }) => <tbody className="divide-y divide-gray-50">{children}</tbody>,
          tr:   ({ children }) => <tr className="hover:bg-gray-50 transition-colors">{children}</tr>,
          th:   ({ children }) => <th className="px-3 py-2 text-left text-xs font-semibold text-indigo-700 uppercase tracking-wide whitespace-nowrap">{children}</th>,
          td:   ({ children }) => <td className="px-3 py-2 text-xs text-gray-700 whitespace-nowrap">{children}</td>,
          a:    ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-800 underline underline-offset-2">{children}</a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────
export default function RentalAI() {
  const user = useAuthStore((s) => s.user);

  const [open,     setOpen]     = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input,    setInput]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  // Position & size state
  const [pos,  setPos]  = useState(defaultPos);
  const [size, setSize] = useState({ w: DEFAULT_W, h: DEFAULT_H });

  // Drag state (refs so we don't re-render mid-drag)
  const dragging   = useRef(false);
  const resizing   = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const resizeStart = useRef({ mx: 0, my: 0, w: 0, h: 0, x: 0, y: 0, dir: '' });

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLTextAreaElement>(null);
  const panelRef  = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // ── Drag handlers ─────────────────────────────────────────────────────
  const onHeaderMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return; // don't drag on buttons
    e.preventDefault();
    dragging.current = true;
    dragOffset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
  }, [pos]);

  // ── Resize handlers ───────────────────────────────────────────────────
  const onResizeMouseDown = useCallback((dir: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    resizing.current = true;
    resizeStart.current = {
      mx: e.clientX, my: e.clientY,
      w: size.w, h: size.h,
      x: pos.x,  y: pos.y,
      dir,
    };
  }, [size, pos]);

  // ── Global mouse move / up ────────────────────────────────────────────
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (dragging.current) {
        const nx = e.clientX - dragOffset.current.x;
        const ny = e.clientY - dragOffset.current.y;
        // Clamp inside viewport
        setPos({
          x: Math.max(0, Math.min(nx, window.innerWidth  - size.w)),
          y: Math.max(0, Math.min(ny, window.innerHeight - size.h)),
        });
      }
      if (resizing.current) {
        const { mx, my, w, h, x, y, dir } = resizeStart.current;
        const dx = e.clientX - mx;
        const dy = e.clientY - my;

        let nw = w, nh = h, nx = x, ny = y;

        // Right edge
        if (dir.includes('e')) nw = Math.max(MIN_W, Math.min(MAX_W, w + dx));
        // Left edge
        if (dir.includes('w')) {
          nw = Math.max(MIN_W, Math.min(MAX_W, w - dx));
          nx = x + (w - nw);
        }
        // Bottom edge
        if (dir.includes('s')) nh = Math.max(MIN_H, Math.min(MAX_H, h + dy));
        // Top edge
        if (dir.includes('n')) {
          nh = Math.max(MIN_H, Math.min(MAX_H, h - dy));
          ny = y + (h - nh);
        }

        setSize({ w: nw, h: nh });
        setPos({ x: nx, y: ny });
      }
    };
    const onUp = () => {
      dragging.current = false;
      resizing.current = false;
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup',   onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup',   onUp);
    };
  }, [size.w, size.h]);

  if (!user) return null;

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    setError('');
    setInput('');
    const newUserMsg: ChatMessage = { role: 'user', content: trimmed };
    const updated = [...messages, newUserMsg];
    setMessages(updated);
    setLoading(true);
    try {
      const { reply } = await aiApi.chat(messages, trimmed);
      setMessages([...updated, { role: 'assistant', content: reply }]);
    } catch (e: any) {
      setError(e?.response?.data?.error || 'RENTAL AI is temporarily unavailable. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
  };

  const clearChat = () => { setMessages([]); setError(''); };
  const firstName  = user.email.split('@')[0];

  // Resize handle style helper
  const rh = (dir: string, extra: string) => ({
    className: `absolute z-10 ${extra}`,
    onMouseDown: onResizeMouseDown(dir),
  });

  return (
    <>
      {/* ── FAB trigger ─────────────────────────────────────────────── */}
      {!open && (
        <button
          onClick={() => { setOpen(true); setPos(defaultPos()); }}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 bg-indigo-600 hover:bg-indigo-700 text-white pl-4 pr-5 py-3 rounded-full shadow-lg shadow-indigo-300 transition-all duration-200 hover:scale-105"
          aria-label="Open RENTAL AI"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z" />
          </svg>
          <span className="text-sm font-bold tracking-wide">RENTAL AI</span>
          <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-green-400 rounded-full border-2 border-white" />
        </button>
      )}

      {/* ── Draggable / Resizable Chat Panel ────────────────────────── */}
      {open && (
        <div
          ref={panelRef}
          className="fixed z-50 flex flex-col bg-white rounded-2xl overflow-hidden select-none"
          style={{
            left:   pos.x,
            top:    pos.y,
            width:  size.w,
            height: size.h,
            boxShadow: '0 24px 64px rgba(0,0,0,0.16), 0 4px 24px rgba(79,70,229,0.12)',
          }}
        >
          {/* ── Resize handles (8 directions) ── */}
          {/* Edges */}
          <div {...rh('n',  'top-0 left-2 right-2 h-1.5 cursor-n-resize')} />
          <div {...rh('s',  'bottom-0 left-2 right-2 h-1.5 cursor-s-resize')} />
          <div {...rh('e',  'right-0 top-2 bottom-2 w-1.5 cursor-e-resize')} />
          <div {...rh('w',  'left-0 top-2 bottom-2 w-1.5 cursor-w-resize')} />
          {/* Corners */}
          <div {...rh('nw', 'top-0 left-0 w-3 h-3 cursor-nw-resize')} />
          <div {...rh('ne', 'top-0 right-0 w-3 h-3 cursor-ne-resize')} />
          <div {...rh('sw', 'bottom-0 left-0 w-3 h-3 cursor-sw-resize')} />
          <div {...rh('se', 'bottom-0 right-0 w-3 h-3 cursor-se-resize')} />

          {/* ── Header (drag handle) ────────────────────────────────── */}
          <div
            onMouseDown={onHeaderMouseDown}
            className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-100 bg-white shrink-0 cursor-grab active:cursor-grabbing"
            style={{ userSelect: 'none' }}
          >
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center shrink-0 shadow-sm">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-gray-900 tracking-wide">RENTAL AI</span>
                <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                  Live
                </span>
              </div>
              <p className="text-xs text-gray-400 truncate">Your ERP Operations Assistant</p>
            </div>

            {/* Header action buttons */}
            <div className="flex items-center gap-1">
              {/* Reset size */}
              <button
                onClick={() => { setSize({ w: DEFAULT_W, h: DEFAULT_H }); setPos(defaultPos()); }}
                title="Reset position & size"
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 9V4.5M9 9H4.5M9 9 3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5 5.25 5.25" />
                </svg>
              </button>
              {messages.length > 0 && (
                <button onClick={clearChat} title="Clear chat" className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                  </svg>
                </button>
              )}
              <button onClick={() => setOpen(false)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Drag grip indicator */}
            <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5 opacity-20">
              {[...Array(6)].map((_, i) => <div key={i} className="w-0.5 h-0.5 rounded-full bg-gray-500" />)}
            </div>
          </div>

          {/* ── Messages ─────────────────────────────────────────────── */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5 bg-gray-50/40">

            {/* Welcome screen */}
            {messages.length === 0 && (
              <div className="flex flex-col items-center text-center pt-6 pb-2">
                <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mb-4">
                  <svg className="w-7 h-7 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z" />
                  </svg>
                </div>
                <h3 className="text-base font-bold text-gray-800 mb-1">Hello, {firstName} 👋</h3>
                <p className="text-sm text-gray-500 max-w-[300px]">
                  I'm your ERP assistant. Ask me about equipment, invoices, operators, or anything in the system.
                </p>
                <div className="mt-5 w-full grid grid-cols-2 gap-2">
                  {QUICK_PROMPTS.map((p) => (
                    <button
                      key={p.label}
                      onClick={() => sendMessage(p.value)}
                      className="text-left px-3 py-2.5 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 transition-all cursor-pointer shadow-sm"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Message thread */}
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                {msg.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center shrink-0 mt-0.5">
                    <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z" />
                    </svg>
                  </div>
                )}
                {msg.role === 'user' ? (
                  <div className="max-w-[78%] bg-indigo-600 text-white text-sm leading-relaxed px-4 py-2.5 rounded-2xl rounded-tr-sm">
                    {msg.content}
                  </div>
                ) : (
                  <div className="flex-1 min-w-0 bg-white border border-gray-100 rounded-2xl rounded-tl-sm shadow-sm px-4 py-3 overflow-hidden">
                    <AIMessage content={msg.content} />
                  </div>
                )}
              </div>
            ))}

            {/* Loading dots */}
            {loading && (
              <div className="flex gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center shrink-0">
                  <svg className="w-3.5 h-3.5 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                </div>
                <div className="bg-white border border-gray-100 shadow-sm rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2.5">
                  <span className="flex gap-1">
                    {[0, 150, 300].map((d) => (
                      <span key={d} className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: `${d}ms` }} />
                    ))}
                  </span>
                  <span className="text-xs text-gray-400 font-medium">Checking system data…</span>
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl px-3.5 py-3 text-sm text-red-700">
                <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                </svg>
                {error}
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Quick prompts strip */}
          {messages.length > 0 && !loading && (
            <div className="px-4 py-2 flex gap-2 overflow-x-auto shrink-0 border-t border-gray-100 bg-white" style={{ scrollbarWidth: 'none' }}>
              {QUICK_PROMPTS.map((p) => (
                <button
                  key={p.label}
                  onClick={() => sendMessage(p.value)}
                  className="shrink-0 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 px-3 py-1.5 rounded-full transition-colors cursor-pointer whitespace-nowrap"
                >
                  {p.label}
                </button>
              ))}
            </div>
          )}

          {/* Input bar */}
          <div className="px-4 py-3.5 border-t border-gray-100 bg-white shrink-0">
            <div className="flex items-end gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100 transition-all">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask RENTAL AI anything…"
                rows={1}
                disabled={loading}
                className="flex-1 bg-transparent text-sm text-gray-800 placeholder-gray-400 resize-none outline-none leading-relaxed max-h-28 overflow-y-auto disabled:opacity-50"
                style={{ minHeight: '20px' }}
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || loading}
                className="shrink-0 w-8 h-8 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-200 disabled:cursor-not-allowed text-white rounded-lg flex items-center justify-center transition-colors cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
                </svg>
              </button>
            </div>
            <p className="text-center text-xs text-gray-400 mt-2">Enter to send · Shift+Enter for newline</p>
          </div>
        </div>
      )}
    </>
  );
}
