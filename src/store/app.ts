import { create } from "zustand";
import { persist } from "zustand/middleware";
import { INITIAL_CARDS } from "@/data/initialCards";
import type { Card, CardModule } from "@/types/card";
import type {
  Message,
  HerStatus,
  ViewSide,
  MealRecord,
  Contact,
  Conversation,
  CallRecord,
  Memo,
} from "@/types";
import type { BeautySettings, ChatSettings } from "@/types/settings";
import {
  DEFAULT_BEAUTY,
  DEFAULT_CHAT_SETTINGS,
} from "@/types/settings";
import { MODULE_LABELS } from "@/types/card";

interface StickerItem {
  id: string;
  image: string;
}

interface CardStore {
  cardGroups: string[];
  addCard: (contactId: string, module: CardModule, card: Omit<Card, "id">) => void;
  deleteCard: (contactId: string, module: CardModule, id: string) => void;
  updateCard: (contactId: string, module: CardModule, id: string, updates: Partial<Card>) => void;
  deleteCards: (contactId: string, module: CardModule, ids: string[]) => void;
  batchImport: (contactId: string, module: CardModule, text: string) => { added: number; duplicates: number };
  resetModule: (contactId: string, module: CardModule) => void;
  pickRandomCard: (contactId: string, module: CardModule, excludeId?: string) => Card | undefined;
  setCardGroup: (contactId: string, id: string, group: string) => void;
  setCardsGroupBatch: (contactId: string, ids: string[], group: string) => void;
  addCardGroup: (name: string) => void;
  deleteCardGroup: (name: string) => void;
  exportCards: (contactId: string) => string;
  importCards: (contactId: string, jsonStr: string) => { success: boolean; message: string };
}

interface StickerStore {
  stickers: StickerItem[];
  addSticker: (image: string) => void;
  addStickers: (images: string[]) => void;
  deleteStickers: (ids: string[]) => void;
}

interface Song {
  id: string;
  title: string;
  url: string;
}

interface MusicStore {
  songs: Song[];
  addSong: (title: string, url: string) => void;
  removeSong: (id: string) => void;
}

interface ContactStore {
  contacts: Contact[];
  activeContactId: string | null;
  addContact: (name: string, avatar?: string) => string;
  updateContact: (id: string, updates: Partial<Contact>) => void;
  deleteContact: (id: string) => void;
  getContact: (id: string) => Contact | undefined;
}

interface ConversationStore {
  conversations: Conversation[];
  activeConversationId: string;
  groupConversationId: string;
  setActiveConversation: (id: string) => void;
  addPrivateConversation: (contactId: string) => string;
  addToGroup: (contactId: string) => void;
  renameGroup: (name: string) => void;
  send: (conversationId: string, text: string) => void;
  sendStickerInConv: (conversationId: string, image: string, senderId: string) => void;
  sendRPS: (conversationId: string, targetId: string, myChoice: "rock" | "paper" | "scissors") => void;
  sendPoll: (conversationId: string, question: string, options: [string, string]) => void;
  toggleView: (conversationId: string) => void;
  setPhoneOpen: (open: boolean) => void;
  setSettingsOpen: (open: boolean) => void;
  dismissCaught: () => void;
  dismissAngry: () => void;
  dismissMealAlert: () => void;
}

interface GlobalState {
  phoneOpen: boolean;
  settingsOpen: boolean;
  caughtMessage: string | null;
  angryAlert: boolean;
  mealAlert: { meal: "breakfast" | "lunch" | "dinner"; name: string } | null;
  activeCardLibContactId: string | null;
  setActiveCardLibContactId: (id: string | null) => void;
  callRecords: CallRecord[];
  memos: Memo[];
  startCall: (contactId: string) => void;
  addMemo: (contactId: string, text: string) => void;
  openMailbox: (contactId: string) => void;
  showMemoBar: boolean;
  toggleMemoBar: () => void;
  incomingCall: { contactId: string; contactName: string; contactAvatar: string } | null;
  answerCall: () => void;
  rejectCall: () => void;
}

interface SettingsState {
  beauty: BeautySettings;
  chat: ChatSettings;
  setBeauty: (b: Partial<BeautySettings>) => void;
  setChat: (c: Partial<ChatSettings>) => void;
  resetBeauty: () => void;
}

function uid(prefix = "c") {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function randRange(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function createDefaultStatus(): HerStatus {
  return {
    body: {
      temp: 36.5,
      heartRate: 72,
      sleepHours: 6.5,
      fatigue: 42,
      heartRateHistory: [70, 73, 71, 75, 78, 76, 74, 72, 70, 73, 75, 72],
      lastUpdateAt: Date.now(),
    },
    mood: {
      current: "平静",
      keyword: "想喝热可可",
      emoji: "🍃",
      curve: [50, 52, 55, 58, 56, 60, 62, 60, 58, 55, 57, 60],
      level: 60,
      isAngry: false,
    },
    work: {
      status: "working",
      content: "写周报",
      tasks: [
        { id: "w1", title: "周报整理", done: false },
        { id: "w2", title: "客户邮件回复 ×3", done: true },
        { id: "w3", title: "周会准备", done: false },
        { id: "w4", title: "设计稿评审", done: false },
      ],
      overtime: false,
      progress: 35,
      lastStatusChange: Date.now(),
    },
    travel: {
      location: "城南 · 三号咖啡馆",
      weather: "多云转晴",
      temperature: 22,
      schedule: [
        { time: "10:00", place: "三号咖啡馆", note: "已到" },
        { time: "14:00", place: "城南书店", note: "想逛" },
        { time: "19:00", place: "回家", note: "做饭" },
      ],
    },
    meals: [],
    notes: [],
    battery: Math.floor(Math.random() * 60) + 30,
    lastBatteryUpdate: Date.now(),
  };
}

function createDefaultCards(): Record<CardModule, Card[]> {
  return JSON.parse(JSON.stringify(INITIAL_CARDS));
}

function createContact(name: string, avatar = "他"): Contact {
  return {
    id: uid("ct"),
    name,
    avatar,
    avatarImage: "",
    cards: createDefaultCards(),
    status: createDefaultStatus(),
    riceFullness: 0,
    myNickname: "",
  };
}

const DEFAULT_CONTACT_NAME = "宝宝";

function createInitialState() {
  const defaultContact = createContact(DEFAULT_CONTACT_NAME, "他");
  const groupId = uid("grp");

  const seedMessages: Message[] = [
    {
      id: "m1",
      sender: "me",
      type: "text",
      text: "在吗？最近怎么样。",
      timestamp: Date.now() - 1000 * 60 * 6,
    },
    {
      id: "m2",
      sender: defaultContact.id,
      type: "text",
      text: "嗯，在。我在听，你说。",
      card: {
        id: "ch1",
        name: "嗯，在。",
        content: "我在听，你说。",
        stamp: "在",
        mood: "平静",
      },
      timestamp: Date.now() - 1000 * 60 * 5,
    },
  ];

  const privateConv: Conversation = {
    id: uid("conv"),
    type: "private",
    name: defaultContact.name,
    messages: seedMessages,
    isFlipping: false,
    view: "me",
    memberIds: [defaultContact.id],
  };

  const groupConv: Conversation = {
    id: groupId,
    type: "group",
    name: "群聊",
    messages: [
      {
        id: "gsys1",
        sender: "system",
        type: "system",
        systemText: `${defaultContact.name} 被拉进了群聊`,
        timestamp: Date.now() - 1000 * 60 * 30,
      },
    ],
    isFlipping: false,
    view: "me",
    memberIds: [defaultContact.id],
  };

  return {
    contacts: [defaultContact],
    activeContactId: defaultContact.id,
    conversations: [groupConv, privateConv],
    activeConversationId: privateConv.id,
    groupConversationId: groupId,
  };
}

function bumpHerStatus(prev: HerStatus, moodFromCard?: string): HerStatus {
  const heartRate = Math.max(55, Math.min(100, prev.body.heartRate + (Math.random() * 8 - 4)));
  const fatigue = Math.max(5, Math.min(95, prev.body.fatigue + (Math.random() * 5 - 2)));
  let moodDelta = 0;
  let isAngry = prev.mood.isAngry;
  let current = prev.mood.current;

  if (moodFromCard === "开心") { moodDelta = 8; current = "开心"; isAngry = false; }
  else if (moodFromCard === "生气") { moodDelta = -15; current = "生气"; isAngry = true; }
  else if (moodFromCard === "疲惫") { moodDelta = -3; current = "疲惫"; }
  else if (moodFromCard === "害羞") { moodDelta = 4; current = "害羞"; }
  else if (moodFromCard === "委屈") { moodDelta = -8; current = "委屈"; isAngry = false; }
  else if (moodFromCard === "想念") { moodDelta = 5; current = "想念"; }
  else if (moodFromCard === "期待") { moodDelta = 6; current = "期待"; }
  else { moodDelta = Math.random() * 4 - 2; }

  const level = Math.max(0, Math.min(100, prev.mood.level + moodDelta));
  isAngry = isAngry || level < 20;

  return {
    ...prev,
    body: {
      ...prev.body,
      heartRate,
      fatigue,
      heartRateHistory: [...prev.body.heartRateHistory.slice(-11), Math.round(heartRate)],
    },
    mood: {
      ...prev.mood,
      current,
      level,
      isAngry,
      curve: [...prev.mood.curve.slice(-11), Math.round(level)],
    },
  };
}

export const useAppStore = create<
  CardStore & StickerStore & MusicStore & ContactStore & ConversationStore & GlobalState & SettingsState
>()(
  persist(
    (set, get) => ({
      // =========== 全局状态 ===========
      phoneOpen: false,
      settingsOpen: false,
      caughtMessage: null,
      angryAlert: false,
      mealAlert: null,
      activeCardLibContactId: null,
      setActiveCardLibContactId: (id) => set({ activeCardLibContactId: id }),
      callRecords: [],
      memos: [],
      showMemoBar: false,
      toggleMemoBar: () => set((s) => ({ showMemoBar: !s.showMemoBar })),
      incomingCall: null,

      startCall: (contactId) => {
        const contact = get().contacts.find((c) => c.id === contactId);
        if (!contact) return;
        const isRejected = Math.random() < 0.15;
        const record: CallRecord = {
          id: uid("call"),
          contactId,
          contactName: contact.name,
          direction: "outgoing",
          status: isRejected ? "rejected" : "connected",
          duration: isRejected ? 0 : 0,
          timestamp: Date.now(),
        };
        set((s) => ({
          callRecords: [record, ...s.callRecords].slice(0, 100),
        }));
        if (!isRejected) {
          window.setTimeout(() => {
            const duration = Math.floor(Math.random() * 180) + 30;
            set((s) => ({
              callRecords: s.callRecords.map((r) =>
                r.id === record.id ? { ...r, duration } : r
              ),
            }));
          }, 3000);
        }
      },

      answerCall: () => {
        const incoming = get().incomingCall;
        if (!incoming) return;
        const record: CallRecord = {
          id: uid("call"),
          contactId: incoming.contactId,
          contactName: incoming.contactName,
          direction: "incoming",
          status: "connected",
          duration: 0,
          timestamp: Date.now(),
        };
        set((s) => ({
          callRecords: [record, ...s.callRecords].slice(0, 100),
          incomingCall: null,
        }));
        window.setTimeout(() => {
          const duration = Math.floor(Math.random() * 180) + 30;
          set((s) => ({
            callRecords: s.callRecords.map((r) =>
              r.id === record.id ? { ...r, duration } : r
            ),
          }));
        }, 3000);
      },

      rejectCall: () => {
        const incoming = get().incomingCall;
        if (!incoming) return;
        const record: CallRecord = {
          id: uid("call"),
          contactId: incoming.contactId,
          contactName: incoming.contactName,
          direction: "incoming",
          status: "missed",
          duration: 0,
          timestamp: Date.now(),
        };
        set((s) => ({
          callRecords: [record, ...s.callRecords].slice(0, 100),
          incomingCall: null,
        }));
      },

      addMemo: (contactId, text) => {
        const trimmed = text.trim();
        if (!trimmed) return;
        const memo: Memo = {
          id: uid("memo"),
          contactId,
          text: trimmed,
          from: "me",
          timestamp: Date.now(),
        };
        set((s) => ({
          memos: [memo, ...s.memos].slice(0, 500),
        }));

        // 写完备忘录后，1-3小时对方回复3-5条字卡到信箱
        const hours = Math.random() * 2 + 1;
        window.setTimeout(() => {
          const state = useAppStore.getState();
          const contact = state.contacts.find((c) => c.id === contactId);
          if (!contact) return;
          const allCards = [
            ...contact.cards.chat,
            ...contact.cards.body,
            ...contact.cards.mood,
            ...contact.cards.workContent,
            ...contact.cards.workStatus,
            ...contact.cards.travel,
            ...contact.cards.breakfast,
            ...contact.cards.lunch,
            ...contact.cards.dinner,
          ];
          if (allCards.length === 0) return;
          const count = Math.floor(Math.random() * 3) + 3;
          const cardContents: string[] = [];
          for (let i = 0; i < count; i++) {
            const card = allCards[Math.floor(Math.random() * allCards.length)];
            cardContents.push(card.content);
          }
          const mergedText = cardContents.join("\n\n");
          useAppStore.setState((s) => ({
            memos: [{
              id: uid("reply"),
              contactId,
              text: mergedText,
              from: contactId,
              timestamp: Date.now(),
            }, ...s.memos].slice(0, 500),
          }));
        }, hours * 60 * 60 * 1000);
      },

      openMailbox: (contactId) => {
        const state = get();
        const contact = state.contacts.find((c) => c.id === contactId);
        if (!contact) return;
        const allCards: Card[] = [
          ...contact.cards.chat,
          ...contact.cards.body,
          ...contact.cards.mood,
          ...contact.cards.workContent,
          ...contact.cards.workStatus,
          ...contact.cards.travel,
          ...contact.cards.breakfast,
          ...contact.cards.lunch,
          ...contact.cards.dinner,
        ];
        const stickers = state.stickers;
        const replyCount = Math.floor(Math.random() * 5) + 8;
        const cardContents: string[] = [];
        for (let i = 0; i < replyCount; i++) {
          const useSticker = stickers.length > 0 && Math.random() < 0.2;
          if (useSticker) {
            cardContents.push("[表情包]");
          } else if (allCards.length > 0) {
            const card = allCards[Math.floor(Math.random() * allCards.length)];
            cardContents.push(card.content);
          }
        }
        const mergedText = cardContents.join("\n\n");
        const memo: Memo = {
          id: uid("mbox"),
          contactId,
          text: mergedText,
          from: contactId,
          timestamp: Date.now(),
        };
        set((s) => ({
          memos: [memo, ...s.memos].slice(0, 500),
        }));
      },

      // =========== 字卡库 ===========
      cardGroups: ["日常", "撒娇", "关心"],

      addCard: (contactId, module, card) =>
        set((s) => ({
          contacts: s.contacts.map((c) =>
            c.id === contactId
              ? { ...c, cards: { ...c.cards, [module]: [...c.cards[module], { ...card, id: uid(module) }] } }
              : c
          ),
        })),

      deleteCard: (contactId, module, id) =>
        set((s) => ({
          contacts: s.contacts.map((c) =>
            c.id === contactId
              ? { ...c, cards: { ...c.cards, [module]: c.cards[module].filter((x) => x.id !== id) } }
              : c
          ),
        })),

      updateCard: (contactId, module, id, updates) =>
        set((s) => ({
          contacts: s.contacts.map((c) =>
            c.id === contactId
              ? {
                  ...c,
                  cards: {
                    ...c.cards,
                    [module]: c.cards[module].map((x) =>
                      x.id === id ? { ...x, ...updates } : x
                    ),
                  },
                }
              : c
          ),
        })),

      deleteCards: (contactId, module, ids) =>
        set((s) => {
          const idSet = new Set(ids);
          return {
            contacts: s.contacts.map((c) =>
              c.id === contactId
                ? { ...c, cards: { ...c.cards, [module]: c.cards[module].filter((x) => !idSet.has(x.id)) } }
                : c
            ),
          };
        }),

      batchImport: (contactId, module, text) => {
        const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
        const contact = get().contacts.find((c) => c.id === contactId);
        if (!contact) return { added: 0, duplicates: 0 };
        const existing = contact.cards[module];
        const existingNames = new Set(existing.map((c) => c.name));
        const added: Card[] = [];
        let duplicates = 0;

        for (const line of lines) {
          const parts = line.split("|").map((p) => p.trim());
          const name = parts[0];
          if (!name) continue;
          if (existingNames.has(name)) {
            duplicates++;
            continue;
          }
          existingNames.add(name);
          added.push({
            id: uid(module),
            name,
            content: parts[1] || name,
            stamp: parts[2] || name.charAt(0) || "卡",
            mood: parts[3] || undefined,
            group: module === "chat" ? (parts[4] || "日常") : undefined,
          });
        }

        set((s) => ({
          contacts: s.contacts.map((c) =>
            c.id === contactId
              ? { ...c, cards: { ...c.cards, [module]: [...c.cards[module], ...added] } }
              : c
          ),
        }));
        return { added: added.length, duplicates };
      },

      resetModule: (contactId, module) =>
        set((s) => ({
          contacts: s.contacts.map((c) =>
            c.id === contactId
              ? { ...c, cards: { ...c.cards, [module]: JSON.parse(JSON.stringify(INITIAL_CARDS[module])) } }
              : c
          ),
        })),

      pickRandomCard: (contactId, module, excludeId) => {
        const contact = get().contacts.find((c) => c.id === contactId);
        if (!contact) return undefined;
        const pool = contact.cards[module].filter((c) => c.id !== excludeId);
        if (pool.length === 0) return undefined;
        return pool[Math.floor(Math.random() * pool.length)];
      },

      setCardGroup: (contactId, id, group) =>
        set((s) => ({
          contacts: s.contacts.map((c) =>
            c.id === contactId
              ? {
                  ...c,
                  cards: {
                    ...c.cards,
                    chat: c.cards.chat.map((card) =>
                      card.id === id ? { ...card, group } : card
                    ),
                  },
                }
              : c
          ),
        })),

      setCardsGroupBatch: (contactId, ids, group) =>
        set((s) => {
          const idSet = new Set(ids);
          return {
            contacts: s.contacts.map((c) =>
              c.id === contactId
                ? {
                    ...c,
                    cards: {
                      ...c.cards,
                      chat: c.cards.chat.map((card) =>
                        idSet.has(card.id) ? { ...card, group } : card
                      ),
                    },
                  }
                : c
            ),
          };
        }),

      addCardGroup: (name) =>
        set((s) => ({
          cardGroups: [...new Set([...s.cardGroups, name])],
        })),

      deleteCardGroup: (name) =>
        set((s) => ({
          cardGroups: s.cardGroups.filter((g) => g !== name),
          contacts: s.contacts.map((c) => ({
            ...c,
            cards: {
              ...c.cards,
              chat: c.cards.chat.map((card) =>
                card.group === name ? { ...card, group: "日常" } : card
              ),
            },
          })),
        })),

      exportCards: (contactId) => {
        const contact = get().contacts.find((c) => c.id === contactId);
        if (!contact) return "{}";
        const data = {
          version: 1,
          cardGroups: get().cardGroups,
          cards: contact.cards,
          exportedAt: new Date().toISOString(),
        };
        return JSON.stringify(data, null, 2);
      },

      importCards: (contactId, jsonStr) => {
        try {
          const data = JSON.parse(jsonStr);
          if (!data.cards || typeof data.cards !== "object") {
            return { success: false, message: "格式不正确：缺少 cards 字段" };
          }
          const modules = ["chat", "mood", "body", "workStatus", "workContent", "travel", "breakfast", "lunch", "dinner"] as const;
          const newCards: Partial<Record<CardModule, Card[]>> = {};
          for (const m of modules) {
            if (Array.isArray(data.cards[m])) {
              newCards[m] = data.cards[m].map((c: any, i: number) => ({
                id: c.id || `${m}-imp-${i}-${Date.now()}`,
                name: String(c.name || c.content || "未命名"),
                content: String(c.content || c.name || ""),
                stamp: String(c.stamp || (c.name || "卡").charAt(0)),
                mood: c.mood || undefined,
                group: c.group || "日常",
              }));
            }
          }
          if (data.cardGroups && Array.isArray(data.cardGroups)) {
            set((s) => ({
              cardGroups: [...new Set([...s.cardGroups, ...data.cardGroups])],
            }));
          }
          set((s) => ({
            contacts: s.contacts.map((c) =>
              c.id === contactId
                ? { ...c, cards: { ...c.cards, ...newCards } as Record<CardModule, Card[]> }
                : c
            ),
          }));
          return { success: true, message: "导入成功" };
        } catch (e) {
          return { success: false, message: "JSON 解析失败" };
        }
      },

      // =========== 表情包 ===========
      stickers: [],

      addSticker: (image) =>
        set((s) => ({
          stickers: [...s.stickers, { id: uid("st"), image }],
        })),

      addStickers: (images) =>
        set((s) => ({
          stickers: [...s.stickers, ...images.map((img) => ({ id: uid("st"), image: img }))],
        })),

      deleteStickers: (ids) =>
        set((s) => {
          const idSet = new Set(ids);
          return { stickers: s.stickers.filter((st) => !idSet.has(st.id)) };
        }),

      // =========== 音乐 ===========
      songs: [],

      addSong: (title, url) =>
        set((s) => ({
          songs: [...s.songs, { id: uid("song"), title, url }],
        })),

      removeSong: (id) =>
        set((s) => ({
          songs: s.songs.filter((so) => so.id !== id),
        })),

      // =========== 联系人 ===========
      contacts: [],
      activeContactId: null,

      addContact: (name, avatar) => {
        const newContact = createContact(name, avatar);
        set((s) => ({
          contacts: [...s.contacts, newContact],
        }));
        return newContact.id;
      },

      updateContact: (id, updates) =>
        set((s) => ({
          contacts: s.contacts.map((c) => (c.id === id ? { ...c, ...updates } : c)),
          conversations: s.conversations.map((conv) => {
            if (conv.type === "private" && conv.memberIds[0] === id) {
              return { ...conv, name: updates.name || conv.name };
            }
            return conv;
          }),
        })),

      deleteContact: (id) =>
        set((s) => ({
          contacts: s.contacts.filter((c) => c.id !== id),
          conversations: s.conversations.filter(
            (conv) => !(conv.type === "private" && conv.memberIds[0] === id)
          ),
          activeContactId: s.activeContactId === id ? (s.contacts.find((c) => c.id !== id)?.id || null) : s.activeContactId,
        })),

      getContact: (id) => get().contacts.find((c) => c.id === id),

      // =========== 会话 ===========
      conversations: [],
      activeConversationId: "",
      groupConversationId: "",

      setActiveConversation: (id) => set({ activeConversationId: id }),

      addPrivateConversation: (contactId) => {
        const contact = get().contacts.find((c) => c.id === contactId);
        if (!contact) return "";
        const existing = get().conversations.find(
          (c) => c.type === "private" && c.memberIds[0] === contactId
        );
        if (existing) return existing.id;

        const newConv: Conversation = {
          id: uid("conv"),
          type: "private",
          name: contact.name,
          messages: [
            {
              id: uid("msg"),
              sender: contactId,
              type: "text",
              text: "嗨。",
              timestamp: Date.now(),
            },
          ],
          isFlipping: false,
          view: "me",
          memberIds: [contactId],
        };
        set((s) => ({
          conversations: [...s.conversations, newConv],
          activeConversationId: newConv.id,
        }));
        return newConv.id;
      },

      addToGroup: (contactId) => {
        const contact = get().contacts.find((c) => c.id === contactId);
        if (!contact) return;
        const groupId = get().groupConversationId;
        const sysMsg: Message = {
          id: uid("sys"),
          sender: "system",
          type: "system",
          systemText: `${contact.name} 被拉进了群聊`,
          timestamp: Date.now(),
        };
        set((s) => ({
          conversations: s.conversations.map((conv) =>
            conv.id === groupId
              ? {
                  ...conv,
                  memberIds: conv.memberIds.includes(contactId)
                    ? conv.memberIds
                    : [...conv.memberIds, contactId],
                  messages: [...conv.messages, sysMsg],
                }
              : conv
          ),
        }));
      },

      renameGroup: (name) => {
        const groupId = get().groupConversationId;
        set((s) => ({
          conversations: s.conversations.map((conv) =>
            conv.id === groupId ? { ...conv, name } : conv
          ),
        }));
      },

      send: (conversationId, text) => {
        const trimmed = text.trim();
        if (!trimmed) return;
        const conv = get().conversations.find((c) => c.id === conversationId);
        if (!conv || conv.isFlipping) return;

        const myMsg: Message = {
          id: uid("me"),
          sender: "me",
          type: "text",
          text: trimmed,
          timestamp: Date.now(),
        };

        set((s) => ({
          conversations: s.conversations.map((c) =>
            c.id === conversationId
              ? { ...c, messages: [...c.messages, myMsg], isFlipping: true }
              : c
          ),
        }));

        const { replySpeedMin, replySpeedMax, waterReminder } = get().chat;
        const myName = get().beauty.myName;

        if (conv.type === "private") {
          const contactId = conv.memberIds[0];
          const replyCount = Math.floor(Math.random() * 3) + 1;

          const sendNextReply = (index: number) => {
            if (index >= replyCount) {
              set((s) => ({
                conversations: s.conversations.map((c) =>
                  c.id === conversationId ? { ...c, isFlipping: false } : c
                ),
              }));
              return;
            }

            const delay = randRange(replySpeedMin * 1000, replySpeedMax * 1000);
            window.setTimeout(() => {
              const state = get();

              if (index === 0 && Math.random() < 0.08 && state.songs.length > 0) {
                const song = state.songs[Math.floor(Math.random() * state.songs.length)];
                const musicMsg: Message = {
                  id: uid("music"),
                  sender: contactId,
                  type: "music",
                  music: song,
                  text: `${myName}，一起听听这首歌吧～`,
                  timestamp: Date.now(),
                };
                set((s) => ({
                  conversations: s.conversations.map((c) =>
                    c.id === conversationId
                      ? { ...c, messages: [...c.messages, musicMsg] }
                      : c
                  ),
                }));
                sendNextReply(index + 1);
                return;
              }

              if (index === 0 && waterReminder && Math.random() < 0.06) {
                const waterMsg: Message = {
                  id: uid("water"),
                  sender: contactId,
                  type: "text",
                  text: `${myName}，记得喝水哦～💧`,
                  timestamp: Date.now(),
                };
                set((s) => ({
                  conversations: s.conversations.map((c) =>
                    c.id === conversationId
                      ? { ...c, messages: [...c.messages, waterMsg] }
                      : c
                  ),
                }));
                sendNextReply(index + 1);
                return;
              }

              const card = state.pickRandomCard(contactId, "chat");
              if (!card) {
                sendNextReply(index + 1);
                return;
              }

              const herMsg: Message = {
                id: uid("her"),
                sender: contactId,
                type: "text",
                text: card.content,
                card,
                timestamp: Date.now(),
              };

              set((s) => {
                const newStatus = bumpHerStatus(
                  s.contacts.find((c) => c.id === contactId)?.status || createDefaultStatus(),
                  card.mood
                );
                return {
                  conversations: s.conversations.map((c) =>
                    c.id === conversationId
                      ? { ...c, messages: [...c.messages, herMsg] }
                      : c
                  ),
                  contacts: s.contacts.map((c) =>
                    c.id === contactId ? { ...c, status: newStatus } : c
                  ),
                };
              });
              sendNextReply(index + 1);
            }, delay);
          };

          sendNextReply(0);
        } else {
          const replyCount = Math.floor(Math.random() * 4) + 3;
          const memberIds = conv.memberIds;
          // 先随机选一个联系人，由他连续发消息
          const speakerId = memberIds[Math.floor(Math.random() * memberIds.length)];
          const speaker = get().contacts.find((c) => c.id === speakerId);
          if (!speaker) {
            set((s) => ({
              conversations: s.conversations.map((c) =>
                c.id === conversationId ? { ...c, isFlipping: false } : c
              ),
            }));
            return;
          }

          const sendNextReply = (index: number) => {
            if (index >= replyCount) {
              set((s) => ({
                conversations: s.conversations.map((c) =>
                  c.id === conversationId ? { ...c, isFlipping: false } : c
                ),
              }));
              return;
            }

            const delay = randRange(replySpeedMin * 1000, replySpeedMax * 1000);
            window.setTimeout(() => {
              const state = get();
              const card = state.pickRandomCard(speakerId, "chat");
              if (!card) {
                sendNextReply(index + 1);
                return;
              }

              let textContent = card.content;
              let mentionTarget: string | undefined;
              if (Math.random() < 0.04) {
                if (Math.random() < 0.8) {
                  mentionTarget = "me";
                  textContent = `@${myName} ${card.content}`;
                } else {
                  const others = memberIds.filter((id) => id !== speakerId);
                  if (others.length > 0) {
                    const targetId = others[Math.floor(Math.random() * others.length)];
                    const targetContact = state.contacts.find((c) => c.id === targetId);
                    mentionTarget = targetId;
                    textContent = `@${targetContact?.name || "某人"} ${card.content}`;
                  }
                }
              }

              const msg: Message = {
                id: uid("grp"),
                sender: speakerId,
                type: "text",
                text: textContent,
                card,
                mentionTarget,
                timestamp: Date.now(),
              };

              set((s) => ({
                conversations: s.conversations.map((c) =>
                  c.id === conversationId
                    ? { ...c, messages: [...c.messages, msg] }
                    : c
                ),
              }));
              sendNextReply(index + 1);
            }, delay);
          };

          sendNextReply(0);
        }
      },

      sendStickerInConv: (conversationId, image, senderId) => {
        const conv = get().conversations.find((c) => c.id === conversationId);
        if (!conv) return;
        const msg: Message = {
          id: uid("stk"),
          sender: senderId,
          type: "sticker",
          sticker: image,
          timestamp: Date.now(),
        };
        set((s) => ({
          conversations: s.conversations.map((c) =>
            c.id === conversationId ? { ...c, messages: [...c.messages, msg] } : c
          ),
        }));
      },

      sendRPS: (conversationId, targetId, myChoice) => {
        const conv = get().conversations.find((c) => c.id === conversationId);
        if (!conv) return;
        const choices: ("rock" | "paper" | "scissors")[] = ["rock", "paper", "scissors"];
        const targetChoice = choices[Math.floor(Math.random() * 3)];
        let result: "win" | "lose" | "draw";
        if (myChoice === targetChoice) result = "draw";
        else if (
          (myChoice === "rock" && targetChoice === "scissors") ||
          (myChoice === "paper" && targetChoice === "rock") ||
          (myChoice === "scissors" && targetChoice === "paper")
        ) result = "win";
        else result = "lose";

        const msg: Message = {
          id: uid("rps"),
          sender: "me",
          type: "rps",
          rps: {
            challenger: "me",
            target: targetId,
            challengerChoice: myChoice,
            targetChoice,
            result,
            resolved: true,
          },
          timestamp: Date.now(),
        };
        set((s) => ({
          conversations: s.conversations.map((c) =>
            c.id === conversationId ? { ...c, messages: [...c.messages, msg] } : c
          ),
        }));
      },

      sendPoll: (conversationId, question, options) => {
        const conv = get().conversations.find((c) => c.id === conversationId);
        if (!conv) return;
        const votes: Record<string, number> = { "0": 0, "1": 0 };
        const voters: Record<string, number> = {};
        for (const memberId of conv.memberIds) {
          const choice = Math.random() < 0.5 ? 0 : 1;
          votes[String(choice)]++;
          voters[memberId] = choice;
        }
        const msg: Message = {
          id: uid("poll"),
          sender: "me",
          type: "poll",
          text: question,
          poll: {
            question,
            options,
            votes,
            voters,
            resolved: true,
          },
          timestamp: Date.now(),
        };
        set((s) => ({
          conversations: s.conversations.map((c) =>
            c.id === conversationId ? { ...c, messages: [...c.messages, msg] } : c
          ),
        }));
      },

      toggleView: (conversationId) =>
        set((s) => ({
          conversations: s.conversations.map((c) =>
            c.id === conversationId ? { ...c, view: c.view === "me" ? "her" : "me" } : c
          ),
        })),

      setPhoneOpen: (open) => {
        if (open) {
          if (Math.random() < 0.1) {
            set({ caughtMessage: "宝宝，你怎么在看我手机？" });
          }
        }
        set({ phoneOpen: open });
      },

      setSettingsOpen: (open) => set({ settingsOpen: open }),
      dismissCaught: () => set({ caughtMessage: null }),
      dismissAngry: () => set({ angryAlert: false }),
      dismissMealAlert: () => set({ mealAlert: null }),

      // =========== 设置 ===========
      beauty: DEFAULT_BEAUTY,
      chat: DEFAULT_CHAT_SETTINGS,

      setBeauty: (b) => set((s) => ({ beauty: { ...s.beauty, ...b } })),
      setChat: (c) => set((s) => ({ chat: { ...s.chat, ...c } })),
      resetBeauty: () => set({ beauty: DEFAULT_BEAUTY }),
    }),
    {
      name: "cardtalk-store",
      partialize: (state) => ({
        contacts: state.contacts,
        activeContactId: state.activeContactId,
        conversations: state.conversations.map((c) => ({
          ...c,
          messages: c.messages.slice(-50),
        })),
        activeConversationId: state.activeConversationId,
        groupConversationId: state.groupConversationId,
        cardGroups: state.cardGroups,
        stickers: state.stickers,
        songs: state.songs,
        beauty: state.beauty,
        chat: state.chat,
        callRecords: state.callRecords,
        memos: state.memos,
        activeCardLibContactId: state.activeCardLibContactId,
      }),
      onRehydrateStorage: () => (state: any) => {
        if (!state) return;

        if (!state.contacts || !state.conversations || state.conversations.length === 0) {
          const init = createInitialState();
          state.contacts = init.contacts;
          state.activeContactId = init.activeContactId;
          state.conversations = init.conversations;
          state.activeConversationId = init.activeConversationId;
          state.groupConversationId = init.groupConversationId;
          return;
        }

        for (const c of state.contacts) {
          if (!c.status?.meals) c.status.meals = [];
          if (!c.status?.notes) c.status.notes = [];
          if (c.status?.battery === undefined) c.status.battery = Math.floor(Math.random() * 60) + 30;
          if (!c.status?.lastBatteryUpdate) c.status.lastBatteryUpdate = Date.now();
          if (c.status?.mood?.level === undefined) c.status.mood.level = 60;
          if (c.status?.mood?.isAngry === undefined) c.status.mood.isAngry = false;
          if (!c.status?.mood?.curve) c.status.mood.curve = [50, 52, 55, 58, 56, 60, 62, 60, 58, 55, 57, 60];
          if (!c.riceFullness) c.riceFullness = 0;
          if (!c.cards) c.cards = createDefaultCards();
          const modules = ["breakfast", "lunch", "dinner"] as const;
          for (const m of modules) {
            if (!c.cards[m] || c.cards[m].length === 0) {
              c.cards[m] = JSON.parse(JSON.stringify(INITIAL_CARDS[m]));
            }
          }
        }
        if (!state.cardGroups) state.cardGroups = ["日常", "撒娇", "关心"];
        if (!state.stickers) state.stickers = [];
        if (!state.activeCardLibContactId) state.activeCardLibContactId = null;
        if (!state.beauty?.myName) state.beauty.myName = "我";
        if (!state.beauty?.herName) state.beauty.herName = "宝宝";
        if (state.beauty?.myAvatarImage === undefined) state.beauty.myAvatarImage = "";
        if (state.beauty?.herAvatarImage === undefined) state.beauty.herAvatarImage = "";
        if (state.beauty?.wallpaperImage === undefined) state.beauty.wallpaperImage = "";
        if (state.chat?.moodCardEnabled === undefined) state.chat.moodCardEnabled = true;
        if (state.chat?.waterReminder === undefined) state.chat.waterReminder = true;
        if (!state.callRecords) state.callRecords = [];
        if (!state.memos) state.memos = [];
        if (state.showMemoBar === undefined) state.showMemoBar = false;
        if (!state.songs) state.songs = [];

        // 启动自动定时器（主动写备忘录 + 主动打电话）
        const setupAutoActions = () => {
          const hours = Math.random() * 2 + 3;
          window.setTimeout(() => {
            const store = useAppStore.getState();

            // 对方主动写备忘录：3-6条字卡合并
            store.contacts.forEach((contact) => {
              const allCards = [
                ...contact.cards.chat,
                ...contact.cards.body,
                ...contact.cards.mood,
                ...contact.cards.workContent,
                ...contact.cards.workStatus,
                ...contact.cards.travel,
                ...contact.cards.breakfast,
                ...contact.cards.lunch,
                ...contact.cards.dinner,
              ];
              if (allCards.length === 0) return;
              const count = Math.floor(Math.random() * 4) + 3;
              const cardContents: string[] = [];
              for (let i = 0; i < count; i++) {
                const card = allCards[Math.floor(Math.random() * allCards.length)];
                cardContents.push(card.content);
              }
              const mergedText = cardContents.join("\n\n");
              useAppStore.setState((s) => ({
                memos: [{
                  id: uid("auto"),
                  contactId: contact.id,
                  text: mergedText,
                  from: contact.id,
                  timestamp: Date.now(),
                }, ...s.memos].slice(0, 500),
              }));
            });

            // 主动打电话：5%概率
            if (Math.random() < 0.05 && store.contacts.length > 0) {
              const contact = store.contacts[Math.floor(Math.random() * store.contacts.length)];
              useAppStore.setState({
                incomingCall: {
                  contactId: contact.id,
                  contactName: contact.name,
                  contactAvatar: contact.avatar,
                },
              });
            }

            setupAutoActions();
          }, hours * 60 * 60 * 1000);
        };
        setupAutoActions();

        // 电量更新：约2.5小时更新一次
        const setupBatteryUpdate = () => {
          const hours = 2 + Math.random() * 1;
          window.setTimeout(() => {
            const store = useAppStore.getState();
            const updates: Record<string, number> = {};
            store.contacts.forEach((c) => {
              const currentBattery = c.status.battery ?? 50;
              // 减少 5-15%，最低 5%
              const drop = Math.floor(Math.random() * 11) + 5;
              let newBattery = Math.max(5, currentBattery - drop);
              // 10%概率充电到 80-100%
              if (Math.random() < 0.1) {
                newBattery = Math.floor(Math.random() * 21) + 80;
              }
              updates[c.id] = newBattery;
            });
            useAppStore.setState((s) => ({
              contacts: s.contacts.map((c) =>
                updates[c.id] !== undefined
                  ? {
                      ...c,
                      status: {
                        ...c.status,
                        battery: updates[c.id],
                        lastBatteryUpdate: Date.now(),
                      },
                    }
                  : c
              ),
            }));
            setupBatteryUpdate();
          }, hours * 60 * 60 * 1000);
        };
        setupBatteryUpdate();
      },
    },
  ),
);

export { MODULE_LABELS, createInitialState, createDefaultCards, createDefaultStatus, bumpHerStatus };
