import { useEffect, useMemo, useRef, useState } from "react";
import { useAppStore } from "@/store/app";
import type { Message, Contact } from "@/types";
import { Music, Play, Pause } from "lucide-react";

export default function MessageList() {
  const conversations = useAppStore((s) => s.conversations);
  const activeConversationId = useAppStore((s) => s.activeConversationId);
  const contacts = useAppStore((s) => s.contacts);
  const beauty = useAppStore((s) => s.beauty);
  const scrollRef = useRef<HTMLDivElement>(null);

  const conv = useMemo(
    () => conversations.find((c) => c.id === activeConversationId),
    [conversations, activeConversationId]
  );

  const messages = conv?.messages || [];
  const isFlipping = conv?.isFlipping || false;
  const view = conv?.view || "me";

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, isFlipping]);

  const getContactName = (senderId: string): string => {
    if (senderId === "me") return beauty.myName;
    const contact = contacts.find((c) => c.id === senderId);
    return contact?.name || "未知";
  };

  const getContact = (senderId: string): Contact | undefined => {
    return contacts.find((c) => c.id === senderId);
  };

  const getAvatarText = (senderId: string): string => {
    if (senderId === "me") return beauty.myAvatar;
    const contact = getContact(senderId);
    return contact?.avatar || "?";
  };

  const getAvatarImage = (senderId: string): string => {
    if (senderId === "me") return beauty.myAvatarImage;
    const contact = getContact(senderId);
    return contact?.avatarImage || "";
  };

  const renderTextWithMention = (text: string, mentionTarget?: string) => {
    if (!mentionTarget) return text;
    const mentionName = getContactName(mentionTarget);
    const mentionPattern = new RegExp(`(@${mentionName})`, "g");
    const parts = text.split(mentionPattern);
    return parts.map((part, i) =>
      part === `@${mentionName}` ? (
        <span key={i} className="font-semibold" style={{ color: "var(--accent)" }}>
          {part}
        </span>
      ) : (
        part
      )
    );
  };

  if (!conv) {
    return (
      <div className="chat-bg fancy-scroll flex-1 overflow-y-auto px-4 py-6 md:px-8">
        <div className="mx-auto flex max-w-3xl flex-col gap-4 items-center justify-center h-full">
          <p style={{ color: "var(--text-soft)" }}>选择一个会话开始聊天</p>
        </div>
      </div>
    );
  }

  const getSide = (sender: string): "left" | "right" => {
    if (view === "me") {
      return sender === "me" ? "right" : "left";
    } else {
      return sender === "me" ? "left" : "right";
    }
  };

  const bubbleStyle = getBubbleStyle(beauty.bubbleStyle);

  return (
    <div
      ref={scrollRef}
      className="chat-bg fancy-scroll flex-1 overflow-y-auto px-4 py-6 md:px-8"
    >
      <div className="mx-auto flex max-w-3xl flex-col gap-4">
        {messages.map((m, i) => {
          const prev = messages[i - 1];
          const showAvatar = !prev || prev.sender !== m.sender;
          const isNew = i === messages.length - 1;

          if (m.type === "system") {
            return <SystemMessage key={m.id} message={m} />;
          }

          const side = getSide(m.sender);
          const isLeft = side === "left";

          if (m.type === "rps" && m.rps) {
            return (
              <RPSBubble
                key={m.id}
                message={m}
                side={side}
                showAvatar={showAvatar}
                getContactName={getContactName}
                getAvatarText={getAvatarText}
                getAvatarImage={getAvatarImage}
                bubbleStyle={bubbleStyle}
              />
            );
          }

          if (m.type === "poll" && m.poll) {
            return (
              <PollBubble
                key={m.id}
                message={m}
                side={side}
                showAvatar={showAvatar}
                getContactName={getContactName}
                getAvatarText={getAvatarText}
                getAvatarImage={getAvatarImage}
                bubbleStyle={bubbleStyle}
              />
            );
          }

          return (
            <div key={m.id} className={`flex items-center gap-2 ${isLeft ? "justify-start" : "justify-end"}`}>
              {isLeft && (
                <div className="flex w-11 shrink-0 justify-center">
                  {showAvatar && (
                    <MessageAvatar
                      senderId={m.sender}
                      avatarText={getAvatarText(m.sender)}
                      avatarImage={getAvatarImage(m.sender)}
                    />
                  )}
                </div>
              )}
              <div className={`flex flex-col ${isLeft ? "items-start" : "items-end"} max-w-[78%]`}>
                {conv.type === "group" && isLeft && showAvatar && m.sender !== "me" && (
                  <span
                    className="mb-1 px-1 text-xs"
                    style={{ color: "color-mix(in srgb, var(--text) 60%, transparent)" }}
                  >
                    {getContactName(m.sender)}
                  </span>
                )}
                <MessageBubble
                  message={m}
                  side={side}
                  bubbleStyle={bubbleStyle}
                  renderTextWithMention={renderTextWithMention}
                  isNew={isNew}
                />
              </div>
              {!isLeft && (
                <div className="flex w-11 shrink-0 justify-center">
                  {showAvatar && (
                    <MessageAvatar
                      senderId={m.sender}
                      avatarText={getAvatarText(m.sender)}
                      avatarImage={getAvatarImage(m.sender)}
                    />
                  )}
                </div>
              )}
            </div>
          );
        })}

        {isFlipping && <FlippingHint side={view === "me" ? "left" : "right"} />}
      </div>
    </div>
  );
}

function MessageAvatar({
  senderId,
  avatarText,
  avatarImage,
  size = "md",
}: {
  senderId: string;
  avatarText: string;
  avatarImage: string;
  size?: "sm" | "md";
}) {
  const dim = size === "sm" ? "h-9 w-9 text-xs" : "h-11 w-11 text-sm";
  const bgVar = senderId === "me" ? "var(--accent)" : "var(--text)";
  const textVar = "var(--card)";

  if (avatarImage) {
    return (
      <div
        className={`shrink-0 overflow-hidden rounded-xl select-none ${dim}`}
        style={{ boxShadow: "0 2px 0 rgba(0,0,0,0.15)" }}
      >
        <img src={avatarImage} alt="avatar" className="h-full w-full object-cover" />
      </div>
    );
  }

  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-xl font-stamp select-none ${dim}`}
      style={{
        background: bgVar,
        color: textVar,
        boxShadow: "0 2px 0 rgba(0,0,0,0.15)",
      }}
    >
      {avatarText}
    </div>
  );
}

function SystemMessage({ message }: { message: Message }) {
  return (
    <div className="flex justify-center py-2">
      <span
        className="px-3 py-1 text-xs rounded-full animate-bubbleIn"
        style={{
          background: "color-mix(in srgb, var(--text) 8%, transparent)",
          color: "color-mix(in srgb, var(--text) 55%, transparent)",
        }}
      >
        {message.systemText}
      </span>
    </div>
  );
}

function MessageBubble({
  message,
  side,
  bubbleStyle,
  renderTextWithMention,
  isNew,
}: {
  message: Message;
  side: "left" | "right";
  bubbleStyle: React.CSSProperties;
  renderTextWithMention: (text: string, mentionTarget?: string) => React.ReactNode;
  isNew: boolean;
}) {
  const isLeft = side === "left";
  const bgColor = isLeft ? "var(--her-card)" : "var(--my-bubble)";
  const time = new Date(message.timestamp).toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
  });

  if (message.type === "sticker" && message.sticker) {
    return (
      <>
        <img
          src={message.sticker}
          alt="sticker"
          className="max-h-32 max-w-[60%] animate-bubbleIn rounded-xl object-contain"
        />
        <span className="mt-1 px-1 text-[10px]" style={{ color: "color-mix(in srgb, var(--text) 50%, transparent)" }}>
          {time}
        </span>
      </>
    );
  }

  if (message.type === "music" && message.music) {
    return (
      <div className="flex flex-col items-start max-w-[75%]">
        <div
          className="animate-bubbleIn rounded-2xl border p-3 w-full"
          style={{
            background: bgColor,
            borderColor: "color-mix(in srgb, var(--card-border) 50%, transparent)",
          }}
        >
          {message.text && (
            <div className="mb-2 text-[13px]" style={{ color: "var(--text)" }}>
              {message.text}
            </div>
          )}
          <div className="flex items-center gap-3">
            <div
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
              style={{ background: "color-mix(in srgb, var(--accent) 20%, transparent)", color: "var(--accent)" }}
            >
              <Music className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="truncate text-sm font-medium" style={{ color: "var(--text)" }}>
                {message.music.title}
              </div>
              <div className="mt-1 text-[11px]" style={{ color: "color-mix(in srgb, var(--text) 55%, transparent)" }}>
                邀请你一起听
              </div>
            </div>
          </div>
        </div>
        <span className="mt-1 px-1 text-[10px]" style={{ color: "color-mix(in srgb, var(--text) 50%, transparent)" }}>
          {time}
        </span>
      </div>
    );
  }

  return (
    <>
      <div className="relative animate-bubbleIn" style={{ maxWidth: "100%" }}>
        <div
          style={{
            ...bubbleStyle,
            background: bgColor,
            color: "var(--text)",
          }}
          className="px-4 py-2.5 text-[15px] leading-relaxed"
        >
          {message.text && renderTextWithMention(message.text, message.mentionTarget)}
        </div>
      </div>
      {message.moodNote && (
        <div
          className="mt-1 animate-bubbleIn text-[11px]"
          style={{ color: "color-mix(in srgb, var(--text-soft) 80%, transparent)" }}
        >
          🌸 心情 · {message.moodNote}
        </div>
      )}
      <span className="mt-1 px-1 text-[10px]" style={{ color: "color-mix(in srgb, var(--text) 50%, transparent)" }}>
        {time}
      </span>
    </>
  );
}

function RPSBubble({
  message,
  side,
  showAvatar,
  getContactName,
  getAvatarText,
  getAvatarImage,
  bubbleStyle,
}: {
  message: Message;
  side: "left" | "right";
  showAvatar: boolean;
  getContactName: (id: string) => string;
  getAvatarText: (id: string) => string;
  getAvatarImage: (id: string) => string;
  bubbleStyle: React.CSSProperties;
}) {
  const isLeft = side === "left";
  const rps = message.rps!;
  const time = new Date(message.timestamp).toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const choiceEmoji = (choice?: string) => {
    switch (choice) {
      case "rock": return "✊";
      case "paper": return "✋";
      case "scissors": return "✌️";
      default: return "❓";
    }
  };

  const resultText = () => {
    if (rps.result === "win") return "你赢了！";
    if (rps.result === "lose") return "你输了";
    return "平局";
  };

  const resultColor = () => {
    if (rps.result === "win") return "var(--accent)";
    if (rps.result === "lose") return "color-mix(in srgb, var(--text) 50%, transparent)";
    return "color-mix(in srgb, var(--text) 70%, transparent)";
  };

  return (
    <div className={`flex items-center gap-2 ${isLeft ? "justify-start" : "justify-end"}`}>
      {isLeft && (
        <div className="flex w-11 shrink-0 justify-center">
          {showAvatar && (
            <MessageAvatar
              senderId={message.sender}
              avatarText={getAvatarText(message.sender)}
              avatarImage={getAvatarImage(message.sender)}
            />
          )}
        </div>
      )}
      <div className={`flex flex-col ${isLeft ? "items-start" : "items-end"} max-w-[78%]`}>
        <div
          className="animate-bubbleIn px-4 py-3"
          style={{
            ...bubbleStyle,
            background: isLeft ? "var(--her-card)" : "var(--my-bubble)",
            color: "var(--text)",
            minWidth: "200px",
          }}
        >
          <div className="text-sm mb-2 font-medium">猜拳对战</div>
          <div className="flex items-center justify-around gap-4 mb-2">
            <div className="flex flex-col items-center">
              <div className="text-3xl mb-1">{choiceEmoji(rps.challengerChoice)}</div>
              <span className="text-xs" style={{ color: "color-mix(in srgb, var(--text) 60%, transparent)" }}>
                {getContactName(rps.challenger)}
              </span>
            </div>
            <div className="text-lg font-bold" style={{ color: "color-mix(in srgb, var(--text) 40%, transparent)" }}>
              VS
            </div>
            <div className="flex flex-col items-center">
              <div className="text-3xl mb-1">{choiceEmoji(rps.targetChoice)}</div>
              <span className="text-xs" style={{ color: "color-mix(in srgb, var(--text) 60%, transparent)" }}>
                {getContactName(rps.target)}
              </span>
            </div>
          </div>
          <div className="text-center text-sm font-medium" style={{ color: resultColor() }}>
            {resultText()}
          </div>
        </div>
        <span className="mt-1 px-1 text-[10px]" style={{ color: "color-mix(in srgb, var(--text) 50%, transparent)" }}>
          {time}
        </span>
      </div>
      {!isLeft && (
        <div className="flex w-11 shrink-0 justify-center">
          {showAvatar && (
            <MessageAvatar
              senderId={message.sender}
              avatarText={getAvatarText(message.sender)}
              avatarImage={getAvatarImage(message.sender)}
            />
          )}
        </div>
      )}
    </div>
  );
}

function PollBubble({
  message,
  side,
  showAvatar,
  getContactName,
  getAvatarText,
  getAvatarImage,
  bubbleStyle,
}: {
  message: Message;
  side: "left" | "right";
  showAvatar: boolean;
  getContactName: (id: string) => string;
  getAvatarText: (id: string) => string;
  getAvatarImage: (id: string) => string;
  bubbleStyle: React.CSSProperties;
}) {
  const isLeft = side === "left";
  const poll = message.poll!;
  const time = new Date(message.timestamp).toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const totalVotes = Object.values(poll.votes).reduce((a, b) => a + b, 0);

  const getVotersForOption = (optionIndex: number): string[] => {
    return Object.entries(poll.voters)
      .filter(([_, choice]) => choice === optionIndex)
      .map(([id]) => getContactName(id));
  };

  return (
    <div className={`flex items-center gap-2 ${isLeft ? "justify-start" : "justify-end"}`}>
      {isLeft && (
        <div className="flex w-11 shrink-0 justify-center">
          {showAvatar && (
            <MessageAvatar
              senderId={message.sender}
              avatarText={getAvatarText(message.sender)}
              avatarImage={getAvatarImage(message.sender)}
            />
          )}
        </div>
      )}
      <div className={`flex flex-col ${isLeft ? "items-start" : "items-end"} max-w-[78%]`}>
        <div
          className="animate-bubbleIn px-4 py-3"
          style={{
            ...bubbleStyle,
            background: isLeft ? "var(--her-card)" : "var(--my-bubble)",
            color: "var(--text)",
            minWidth: "240px",
          }}
        >
          <div className="text-sm font-medium mb-3">📊 {poll.question}</div>
          {poll.options.map((option, idx) => {
            const votes = poll.votes[String(idx)] || 0;
            const percentage = totalVotes > 0 ? (votes / totalVotes) * 100 : 0;
            const voters = getVotersForOption(idx);
            return (
              <div key={idx} className="mb-2 last:mb-0">
                <div className="flex justify-between text-sm mb-1">
                  <span>{option}</span>
                  <span style={{ color: "color-mix(in srgb, var(--text) 60%, transparent)" }}>
                    {votes} 票
                  </span>
                </div>
                <div
                  className="h-2 rounded-full overflow-hidden"
                  style={{ background: "color-mix(in srgb, var(--text) 10%, transparent)" }}
                >
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${percentage}%`,
                      background: "var(--accent)",
                    }}
                  />
                </div>
                {voters.length > 0 && (
                  <div
                    className="mt-1 text-[11px]"
                    style={{ color: "color-mix(in srgb, var(--text) 50%, transparent)" }}
                  >
                    {voters.join("、")}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <span className="mt-1 px-1 text-[10px]" style={{ color: "color-mix(in srgb, var(--text) 50%, transparent)" }}>
          {time}
        </span>
      </div>
      {!isLeft && (
        <div className="flex w-11 shrink-0 justify-center">
          {showAvatar && (
            <MessageAvatar
              senderId={message.sender}
              avatarText={getAvatarText(message.sender)}
              avatarImage={getAvatarImage(message.sender)}
            />
          )}
        </div>
      )}
    </div>
  );
}

function FlippingHint({ side }: { side: "left" | "right" }) {
  const isLeft = side === "left";
  return (
    <div className={`flex items-center gap-2 ${isLeft ? "justify-start" : "justify-end"}`}>
      {isLeft && <div className="w-11 shrink-0" />}
      <div className="animate-bubbleIn">
        <div
          className="flex items-center gap-1.5 px-3.5 py-2.5"
          style={{ background: "var(--her-card)", borderRadius: "1rem", boxShadow: "0 2px 8px -2px rgba(0,0,0,0.12)" }}
        >
          <span className="inline-block h-1.5 w-1.5 rounded-full animate-bounce [animation-delay:-0.2s]" style={{ background: "var(--accent)" }} />
          <span className="inline-block h-1.5 w-1.5 rounded-full animate-bounce [animation-delay:-0.1s]" style={{ background: "var(--accent)" }} />
          <span className="inline-block h-1.5 w-1.5 rounded-full animate-bounce" style={{ background: "var(--accent)" }} />
        </div>
      </div>
      {!isLeft && <div className="w-11 shrink-0" />}
    </div>
  );
}

function getBubbleStyle(style: string): React.CSSProperties {
  switch (style) {
    case "round":
      return { borderRadius: "1.25rem", boxShadow: "0 2px 8px -2px rgba(0,0,0,0.15)" };
    case "paper":
      return {
        borderRadius: "0.75rem",
        border: "1px solid var(--card-border)",
        boxShadow: "0 2px 0 rgba(0,0,0,0.06), 0 8px 18px -8px rgba(0,0,0,0.2)",
      };
    case "card":
      return {
        borderRadius: "0.5rem",
        border: "1px solid var(--card-border)",
        boxShadow: "0 1px 0 rgba(0,0,0,0.08)",
      };
    case "cloud":
      return {
        borderRadius: "1.5rem",
        boxShadow: "0 2px 10px -3px rgba(0,0,0,0.18)",
      };
    case "tail":
      return {
        borderRadius: "1rem",
        boxShadow: "0 1px 6px -2px rgba(0,0,0,0.12)",
      };
    case "minimal":
      return {
        borderRadius: "0.5rem",
        boxShadow: "none",
      };
    case "soft":
      return {
        borderRadius: "1.5rem",
        boxShadow: "0 4px 16px -4px rgba(0,0,0,0.1), 0 0 0 1px color-mix(in srgb, var(--accent) 8%, transparent)",
      };
    default:
      return { borderRadius: "1rem" };
  }
}
