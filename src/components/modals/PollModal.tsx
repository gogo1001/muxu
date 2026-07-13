import React, { useState } from "react";
import { X } from "lucide-react";
import { useAppStore } from "@/store/app";

interface PollModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PollModal({ isOpen, onClose }: PollModalProps) {
  const conversations = useAppStore((s) => s.conversations);
  const activeConversationId = useAppStore((s) => s.activeConversationId);
  const sendPoll = useAppStore((s) => s.sendPoll);

  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOption1, setPollOption1] = useState("");
  const [pollOption2, setPollOption2] = useState("");

  const activeConv = conversations.find((c) => c.id === activeConversationId);

  const handleSendPoll = () => {
    const q = pollQuestion.trim();
    const o1 = pollOption1.trim();
    const o2 = pollOption2.trim();
    if (!q || !o1 || !o2 || !activeConv) return;
    sendPoll(activeConv.id, q, [o1, o2]);
    setPollQuestion("");
    setPollOption1("");
    setPollOption2("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        className="relative w-[90%] max-w-sm animate-popIn rounded-2xl border p-4 shadow-2xl"
        style={{
          borderColor: "var(--card-border)",
          background: "var(--card)",
        }}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold" style={{ color: "var(--text)" }}>
            发起投票
          </h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full transition hover:bg-black/10"
            style={{ color: "var(--text-soft)" }}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm" style={{ color: "var(--text-soft)" }}>
              投票问题
            </label>
            <input
              value={pollQuestion}
              onChange={(e) => setPollQuestion(e.target.value)}
              placeholder="输入问题..."
              className="w-full rounded-xl border px-4 py-2.5 text-sm focus:outline-none"
              style={{
                borderColor: "var(--card-border)",
                background: "var(--bg)",
                color: "var(--text)",
              }}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm" style={{ color: "var(--text-soft)" }}>
              选项 1
            </label>
            <input
              value={pollOption1}
              onChange={(e) => setPollOption1(e.target.value)}
              placeholder="输入选项..."
              className="w-full rounded-xl border px-4 py-2.5 text-sm focus:outline-none"
              style={{
                borderColor: "var(--card-border)",
                background: "var(--bg)",
                color: "var(--text)",
              }}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm" style={{ color: "var(--text-soft)" }}>
              选项 2
            </label>
            <input
              value={pollOption2}
              onChange={(e) => setPollOption2(e.target.value)}
              placeholder="输入选项..."
              className="w-full rounded-xl border px-4 py-2.5 text-sm focus:outline-none"
              style={{
                borderColor: "var(--card-border)",
                background: "var(--bg)",
                color: "var(--text)",
              }}
            />
          </div>

          <button
            onClick={handleSendPoll}
            disabled={!pollQuestion.trim() || !pollOption1.trim() || !pollOption2.trim()}
            className="w-full rounded-xl py-3 font-medium transition disabled:opacity-40"
            style={{
              background: "var(--accent)",
              color: "var(--card)",
            }}
          >
            发起投票
          </button>
        </div>
      </div>
    </div>
  );
}