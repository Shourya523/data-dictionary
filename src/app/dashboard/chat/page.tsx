"use client";

import DashboardLayout from "../../../components/dashboard/DashboardLayout";
import { useState } from "react";
import { Send, Bot, User } from "lucide-react";
import { Button } from "../../../components/ui/button";

type Message = { role: "user" | "assistant"; content: string };

const responses: Record<string, string> = {
  "what does the billing table store": "The **billing** table stores invoice and payment records. Key columns: `invoice_id`, `customer_id` (FK → users), `amount`, `currency`, `status`, `created_at`. ~890K rows, classified as **Financial**.",
  "which fields contain sensitive data": "**38 sensitive fields** found:\n\n• PII (24): email, full_name, phone in `users`, `user_profiles`\n• Financial (11): amount, card_last4 in `payments`, `invoices`\n• Auth (3): password_hash, session_token in `users`, `sessions`"
};

const ChatPage = () => {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Ask me anything about your database." },
  ]);
  const [input, setInput] = useState("");

  const send = () => {
    if (!input.trim()) return;
    const text = input.trim();
    setMessages((m) => [...m, { role: "user", content: text }]);
    setInput("");
    const key = Object.keys(responses).find((k) => text.toLowerCase().includes(k));
    const reply = key ? responses[key] : `Here's what I found about "${text}" — this is a prototype response. In production, DataLens AI queries your live schema.`;
    setTimeout(() => setMessages((m) => [...m, { role: "assistant", content: reply }]), 600);
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col h-[calc(100vh-5rem)]">
        <div className="mb-4">
          <h1 className="text-xl font-semibold">AI Chat</h1>
          <p className="text-sm text-muted-foreground mt-1">Ask about your data in plain language.</p>
        </div>

        <div className="flex-1 overflow-auto rounded-xl border border-border bg-card p-5 space-y-4 mb-4">
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}>
              {msg.role === "assistant" && (
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Bot className="w-3.5 h-3.5 text-primary" />
                </div>
              )}
              <div className={`max-w-[70%] rounded-xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-secondary"
              }`}>
                <p className="whitespace-pre-wrap">{msg.content}</p>
              </div>
              {msg.role === "user" && (
                <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center shrink-0">
                  <User className="w-3.5 h-3.5 text-muted-foreground" />
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Ask about your data..."
            className="flex-1 h-11 px-4 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <Button onClick={send} size="icon" className="h-11 w-11">
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ChatPage;