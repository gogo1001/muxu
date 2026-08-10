import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useAppStore } from "@/store/app";
import type { Message, Contact, TomatoThrow, ViewSide } from "@/types";
import { Music, Play, Pause, Reply, RotateCcw, Trash2 } from "lucide-react";
import { PetCanvas } from "./phone/apps/PetApp";
import { DEFAULT_PET_CONFIG, type BallPetConfig } from "@/types/pet";

function HiddenPetPart({ part, side }: { part: "ear" | "top" | "accessory"; side: "left" | "right" }) {
  const convId = useAppStore((s) => s.activeConversationId);
  const [config, setConfig] = useState<BallPetConfig>(DEFAULT_PET_CONFIG);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(`muxu-pet-${convId}`);
      if (saved) setConfig({ ...DEFAULT_PET_CONFIG, ...JSON.parse(saved) });
      else setConfig({ ...DEFAULT_PET_CONFIG });
    } catch { setConfig({ ...DEFAULT_PET_CONFIG }); }
  }, [convId]);

  useEffect(() => {
    const handler = (e: Event) => {
      const evt = e as CustomEvent;
      if (evt.detail?.key === `muxu-pet-${convId}` && evt.detail?.config) {
        setConfig({ ...DEFAULT_PET_CONFIG, ...evt.detail.config });
      }
    };
    window.addEventListener("pet-config-updated", handler);
    return () => window.removeEventListener("pet-config-updated", handler);
  }, [convId]);

  const staticConfig = useMemo(() => ({
    ...config,
    breathe: false,
    wobble: false,
    bounce: false,
    blink: false,
  }), [config]);

  const petSize = 60;
  let clipStyle: React.CSSProperties = { overflow: "hidden" };
  let flip = false;
  let petOffset = -10;

  if (part === "ear") {
    clipStyle = { ...clipStyle, height: petSize * 0.28, width: petSize };
    flip = side === "left";
    petOffset = -24;
  } else if (part === "top") {
    clipStyle = { ...clipStyle, height: petSize * 0.33, width: petSize };
    flip = side === "left";
    petOffset = -18;
  } else {
    clipStyle = { ...clipStyle, height: petSize * 0.22, width: petSize * 0.32 };
    if (side === "left") {
      clipStyle = { ...clipStyle, marginLeft: 0 };
    } else {
      clipStyle = { ...clipStyle, marginLeft: petSize * 0.68 };
    }
    petOffset = -12;
  }

  return (
    <div style={{ ...clipStyle, transform: flip ? "scaleX(-1)" : "none" }}>
      <div style={{ marginTop: `${petOffset}px` }}>
        <PetCanvas config={staticConfig} size={petSize} patSignal={0} />
      </div>
    </div>
  );
}

export default function MessageList() {
  const conversations = useAppStore((s) => s.conversations);
  const activeConversationId = useAppStore((s) => s.activeConversationId);
  const contacts = useAppStore((s) => s.contacts);
  const beauty = useAppStore((s) => s.beauty);
  const themeId = beauty.themeId;
  const isCuteMoe = themeId === "cute-moe";
  const pat = useAppStore((s) => s.pat);
  const quoteMessage = useAppStore((s) => s.quoteMessage);
  const recallMessage = useAppStore((s) => s.recallMessage);
  const deleteMessage = useAppStore((s) => s.deleteMessage);
  const throwTomato = useAppStore((s) => s.throwTomato);
  const tomatoThrows = useAppStore((s) => s.tomatoThrows);
  const findPet = useAppStore((s) => s.findPet);
  const petHidingMode = useAppStore((s) => s.petHidingMode);
  const setPetHidingMode = useAppStore((s) => s.setPetHidingMode);
  const hidePetAtMessage = useAppStore((s) => s.hidePetAtMessage);
  const readBadgeEnabled = useAppStore((s) => s.chat.readBadgeEnabled);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isAtBottomRef = useRef(true); // 当前是否在底部附近（scroll 时更新）
  const lastMyMessageIdRef = useRef<string | null>(null); // 我最新发的消息 id，用于在用户看旧消息时也自动滚到底部
  const [showNewMsgBtn, setShowNewMsgBtn] = useState(false); // "跳到新消息"按钮
  const [unreadNewCount, setUnreadNewCount] = useState(0); // 未读新消息计数
  const [contextMenu, setContextMenu] = useState<{ messageId: string; x: number; y: number; sender: string } | null>(null);
  const [tomatoPicker, setTomatoPicker] = useState<{ senderId: string; msgId: string; x: number; y: number } | null>(null);
  const [tomatoMsgCollapsed, setTomatoMsgCollapsed] = useState(true);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 领取弹窗状态（store 管理，便于在任意层级打开）
  const rpClaimModal = useAppStore((s) => s.rpClaimModal);
  const setRpClaimModal = useAppStore((s) => s.setRpClaimModal);
  const giftClaimModal = useAppStore((s) => s.giftClaimModal);
  const setGiftClaimModal = useAppStore((s) => s.setGiftClaimModal);


  const conv = useMemo(
    () => conversations.find((c) => c.id === activeConversationId),
    [conversations, activeConversationId]
  );

  const messages = conv?.messages || [];
  const isFlipping = conv?.isFlipping || false;
  const view = conv?.view || "me";

  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  const handleLongPress = useCallback((e: React.TouchEvent | React.MouseEvent, messageId: string, sender: string) => {
    e.preventDefault();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.type === "contextmenu" ? (e as React.MouseEvent).clientX : rect.left + rect.width / 2;
    const y = e.type === "contextmenu" ? (e as React.MouseEvent).clientY : rect.top;
    setContextMenu({ messageId, x, y, sender });
  }, []);

  const handleTouchStart = useCallback((messageId: string, sender: string) => {
    longPressTimer.current = setTimeout(() => {
      setContextMenu((prev) => {
        if (prev?.messageId === messageId) return prev;
        const el = document.querySelector(`[data-msg-id="${messageId}"]`);
        if (el) {
          const rect = el.getBoundingClientRect();
          return { messageId, x: rect.left + rect.width / 2, y: rect.top, sender };
        }
        return { messageId, x: window.innerWidth / 2, y: window.innerHeight / 2, sender };
      });
    }, 500);
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const lastTomatoTime = useRef(0);
  const lastTomatoTarget = useRef<string | null>(null);
  const avatarSwipeStart = useRef<{ x: number; y: number; senderId: string; msgId: string } | null>(null);

  const showTomatoPicker = useCallback((senderId: string, msgId: string = "", clientX: number, clientY: number) => {
    if (!conv) return;
    if (senderId === "me") return;
    setTomatoPicker({ senderId, msgId, x: clientX, y: clientY });
  }, [conv]);

  const handlePickTomato = useCallback((count: number) => {
    if (!tomatoPicker || !activeConversationId) return;
    const now = Date.now();
    if (now - lastTomatoTime.current < 1000 && lastTomatoTarget.current === tomatoPicker.senderId) {
      setTomatoPicker(null);
      return;
    }
    lastTomatoTime.current = now;
    lastTomatoTarget.current = tomatoPicker.senderId;
    throwTomato(activeConversationId, "me", tomatoPicker.senderId, tomatoPicker.msgId, false, count);
    setTomatoPicker(null);
  }, [tomatoPicker, activeConversationId, throwTomato]);

  const handleAvatarSwipeStart = useCallback((senderId: string, msgId: string, clientX: number, clientY: number) => {
    if (!conv || senderId === "me") return;
    avatarSwipeStart.current = { x: clientX, y: clientY, senderId, msgId };
  }, [conv]);

  const handleAvatarSwipeMove = useCallback((clientX: number, clientY: number) => {
    const start = avatarSwipeStart.current;
    if (!start) return;
    const dx = clientX - start.x;
    const dy = clientY - start.y;
    if (dx < -50 && Math.abs(dx) > Math.abs(dy) * 2) {
      showTomatoPicker(start.senderId, start.msgId, start.x, start.y);
      avatarSwipeStart.current = null;
    }
  }, [showTomatoPicker]);

  const handleAvatarSwipeEnd = useCallback(() => {
    avatarSwipeStart.current = null;
  }, []);

  // 鼠标左滑触发
  const avatarMouseDown = useRef<{ x: number; y: number; senderId: string; msgId: string } | null>(null);

  const handleAvatarMouseDown = useCallback((senderId: string, msgId: string, clientX: number, clientY: number) => {
    if (!conv || senderId === "me") return;
    avatarMouseDown.current = { x: clientX, y: clientY, senderId, msgId };
  }, [conv]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!avatarMouseDown.current) return;
      const start = avatarMouseDown.current;
      const dx = e.clientX - start.x;
      const dy = e.clientY - start.y;
      if (dx < -50 && Math.abs(dx) > Math.abs(dy) * 2) {
        showTomatoPicker(start.senderId, start.msgId, start.x, start.y);
        avatarMouseDown.current = null;
      }
    };
    const handleMouseUp = () => {
      avatarMouseDown.current = null;
    };
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [showTomatoPicker]);

  // ===== 智能滚动：用户在看旧消息时收到新消息不自动打断 =====
  // 判定阈值：距离底部 <= 80px 算"在底部附近"
  const BOTTOM_THRESHOLD_PX = 80;

  const scrollToBottomSmooth = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, []);

  const scrollToBottomImmediate = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, []);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const dist = el.scrollHeight - el.scrollTop - el.clientHeight;
    const atBottom = dist <= BOTTOM_THRESHOLD_PX;
    isAtBottomRef.current = atBottom;
    if (atBottom) {
      // 已经滚到底部，隐藏按钮，清零计数
      setShowNewMsgBtn(false);
      setUnreadNewCount(0);
    }
  }, []);

  // 消息变化时判断是否自动滚动
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) {
      lastMyMessageIdRef.current = messages.length > 0 ? messages[messages.length - 1].id : null;
      return;
    }
    // 找出这条 messages 数组里我最新发的消息
    let latestMineId: string | null = null;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].sender === "me") { latestMineId = messages[i].id; break; }
    }
    // 我新发消息了 → 无论在哪都必须自动滚到底部
    const iJustSent = latestMineId !== null && lastMyMessageIdRef.current !== latestMineId;
    lastMyMessageIdRef.current = latestMineId;

    if (iJustSent) {
      scrollToBottomImmediate();
      setShowNewMsgBtn(false);
      setUnreadNewCount(0);
      return;
    }
    // isFlipping 翻转视图也滚到底部
    if (isFlipping) {
      scrollToBottomImmediate();
      return;
    }
    // 只有本来就"在底部附近"才自动滚到底部，否则保留用户当前位置
    if (isAtBottomRef.current) {
      scrollToBottomImmediate();
    } else {
      // 计算"新增加的消息条数"（用最后一条消息是否是新增）
      setUnreadNewCount((c) => c + 1);
      setShowNewMsgBtn(true);
    }
  }, [messages, isFlipping, scrollToBottomImmediate]);

  // 对话切换时重置并滚到底部
  useEffect(() => {
    isAtBottomRef.current = true;
    setShowNewMsgBtn(false);
    setUnreadNewCount(0);
    lastMyMessageIdRef.current = null;
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [activeConversationId]);

  const getContactName = (senderId: string): string => {
    if (senderId === "me") return beauty.myName;
    const contact = contacts.find((c) => c.id === senderId);
    return contact?.name || "未知";
  };

  const getContact = (senderId: string): Contact | undefined => {
    return contacts.find((c) => c.id === senderId);
  };

  // 获取联系人的私聊会话头像设置（群聊中使用各自会话的头像）
  const getPrivateConvAvatar = (senderId: string): { text: string; image: string } => {
    const privateConv = conversations.find(
      (c) => c.type === "private" && c.memberIds.includes(senderId)
    );
    return {
      text: privateConv?.herAvatarText || "",
      image: privateConv?.herAvatarImage || "",
    };
  };

  const getAvatarText = (senderId: string): string => {
    if (senderId === "me") {
      return conv?.myAvatarText || beauty.myAvatar;
    }
    const contact = getContact(senderId);
    if (conv?.type === "group") {
      const priv = getPrivateConvAvatar(senderId);
      if (priv.text) return priv.text;
    }
    return contact?.avatar || conv?.herAvatarText || "?";
  };

  const getAvatarImage = (senderId: string): string => {
    if (senderId === "me") {
      return conv?.myAvatarImage || beauty.myAvatarImage;
    }
    const contact = getContact(senderId);
    if (conv?.type === "group") {
      const priv = getPrivateConvAvatar(senderId);
      if (priv.image) return priv.image;
    }
    return contact?.avatarImage || conv?.herAvatarImage || beauty.herAvatarImage || "";
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
      <div className="chat-bg fancy-scroll flex-1 overflow-y-auto px-2 py-3 sm:px-4 md:px-8">
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

  // 找出「我」发的最新一条 readStatus === "ignored" 的消息 id：只在这一条的头像上标红 ^^
  const latestMineIgnoredMsgId = React.useMemo(() => {
    if (!readBadgeEnabled) return null;
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (!m || m.type === "system" || m.recalled) continue;
      if (m.sender === "me" && m.readStatus === "ignored") return m.id;
    }
    return null;
  }, [messages, readBadgeEnabled]);

  return (
    <div className="relative flex-1 flex flex-col">
      <div
        ref={scrollRef}
        className="chat-bg fancy-scroll flex-1 overflow-y-auto px-2 py-3 sm:px-4 md:px-8"
        onClick={petHidingMode ? () => {} : undefined}
        onScroll={handleScroll}
      >
      {petHidingMode && (
        <div
          className="sticky top-0 z-30 mx-auto mb-3 flex max-w-3xl items-center justify-between rounded-xl px-4 py-2"
          style={{ background: "color-mix(in srgb, var(--accent) 15%, var(--card))", backdropFilter: "blur(8px)" }}
        >
          <span className="text-xs font-medium" style={{ color: "var(--text)" }}>
            点击任意消息，把宠物藏在后面～🐾
          </span>
          <button
            className="rounded-lg px-3 py-1 text-xs font-medium"
            style={{ background: "var(--card)", color: "var(--text-soft)", border: "1px solid var(--card-border)" }}
            onClick={(e) => { e.stopPropagation(); setPetHidingMode(false); }}
          >
            取消
          </button>
        </div>
      )}
      <div className="mx-auto flex max-w-3xl flex-col">
        {messages.map((m, i) => {
          const prev = messages[i - 1];
          const next = messages[i + 1];
          const isNew = i === messages.length - 1;

          // 连续消息间距：和上一条是同一方（私聊不看名字，群聊看同一sender）、非系统消息、非番茄消息 -> 缩小间距
          // 我的连续消息：0间距紧贴；对方连续：2px 小间距；换边：4px 间距
          let gapClass = "mt-4";
          const isNonSystem = m.type !== "system";
          const prevIsNonSystem = prev && prev.type !== "system";
          if (isNonSystem && prevIsNonSystem && !m.recalled && !prev?.recalled) {
            const sameSide = getSide(m.sender) === getSide(prev!.sender);
            const isMine = m.sender === "me";
            if (sameSide && isMine && prev!.sender === "me") {
              gapClass = "mt-0";
            } else if (conv?.type === "group") {
              if (sameSide && m.sender === prev!.sender) gapClass = "mt-0.5";
              else if (sameSide) gapClass = "mt-1.5";
              else gapClass = "mt-1.5";
            } else {
              if (sameSide) gapClass = "mt-0.5";
              else gapClass = "mt-1.5";
            }
          }

          const isTomatoSystemMsg = m.type === "system" && (m.systemText?.includes("番茄") || m.systemText?.includes("扔了"));
          const prevIsTomato = prev?.type === "system" && (prev.systemText?.includes("番茄") || prev.systemText?.includes("扔了"));
          const nextIsTomato = next?.type === "system" && (next.systemText?.includes("番茄") || next.systemText?.includes("扔了"));

          // 折叠模式下，只显示第一条番茄消息，后面的跳过
          if (tomatoMsgCollapsed && isTomatoSystemMsg && prevIsTomato) {
            return null;
          }

          if (m.type === "system") {
            const hasMoreTomato = isTomatoSystemMsg && (nextIsTomato || prevIsTomato);
            return (
              <div key={m.id} className={gapClass}>
                <SystemMessage
                  message={m}
                  collapsed={tomatoMsgCollapsed && hasMoreTomato}
                  onToggleCollapse={hasMoreTomato ? () => setTomatoMsgCollapsed((v) => !v) : undefined}
                />
              </div>
            );
          }

          const side = getSide(m.sender);
          const isLeft = side === "left";

          if (m.type === "rps" && m.rps) {
            return (
              <div key={m.id} className={gapClass}>
                <RPSBubble
                  message={m}
                  side={side}
                  getContactName={getContactName}
                  getAvatarText={getAvatarText}
                  getAvatarImage={getAvatarImage}
                  bubbleStyle={bubbleStyle}
                  showReadIgnoredBadge={m.sender === "me" && latestMineIgnoredMsgId === m.id}
                  showRead={readBadgeEnabled && m.sender === "me" && m.readStatus === "read"}
                  showReadIgnored={readBadgeEnabled && m.sender === "me" && m.readStatus === "ignored"}
                />
              </div>
            );
          }

          if (m.type === "poll" && m.poll) {
            return (
              <div key={m.id} className={gapClass}>
                <PollBubble
                  message={m}
                  side={side}
                  getContactName={getContactName}
                  getAvatarText={getAvatarText}
                  getAvatarImage={getAvatarImage}
                  bubbleStyle={bubbleStyle}
                  showReadIgnoredBadge={m.sender === "me" && latestMineIgnoredMsgId === m.id}
                  showRead={readBadgeEnabled && m.sender === "me" && m.readStatus === "read"}
                  showReadIgnored={readBadgeEnabled && m.sender === "me" && m.readStatus === "ignored"}
                />
              </div>
            );
          }

          if (m.recalled) {
            const side = getSide(m.sender);
            const isMine = (view === "me" && m.sender === "me") || (view === "her" && m.sender !== "me");
            return (
              <div key={m.id} className={`${gapClass} flex items-center gap-2 ${side === "left" ? "justify-start" : "justify-end"}`}>
                {side === "left" && <div className="w-9 shrink-0" />}
                <div className="py-1 px-3 text-[13px] italic" style={{ color: "var(--text-soft)" }}>
                  {isMine ? "你撤回了一条消息" : "对方撤回了一条消息"}
                </div>
                {side === "right" && <div className="w-9 shrink-0" />}
              </div>
            );
          }

          return (
            <div key={m.id} className={`${gapClass} relative flex items-center gap-2 ${isLeft ? "justify-start" : "justify-end"}`}
              data-msg-id={m.id}
              data-sender={m.sender}
              onContextMenu={(e) => handleLongPress(e, m.id, m.sender)}
              onTouchStart={() => handleTouchStart(m.id, m.sender)}
              onTouchEnd={handleTouchEnd}
              onTouchMove={handleTouchEnd}
              onClick={petHidingMode ? (e) => {
                e.stopPropagation();
                hidePetAtMessage(activeConversationId, m.id, isLeft ? "left" : "right");
              } : undefined}
              style={petHidingMode ? { cursor: "pointer" } : undefined}
            >
              {isLeft && (
                <div className="flex w-9 shrink-0 justify-center">
                  <MessageAvatar
                    senderId={m.sender}
                    avatarText={getAvatarText(m.sender)}
                    avatarImage={getAvatarImage(m.sender)}
                    onPat={() => pat(activeConversationId, m.sender)}
                    onSwipeStart={handleAvatarSwipeStart}
                    onSwipeMove={handleAvatarSwipeMove}
                    onSwipeEnd={handleAvatarSwipeEnd}
                    onMouseDown={handleAvatarMouseDown}
                    msgId={m.id}
                    tomatoCount={tomatoThrows.filter((t) => t.targetMsgId === m.id && t.conversationId === activeConversationId).length}
                    showReadIgnoredBadge={m.sender === "me" && latestMineIgnoredMsgId === m.id}
                  />
                </div>
              )}
              <div
                className={`flex flex-col ${isLeft ? "items-start" : "items-end"}`}
                style={{
                  maxWidth: m.type === "text" || m.type === "image" ? "78%" : "auto",
                  alignSelf: "flex-start",
                }}
              >
                {isLeft && m.sender !== "me" && (
                  <span
                    className="mb-0.5 px-1 text-xs cursor-pointer select-none active:opacity-60 flex items-center gap-1.5 relative z-10"
                    style={{ color: "color-mix(in srgb, var(--text) 60%, transparent)" }}
                    onDoubleClick={(e) => showTomatoPicker(m.sender, m.id, e.clientX, e.clientY)}
                    title="双击扔番茄"
                  >
                    {m.isAutoInitiated && (
                      <span className="text-[#FFB347]" style={{ fontSize: "10px" }}>⭐</span>
                    )}
                    <span className="font-medium" style={{ color: "color-mix(in srgb, var(--text) 78%, transparent)" }}>
                      {getContactName(m.sender)}
                    </span>
                    <span
                      className="text-[10px]"
                      style={{ color: "color-mix(in srgb, var(--text) 45%, transparent)" }}
                    >
                      {new Date(m.timestamp).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </span>
                )}
                {/* 我方消息无昵称，用占位撑出与对方一致的顶部偏移 */}
                {!isLeft && <div style={{ height: "18px" }} aria-hidden="true" />}
                <div className="relative">
                  {beauty.petEnabled && conv?.type !== "group" && conv?.petHidden?.messageId === m.id && (
                    <button
                      className="absolute z-20 cursor-pointer overflow-visible p-0 transition hover:scale-110 active:scale-95"
                      style={{
                        top: "-10px",
                        [conv.petHidden.side === "left" ? "left" : "right"]: "8px",
                        background: "transparent",
                        border: "none",
                        lineHeight: 0,
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        findPet(activeConversationId, "me");
                      }}
                      title="找到宠物了！"
                    >
                      <HiddenPetPart part={conv.petHidden.part} side={conv.petHidden.side} />
                    </button>
                  )}
                  <MessageBubble
                    message={m}
                    side={side}
                    bubbleStyle={bubbleStyle}
                    renderTextWithMention={renderTextWithMention}
                    isNew={isNew}
                    showRead={readBadgeEnabled && m.sender === "me" && m.readStatus === "read"}
                    showReadIgnored={readBadgeEnabled && m.sender === "me" && m.readStatus === "ignored"}
                  />
                </div>
              </div>
              {!isLeft && (
                <div className="flex w-9 shrink-0 justify-center">
                  <MessageAvatar
                    senderId={m.sender}
                    avatarText={getAvatarText(m.sender)}
                    avatarImage={getAvatarImage(m.sender)}
                    onSwipeStart={handleAvatarSwipeStart}
                    onSwipeMove={handleAvatarSwipeMove}
                    onSwipeEnd={handleAvatarSwipeEnd}
                    onMouseDown={handleAvatarMouseDown}
                    msgId={m.id}
                    tomatoCount={tomatoThrows.filter((t) => t.targetMsgId === m.id && t.conversationId === activeConversationId).length}
                    showReadIgnoredBadge={m.sender === "me" && latestMineIgnoredMsgId === m.id}
                  />
                </div>
              )}
            </div>
          );
        })}

        {isFlipping && <FlippingHint side={view === "me" ? "left" : "right"} name={getContactName(conv.memberIds[0])} />}
      </div>

      {contextMenu && activeConversationId && (
        <div
          className="fixed inset-0 z-50"
          onClick={(e) => { e.stopPropagation(); setContextMenu(null); }}
        >
          <div
            className="absolute z-50 flex flex-col rounded-xl border shadow-xl overflow-hidden min-w-[120px]"
            style={{
              left: Math.min(contextMenu.x, window.innerWidth - 140),
              top: Math.min(contextMenu.y - 10, window.innerHeight - 160),
              background: "var(--card)",
              borderColor: "var(--card-border)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => {
                quoteMessage(activeConversationId, contextMenu.messageId);
                setContextMenu(null);
              }}
              className="flex items-center gap-2 px-4 py-2.5 text-[13px] transition hover:bg-black/5"
              style={{ color: "var(--text)" }}
            >
              <Reply className="h-4 w-4" />
              引用
            </button>
            {contextMenu.sender === "me" && (
              <button
                onClick={() => {
                  recallMessage(activeConversationId, contextMenu.messageId);
                  setContextMenu(null);
                }}
                className="flex items-center gap-2 px-4 py-2.5 text-[13px] transition hover:bg-black/5"
                style={{ color: "var(--text)" }}
              >
                <RotateCcw className="h-4 w-4" />
                撤回
              </button>
            )}
            <button
              onClick={() => {
                deleteMessage(activeConversationId, contextMenu.messageId);
                setContextMenu(null);
              }}
              className="flex items-center gap-2 px-4 py-2.5 text-[13px] transition hover:bg-red-50"
              style={{ color: "var(--accent)" }}
            >
              <Trash2 className="h-4 w-4" />
              删除
            </button>
          </div>
        </div>
      )}

      {tomatoPicker && (
        <div
          className="fixed inset-0 z-50"
          onClick={(e) => { e.stopPropagation(); setTomatoPicker(null); }}
        >
          <div
            className="absolute z-50 rounded-2xl border shadow-xl p-4"
            style={{
              left: Math.min(Math.max(tomatoPicker.x - 80, 10), window.innerWidth - 180),
              top: Math.min(Math.max(tomatoPicker.y - 60, 10), window.innerHeight - 120),
              background: "var(--card)",
              borderColor: "var(--card-border)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-2 text-center text-[12px] font-medium" style={{ color: "var(--text)" }}>
              选择扔几个番茄 🍅
            </div>
            <div className="flex gap-2">
              {[1, 2, 3].map((n) => (
                <button
                  key={n}
                  onClick={() => handlePickTomato(n)}
                  className="flex h-12 w-12 items-center justify-center rounded-xl text-lg font-bold transition hover:scale-110 active:scale-95"
                  style={{
                    background: n === 1 ? "#FF6B6B22" : n === 2 ? "#FF8E5322" : "#E91E6322",
                    color: n === 1 ? "#FF6B6B" : n === 2 ? "#FF8E53" : "#E91E63",
                    border: `1px solid ${n === 1 ? "#FF6B6B" : n === 2 ? "#FF8E53" : "#E91E63"}`,
                  }}
                >
                  {n}🍅
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {tomatoThrows.filter((t) => t.conversationId === activeConversationId).map((tomato) => (
        <TomatoAnimation key={tomato.id} tomato={tomato} messages={messages} view={view} />
      ))}

      {/* ================ 领取私聊红包 弹窗（简约线条风格） ================ */}
      {rpClaimModal && (() => {
        const conv = conversations.find((c) => c.id === rpClaimModal.conversationId);
        const msg = conv?.messages.find((m) => m.id === rpClaimModal.messageId);
        const rp = msg?.redpacket;
        const claimRedpacket = useAppStore.getState().claimRedpacket;
        const returnRedpacket = useAppStore.getState().returnRedpacket;
        const myNameNow = useAppStore.getState().beauty.myName || "我";
        const senderName = msg?.sender === "me" ? myNameNow : (contacts.find((c) => c.id === msg?.sender)?.name || "对方");
        if (!rp) return null;
        return (
          <div
            className="fixed inset-0 z-[60] flex items-center justify-center"
            style={{ background: "color-mix(in srgb, #000 35%, transparent)" }}
            onClick={() => setRpClaimModal(null)}
          >
            <div
              className="animate-bubbleIn w-[80%] max-w-[320px] rounded-2xl p-5"
              style={{
                background: "var(--card)",
                border: "1px solid var(--card-border)",
                boxShadow: "0 12px 40px color-mix(in srgb, #000 25%, transparent)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* 信封/红包线条图 */}
              <div className="flex justify-center mb-4">
                <div
                  className="rounded-2xl border-2 border-dashed p-4"
                  style={{
                    borderColor: "color-mix(in srgb, var(--accent) 55%, transparent)",
                    background: "color-mix(in srgb, var(--accent) 8%, transparent)",
                  }}
                >
                  <svg width="64" height="64" viewBox="0 0 80 80" fill="none">
                    <rect x="8" y="12" width="64" height="56" rx="6" stroke="var(--accent)" strokeWidth="2" />
                    <path d="M8 28 H72" stroke="var(--accent)" strokeWidth="2" />
                    <path d="M40 12 C 28 20, 28 28, 40 36 C 52 28, 52 20, 40 12 Z" fill="color-mix(in srgb, var(--accent) 25%, transparent)" stroke="var(--accent)" strokeWidth="2" strokeLinejoin="round" />
                    <circle cx="40" cy="44" r="4" fill="var(--accent)" />
                  </svg>
                </div>
              </div>
              <div className="text-center text-[13px]" style={{ color: "var(--text-soft)" }}>
                {senderName} 给你发了一个红包
              </div>
              <div className="mt-1 text-center text-[28px] font-bold leading-none" style={{ color: "var(--accent)" }}>
                ¥{rp.amount.toFixed(2)}
              </div>
              {rp.message && (
                <div className="mt-2 text-center text-[12px] rounded-lg border border-dashed px-2.5 py-1.5" style={{ color: "var(--text-soft)", borderColor: "color-mix(in srgb, var(--card-border) 70%, transparent)" }}>
                  “{rp.message}”
                </div>
              )}
              <div className="mt-5 grid grid-cols-2 gap-2.5">
                <button
                  onClick={() => {
                    returnRedpacket(rpClaimModal.conversationId, rpClaimModal.messageId);
                    setRpClaimModal(null);
                  }}
                  className="rounded-xl border-2 border-dashed py-2.5 text-[13px] font-medium transition active:scale-95 hover:opacity-90"
                  style={{
                    borderColor: "color-mix(in srgb, var(--text-soft) 50%, var(--card-border))",
                    color: "var(--text-soft)",
                    background: "color-mix(in srgb, var(--text-soft) 6%, var(--card))",
                  }}
                >
                  ↩ 不收，退回
                </button>
                <button
                  onClick={() => {
                    claimRedpacket(rpClaimModal.conversationId, rpClaimModal.messageId);
                    setRpClaimModal(null);
                  }}
                  className="rounded-xl border-2 border-dashed py-2.5 text-[13px] font-semibold transition active:scale-95 hover:opacity-90"
                  style={{
                    borderColor: "color-mix(in srgb, var(--accent) 55%, var(--card-border))",
                    color: "var(--accent)",
                    background: "color-mix(in srgb, var(--accent) 12%, transparent)",
                  }}
                >
                  🧧 领取红包
                </button>
              </div>
              <button
                onClick={() => setRpClaimModal(null)}
                className="mt-3 w-full text-[11px] transition hover:opacity-70"
                style={{ color: "var(--text-soft)" }}
              >
                稍后再领
              </button>
            </div>
          </div>
        );
      })()}

      {/* ================ 领取对方送的礼物 弹窗（简约线条风格） ================ */}
      {giftClaimModal && (() => {
        const conv = conversations.find((c) => c.id === giftClaimModal.conversationId);
        const msg = conv?.messages.find((m) => m.id === giftClaimModal.messageId);
        const shop = msg?.shop;
        const claimGift = useAppStore.getState().claimGift;
        const myNameNow = useAppStore.getState().beauty.myName || "我";
        const senderName = msg?.sender === "me" ? myNameNow : (contacts.find((c) => c.id === msg?.sender)?.name || "对方");
        if (!shop) return null;
        return (
          <div
            className="fixed inset-0 z-[60] flex items-center justify-center"
            style={{ background: "color-mix(in srgb, #000 35%, transparent)" }}
            onClick={() => setGiftClaimModal(null)}
          >
            <div
              className="animate-bubbleIn w-[80%] max-w-[320px] rounded-2xl p-5"
              style={{
                background: "var(--card)",
                border: "1px solid var(--card-border)",
                boxShadow: "0 12px 40px color-mix(in srgb, #000 25%, transparent)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-center mb-4">
                <div
                  className="rounded-2xl border-2 border-dashed p-4"
                  style={{
                    borderColor: "color-mix(in srgb, var(--accent) 55%, transparent)",
                    background: "color-mix(in srgb, var(--accent) 8%, transparent)",
                  }}
                >
                  <svg width="64" height="64" viewBox="0 0 80 80" fill="none">
                    <rect x="10" y="28" width="60" height="42" rx="5" stroke="var(--accent)" strokeWidth="2" />
                    <rect x="10" y="28" width="60" height="14" stroke="var(--accent)" strokeWidth="2" />
                    <path d="M40 28 L40 70" stroke="var(--accent)" strokeWidth="2" />
                    <path d="M22 28 C 22 10, 36 12, 40 26 C 44 12, 58 10, 58 28" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" fill="none" />
                    <circle cx="40" cy="28" r="3.5" fill="var(--accent)" />
                  </svg>
                </div>
              </div>
              <div className="text-center text-[13px]" style={{ color: "var(--text-soft)" }}>
                {senderName} 送给你一份礼物
              </div>
              <div className="mt-2 flex items-center justify-center gap-2 rounded-xl border-2 border-dashed px-3 py-2" style={{ borderColor: "color-mix(in srgb, var(--accent) 40%, transparent)" }}>
                <span className="text-2xl">{shop.emoji}</span>
                <div>
                  <div className="text-[15px] font-semibold text-center" style={{ color: "var(--text)" }}>{shop.productName}</div>
                  <div className="text-[12px] text-center" style={{ color: "var(--text-soft)" }}>价值 ¥{shop.price}</div>
                </div>
              </div>
              {shop.leaveMessage && (
                <div className="mt-2 text-center text-[12px] rounded-lg border border-dashed px-2.5 py-1.5" style={{ color: "var(--text-soft)", borderColor: "color-mix(in srgb, var(--card-border) 70%, transparent)" }}>
                  💬 {shop.leaveMessage}
                </div>
              )}
              <div className="mt-5 grid grid-cols-1 gap-2.5">
                <button
                  onClick={() => {
                    claimGift(giftClaimModal.conversationId, giftClaimModal.messageId);
                    setGiftClaimModal(null);
                  }}
                  className="rounded-xl border-2 border-dashed py-3 text-[14px] font-semibold transition active:scale-95 hover:opacity-90"
                  style={{
                    borderColor: "color-mix(in srgb, var(--accent) 55%, var(--card-border))",
                    color: "var(--accent)",
                    background: "color-mix(in srgb, var(--accent) 12%, transparent)",
                  }}
                >
                  🎁 开心收下并致谢
                </button>
              </div>
              <button
                onClick={() => setGiftClaimModal(null)}
                className="mt-3 w-full text-[11px] transition hover:opacity-70"
                style={{ color: "var(--text-soft)" }}
              >
                稍后再说
              </button>
            </div>
          </div>
        );
      })()}
      </div>

      {/* 跳到新消息按钮：当用户在看旧消息、又有新消息到来时显示 */}
      {showNewMsgBtn && (
        <button
          onClick={() => {
            scrollToBottomSmooth();
            setShowNewMsgBtn(false);
            setUnreadNewCount(0);
          }}
          className="absolute z-40 bottom-3 right-3 sm:bottom-4 sm:right-6 md:bottom-4 md:right-10 flex items-center gap-1.5 rounded-full border px-3 py-2 shadow-lg transition hover:scale-105 active:scale-95"
          style={{
            background: "var(--card)",
            borderColor: "var(--accent)",
            boxShadow: "0 4px 14px color-mix(in srgb, var(--accent) 25%, transparent)",
          }}
          title="跳到最新消息"
        >
          <span
            className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold"
            style={{ background: "var(--accent)", color: "var(--card)" }}
          >
            {unreadNewCount > 99 ? "99+" : unreadNewCount}
          </span>
          <span className="text-[11px] font-medium" style={{ color: "var(--accent)" }}>
            新消息
          </span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--accent)" }}>
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </button>
      )}
    </div>
  );
}

const tomatoImgUrl = "https://i.postimg.cc/ZKVRS4kH/retouch-2026071501420750.png";

function MessageAvatar({
  senderId,
  avatarText,
  avatarImage,
  size = "md",
  onPat,
  onSwipeStart,
  onSwipeMove,
  onSwipeEnd,
  onMouseDown: onAvatarMouseDown,
  msgId,
  tomatoCount,
  showReadIgnoredBadge,
}: {
  senderId: string;
  avatarText: string;
  avatarImage: string;
  size?: "sm" | "md";
  onPat?: () => void;
  onSwipeStart?: (senderId: string, msgId: string, clientX: number, clientY: number) => void;
  onSwipeMove?: (clientX: number, clientY: number) => void;
  onSwipeEnd?: () => void;
  onMouseDown?: (senderId: string, msgId: string, clientX: number, clientY: number) => void;
  msgId?: string;
  tomatoCount?: number;
  showReadIgnoredBadge?: boolean;
}) {
  const [isPating, setIsPating] = useState(false);
  const dim = size === "sm" ? "h-[36px] w-[36px] text-[12px]" : "h-[36px] w-[36px] text-[12px]";
  const bgVar = senderId === "me" ? "var(--accent)" : "var(--text)";
  const textVar = "var(--card)";
  const pressTimer = useRef<number | undefined>(undefined);

  const handleDoubleClick = () => {
    if (senderId !== "me" && onPat) {
      setIsPating(true);
      onPat();
      setTimeout(() => setIsPating(false), 300);
    }
  };

  const handleContextMenu = (_e: React.MouseEvent) => {
  };

  // 我的头像：长按 400ms 派发事件 → DesktopPet 显示小手
  const pressStart = useRef<{ x: number; y: number } | null>(null);
  const startMyLongPress = (x: number, y: number) => {
    pressStart.current = { x, y };
    if (pressTimer.current) window.clearTimeout(pressTimer.current);
    pressTimer.current = window.setTimeout(() => {
      pressStart.current = null; // 已触发，后续移动不再取消
      window.dispatchEvent(new CustomEvent("avatar-longpress", { detail: { x, y } }));
    }, 400);
  };
  const cancelMyLongPress = () => {
    if (pressTimer.current) { window.clearTimeout(pressTimer.current); pressTimer.current = undefined; }
    pressStart.current = null;
  };
  // 手指移动超过阈值才取消（避免手机按压抖动误取消长按）
  const onMyTouchMove = (x: number, y: number) => {
    const s = pressStart.current;
    if (!s) return; // 未开始或已触发
    if (Math.abs(x - s.x) > 10 || Math.abs(y - s.y) > 10) cancelMyLongPress();
  };

  const longPressTitle = senderId === "me" ? "长按摸摸小宠物" : "双击拍一拍";

  const avatarEl = avatarImage ? (
    <div
      data-avatar="true"
      className={`shrink-0 overflow-hidden rounded-lg select-none cursor-pointer transition-transform active:scale-95 ${dim} ${isPating ? "animate-bounce" : ""}`}
      style={{ boxShadow: "0 1px 2px rgba(0,0,0,0.15)" }}
      onDoubleClick={handleDoubleClick}
      onContextMenu={(e) => {
        if (senderId === "me") e.stopPropagation();
        handleContextMenu(e);
      }}
      onTouchStart={(e) => {
        if (e.touches.length === 1) {
          if (senderId === "me") {
            e.stopPropagation();
            startMyLongPress(e.touches[0].clientX, e.touches[0].clientY);
          } else {
            onSwipeStart?.(senderId, msgId || "", e.touches[0].clientX, e.touches[0].clientY);
          }
        }
      }}
      onTouchMove={(e) => {
        if (e.touches.length === 1) {
          if (senderId === "me") {
            e.stopPropagation();
            onMyTouchMove(e.touches[0].clientX, e.touches[0].clientY);
          } else {
            onSwipeMove?.(e.touches[0].clientX, e.touches[0].clientY);
          }
        }
      }}
      onTouchEnd={(e) => {
        if (senderId === "me") { e.stopPropagation(); cancelMyLongPress(); }
        else onSwipeEnd?.();
      }}
      onTouchCancel={(e) => {
        if (senderId === "me") { e.stopPropagation(); cancelMyLongPress(); }
        else onSwipeEnd?.();
      }}
      onMouseDown={(e) => {
        if (senderId === "me") {
          e.stopPropagation();
          startMyLongPress(e.clientX, e.clientY);
        } else {
          onAvatarMouseDown?.(senderId, msgId || "", e.clientX, e.clientY);
        }
      }}
      onMouseUp={senderId === "me" ? cancelMyLongPress : undefined}
      onMouseLeave={senderId === "me" ? cancelMyLongPress : undefined}
      title={longPressTitle}
    >
      <img src={avatarImage} alt="avatar" className="h-full w-full object-cover" />
    </div>
  ) : (
    <div
      data-avatar="true"
      className={`flex shrink-0 items-center justify-center rounded-lg font-stamp select-none cursor-pointer transition-transform active:scale-95 ${dim} ${isPating ? "animate-bounce" : ""}`}
      style={{
        background: bgVar,
        color: textVar,
        boxShadow: "0 1px 2px rgba(0,0,0,0.15)",
      }}
      onDoubleClick={handleDoubleClick}
      onContextMenu={(e) => {
        if (senderId === "me") e.stopPropagation();
        handleContextMenu(e);
      }}
      onTouchStart={(e) => {
        if (e.touches.length === 1) {
          if (senderId === "me") {
            e.stopPropagation();
            startMyLongPress(e.touches[0].clientX, e.touches[0].clientY);
          } else {
            onSwipeStart?.(senderId, msgId || "", e.touches[0].clientX, e.touches[0].clientY);
          }
        }
      }}
      onTouchMove={(e) => {
        if (e.touches.length === 1) {
          if (senderId === "me") {
            e.stopPropagation();
            onMyTouchMove(e.touches[0].clientX, e.touches[0].clientY);
          } else {
            onSwipeMove?.(e.touches[0].clientX, e.touches[0].clientY);
          }
        }
      }}
      onTouchEnd={(e) => {
        if (senderId === "me") { e.stopPropagation(); cancelMyLongPress(); }
        else onSwipeEnd?.();
      }}
      onTouchCancel={(e) => {
        if (senderId === "me") { e.stopPropagation(); cancelMyLongPress(); }
        else onSwipeEnd?.();
      }}
      onMouseDown={(e) => {
        if (senderId === "me") {
          e.stopPropagation();
          startMyLongPress(e.clientX, e.clientY);
        } else {
          onAvatarMouseDown?.(senderId, msgId || "", e.clientX, e.clientY);
        }
      }}
      onMouseUp={senderId === "me" ? cancelMyLongPress : undefined}
      onMouseLeave={senderId === "me" ? cancelMyLongPress : undefined}
      title={longPressTitle}
    >
      {avatarText}
    </div>
  );

  const hasBadge = !!showReadIgnoredBadge;
  const hasTomato = !!tomatoCount && tomatoCount > 0;

  if (!hasBadge && !hasTomato) return avatarEl;

  const count = Math.min(tomatoCount || 0, 10);
  return (
    <div className="relative flex items-center justify-center" style={{ height: "36px", width: "36px" }}>
      {avatarEl}
      {hasBadge && (
        <div
          className="pointer-events-none absolute"
          style={{
            top: "-8px",
            left: "50%",
            transform: "translateX(-50%)",
            fontSize: "14px",
            lineHeight: 1,
            letterSpacing: "2px",
            color: "#E74C3C",
            textShadow: "0 1px 2px rgba(0,0,0,0.35)",
            fontWeight: 900,
            zIndex: 10,
          }}
          title="已读不回"
        >
          ^&nbsp;^
        </div>
      )}
      {hasTomato && Array.from({ length: count }).map((_, i) => {
        const bottomBase = 24;
        const offsetPer = 6;
        const bottomPx = bottomBase + i * offsetPer;
        const jitter = i === 0 ? 0 : (i % 3 - 1) * 0.8;
        const rotate = i === 0 ? 0 : (i % 3 - 1) * 1.5;
        return (
          <img
            key={i}
            src={tomatoImgUrl}
            alt="tomato"
            className="absolute h-3 w-3 object-contain"
            style={{
              bottom: `${bottomPx}px`,
              left: `calc(50% + ${jitter}px)`,
              transform: `translateX(-50%) rotate(${rotate}deg)`,
              filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.25))",
              zIndex: i,
            }}
          />
        );
      })}
    </div>
  );
}

function TomatoAnimation({
  tomato,
  messages,
  view,
}: {
  tomato: TomatoThrow;
  messages: Message[];
  view: ViewSide;
}) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const animRef = useRef<number | null>(null);
  const startedRef = useRef(false);

  const getSide = useCallback((sender: string): "left" | "right" => {
    if (view === "me") {
      return sender === "me" ? "right" : "left";
    } else {
      return sender === "me" ? "left" : "right";
    }
  }, [view]);

  const findAvatarByMsgId = useCallback((msgId: string): { x: number; y: number; width: number; height: number } | null => {
    const msgEl = document.querySelector(`[data-msg-id="${msgId}"]`);
    if (!msgEl) return null;

    const avatarEl = msgEl.querySelector('[data-avatar="true"]') as HTMLElement | null;
    if (!avatarEl) return null;

    const rect = avatarEl.getBoundingClientRect();
    const scrollContainer = document.querySelector(".chat-bg")?.getBoundingClientRect();
    if (!scrollContainer) return null;

    return {
      x: rect.left - scrollContainer.left + rect.width / 2,
      y: rect.top - scrollContainer.top,
      width: rect.width,
      height: rect.height,
    };
  }, [messages]);

  const findLatestMessageAvatar = useCallback((senderId: string): { x: number; y: number; width: number; height: number } | null => {
    const senderMessages = [...messages].reverse().filter((m) => m.sender === senderId && m.type !== "system" && !m.recalled);
    for (const msg of senderMessages) {
      const pos = findAvatarByMsgId(msg.id);
      if (pos) return pos;
    }
    return null;
  }, [messages, findAvatarByMsgId]);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    // 延迟一帧等待 DOM 渲染完成，尤其是对面刚发消息就扔番茄的场景
    const startAnim = () => {
      const throwerPos = findLatestMessageAvatar(tomato.throwerId);

      let targetPos: { x: number; y: number; width: number; height: number } | null = null;
      if (tomato.targetMsgId) {
        targetPos = findAvatarByMsgId(tomato.targetMsgId);
      }
      if (!targetPos) {
        targetPos = findLatestMessageAvatar(tomato.targetId);
      }

      if (!throwerPos || !targetPos) {
        setPos(null);
        return;
      }

      const startX = throwerPos.x;
      const startY = throwerPos.y - throwerPos.height * 0.25;
      const endX = targetPos.x;
      const endY = targetPos.y + targetPos.height * 0.25;

      setPos({ x: startX, y: startY });

      const duration = 600;
      const startTime = performance.now();
      const arcHeight = Math.max(60, Math.abs(endY - startY) * 0.8 + 40);

      const animate = (now: number) => {
        const elapsed = now - startTime;
        const t = Math.min(elapsed / duration, 1);

        const x = startX + (endX - startX) * t;
        const y = startY + (endY - startY) * t - arcHeight * 4 * t * (1 - t);

        setPos({ x, y });

        if (t < 1) {
          animRef.current = requestAnimationFrame(animate);
        } else {
          setPos(null);
        }
      };

      animRef.current = requestAnimationFrame(animate);
    };

    const raf = requestAnimationFrame(startAnim);

    return () => {
      cancelAnimationFrame(raf);
      if (animRef.current) {
        cancelAnimationFrame(animRef.current);
      }
    };
  }, [tomato.id]);

  const tomatoImg = "https://i.postimg.cc/ZKVRS4kH/retouch-2026071501420750.png";

  if (!pos) return null;

  return (
    <div
      className="pointer-events-none absolute left-0 top-0 z-30 h-full w-full"
    >
      <div
        className="absolute"
        style={{
          left: `${pos.x - 6}px`,
          top: `${pos.y - 12}px`,
          width: "12px",
          height: "12px",
          transform: "scale(1)",
          opacity: 1,
          transition: "none",
          filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.25))",
          zIndex: 100,
        }}
      >
        <img
          src={tomatoImg}
          alt="tomato"
          className="h-full w-full object-contain"
        />
      </div>
    </div>
  );
}

function SystemMessage({ message, onToggleCollapse, collapsed }: { message: Message; onToggleCollapse?: () => void; collapsed?: boolean }) {
  const isTomatoMsg = message.systemText?.includes("番茄") || message.systemText?.includes("扔了");
  
  return (
    <div className="flex justify-center py-2">
      <span
        className={`px-3 py-1 text-xs rounded-full animate-bubbleIn ${onToggleCollapse ? "cursor-pointer hover:opacity-80" : ""}`}
        style={{
          background: "color-mix(in srgb, var(--text) 8%, transparent)",
          color: "color-mix(in srgb, var(--text) 55%, transparent)",
        }}
        onClick={onToggleCollapse}
      >
        {isTomatoMsg && collapsed ? "🍅 番茄大战（点击展开/收起）" : message.systemText}
        {isTomatoMsg && !collapsed && " 🍅"}
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
  showRead,
  showReadIgnored,
}: {
  message: Message;
  side: "left" | "right";
  bubbleStyle: React.CSSProperties;
  renderTextWithMention: (text: string, mentionTarget?: string) => React.ReactNode;
  isNew: boolean;
  showRead?: boolean;
  showReadIgnored?: boolean;
}) {
  const isLeft = side === "left";
  const isMine = message.sender === "me";
  const bgColor = isLeft ? "var(--her-card)" : "var(--my-bubble)";
  const textColor = isLeft ? "var(--text)" : "var(--my-bubble-text)";
  const isCuteMoe = useAppStore((s) => s.beauty.themeId) === "cute-moe";
  const songs = useAppStore((s) => s.songs);
  const setMusicCurrentIndex = useAppStore((s) => s.setMusicCurrentIndex);
  const setMusicPlaying = useAppStore((s) => s.setMusicPlaying);
  const setMusicFullScreen = useAppStore((s) => s.setMusicFullScreen);
  const claimRedpacket = useAppStore((s) => s.claimRedpacket);
  const setRpClaimModal = useAppStore((s) => s.setRpClaimModal);
  const setGiftClaimModal = useAppStore((s) => s.setGiftClaimModal);
  const activeConversationId = useAppStore((s) => s.activeConversationId);
  const conversations = useAppStore((s) => s.conversations);
  const contacts = useAppStore((s) => s.contacts);
  const myName = useAppStore((s) => s.beauty.myName);
  const conv = useMemo(() => conversations.find((c) => c.id === activeConversationId), [conversations, activeConversationId]);
  const time = new Date(message.timestamp).toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const getContactNameInner = (senderId: string): string => {
    if (senderId === "me") return myName;
    const contact = contacts.find((c) => c.id === senderId);
    return contact?.name || "未知";
  };

  const timeRowClass = `mt-0.5 w-full flex gap-1 text-[10px] px-1 ${isMine ? "justify-end" : "justify-start"}`;
  const timeColor = { color: "color-mix(in srgb, var(--text) 50%, transparent)" };
  const toggleEnvelope = useAppStore((s) => s.toggleEnvelope);

  // 对方主动写信 -> 信封简笔画样式包裹
  const isLetter = !isMine && !!message.isLetter;
  const letterOpened = !!message.envelopeOpened;
  const letterSeal = message.letterSeal || "😊";
  if (isLetter && !letterOpened) {
    return (
      <button
        onClick={() => toggleEnvelope(activeConversationId, message.id)}
        className="group animate-bubbleIn rounded-xl border-2 border-dashed px-4 py-5 text-left transition active:scale-[0.98] hover:opacity-95"
        style={{
          borderColor: "color-mix(in srgb, var(--accent) 55%, var(--card-border))",
          background: "color-mix(in srgb, var(--accent) 6%, var(--card))",
          minWidth: "200px",
          maxWidth: "260px",
        }}
        aria-label="打开信封"
      >
        {/* 信封简笔画线条 SVG */}
        <div className="relative mx-auto mb-3 h-20 w-32">
          {/* 印章emoji - 简约线条风格 */}
          <div
            className="absolute -right-1 -top-1 z-10 flex h-9 w-9 items-center justify-center rounded-full border-2 text-lg"
            style={{
              borderColor: "var(--accent)",
              background: "color-mix(in srgb, var(--accent) 12%, var(--card))",
              boxShadow: "0 1px 3px color-mix(in srgb, var(--accent) 30%, transparent)",
            }}
          >
            {letterSeal}
          </div>
          <svg viewBox="0 0 200 130" className="h-full w-full" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* 信封外框 */}
            <rect x="4" y="28" width="192" height="96" rx="6" stroke="var(--accent)" strokeWidth="2.2" />
            {/* 信封翻盖（倒三角） */}
            <path d="M4 32 L100 92 L196 32" stroke="var(--accent)" strokeWidth="2.2" strokeLinejoin="round" fill="none" />
            {/* 翻盖内层点缀 */}
            <path d="M20 34 L100 82 L180 34" stroke="color-mix(in srgb, var(--accent) 50%, transparent)" strokeWidth="1.2" strokeLinejoin="round" fill="none" />
            {/* 火漆/封口小爱心 */}
            <circle cx="100" cy="74" r="9" fill="none" stroke="var(--accent)" strokeWidth="1.8" />
            <path d="M100 77 C 96 73, 92 75, 92 79 C 92 83, 100 86, 100 86 C 100 86, 108 83, 108 79 C 108 75, 104 73, 100 77 Z"
                  fill="color-mix(in srgb, var(--accent) 70%, transparent)"
                  stroke="none" />
            {/* 边角装饰 */}
            <path d="M10 118 L24 118 M10 122 L18 122" stroke="color-mix(in srgb, var(--accent) 40%, transparent)" strokeWidth="1.4" strokeLinecap="round" />
            <path d="M190 118 L176 118 M190 122 L182 122" stroke="color-mix(in srgb, var(--accent) 40%, transparent)" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
        </div>
        <div className="text-center text-[13px] font-semibold" style={{ color: "var(--accent)" }}>
          ✉️ 对方给我写了一封信
        </div>
        <div className="mt-1 text-center text-[11px]" style={{ color: "var(--text-soft)" }}>
          点击即可查看内容
        </div>
        <div className={timeRowClass} style={{ ...timeColor, marginTop: "12px" }}>
          <span>{time}</span>
        </div>
      </button>
    );
  }

  // 对方主动写信 · 已展开 → 手写信格式 + 双击返回信封
  if (isLetter && letterOpened) {
    const writerName = getContactNameInner(message.sender) || "对方";
    const recipientName = myName || "我";
    // 随机挑一款手写字体（用 message.id 取模，保持同封信字体稳定）
    const fontVariants = ["font-ma", "font-zcool-kuaile", "font-zcool-xiaowei", "font-liu", "font-longcang", "font-kaiti"];
    let hash = 0;
    for (let i = 0; i < message.id.length; i++) hash = (hash * 31 + message.id.charCodeAt(i)) >>> 0;
    const fontClass = fontVariants[hash % fontVariants.length];
    const letterText = message.text || "";
    return (
      <div
        onDoubleClick={(e) => {
          e.stopPropagation();
          toggleEnvelope(activeConversationId, message.id);
        }}
        className="animate-bubbleIn select-none cursor-pointer transition active:scale-[0.99]"
        style={{
          minWidth: "230px",
          maxWidth: "280px",
        }}
        title="双击返回信封封面"
      >
        {/* 信纸：仿旧纸张 + 线条纹 + 外框 */}
        <div
          className="relative overflow-hidden rounded-xl border-2 px-4 py-4"
          style={{
            borderColor: "color-mix(in srgb, var(--accent) 45%, var(--card-border))",
            borderStyle: "solid",
            backgroundImage:
              "linear-gradient(to bottom, transparent 0px, transparent calc(1.9em - 1px), color-mix(in srgb, var(--accent) 22%, transparent) calc(1.9em - 1px), color-mix(in srgb, var(--accent) 22%, transparent) 1.9em, transparent 1.9em)",
            backgroundSize: "100% 1.9em",
            backgroundColor: "color-mix(in srgb, #FFFDF5 60%, var(--card))",
            backgroundPosition: "0 0.6em",
            boxShadow:
              "0 2px 6px color-mix(in srgb, var(--text) 8%, transparent), inset 0 0 0 1px color-mix(in srgb, var(--accent) 8%, transparent)",
          }}
        >
          {/* 印章emoji - 简约线条风格印在右上角 */}
          <div
            className="absolute -right-2 -top-2 z-10 flex h-10 w-10 rotate-12 items-center justify-center rounded-full border-2 text-xl"
            style={{
              borderColor: "var(--accent)",
              background: "color-mix(in srgb, var(--accent) 10%, var(--card))",
              boxShadow: "0 1px 4px color-mix(in srgb, var(--accent) 25%, transparent)",
              opacity: 0.85,
            }}
          >
            {letterSeal}
          </div>
          {/* 顶部：收信人称呼 */}
          <div
            className={`handwrite ${fontClass} mb-1 text-[16px] font-semibold`}
            style={{ color: "var(--accent)" }}
          >
            亲爱的{recipientName}：
          </div>
          {/* 正文：按换行分段，每段首行缩进2字 */}
          <div
            className={`handwrite ${fontClass} text-[15px] leading-[1.9] whitespace-pre-wrap break-words`}
            style={{
              color: "#3a2e20",
              textIndent: "2em",
            }}
          >
            {letterText}
          </div>
          {/* 署名：写信人 + 日期行 */}
          <div className={`handwrite ${fontClass} mt-3 text-right text-[14px]`} style={{ color: "#3a2e20" }}>
            <div>……{writerName}</div>
            <div
              className="mt-0.5 text-[11px]"
              style={{ color: "color-mix(in srgb, var(--text-soft) 75%, transparent)" }}
            >
              {new Date(message.timestamp).toLocaleDateString("zh-CN", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </div>
          </div>
          {/* 折角印章小点缀 */}
          <div
            className="pointer-events-none absolute -bottom-1 -right-1 h-10 w-10 rotate-12 opacity-85"
            aria-hidden
          >
            <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M20 14 C 17 10, 12 12, 12 17 C 12 22, 20 25, 20 25 C 20 25, 28 22, 28 17 C 28 12, 23 10, 20 14 Z"
                fill="color-mix(in srgb, var(--accent) 85%, transparent)"
                opacity="0.15"
              />
              <text
                x="20"
                y="22"
                textAnchor="middle"
                fontSize="9"
                fontWeight="bold"
                fill="color-mix(in srgb, var(--accent) 75%, transparent)"
                style={{ fontFamily: "serif" }}
              >
                信
              </text>
            </svg>
          </div>
        </div>
        <div className="mt-1.5 text-center text-[10px]" style={{ color: "var(--text-soft)" }}>
          💡 双击卡片可返回信封封面
        </div>
        <div className={timeRowClass} style={{ ...timeColor, marginTop: "4px" }}>
          <span>{time}</span>
        </div>
      </div>
    );
  }

  const handlePlayMusic = () => {
    if (!message.music) return;
    const idx = songs.findIndex((s) => s.title === message.music!.title && s.url === message.music!.url);
    if (idx >= 0) {
      setMusicCurrentIndex(idx);
    }
    setMusicPlaying(true);
    setMusicFullScreen(true);
  };

  if (message.type === "image" && message.image) {
    return (
      <>
        <img
          src={message.image}
          alt="image"
          className="animate-bubbleIn rounded-2xl border object-cover"
          style={{
            maxWidth: "240px",
            maxHeight: "280px",
            borderColor: "var(--card-border)",
            display: "block",
          }}
        />
        {isMine && (
          <div className={timeRowClass} style={timeColor}>
            <span>{time}</span>
            {showRead && <span style={{ color: "var(--text-soft)" }}>已读</span>}
            {showReadIgnored && <span style={{ color: "#ef4444" }}>已读不回</span>}
          </div>
        )}
      </>
    );
  }

  if (message.type === "sticker") {
    return (
      <>
        {message.moodTag && (
          <span
            className="mb-1 ml-1 inline-flex items-center rounded-full px-2 py-0.5 text-[10px]"
            style={{
              background: "color-mix(in srgb, var(--accent) 15%, transparent)",
              color: "var(--accent)",
              border: "1px solid color-mix(in srgb, var(--accent) 30%, transparent)",
            }}
          >
            💭 {message.moodTag}
          </span>
        )}
        {message.sticker ? (
          <img
            src={message.sticker}
            alt="sticker"
            className="animate-bubbleIn rounded-xl object-contain"
            style={{ width: "80px", height: "80px", display: "block" }}
          />
        ) : (
          <div
            className="animate-bubbleIn rounded-xl px-4 py-2.5 text-[15px]"
            style={{ background: bgColor, color: "var(--text-soft)" }}
          >
            [表情包]
          </div>
        )}
        {isMine && (
          <div className={timeRowClass} style={timeColor}>
            <span>{time}</span>
            {showRead && <span style={{ color: "var(--text-soft)" }}>已读</span>}
            {showReadIgnored && <span style={{ color: "#ef4444" }}>已读不回</span>}
          </div>
        )}
      </>
    );
  }

  if (message.type === "music" && message.music) {
    return (
      <div className="flex flex-col items-start max-w-[75%]">
        <div
          onClick={handlePlayMusic}
          className="animate-bubbleIn cursor-pointer rounded-2xl border p-3 w-full transition hover:opacity-90 active:scale-[0.98]"
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
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl cute-music-btn"
              style={{ background: isCuteMoe ? "transparent" : "color-mix(in srgb, var(--accent) 20%, transparent)", color: isCuteMoe ? "transparent" : "var(--accent)" }}
            >
              <Music className="h-6 w-6" style={{ opacity: isCuteMoe ? 0 : 1 }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="truncate text-sm font-medium" style={{ color: "var(--text)" }}>
                {message.music.title}
              </div>
              <div className="mt-1 text-[11px]" style={{ color: "color-mix(in srgb, var(--text) 55%, transparent)" }}>
                点击一起听
              </div>
            </div>
          </div>
        </div>
        {isMine && (
          <div className={timeRowClass} style={timeColor}>
            <span>{time}</span>
            {showRead && <span style={{ color: "var(--text-soft)" }}>已读</span>}
            {showReadIgnored && <span style={{ color: "#ef4444" }}>已读不回</span>}
          </div>
        )}
      </div>
    );
  }

  if (message.type === "survey" && message.survey) {
    return <SurveyBubble message={message} time={time} bgColor={bgColor} showRead={showRead} showReadIgnored={showReadIgnored} isMine={isMine} />;
  }

  if (message.type === "shop" && message.shop) {
    const shop = message.shop;
    // 对方送我的礼物（sender != me 且 action 为 bought 或 recommend）：显示「待领取」样式，点击弹领取确认
    const isGiftForMe = !isMine && (shop.action === "bought" || shop.action === "recommend");
    const canClaimGift = isGiftForMe && !(message as any).giftClaimed;
    return (
      <div
        className={`animate-bubbleIn rounded-2xl border p-3 ${canClaimGift ? "cursor-pointer active:scale-[0.98]" : ""}`}
        style={{
          background: bgColor,
          borderColor: canClaimGift
            ? "color-mix(in srgb, var(--accent) 45%, var(--card-border))"
            : "color-mix(in srgb, var(--card-border) 50%, transparent)",
          minWidth: "190px",
          maxWidth: "260px",
        }}
        onClick={() => {
          if (!canClaimGift) return;
          setGiftClaimModal({ conversationId: activeConversationId, messageId: message.id });
        }}
      >
        {/* 简约线条礼物盒图标 */}
        <div className="flex items-start gap-2.5">
          <div
            className="shrink-0 rounded-lg border-2 border-dashed px-2 py-2"
            style={{
              borderColor: "color-mix(in srgb, var(--accent) 60%, transparent)",
              background: "color-mix(in srgb, var(--accent) 6%, transparent)",
            }}
          >
            <svg width="32" height="32" viewBox="0 0 48 48" fill="none">
              <rect x="6" y="16" width="36" height="26" rx="3" stroke="var(--accent)" strokeWidth="2" />
              <rect x="6" y="16" width="36" height="8" stroke="var(--accent)" strokeWidth="2" />
              <path d="M24 16 L24 42" stroke="var(--accent)" strokeWidth="2" />
              <path d="M14 16 C 14 6, 22 6, 24 14 C 26 6, 34 6, 34 16" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" fill="none" />
              <circle cx="24" cy="16" r="2.2" fill="var(--accent)" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold" style={{ color: "var(--text)" }}>
              {isMine ? "已送出礼物" : "🎁 对方送我一份礼物"}
            </div>
            <div className="mt-0.5 flex items-center gap-1.5">
              <span className="text-lg leading-none">{shop.emoji}</span>
              <span className="text-[13px] font-medium truncate" style={{ color: "var(--text)" }}>
                {shop.productName}
              </span>
            </div>
            <div className="mt-0.5 text-[11px]" style={{ color: "color-mix(in srgb, var(--text) 55%, transparent)" }}>
              价值 ¥{shop.price}
            </div>
          </div>
        </div>
        {canClaimGift && (
          <div className="mt-2 rounded-lg border border-dashed px-2 py-1.5 text-center text-[12px]" style={{ borderColor: "color-mix(in srgb, var(--accent) 40%, transparent)", color: "var(--accent)" }}>
            ✨ 点击查看并领取
          </div>
        )}
        {!canClaimGift && isGiftForMe && (
          <div className="mt-2 text-[11px] text-center" style={{ color: "#4CAF50" }}>
            ✓ 已领取
          </div>
        )}
        {shop.leaveMessage && (
          <div
            className="mt-1.5 rounded-lg border px-2 py-1 text-[11px]"
            style={{
              background: "color-mix(in srgb, var(--accent) 6%, transparent)",
              borderColor: "color-mix(in srgb, var(--accent) 18%, transparent)",
              color: "var(--text)",
            }}
          >
            💬 留言：{shop.leaveMessage}
          </div>
        )}
        {isMine && (
          <div className={timeRowClass.replace("px-1", "px-0")} style={timeColor}>
            <span>{time}</span>
            {showRead && <span style={{ color: "var(--text-soft)" }}>已读</span>}
            {showReadIgnored && <span style={{ color: "#ef4444" }}>已读不回</span>}
          </div>
        )}
      </div>
    );
  }

  if (message.type === "redpacket" && message.redpacket) {
    const rp = message.redpacket as any;
    const isGroupRp = !!rp.isGroup;
    const count = rp.count ?? 1;
    const claims: { contactId: string; name?: string; amount: number; comment?: string; isBest?: boolean; at?: number; commentAt?: number }[] = rp.claims ?? [];
    // 只有 amount>0 才算真正抢到
    const realClaims = claims.filter((c) => c.amount > 0);
    const claimedCount = realClaims.length;
    const allClaimed = claimedCount >= count;
    let kingId: string | null = null;
    let kingAmount = 0;
    for (const c of realClaims) {
      if (c.amount > kingAmount) {
        kingAmount = c.amount;
        kingId = c.contactId;
      }
    }
    const meClaimed = realClaims.some((c) => c.contactId === "me");
    const canClaimGroup = isGroupRp && !meClaimed && claimedCount < count && message.sender !== "me";
    // 手气红包折叠：评论区 & 抢包记录可折叠/展开
    const [rpCollapsed, setRpCollapsed] = useState(false);

    const isMine = message.sender === "me";
    const canClaimPrivate = !isGroupRp && !rp.claimed && !rp.returned && !isMine;
    const isReturned = !!rp.returned;
    const isClaimedPrivate = !isGroupRp && !!rp.claimed;

    const bgStyle = isReturned
      ? "color-mix(in srgb, var(--text-soft) 10%, var(--card))"
      : (isClaimedPrivate || (isGroupRp && allClaimed))
      ? "color-mix(in srgb, var(--accent) 8%, var(--card))"
      : "var(--card)";

    // 头像获取工具（复用 MessageList 里的 getAvatarText / Image，找不到就 fallback 到首字）
    const getClaimAvatarText = (cid: string) => {
      if (cid === "me") return myName?.slice?.(0, 1) || "我";
      const contact = contacts.find((c) => c.id === cid);
      return contact?.avatar?.slice?.(0, 1) || contact?.name?.slice?.(0, 1) || "?";
    };
    const getClaimAvatarImage = (cid: string) => {
      if (cid === "me") return "";
      return contacts.find((c) => c.id === cid)?.avatarImage || "";
    };
    const getClaimName = (cid: string) => cid === "me" ? myName : getContactNameInner(cid);

    const openRpOrClaim = () => {
      if (isGroupRp) {
        if (canClaimGroup) claimRedpacket(activeConversationId, message.id);
        // 已领完或已抢：点击不做额外动作（仅展示）
      } else {
        if (canClaimPrivate) setRpClaimModal({ conversationId: activeConversationId, messageId: message.id });
      }
    };

    return (
      <div
        className={`animate-bubbleIn rounded-2xl px-3 py-2.5 ${(canClaimPrivate || canClaimGroup) ? "cursor-pointer active:scale-[0.98]" : ""}`}
        style={{
          background: bgStyle,
          border: "1px solid color-mix(in srgb, var(--accent) 20%, var(--card-border))",
          minWidth: isGroupRp ? "260px" : "160px",
          maxWidth: isGroupRp ? "320px" : "230px",
          transition: "transform 0.15s",
          boxShadow: "0 1px 0 color-mix(in srgb, var(--text) 3%, transparent)",
        }}
        onClick={openRpOrClaim}
      >
        {/* =============== 顶部红包卡（微信风格） =============== */}
        <div
          className="rounded-xl px-3 py-3 flex items-center gap-3"
          style={{
            background: isReturned
              ? "color-mix(in srgb, var(--text-soft) 12%, transparent)"
              : "linear-gradient(135deg, color-mix(in srgb, var(--accent) 22%, transparent), color-mix(in srgb, var(--accent) 8%, transparent))",
            border: "1px dashed color-mix(in srgb, var(--accent) 35%, transparent)",
          }}
        >
          {/* 线条风红包图标 */}
          <div
            className="shrink-0 h-11 w-11 flex items-center justify-center rounded-lg"
            style={{
              background: "color-mix(in srgb, var(--accent) 15%, transparent)",
              border: "1px solid color-mix(in srgb, var(--accent) 35%, transparent)",
            }}
          >
            <svg width="28" height="28" viewBox="0 0 40 40" fill="none">
              <rect x="5" y="6" width="30" height="28" rx="3" stroke="var(--accent)" strokeWidth="2" />
              <path d="M5 14 H35" stroke="var(--accent)" strokeWidth="2" />
              <path d="M20 6 C 13 10, 13 14, 20 18 C 27 14, 27 10, 20 6 Z" fill="color-mix(in srgb, var(--accent) 25%, transparent)" stroke="var(--accent)" strokeWidth="1.8" strokeLinejoin="round" />
              <circle cx="20" cy="21.5" r="2.2" fill="var(--accent)" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[14px] font-semibold leading-tight" style={{ color: "var(--text)" }}>
              {isReturned ? "红包已退回" : isGroupRp ? "🧧 手气红包" : "🧧 恭喜发财"}
            </div>
            {rp.message && !isReturned && (
              <div className="mt-0.5 text-[11px] truncate" style={{ color: "var(--text-soft)" }}>
                {rp.message}
              </div>
            )}
            <div className="mt-1 text-[11px]" style={{ color: "var(--text-soft)" }}>
              {isGroupRp
                ? `${claimedCount}/${count} 个已被领取`
                : (isReturned ? "已退回" : isClaimedPrivate ? "已领取 ✓" : isMine ? "等待对方处理..." : "✨ 点击领取 / 退回")}
            </div>
          </div>
          <div
            className="shrink-0 text-right"
            style={{ color: isReturned ? "var(--text-soft)" : "var(--accent)" }}
          >
            {isGroupRp ? (
              <div className="flex items-center gap-2">
                <div>
                  <div className="text-[17px] font-bold leading-none">¥{rp.totalAmount ?? rp.amount}</div>
                  <div className="mt-1 text-[10px]" style={{ color: "var(--text-soft)" }}>总金额</div>
                </div>
                {/* 群聊红包折叠/展开按钮（独立，不影响抢红包点击） */}
                <button
                  type="button"
                  className="h-7 w-7 flex items-center justify-center rounded-lg shrink-0 transition-transform"
                  style={{
                    transform: rpCollapsed ? "rotate(0deg)" : "rotate(180deg)",
                    background: "color-mix(in srgb, var(--accent) 15%, transparent)",
                    border: "1px solid color-mix(in srgb, var(--accent) 35%, transparent)",
                    color: "var(--accent)",
                  }}
                  title={rpCollapsed ? "展开抢包记录" : "折叠抢包记录"}
                  onClick={(e) => {
                    e.stopPropagation();
                    setRpCollapsed((v) => !v);
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
              </div>
            ) : (
              <div>
                <div className="text-[17px] font-bold leading-none">¥{rp.amount}</div>
              </div>
            )}
          </div>
        </div>

        {/* =============== 手气王仪式感标签 =============== */}
        {isGroupRp && allClaimed && kingId && (
          <div
            className="mt-2 rounded-full px-2.5 py-1 inline-flex items-center gap-1 text-[11px] font-medium"
            style={{
              background: "linear-gradient(90deg, color-mix(in srgb, var(--accent) 25%, transparent), color-mix(in srgb, #F5C16B 45%, transparent))",
              color: "color-mix(in srgb, #B8860B 85%, var(--accent))",
              border: "1px dashed color-mix(in srgb, var(--accent) 40%, transparent)",
            }}
          >
            <span className="text-[13px]">👑</span>
            手气王：
            <span className="font-bold">{getClaimName(kingId)}</span>
            <span className="ml-1">¥{kingAmount.toFixed(2)}</span>
          </div>
        )}

        {/* =============== 群聊评论区：头像 + 昵称 + 金额 + 评论（可折叠） =============== */}
        {isGroupRp && claims.length > 0 && !rpCollapsed && (
          <div
            className="mt-2.5 rounded-xl border pt-2 overflow-hidden"
            style={{
              background: "color-mix(in srgb, var(--text) 2.5%, var(--card))",
              borderColor: "color-mix(in srgb, var(--card-border) 75%, transparent)",
            }}
          >
            <div className="px-2.5 pb-1 flex items-center justify-between">
              <div className="text-[11px] font-semibold" style={{ color: "var(--text-soft)" }}>
                💬 抢包记录 & 评论
              </div>
              <div className="text-[10px]" style={{ color: "var(--text-soft)" }}>
                共 {claims.length} 人
              </div>
            </div>
            <div className="divide-y" style={{ borderColor: "color-mix(in srgb, var(--card-border) 55%, transparent)" }}>
              {claims.map((c, i) => {
                const isKing = allClaimed && c.contactId === kingId && c.amount > 0;
                const missed = c.amount === 0;
                const avatarText = getClaimAvatarText(c.contactId);
                const avatarImage = getClaimAvatarImage(c.contactId);
                const name = c.name || getClaimName(c.contactId);
                return (
                  <div key={i} className="flex gap-2.5 px-2.5 py-2 items-start">
                    {/* 头像 */}
                    <div className="relative shrink-0">
                      {avatarImage ? (
                        <img
                          src={avatarImage}
                          className="h-8 w-8 rounded-full object-cover border"
                          style={{ borderColor: "color-mix(in srgb, var(--card-border) 80%, transparent)" }}
                          draggable={false}
                        />
                      ) : (
                        <div
                          className="h-8 w-8 rounded-full flex items-center justify-center text-[13px] font-semibold border"
                          style={{
                            borderColor: "color-mix(in srgb, var(--card-border) 80%, transparent)",
                            background: c.contactId === "me"
                              ? "color-mix(in srgb, var(--accent) 20%, transparent)"
                              : "color-mix(in srgb, var(--her-card) 80%, var(--card))",
                            color: c.contactId === "me" ? "var(--accent)" : "var(--text)",
                          }}
                        >
                          {avatarText}
                        </div>
                      )}
                      {/* 手气王冠在头像右上角 */}
                      {isKing && (
                        <div
                          className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full flex items-center justify-center shadow"
                          style={{
                            background: "linear-gradient(135deg, #FFDF7C, #F5A623)",
                            fontSize: "9px",
                            lineHeight: 1,
                            border: "1px solid #fff",
                          }}
                          title="手气王"
                        >
                          👑
                        </div>
                      )}
                    </div>
                    {/* 主体 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 text-[12px]">
                        <span
                          className="font-semibold truncate min-w-0"
                          style={{ color: c.contactId === "me" ? "var(--accent)" : "var(--text)" }}
                        >
                          {name}
                        </span>
                        {isKing && (
                          <span
                            className="shrink-0 text-[10px] rounded-full px-1.5 py-0.5 font-medium"
                            style={{
                              background: "color-mix(in srgb, #F5C16B 35%, transparent)",
                              color: "#9A6B00",
                              border: "1px dashed color-mix(in srgb, #F5C16B 70%, transparent)",
                            }}
                          >
                            手气王
                          </span>
                        )}
                        <span
                          className={`ml-auto shrink-0 text-[12px] font-bold ${missed ? "" : ""}`}
                          style={{ color: missed ? "var(--text-soft)" : "var(--accent)" }}
                        >
                          {missed ? "💨 手慢了" : `¥${c.amount.toFixed(2)}`}
                        </span>
                      </div>
                      {/* 评论内容（有就显示，类似帖子评论） */}
                      {c.comment ? (
                        <div
                          className="mt-1 inline-block max-w-full rounded-lg px-2 py-1 text-[12px] leading-snug"
                          style={{
                            background: "color-mix(in srgb, var(--text) 5%, transparent)",
                            color: "var(--text)",
                          }}
                        >
                          {c.comment}
                        </div>
                      ) : (
                        <div className="mt-1 text-[11px]" style={{ color: "color-mix(in srgb, var(--text-soft) 70%, transparent)" }}>
                          {missed ? "（没抢到，默默围观）" : "（暂未评论）"}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            {/* 底部状态条 */}
            <div
              className="px-2.5 py-1.5 text-[10px] flex items-center justify-between"
              style={{
                background: "color-mix(in srgb, var(--text) 2%, transparent)",
                color: "var(--text-soft)",
                borderTop: "1px dashed color-mix(in srgb, var(--card-border) 55%, transparent)",
              }}
            >
              <span>
                {canClaimGroup && "✨ 点上面红包卡即可开红包"}
                {!canClaimGroup && !allClaimed && message.sender !== "me" && meClaimed && "✓ 我已抢到"}
                {!canClaimGroup && !allClaimed && isMine && `还剩 ${count - claimedCount} 个待领取`}
                {allClaimed && "🎊 已领完，感谢老板！"}
              </span>
              <span>{realClaims.length}人抢到</span>
            </div>
          </div>
        )}

        {isMine && (
          <div className={timeRowClass.replace("px-1", "px-0")} style={{ ...timeColor, color: "color-mix(in srgb, var(--text) 40%, transparent)", marginTop: "10px" }}>
            <span>{time}</span>
            {showRead && <span style={{ color: "var(--text-soft)" }}>已读</span>}
            {showReadIgnored && <span style={{ color: "#ef4444" }}>已读不回</span>}
          </div>
        )}
      </div>
    );
  }

  const quotedMsg = message.quoteId && conv
    ? conv.messages.find((m) => m.id === message.quoteId)
    : undefined;

  const quoteSenderLabel = message.quoteSender === "me" ? "我" : "对方";

  return (
    <>
      {(message.quoteText || quotedMsg) && (
        <div
          className="animate-bubbleIn mb-1 rounded-lg border-l-2 px-2.5 py-1.5 text-[13px]"
          style={{
            background: "color-mix(in srgb, var(--accent) 15%, transparent)",
            borderColor: "var(--accent)",
            color: "var(--text)",
          }}
        >
          <div className="text-[11px] font-semibold mb-0.5" style={{ color: "var(--accent)" }}>
            {quoteSenderLabel}
          </div>
          {quotedMsg && quotedMsg.type === "sticker" && quotedMsg.sticker ? (
            <div className="flex items-center gap-2 line-clamp-2 leading-snug opacity-90">
              <img src={quotedMsg.sticker} className="h-10 w-10 rounded object-contain border" draggable={false} style={{ borderColor: "var(--card-border)" }} />
              <span style={{ color: "var(--text-soft)" }}>[表情包]</span>
            </div>
          ) : quotedMsg && quotedMsg.type === "image" && quotedMsg.image ? (
            <div className="flex items-center gap-2 line-clamp-2 leading-snug opacity-90">
              <img src={quotedMsg.image} className="h-14 w-14 rounded object-cover border" draggable={false} style={{ borderColor: "var(--card-border)" }} />
              <span style={{ color: "var(--text-soft)" }}>[图片]</span>
            </div>
          ) : (
            <div className="line-clamp-3 leading-snug opacity-90">{message.quoteText || ""}</div>
          )}
        </div>
      )}
      <div className={`relative animate-bubbleIn ${isLeft ? "bubble-tail-left" : "bubble-tail-right"}`} style={{ maxWidth: "100%", minHeight: "36px" }}>
        <div
          style={{
            ...bubbleStyle,
            background: bgColor,
            color: textColor,
            overflowWrap: "anywhere",
            wordBreak: "break-word",
          }}
          className={`px-3 py-[0.4em] text-[15px] leading-relaxed message-bubble ${isLeft ? "message-received" : "message-sent"}`}
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
      {isMine && (
        <div className={timeRowClass} style={timeColor}>
          <span>{time}</span>
          {showRead && <span style={{ color: "var(--text-soft)" }}>已读</span>}
          {showReadIgnored && <span style={{ color: "#ef4444" }}>已读不回</span>}
        </div>
      )}
    </>
  );
}

function SurveyBubble({ message, time, bgColor, showRead, showReadIgnored, isMine }: { message: Message; time: string; bgColor: string; showRead?: boolean; showReadIgnored?: boolean; isMine?: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const s = message.survey!;
  const isCompleted = !!s.answers;

  // 折叠时预览：显示标题 + 题数 + 第一题回答
  const firstAnswer = isCompleted && s.answers?.[0]
    ? s.answers[0].answer
    : null;

  const timeRowClass = `mt-1 w-full flex gap-1 text-[10px] px-0 ${isMine ? "justify-end" : "justify-start"}`;
  const timeColor = { color: "color-mix(in srgb, var(--text) 50%, transparent)" };

  return (
    <div
      className="animate-bubbleIn rounded-xl border p-3 cursor-pointer"
      style={{ background: bgColor, borderColor: "color-mix(in srgb, var(--card-border) 50%, transparent)", minWidth: "200px", maxWidth: "280px" }}
      onClick={() => isCompleted && setExpanded(!expanded)}
    >
      <div className="mb-1.5 flex items-center gap-2">
        <span className="text-[13px] font-medium" style={{ color: "var(--accent)" }}>📋 {s.title}</span>
        {isCompleted && (
          <span className="text-[10px] rounded-full px-1.5 py-0.5" style={{ background: "color-mix(in srgb, var(--accent) 20%, transparent)", color: "var(--accent)" }}>
            已回答
          </span>
        )}
        {isCompleted && (
          <span className="ml-auto text-[10px]" style={{ color: "var(--text-soft)" }}>
            {expanded ? "收起 ▲" : "展开 ▼"}
          </span>
        )}
      </div>

      {/* 折叠状态：预览 */}
      {!expanded && (
        <div>
          <div className="text-[11px]" style={{ color: "var(--text-soft)" }}>
            {s.questions.length} 道题
          </div>
          {isCompleted && firstAnswer ? (
            <div className="mt-1 text-[12px]" style={{ color: "color-mix(in srgb, var(--text) 70%, transparent)" }}>
              {s.questions[0]?.text}：{firstAnswer}
            </div>
          ) : !isCompleted ? (
            <div className="mt-1 text-[11px]" style={{ color: "color-mix(in srgb, var(--text) 50%, transparent)" }}>
              等待对方回答中...
            </div>
          ) : null}
        </div>
      )}

      {/* 展开状态：完整问卷 */}
      {expanded && isCompleted && (
        <div className="space-y-1.5">
          {s.questions.map((q, i) => (
            <div key={q.id} className="text-[13px]">
              <div style={{ color: "var(--text)" }}>{i + 1}. {q.text}</div>
              {s.answers?.find(a => a.questionId === q.id) && (
                <div className="mt-0.5 pl-3 text-[12px]" style={{ color: "color-mix(in srgb, var(--text) 60%, transparent)" }}>
                  → {s.answers.find(a => a.questionId === q.id)?.answer}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {isMine && (
        <div className={timeRowClass} style={timeColor}>
          <span>{time}</span>
          {showRead && <span style={{ color: "var(--text-soft)" }}>已读</span>}
          {showReadIgnored && <span style={{ color: "#ef4444" }}>已读不回</span>}
        </div>
      )}
    </div>
  );
}

function RPSBubble({
  message,
  side,
  getContactName,
  getAvatarText,
  getAvatarImage,
  bubbleStyle,
  showReadIgnoredBadge,
  showRead,
  showReadIgnored,
}: {
  message: Message;
  side: "left" | "right";
  getContactName: (id: string) => string;
  getAvatarText: (id: string) => string;
  getAvatarImage: (id: string) => string;
  bubbleStyle: React.CSSProperties;
  showReadIgnoredBadge?: boolean;
  showRead?: boolean;
  showReadIgnored?: boolean;
}) {
  const isLeft = side === "left";
  const isMine = message.sender === "me";
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

  const timeRowClass = `mt-0.5 w-full flex flex-wrap gap-1 text-[10px] ${isMine ? "pr-1 justify-end" : "pl-1 justify-start"}`;
  const timeColor = { color: "color-mix(in srgb, var(--text) 50%, transparent)" };

  return (
    <div className={`flex items-center gap-2 ${isLeft ? "justify-start" : "justify-end"}`}>
      {isLeft && (
        <div className="flex w-9 shrink-0 justify-center">
          <MessageAvatar
            senderId={message.sender}
            avatarText={getAvatarText(message.sender)}
            avatarImage={getAvatarImage(message.sender)}
            showReadIgnoredBadge={showReadIgnoredBadge}
          />
        </div>
      )}
      <div className={`flex flex-col ${isLeft ? "items-start" : "items-end"} max-w-[78%] w-full`}>
        <div
          className="animate-bubbleIn px-4 py-3"
          style={{
            ...bubbleStyle,
            background: isLeft ? "var(--her-card)" : "var(--my-bubble)",
            color: isLeft ? "var(--text)" : "var(--my-bubble-text)",
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
        {isMine && (
          <div className={timeRowClass} style={timeColor}>
            <span>{time}</span>
            {showRead && <span style={{ color: "var(--text-soft)" }}>已读</span>}
            {showReadIgnored && <span style={{ color: "#ef4444" }}>已读不回</span>}
          </div>
        )}
      </div>
      {!isLeft && (
        <div className="flex w-9 shrink-0 justify-center">
          <MessageAvatar
            senderId={message.sender}
            avatarText={getAvatarText(message.sender)}
            avatarImage={getAvatarImage(message.sender)}
            showReadIgnoredBadge={showReadIgnoredBadge}
          />
        </div>
      )}
    </div>
  );
}

function PollBubble({
  message,
  side,
  getContactName,
  getAvatarText,
  getAvatarImage,
  bubbleStyle,
  showReadIgnoredBadge,
  showRead,
  showReadIgnored,
}: {
  message: Message;
  side: "left" | "right";
  getContactName: (id: string) => string;
  getAvatarText: (id: string) => string;
  getAvatarImage: (id: string) => string;
  bubbleStyle: React.CSSProperties;
  showReadIgnoredBadge?: boolean;
  showRead?: boolean;
  showReadIgnored?: boolean;
}) {
  const isLeft = side === "left";
  const isMine = message.sender === "me";
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

  const timeRowClass = `mt-0.5 w-full flex flex-wrap gap-1 text-[10px] ${isMine ? "pr-1 justify-end" : "pl-1 justify-start"}`;
  const timeColor = { color: "color-mix(in srgb, var(--text) 50%, transparent)" };

  return (
    <div className={`flex items-center gap-2 ${isLeft ? "justify-start" : "justify-end"}`}>
      {isLeft && (
        <div className="flex w-9 shrink-0 justify-center">
          <MessageAvatar
            senderId={message.sender}
            avatarText={getAvatarText(message.sender)}
            avatarImage={getAvatarImage(message.sender)}
            showReadIgnoredBadge={showReadIgnoredBadge}
          />
        </div>
      )}
      <div className={`flex flex-col ${isLeft ? "items-start" : "items-end"} max-w-[78%] w-full`}>
        <div
          className="animate-bubbleIn px-4 py-3"
          style={{
            ...bubbleStyle,
            background: isLeft ? "var(--her-card)" : "var(--my-bubble)",
            color: isLeft ? "var(--text)" : "var(--my-bubble-text)",
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
        {isMine && (
          <div className={timeRowClass} style={timeColor}>
            <span>{time}</span>
            {showRead && <span style={{ color: "var(--text-soft)" }}>已读</span>}
            {showReadIgnored && <span style={{ color: "#ef4444" }}>已读不回</span>}
          </div>
        )}
      </div>
      {!isLeft && (
        <div className="flex w-9 shrink-0 justify-center">
          <MessageAvatar
            senderId={message.sender}
            avatarText={getAvatarText(message.sender)}
            avatarImage={getAvatarImage(message.sender)}
            showReadIgnoredBadge={showReadIgnoredBadge}
          />
        </div>
      )}
    </div>
  );
}

function FlippingHint({ side, name }: { side: "left" | "right"; name?: string }) {
  const isLeft = side === "left";
  return (
    <div className={`flex items-center gap-2 ${isLeft ? "justify-start" : "justify-end"}`}>
      {isLeft && <div className="w-9 shrink-0" />}
      <div className="animate-bubbleIn flex flex-col gap-1">
        {name && (
          <span className="px-1 text-xs" style={{ color: "color-mix(in srgb, var(--text) 60%, transparent)" }}>
            {name} 正在输入中...
          </span>
        )}
        <div
          className="flex items-center gap-1.5 px-3.5 py-2"
          style={{ background: "var(--her-card)", borderRadius: "1rem", boxShadow: "0 2px 8px -2px rgba(0,0,0,0.12)" }}
        >
          <span className="inline-block h-1.5 w-1.5 rounded-full animate-bounce [animation-delay:-0.2s]" style={{ background: "var(--accent)" }} />
          <span className="inline-block h-1.5 w-1.5 rounded-full animate-bounce [animation-delay:-0.1s]" style={{ background: "var(--accent)" }} />
          <span className="inline-block h-1.5 w-1.5 rounded-full animate-bounce" style={{ background: "var(--accent)" }} />
        </div>
      </div>
      {!isLeft && <div className="w-9 shrink-0" />}
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
    case "line":
      return {
        borderRadius: "1.2rem",
        border: "2px dashed color-mix(in srgb, var(--accent) 35%, transparent)",
        boxShadow: "0 2px 8px -3px rgba(0,0,0,0.08)",
      };
    case "stamp":
      return {
        borderRadius: "0.3rem",
        border: "2px solid var(--accent)",
        boxShadow: "inset 0 0 0 1px var(--card), 0 2px 0 rgba(0,0,0,0.1)",
      };
    case "glass":
      return {
        borderRadius: "1.25rem",
        background: "color-mix(in srgb, var(--card) 70%, transparent)",
        backdropFilter: "blur(10px)",
        boxShadow: "0 4px 20px -5px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.5)",
        border: "1px solid color-mix(in srgb, var(--card-border) 60%, transparent)",
      };
    case "sketch":
      return {
        borderRadius: "1.1rem 1.3rem 1.2rem 1.4rem",
        border: "2px solid color-mix(in srgb, var(--accent) 50%, transparent)",
        boxShadow: "2px 2px 0 color-mix(in srgb, var(--accent) 25%, transparent)",
        transform: "rotate(-0.3deg)",
      };
    case "neon":
      return {
        borderRadius: "1rem",
        boxShadow: "0 0 10px color-mix(in srgb, var(--accent) 40%, transparent), 0 0 20px color-mix(in srgb, var(--accent) 20%, transparent), inset 0 0 5px color-mix(in srgb, var(--accent) 15%, transparent)",
        border: "1px solid color-mix(in srgb, var(--accent) 50%, transparent)",
      };
    case "bubble":
      return {
        borderRadius: "1.5rem",
        boxShadow: "inset 0 2px 0 rgba(255,255,255,0.6), inset 0 -2px 0 rgba(0,0,0,0.08), 0 4px 12px -3px rgba(0,0,0,0.15)",
        border: "1px solid color-mix(in srgb, var(--card-border) 50%, transparent)",
      };
    default:
      return { borderRadius: "1rem" };
  }
}
