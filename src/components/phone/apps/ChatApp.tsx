import { useEffect, useState } from "react";
import { AppHeader } from "./HomeScreen";
import { PetCanvas } from "./PetApp";
import { useAppStore } from "@/store/app";
import { DEFAULT_PET_CONFIG, type BallPetConfig } from "@/types/pet";
import { Eye } from "lucide-react";

export default function ChatApp({ onBack }: { onBack: () => void }) {
  const contacts = useAppStore((s) => s.contacts);
  const conversations = useAppStore((s) => s.conversations);
  const activeConversationId = useAppStore((s) => s.activeConversationId);
  const toggleView = useAppStore((s) => s.toggleView);
  const beauty = useAppStore((s) => s.beauty);

  const activeConv = conversations.find((c) => c.id === activeConversationId);
  const contactId = activeConv?.type === "private" ? activeConv.memberIds[0] : contacts[0]?.id;
  const contact = contacts.find((c) => c.id === contactId);

  // 本会话独立的宠物配置
  const [petConfig, setPetConfig] = useState<BallPetConfig>(DEFAULT_PET_CONFIG);
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`muxu-pet-${activeConversationId}`);
      setPetConfig(saved ? { ...DEFAULT_PET_CONFIG, ...JSON.parse(saved) } : { ...DEFAULT_PET_CONFIG });
    } catch {
      setPetConfig({ ...DEFAULT_PET_CONFIG });
    }
  }, [activeConversationId]);

  if (!activeConv || !contact) return null;

  const messages = activeConv.messages;
  const view = activeConv.view;
  const isHer = view === "her";
  const herName = contact.name;
  const myName = beauty.myName;
  const herAvatar = contact.avatar;
  const myAvatar = beauty.myAvatar;

  return (
    <div className="flex h-full flex-col">
      <AppHeader title={`和${myName}的聊天`} onBack={onBack} />
      <div className="fancy-scroll flex-1 overflow-y-auto px-3 py-3">
        {/* 本会话的宠物展示 */}
        <div
          className="mb-3 flex items-center justify-center rounded-2xl py-2"
          style={{ background: "color-mix(in srgb, var(--accent) 8%, transparent)" }}
        >
          <PetCanvas config={petConfig} size={120} />
        </div>
        <div className="flex flex-col gap-3">
          {messages.slice(-30).map((m, i) => {
            const herSide = m.sender === contactId;
            const prev = messages[messages.length - 30 + i - 1];
            const showAvatar = !prev || prev.sender !== m.sender;
            return (
              <div
                key={m.id}
                className={`flex items-center gap-1.5 ${herSide ? "justify-end" : "justify-start"}`}
              >
                {!herSide && (
                  <div className="w-7 shrink-0">
                    {showAvatar && (
                      <div
                        className="flex h-7 w-7 items-center justify-center rounded-full text-[10px]"
                        style={{ background: "var(--accent)", color: "var(--card)" }}
                      >
                        {myAvatar}
                      </div>
                    )}
                  </div>
                )}
                {m.type === "sticker" && m.sticker ? (
                  <img src={m.sticker} alt="sticker" className="max-h-20 max-w-[60%] rounded-lg object-contain" />
                ) : (
                  <div
                    className="max-w-[70%] rounded-2xl px-2.5 py-1.5 text-[11px]"
                    style={{
                      background: herSide ? "var(--accent)" : "var(--card)",
                      color: herSide ? "var(--card)" : "var(--text)",
                      border: herSide ? "none" : "1px solid var(--card-border)",
                    }}
                  >
                    {m.text}
                    {m.moodNote && (
                      <div className="mt-0.5 text-[9px] opacity-70">🌸 {m.moodNote}</div>
                    )}
                  </div>
                )}
                {herSide && (
                  <div className="w-7 shrink-0">
                    {showAvatar && (
                      <div
                        className="flex h-7 w-7 items-center justify-center rounded-full text-[10px]"
                        style={{ background: "var(--text)", color: "var(--card)" }}
                      >
                        {herAvatar}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      <div className="border-t px-3 py-2" style={{ borderColor: "var(--card-border)" }}>
        <button
          onClick={() => toggleView(activeConv.id)}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg py-1.5 text-[11px] font-medium transition active:scale-95"
          style={{
            background: "color-mix(in srgb, var(--accent) 12%, transparent)",
            color: "var(--accent)",
          }}
        >
          <Eye className="h-3.5 w-3.5" />
          {isHer ? `回到${myName}的视角` : `偷看${herName}的视角`}
        </button>
      </div>
    </div>
  );
}
