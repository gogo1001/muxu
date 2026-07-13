import { useState, type KeyboardEvent } from "react";
import { Send, Smile, X } from "lucide-react";
import { useAppStore } from "@/store/app";

export default function InputBar() {
  const conversations = useAppStore((s) => s.conversations);
  const activeConversationId = useAppStore((s) => s.activeConversationId);
  const send = useAppStore((s) => s.send);
  const sendStickerInConv = useAppStore((s) => s.sendStickerInConv);
  const stickers = useAppStore((s) => s.stickers);
  const [text, setText] = useState("");
  const [showStickers, setShowStickers] = useState(false);

  const activeConv = conversations.find((c) => c.id === activeConversationId);
  const isGroup = activeConv?.type === "group";

  const onSend = () => {
    if (!text.trim() || !activeConv) return;
    send(activeConv.id, text);
    setText("");
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  const onPickSticker = (image: string) => {
    if (!activeConv) return;
    sendStickerInConv(activeConv.id, image, "me");
    setShowStickers(false);
  };

  const placeholder = isGroup
    ? "说点什么吧"
    : "说点什么吧（Enter 发送）";

  return (
    <div
      className="border-t px-4 py-3 backdrop-blur md:px-8"
      style={{
        borderColor: "var(--card-border)",
        background: "color-mix(in srgb, var(--bg-deep) 70%, transparent)",
      }}
    >
      {showStickers && (
        <div
          className="mx-auto mb-2 max-w-3xl animate-slideUp rounded-2xl border p-2"
          style={{
            borderColor: "var(--card-border)",
            background: "var(--card)",
          }}
        >
          <div className="mb-1 flex items-center justify-between px-1">
            <span className="text-[11px]" style={{ color: "var(--text-soft)" }}>
              表情包 · 点击发送
            </span>
            <button
              onClick={() => setShowStickers(false)}
              className="flex h-6 w-6 items-center justify-center rounded-full transition hover:bg-black/10"
              style={{ color: "var(--text-soft)" }}
              aria-label="关闭"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="fancy-scroll max-h-40 overflow-y-auto">
            {stickers.length === 0 ? (
              <div
                className="py-6 text-center text-[11px]"
                style={{ color: "var(--text-soft)" }}
              >
                暂无表情包，去「设置 → 字卡库 → 表情包」导入
              </div>
            ) : (
              <div className="grid grid-cols-6 gap-1.5 p-1 sm:grid-cols-8">
                {stickers.map((st) => (
                  <button
                    key={st.id}
                    onClick={() => onPickSticker(st.image)}
                    className="aspect-square overflow-hidden rounded-lg transition active:scale-90"
                    style={{
                      background: "var(--bg)",
                      border: "1px solid var(--card-border)",
                    }}
                  >
                    <img
                      src={st.image}
                      alt="sticker"
                      className="h-full w-full object-contain"
                      draggable={false}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="mx-auto flex max-w-3xl items-end gap-2">
        <button
          onClick={() => setShowStickers(!showStickers)}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border transition hover:bg-black/5"
          style={{
            borderColor: showStickers ? "var(--accent)" : "var(--card-border)",
            background: showStickers ? "var(--accent)" : "var(--card)",
            color: showStickers ? "var(--card)" : "var(--text-soft)",
          }}
          aria-label="表情包"
          title="表情包"
        >
          <Smile className="h-5 w-5" />
        </button>
        <div
          className="flex-1 rounded-2xl border px-4 py-2.5 shadow-inner focus-within:border-[var(--accent)]"
          style={{
            background: "var(--card)",
            borderColor: "var(--card-border)",
          }}
        >
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKeyDown}
            rows={1}
            placeholder={placeholder}
            className="block w-full resize-none bg-transparent text-[15px] leading-relaxed placeholder:opacity-50 focus:outline-none"
            style={{ color: "var(--text)" }}
          />
        </div>
        <button
          onClick={onSend}
          disabled={!text.trim()}
          className="group flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl transition disabled:cursor-not-allowed"
          style={{
            background: "var(--accent)",
            color: "var(--card)",
            boxShadow: "0 2px 0 rgba(0,0,0,0.15)",
            opacity: !text.trim() ? 0.4 : 1,
          }}
          aria-label="发送"
        >
          <Send className="h-5 w-5 transition group-hover:-translate-y-0.5" />
        </button>
      </div>
    </div>
  );
}
