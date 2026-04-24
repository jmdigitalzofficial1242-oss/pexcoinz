import { useState, useRef, useEffect, useCallback } from "react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Send, MessageCircle, User, Headphones, RefreshCw } from "lucide-react";
import { useGetMe } from "@workspace/api-client-react";
import { getToken } from "@/lib/auth-utils";
import { Link } from "react-router-dom";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface SupportMessage {
  id: number;
  ticketId: number;
  senderId: number | null;
  senderRole: "user" | "admin";
  content: string;
  isRead: boolean;
  createdAt: string;
}

interface SupportTicket {
  id: number;
  userId: number;
  subject: string;
  status: string;
  lastMessageAt: string;
  createdAt: string;
}

async function apiCall(path: string, opts?: RequestInit) {
  const token = getToken();
  return fetch(`${BASE}/api${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts?.headers ?? {}),
    },
  });
}

const STATUS_COLORS: Record<string, string> = {
  open: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  answered: "bg-green-500/15 text-green-400 border-green-500/30",
  closed: "bg-muted text-muted-foreground",
};

export default function Support() {
  const { data: user } = useGetMe({ query: { retry: false } });
  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const scrollToBottom = () => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  };

  const loadTicket = useCallback(async () => {
    const token = getToken();
    if (!token) { setLoading(false); return; }
    try {
      const res = await apiCall("/support/ticket");
      if (res.ok) {
        const data = await res.json();
        setTicket(data.ticket);
        setMessages(data.messages);
        setError(null);
      } else {
        setError("Failed to load support chat.");
      }
    } catch {
      setError("Could not connect to support.");
    } finally {
      setLoading(false);
    }
  }, []);

  const pollMessages = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    try {
      const res = await apiCall("/support/ticket");
      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => {
          if (prev.length !== data.messages.length) {
            scrollToBottom();
          }
          return data.messages;
        });
        setTicket(data.ticket);
      }
    } catch {}
  }, []);

  useEffect(() => {
    loadTicket().then(scrollToBottom);
    pollingRef.current = setInterval(pollMessages, 5000);
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [loadTicket, pollMessages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || sending) return;
    const text = input.trim();
    setInput("");
    setSending(true);

    const optimistic: SupportMessage = {
      id: Date.now(),
      ticketId: ticket?.id ?? 0,
      senderId: (user as any)?.id ?? null,
      senderRole: "user",
      content: text,
      isRead: false,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    scrollToBottom();

    try {
      const res = await apiCall("/support/messages", {
        method: "POST",
        body: JSON.stringify({ content: text }),
      });
      if (res.ok) {
        await pollMessages();
      }
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
    } finally {
      setSending(false);
    }
  };

  const isLoggedIn = !!getToken();

  if (!isLoggedIn) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-[60vh] gap-4 px-4 text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Headphones className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-xl font-bold">Customer Support</h2>
          <p className="text-sm text-muted-foreground max-w-sm">
            Please log in to access our live support chat. Our team is available 24/7.
          </p>
          <Link to="/login">
            <Button className="gap-2">Sign In to Chat</Button>
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="flex flex-col h-[calc(100dvh-130px)] sm:h-[calc(100vh-4rem)] max-w-2xl mx-auto w-full">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border/40 bg-card/80 backdrop-blur-sm shrink-0">
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
            <Headphones className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm">PexCoin Support</p>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <p className="text-xs text-muted-foreground">Live Support</p>
              </div>
              {ticket && (
                <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${STATUS_COLORS[ticket.status] ?? ""}`}>
                  {ticket.status}
                </Badge>
              )}
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={loadTicket}>
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-3 sm:px-4 py-4 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="flex flex-col items-center gap-3 text-muted-foreground">
                <RefreshCw className="h-6 w-6 animate-spin" />
                <p className="text-sm">Loading chat...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center space-y-3">
                <p className="text-sm text-muted-foreground">{error}</p>
                <Button size="sm" variant="outline" onClick={loadTicket}>Try Again</Button>
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg) => {
                const isUser = msg.senderRole === "user";
                return (
                  <div key={msg.id} className={`flex items-end gap-2 ${isUser ? "justify-end" : "justify-start"}`}>
                    {!isUser && (
                      <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mb-0.5">
                        <Headphones className="h-3.5 w-3.5 text-primary" />
                      </div>
                    )}
                    <div className={`max-w-[78%] flex flex-col ${isUser ? "items-end" : "items-start"}`}>
                      {!isUser && <span className="text-[10px] text-muted-foreground mb-0.5 px-1">Support Team</span>}
                      <div className={`px-3 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words ${
                        isUser
                          ? "bg-primary text-primary-foreground rounded-br-sm"
                          : "bg-card border border-border/50 text-foreground rounded-bl-sm"
                      }`}>
                        {msg.content}
                      </div>
                      <span className="text-[10px] text-muted-foreground mt-0.5 px-1">
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    {isUser && (
                      <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0 mb-0.5">
                        <User className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </>
          )}
        </div>

        {/* Quick Replies */}
        {messages.length <= 1 && !loading && (
          <div className="px-3 sm:px-4 pb-2 flex flex-wrap gap-1.5">
            {["How do I deposit?", "How do I withdraw?", "I have a trading issue", "My balance is wrong"].map((qr) => (
              <button
                key={qr}
                onClick={() => setInput(qr)}
                className="text-xs px-2.5 py-1.5 rounded-full border border-primary/30 text-primary hover:bg-primary/10 active:bg-primary/20 transition-colors"
              >
                {qr}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="border-t border-border/40 px-3 py-2.5 flex items-center gap-2 bg-background shrink-0">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
            placeholder="Type a message..."
            className="flex-1 h-10 text-sm"
            disabled={sending || loading}
          />
          <Button size="icon" className="h-10 w-10 shrink-0" onClick={sendMessage} disabled={!input.trim() || sending || loading}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Layout>
  );
}
