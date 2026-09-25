"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, MessageSquare, Plus, Send, Trash2 } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { coachFollowUpPrompts } from "@/lib/coachFollowUps";
import { MarkdownContent } from "@/components/MarkdownContent";
import { BackLink } from "@/components/ui/BackLink";
import { IMAGES } from "@/lib/imagery";

interface Thread {
  id: string;
  title: string;
  updated_at: string;
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

function FollowUpPrompts({
  prompts,
  onSelect,
}: {
  prompts: string[];
  onSelect: (text: string) => void;
}) {
  if (!prompts.length) return null;
  return (
    <div className="pt-2 space-y-2">
      <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--text-muted)]">
        Try asking
      </p>
      <div className="flex flex-col gap-2">
        {prompts.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onSelect(s)}
            className="btn-ghost text-left text-sm w-full"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

function CoachChat() {
  const searchParams = useSearchParams();
  const contextKey = searchParams.get("context");
  const [threads, setThreads] = useState<Thread[]>([]);
  const [threadPage, setThreadPage] = useState(1);
  const [threadPages, setThreadPages] = useState(1);
  const [currentThreadId, setCurrentThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [raceContext, setRaceContext] = useState<{
    days_to_race?: number;
    event_type?: string;
  } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const contextPromptSent = useRef(false);

  const followUps = useMemo(
    () => coachFollowUpPrompts(messages, loading),
    [messages, loading]
  );

  useEffect(() => {
    fetchThreads();
    apiFetch<{ days_to_race?: number; event_type?: string }>("/api/today")
      .then((t) => setRaceContext(t))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!contextKey || contextPromptSent.current || currentThreadId) return;
    const prompts: Record<string, string> = {
      weekly_brief: "Here's my weekly brief — help me interpret it and what to focus on next.",
      acwr: "Explain my current ACWR and whether I should adjust this week's training.",
      zones: "Review my heart rate zone distribution and am I doing enough Zone 2?",
    };
    const msg = prompts[contextKey];
    if (msg) {
      contextPromptSent.current = true;
      handleSendMessage(undefined, msg);
    }
  }, [contextKey, currentThreadId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, followUps]);

  useEffect(() => {
    if (currentThreadId) fetchMessages(currentThreadId);
    else setMessages([]);
  }, [currentThreadId]);

  const fetchThreads = async (page = threadPage) => {
    try {
      const data = await apiFetch<{
        threads: Thread[];
        page: number;
        total_pages: number;
      }>(`/api/chat/threads?page=${page}&page_size=15`);
      setThreads(data.threads);
      setThreadPage(data.page);
      setThreadPages(data.total_pages);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchMessages = async (threadId: string) => {
    const all: Message[] = [];
    let page = 1;
    let totalPages = 1;
    while (page <= totalPages) {
      const data = await apiFetch<{
        messages: Message[];
        total_pages: number;
      }>(`/api/chat/threads/${threadId}/messages?page=${page}&page_size=50`);
      all.push(...data.messages);
      totalPages = data.total_pages;
      page += 1;
    }
    setMessages(all);
  };

  const handleCreateThread = async () => {
    const data = await apiFetch<{ thread_id: string; title: string }>("/api/chat/threads", {
      method: "POST",
      body: JSON.stringify({ title: "New chat", context: { source: contextKey } }),
    });
    setThreads([
      { id: data.thread_id, title: data.title, updated_at: new Date().toISOString() },
      ...threads,
    ]);
    setCurrentThreadId(data.thread_id);
    setMessages([]);
  };

  const handleDeleteThread = async (threadId: string) => {
    if (!window.confirm("Delete this conversation? This cannot be undone.")) return;
    try {
      await apiFetch(`/api/chat/threads/${threadId}`, { method: "DELETE" });
      if (currentThreadId === threadId) {
        setCurrentThreadId(null);
        setMessages([]);
      }
      fetchThreads();
    } catch (e) {
      console.error(e);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent, override?: string) => {
    if (e) e.preventDefault();
    const text = override || inputMessage;
    if (!text.trim() || loading) return;

    let threadId = currentThreadId;
    if (!threadId) {
      const data = await apiFetch<{ thread_id: string }>("/api/chat/threads", {
        method: "POST",
        body: JSON.stringify({ title: "New chat" }),
      });
      threadId = data.thread_id;
      setCurrentThreadId(threadId);
    }

    if (!override) setInputMessage("");
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setLoading(true);
    try {
      const data = await apiFetch<{ response: string }>("/api/chat/message", {
        method: "POST",
        body: JSON.stringify({
          thread_id: threadId,
          user_input: text,
          context: contextKey ? { metric: contextKey } : undefined,
        }),
      });
      setMessages((prev) => [...prev, { role: "assistant", content: data.response }]);
      await fetchThreads();
    } catch (err) {
      let detail =
        "I couldn't reach the coaching engine. Check that the API is running and your Gemini key is set.";
      if (err instanceof Error) {
        try {
          const parsed = JSON.parse(err.message);
          if (parsed.detail) detail = String(parsed.detail);
        } catch {
          if (err.message.includes("503") || err.message.toLowerCase().includes("unavailable")) {
            detail =
              "Gemini is temporarily overloaded (503). Wait a minute and try again, or set GEMINI_MODEL=gemini-2.0-flash in backend/.env.";
          }
        }
      }
      setMessages((prev) => [...prev, { role: "assistant", content: detail }]);
    } finally {
      setLoading(false);
    }
  };

  const showFollowUps = !loading && followUps.length > 0;

  return (
    <div className="flex flex-1 min-h-0 h-full w-full">
      <div className="hidden lg:flex w-[260px] shrink-0 flex-col min-h-0 border-r border-[var(--border)] bg-[var(--card)]">
        <div className="p-3 border-b border-[var(--border)] shrink-0">
          <button onClick={handleCreateThread} className="btn-primary w-full text-sm">
            <Plus className="w-4 h-4" />
            New chat
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto p-2">
          {threads.map((t) => {
            const active = currentThreadId === t.id;
            return (
              <div
                key={t.id}
                className={`group flex items-stretch gap-0.5 rounded-lg mb-0.5 ${
                  active ? "bg-[var(--bg-subtle)]" : "hover:bg-[var(--bg-muted)]"
                }`}
              >
                <button
                  type="button"
                  onClick={() => setCurrentThreadId(t.id)}
                  className={`flex flex-1 min-w-0 items-start gap-2 text-left px-2.5 py-2.5 transition ${
                    active ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]"
                  }`}
                >
                  <MessageSquare className="w-4 h-4 mt-0.5 shrink-0 text-[var(--text-muted)]" />
                  <span className="text-sm line-clamp-2 leading-snug">{t.title}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteThread(t.id)}
                  className="shrink-0 px-2 self-center rounded-md text-[var(--text-muted)] opacity-0 group-hover:opacity-100 hover:text-red-600 hover:bg-red-50 transition"
                  aria-label={`Delete ${t.title}`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
        {threadPages > 1 && (
          <div className="shrink-0 p-2 border-t border-[var(--border)] flex items-center justify-between gap-2">
            <button
              type="button"
              disabled={threadPage <= 1}
              onClick={() => fetchThreads(threadPage - 1)}
              className="btn-ghost text-xs px-2 py-1 disabled:opacity-40"
            >
              Prev
            </button>
            <span className="font-mono text-[10px] text-[var(--text-muted)]">
              {threadPage}/{threadPages}
            </span>
            <button
              type="button"
              disabled={threadPage >= threadPages}
              onClick={() => fetchThreads(threadPage + 1)}
              className="btn-ghost text-xs px-2 py-1 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 flex flex-col min-h-0 min-w-0">
        <div className="shrink-0 min-h-[96px] sm:h-28 relative overflow-hidden">
          <img
            src={IMAGES.coach}
            alt=""
            className="absolute inset-0 h-full w-full object-cover object-center"
            decoding="async"
            draggable={false}
          />
          <div className="absolute inset-0 grain opacity-70" aria-hidden />
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/45 to-black/20" />
          <div className="relative z-10 h-full px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
            <div className="text-white min-w-0">
              <h1 className="text-4xl sm:text-5xl leading-none">
                <span className="headline">Coach</span>
                <span className="serif-accent text-white/80 ml-2 text-[0.7em]">on call</span>
              </h1>
              <p className="text-xs text-white/75 mt-1">Answers grounded in your Strava data</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {raceContext?.days_to_race != null && (
                <span className="badge-pill">
                  {raceContext.event_type ?? "Race"} · {raceContext.days_to_race}d
                </span>
              )}
              <div className="lg:hidden flex items-center gap-2">
                <select
                  value={currentThreadId ?? ""}
                  onChange={(e) => setCurrentThreadId(e.target.value || null)}
                  className="max-w-[160px] sm:max-w-[220px] text-xs rounded-lg bg-black/40 text-white border border-white/30 px-2 py-2"
                  aria-label="Conversation"
                >
                  <option value="">New conversation</option>
                  {threads.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleCreateThread}
                  className="btn-ghost-on-dark p-2"
                  aria-label="New chat"
                >
                  <Plus className="w-4 h-4" />
                </button>
                {currentThreadId && (
                  <button
                    type="button"
                    onClick={() => handleDeleteThread(currentThreadId)}
                    className="btn-ghost-on-dark p-2"
                    aria-label="Delete conversation"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              <span className="hidden md:inline-flex">
                <BackLink href="/home" label="Dashboard" />
              </span>
            </div>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-5 py-5">
          <div className="max-w-2xl mx-auto space-y-4">
            {messages.length === 0 && !loading && (
              <div className="py-8 text-center">
                <h2 className="section-title text-3xl mb-3">What are we training for?</h2>
                <p className="text-sm text-[var(--text-secondary)] mb-6">
                  Load, zones, race builds — ask anything.
                </p>
                <FollowUpPrompts prompts={followUps} onSelect={(s) => handleSendMessage(undefined, s)} />
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                {m.role === "user" ? (
                  <div className="max-w-[88%] rounded-2xl rounded-br-sm px-4 py-2.5 bg-[var(--ink)] text-white text-[15px] leading-relaxed">
                    {m.content}
                  </div>
                ) : (
                  <div className="max-w-[95%] w-full surface px-4 py-3">
                    <MarkdownContent content={m.content} />
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex items-center gap-2 text-[var(--text-secondary)] text-sm">
                <Loader2 className="w-4 h-4 animate-spin text-[var(--signal)]" />
                Analyzing your training…
              </div>
            )}
            {showFollowUps && messages.length > 0 && (
              <FollowUpPrompts
                prompts={followUps}
                onSelect={(s) => handleSendMessage(undefined, s)}
              />
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        <footer className="shrink-0 border-t border-[var(--border)] p-3 sm:p-4 bg-[var(--card)]">
          <form onSubmit={handleSendMessage} className="max-w-2xl mx-auto flex gap-2 items-end">
            <textarea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              rows={1}
              className="input-field flex-1 min-h-[44px] max-h-28 resize-none py-2.5"
              placeholder="Ask your coach…"
            />
            <button
              type="submit"
              disabled={loading || !inputMessage.trim()}
              className="btn-signal h-11 w-11 shrink-0 p-0 flex items-center justify-center disabled:opacity-40"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </footer>
      </div>
    </div>
  );
}

export default function CoachPage() {
  return (
    <React.Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center text-[var(--text-muted)] text-sm">
          Loading coach…
        </div>
      }
    >
      <CoachChat />
    </React.Suspense>
  );
}
