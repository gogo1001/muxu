import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { INITIAL_CARDS } from "@/data/initialCards";
import { DEFAULT_NOTE_CARDS, DEFAULT_WHISPER_CARDS, DEFAULT_REPLY_CARDS } from "@/data/driftBottleCards";
import { idbStorage } from "@/store/idbStorage";
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
  DriftBottle,
  TomatoThrow,
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
  musicPlaying: boolean;
  musicCurrentIndex: number;
  musicFloating: boolean;
  musicFullScreen: boolean;
  musicSwitchNote: string | null;
  setMusicPlaying: (playing: boolean) => void;
  setMusicCurrentIndex: (index: number) => void;
  setMusicFloating: (floating: boolean) => void;
  setMusicFullScreen: (open: boolean) => void;
  setMusicSwitchNote: (note: string | null) => void;
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
  quotingMessageId: string | null;
  tomatoThrows: TomatoThrow[];
  tomatoStats: Record<string, { thrownByMe: number; thrownAtMe: number }>;
  setActiveConversation: (id: string) => void;
  addPrivateConversation: (contactId: string) => string;
  addToGroup: (contactId: string) => void;
  renameGroup: (name: string) => void;
  send: (conversationId: string, text: string) => void;
  sendStickerInConv: (conversationId: string, image: string, senderId: string) => void;
  sendImageInConv: (conversationId: string, image: string, senderId: string) => void;
  sendRPS: (conversationId: string, targetId: string, myChoice: "rock" | "paper" | "scissors") => void;
  sendPoll: (conversationId: string, question: string, options: string[]) => void;
  quoteMessage: (conversationId: string, messageId: string) => void;
  recallMessage: (conversationId: string, messageId: string) => void;
  deleteMessage: (conversationId: string, messageId: string) => void;
  clearMessages: (conversationId: string) => void;
  toggleView: (conversationId: string) => void;
  setPhoneOpen: (open: boolean) => void;
  setSettingsOpen: (open: boolean) => void;
  dismissCaught: () => void;
  dismissAngry: () => void;
  dismissMealAlert: () => void;
  pat: (conversationId: string, contactId: string) => void;
  setConversationAvatar: (conversationId: string, side: "my" | "her", text?: string, image?: string) => void;
  throwTomato: (conversationId: string, throwerId: string, targetId: string, targetMsgId?: string, auto?: boolean, count?: number) => void;
  removeTomatoThrow: (tomatoId: string) => void;
  sendGroupListenTogether: (conversationId: string, songIndex?: number) => void;
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
  driftBottles: DriftBottle[];
  // 漂流瓶应用独立字卡库
  bottleNoteCards: { id: string; content: string }[];
  bottleWhisperCards: { id: string; content: string }[];
  bottleReplyCards: { id: string; content: string }[];
  // 漂流瓶日记
  bottleDiary: { id: string; type: "star" | "ocean" | "letter"; content: string; reply?: string; timestamp: number }[];
  // 漂流瓶已发送的信
  bottleLetters: { id: string; content: string; font: string; fontSize: number; timestamp: number; receivedAt?: number; replyAt?: number; reply?: string }[];
  // 漂流瓶星星领取记录（按日期）
  bottleStarPicks: Record<string, { morning: boolean; noon: boolean; evening: boolean }>;
  lastAutoMemoAt: number;
  lastAutoMailboxAt: number;
  lastAutoDriftBottleAt: number;
  startCall: (contactId: string) => void;
  addMemo: (contactId: string, text: string) => void;
  addDriftBottle: (contactId: string, text: string) => void;
  openMailbox: (contactId: string) => void;
  markDriftBottleRead: (id: string) => void;
  // 漂流瓶字卡库操作
  addBottleNoteCards: (cards: string[]) => void;
  deleteBottleNoteCard: (id: string) => void;
  addBottleWhisperCards: (cards: string[]) => void;
  deleteBottleWhisperCard: (id: string) => void;
  addBottleReplyCards: (cards: string[]) => void;
  deleteBottleReplyCard: (id: string) => void;
  // 漂流瓶拾取/写信
  pickBottleStar: (content: string) => void;
  pickBottleOcean: (content: string) => void;
  replyBottleOcean: (id: string, reply: string) => void;
  sendBottleLetter: (content: string, font: string, fontSize: number) => void;
  showMemoBar: boolean;
  toggleMemoBar: () => void;
  incomingCall: { contactId: string; contactName: string; contactAvatar: string } | null;
  answerCall: () => void;
  rejectCall: () => void;
  floatingPhone: boolean;
  floatingPhoneContactId: string | null;
  setFloatingPhone: (open: boolean, contactId?: string) => void;
  dismissFloatingPhone: () => void;
  activeCall: {
    recordId: string;
    contactId: string;
    contactName: string;
    contactAvatar: string;
    direction: "incoming" | "outgoing";
    status: "calling" | "connected" | "rejected" | "ended";
    startTime: number;
  } | null;
  activeCallDuration: number;
  setActiveCallConnected: () => void;
  setActiveCallRejected: () => void;
  endActiveCall: () => void;
  updateActiveCallDuration: (duration: number) => void;
  callModalOpen: boolean;
  setCallModalOpen: (open: boolean) => void;
  minimizeActiveCall: () => void;
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

function getTodayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getTomatoStatKey(contactId: string, date: string): string {
  return `${contactId}:${date}`;
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
      location: "公司办公室",
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
      driftBottles: [],
      bottleNoteCards: DEFAULT_NOTE_CARDS,
      bottleWhisperCards: DEFAULT_WHISPER_CARDS,
      bottleReplyCards: DEFAULT_REPLY_CARDS,
      bottleDiary: [],
      bottleLetters: [],
      bottleStarPicks: {},
      showMemoBar: false,
      lastAutoMemoAt: 0,
      lastAutoMailboxAt: 0,
      lastAutoDriftBottleAt: 0,
      toggleMemoBar: () => set((s) => ({ showMemoBar: !s.showMemoBar })),
      incomingCall: null,
      floatingPhone: false,
      floatingPhoneContactId: null,
      activeCall: null,
      activeCallDuration: 0,
      callModalOpen: false,

      startCall: (contactId) => {
        const contact = get().contacts.find((c) => c.id === contactId);
        if (!contact) return;
        const recordId = uid("call");
        const now = Date.now();
        const isRejected = Math.random() < 0.15;
        const record: CallRecord = {
          id: recordId,
          contactId,
          contactName: contact.name,
          direction: "outgoing",
          status: isRejected ? "rejected" : "connected",
          duration: 0,
          timestamp: now,
        };
        set((s) => ({
          callRecords: [record, ...s.callRecords].slice(0, 100),
          activeCall: {
            recordId,
            contactId,
            contactName: contact.name,
            contactAvatar: contact.avatar || "他",
            direction: "outgoing",
            status: "calling",
            startTime: now,
          },
          activeCallDuration: 0,
          callModalOpen: true,
        }));
        const delay = 1500 + Math.random() * 1500;
        window.setTimeout(() => {
          if (isRejected) {
            set((s) => ({
              activeCall: s.activeCall ? { ...s.activeCall, status: "rejected" } : null,
            }));
          } else {
            set((s) => ({
              activeCall: s.activeCall ? { ...s.activeCall, status: "connected" } : null,
            }));
            const randDuration = Math.floor(Math.random() * 180) + 30;
            window.setTimeout(() => {
              const state = get();
              if (state.activeCall?.status === "connected") {
                set((s) => ({
                  callRecords: s.callRecords.map((r) =>
                    r.id === recordId ? { ...r, duration: randDuration } : r
                  ),
                }));
              }
            }, 3000);
          }
        }, delay);
      },

      setActiveCallConnected: () => set((s) => ({
        activeCall: s.activeCall ? { ...s.activeCall, status: "connected" } : null,
      })),
      setActiveCallRejected: () => set((s) => ({
        activeCall: s.activeCall ? { ...s.activeCall, status: "rejected" } : null,
      })),
      endActiveCall: () => {
        const state = get();
        if (!state.activeCall) return;
        set((s) => ({
          callRecords: s.callRecords.map((r) =>
            r.id === s.activeCall?.recordId ? { ...r, duration: s.activeCallDuration } : r
          ),
          activeCall: null,
          activeCallDuration: 0,
          callModalOpen: false,
          floatingPhone: false,
        }));
      },
      updateActiveCallDuration: (duration) => set({ activeCallDuration: duration }),
      setCallModalOpen: (open) => set({ callModalOpen: open }),
      minimizeActiveCall: () => {
        const state = get();
        if (!state.activeCall) return;
        set((s) => ({
          callModalOpen: false,
          floatingPhone: true,
          floatingPhoneContactId: s.activeCall?.contactId ?? null,
        }));
      },

      answerCall: () => {
        const incoming = get().incomingCall;
        if (!incoming) return;
        const recordId = uid("call");
        const now = Date.now();
        const record: CallRecord = {
          id: recordId,
          contactId: incoming.contactId,
          contactName: incoming.contactName,
          direction: "incoming",
          status: "connected",
          duration: 0,
          timestamp: now,
        };
        set((s) => ({
          callRecords: [record, ...s.callRecords].slice(0, 100),
          incomingCall: null,
          activeCall: {
            recordId,
            contactId: incoming.contactId,
            contactName: incoming.contactName,
            contactAvatar: incoming.contactAvatar,
            direction: "incoming",
            status: "connected",
            startTime: now,
          },
          activeCallDuration: 0,
          callModalOpen: true,
        }));
        const randDuration = Math.floor(Math.random() * 180) + 30;
        window.setTimeout(() => {
          const state = get();
          if (state.activeCall?.status === "connected") {
            set((s) => ({
              callRecords: s.callRecords.map((r) =>
                r.id === recordId ? { ...r, duration: randDuration } : r
              ),
            }));
          }
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
      },

      openMailbox: (contactId) => {
        // 打开信箱只显示已有信件，不自动生成新信
        // 信件由后台定时任务 setupMailboxSend 自动生成
      },

      addDriftBottle: (contactId, text) => {
        const trimmed = text.trim();
        if (!trimmed) return;
        const bottle: DriftBottle = {
          id: uid("drift"),
          contactId,
          text: trimmed,
          from: "me",
          timestamp: Date.now(),
          isRead: true,
        };
        set((s) => ({
          driftBottles: [bottle, ...s.driftBottles].slice(0, 500),
        }));

        // 漂流瓶回复：对方回复漂流瓶
        const scheduleNextReply = () => {
          const delay = Math.random() * 3000 + 2000;
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
            const card = allCards[Math.floor(Math.random() * allCards.length)];
            useAppStore.setState((s) => ({
              driftBottles: [{
                id: uid("drift-reply"),
                contactId,
                text: card.content,
                from: contactId,
                timestamp: Date.now(),
                isRead: false,
              }, ...s.driftBottles].slice(0, 500),
            }));
          }, delay);
        };
        scheduleNextReply();
      },

      markDriftBottleRead: (id) => {
        set((s) => ({
          driftBottles: s.driftBottles.map((b) =>
            b.id === id ? { ...b, isRead: true } : b
          ),
        }));
      },

      // =========== 漂流瓶应用字卡库 ===========
      addBottleNoteCards: (cards) =>
        set((s) => {
          const existing = new Set(s.bottleNoteCards.map((c) => c.content.trim()));
          const toAdd = cards
            .map((c) => c.trim())
            .filter((c) => c && !existing.has(c) && !existing.add(c))
            .map((c) => ({ id: uid("bn"), content: c }));
          return { bottleNoteCards: [...s.bottleNoteCards, ...toAdd] };
        }),
      deleteBottleNoteCard: (id) =>
        set((s) => ({ bottleNoteCards: s.bottleNoteCards.filter((c) => c.id !== id) })),
      addBottleWhisperCards: (cards) =>
        set((s) => {
          const existing = new Set(s.bottleWhisperCards.map((c) => c.content.trim()));
          const toAdd = cards
            .map((c) => c.trim())
            .filter((c) => c && !existing.has(c) && !existing.add(c))
            .map((c) => ({ id: uid("bw"), content: c }));
          return { bottleWhisperCards: [...s.bottleWhisperCards, ...toAdd] };
        }),
      deleteBottleWhisperCard: (id) =>
        set((s) => ({ bottleWhisperCards: s.bottleWhisperCards.filter((c) => c.id !== id) })),
      addBottleReplyCards: (cards) =>
        set((s) => {
          const existing = new Set(s.bottleReplyCards.map((c) => c.content.trim()));
          const toAdd = cards
            .map((c) => c.trim())
            .filter((c) => c && !existing.has(c) && !existing.add(c))
            .map((c) => ({ id: uid("br"), content: c }));
          return { bottleReplyCards: [...s.bottleReplyCards, ...toAdd] };
        }),
      deleteBottleReplyCard: (id) =>
        set((s) => ({ bottleReplyCards: s.bottleReplyCards.filter((c) => c.id !== id) })),

      // =========== 漂流瓶拾取/写信 ===========
      pickBottleStar: (content) =>
        set((s) => ({
          bottleDiary: [
            { id: uid("dstar"), type: "star" as const, content, timestamp: Date.now() },
            ...s.bottleDiary,
          ],
        })),
      pickBottleOcean: (content) =>
        set((s) => ({
          bottleDiary: [
            { id: uid("docean"), type: "ocean" as const, content, timestamp: Date.now() },
            ...s.bottleDiary,
          ],
        })),
      replyBottleOcean: (id, reply) =>
        set((s) => ({
          bottleDiary: s.bottleDiary.map((d) =>
            d.id === id ? { ...d, reply } : d
          ),
        })),
      sendBottleLetter: (content, font, fontSize) => {
        const letterId = uid("bletter");
        const now = Date.now();
        set((s) => ({
          bottleLetters: [
            ...s.bottleLetters,
            { id: letterId, content, font, fontSize, timestamp: now },
          ],
          bottleDiary: [
            { id: uid("dletter"), type: "letter" as const, content, timestamp: now },
            ...s.bottleDiary,
          ],
        }));

        // 30分钟到1小时后，对方收到漂流瓶
        const receiveDelay = randRange(30 * 60 * 1000, 60 * 60 * 1000);
        window.setTimeout(() => {
          set((s) => ({
            bottleLetters: s.bottleLetters.map((l) =>
              l.id === letterId ? { ...l, receivedAt: Date.now() } : l
            ),
          }));

          // 2-3小时后抽取回信字卡回复
          const replyDelay = randRange(2 * 60 * 60 * 1000, 3 * 60 * 60 * 1000);
          window.setTimeout(() => {
            const st = get();
            const replyCards = st.bottleReplyCards;
            if (replyCards.length === 0) return;
            const replyCount = Math.floor(Math.random() * 4) + 3; // 3-6条
            const shuffled = [...replyCards].sort(() => Math.random() - 0.5);
            const selected = shuffled.slice(0, Math.min(replyCount, shuffled.length));
            const replyText = selected.map((c) => c.content).join("\n\n---\n\n");
            set((s) => ({
              bottleLetters: s.bottleLetters.map((l) =>
                l.id === letterId
                  ? { ...l, replyAt: Date.now(), reply: replyText }
                  : l
              ),
              bottleDiary: s.bottleDiary.map((d) =>
                d.type === "letter" && d.content === content && !d.reply
                  ? { ...d, reply: replyText }
                  : d
              ),
            }));
          }, replyDelay);
        }, receiveDelay);
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
        const simplifiedCards: Partial<Record<CardModule, { content: string; group?: string }[]>> = {};
        const modules = ["chat", "mood", "body", "workStatus", "workContent", "workLocation", "travel", "breakfast", "lunch", "dinner"] as const;
        for (const m of modules) {
          const list = contact.cards[m];
          if (list && list.length > 0) {
            simplifiedCards[m] = list.map((c) => ({
              content: c.content || c.name || "",
              ...(m === "chat" && c.group ? { group: c.group } : {}),
            }));
          }
        }
        const data = {
          cardGroups: get().cardGroups,
          cards: simplifiedCards,
        };
        return JSON.stringify(data, null, 2);
      },

      importCards: (contactId, jsonStr) => {
        try {
          const data = JSON.parse(jsonStr);
          const newCards: Partial<Record<CardModule, Card[]>> = {};
          const newGroups: string[] = [];

          if (Array.isArray(data.groups)) {
            for (const group of data.groups) {
              const groupName = group.name || "未命名分组";
              newGroups.push(groupName);
              if (Array.isArray(group.items)) {
                const cards = group.items.map((text: string, i: number) => ({
                  id: `chat-imp-${groupName}-${i}-${Date.now()}`,
                  name: String(text || ""),
                  content: String(text || ""),
                  group: groupName,
                }));
                newCards.chat = [...(newCards.chat || []), ...cards];
              }
            }
          }

          if (Array.isArray(data.customReplies)) {
            const cards = data.customReplies.map((text: string, i: number) => ({
              id: `chat-imp-${i}-${Date.now()}`,
              name: String(text || ""),
              content: String(text || ""),
              group: "日常",
            }));
            newCards.chat = [...(newCards.chat || []), ...cards];
          }

          if (data.cards && typeof data.cards === "object") {
            const modules = ["chat", "mood", "body", "workStatus", "workContent", "workLocation", "travel", "breakfast", "lunch", "dinner"] as const;
            for (const m of modules) {
              if (Array.isArray(data.cards[m])) {
                const existing = newCards[m] || [];
                const imported = data.cards[m].map((c: any, i: number) => {
                  const content = String(c.content || c.name || "");
                  return {
                    id: `${m}-imp-${i}-${Date.now()}`,
                    name: content || "未命名",
                    content,
                    group: m === "chat" ? (c.group || "日常") : undefined,
                  };
                });
                newCards[m] = [...existing, ...imported];
              }
            }
          }

          if (!newCards.chat && !newCards.mood && !newCards.body) {
            return { success: false, message: "格式不正确：未找到可导入的字卡" };
          }

          const allNewGroups = [...newGroups, ...(Array.isArray(data.cardGroups) ? data.cardGroups : [])];
          let addedCount = 0;
          let dupCount = 0;

          set((s) => {
            const contact = s.contacts.find((c) => c.id === contactId);
            if (!contact) return {};

            const updatedGroups = [...new Set([...s.cardGroups, ...allNewGroups])];
            const mergedCards = { ...contact.cards } as Record<CardModule, Card[]>;

            const modules = Object.keys(newCards) as CardModule[];
            for (const m of modules) {
              const existing = mergedCards[m] || [];
              const existingKeys = new Set(
                existing.map((c) => `${(c.name || "").trim()}|${(c.content || "").trim()}`)
              );
              const toAdd: Card[] = [];
              for (const c of newCards[m] || []) {
                const key = `${(c.name || "").trim()}|${(c.content || "").trim()}`;
                if (existingKeys.has(key)) {
                  dupCount++;
                  continue;
                }
                existingKeys.add(key);
                toAdd.push(c);
                addedCount++;
              }
              mergedCards[m] = [...existing, ...toAdd];
            }

            return {
              cardGroups: updatedGroups,
              contacts: s.contacts.map((c) =>
                c.id === contactId
                  ? { ...c, cards: mergedCards }
                  : c
              ),
            };
          });

          return {
            success: true,
            message: `导入成功：新增 ${addedCount} 张，跳过重复 ${dupCount} 张，${allNewGroups.length} 个分组`,
          };
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

      musicPlaying: false,
      musicCurrentIndex: 0,
      musicFloating: false,
      musicFullScreen: false,
      musicSwitchNote: null,

      setMusicPlaying: (playing) => set({ musicPlaying: playing }),
      setMusicCurrentIndex: (index) => set({ musicCurrentIndex: index }),
      setMusicFloating: (floating) => set({ musicFloating: floating }),
      setMusicFullScreen: (open) => set({ musicFullScreen: open }),
      setMusicSwitchNote: (note) => set({ musicSwitchNote: note }),

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
      quotingMessageId: null,
      tomatoThrows: [],
      tomatoStats: {},

      setActiveConversation: (id) => set({ activeConversationId: id, quotingMessageId: null }),

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

      pat: (conversationId, contactId) => {
        const state = get();
        const contact = state.contacts.find((c) => c.id === contactId);
        if (!contact) return;

        const patMsg: Message = {
          id: uid("pat"),
          sender: "me",
          type: "system",
          systemText: `你拍了拍 ${contact.name}`,
          timestamp: Date.now(),
        };

        set((s) => ({
          conversations: s.conversations.map((c) =>
            c.id === conversationId
              ? { ...c, messages: [...c.messages, patMsg] }
              : c
          ),
        }));

        const delay = randRange(2000, 5000);
        window.setTimeout(() => {
          const currentState = get();
          const card = currentState.pickRandomCard(contactId, "chat");
          if (!card) return;

          const herMsg: Message = {
            id: uid("her"),
            sender: contactId,
            type: "text",
            text: card.content,
            card,
            timestamp: Date.now(),
          };

          set((s) => ({
            conversations: s.conversations.map((c) =>
              c.id === conversationId
                ? { ...c, messages: [...c.messages, herMsg] }
                : c
            ),
          }));
        }, delay);
      },

      send: (conversationId, text) => {
        const trimmed = text.trim();
        if (!trimmed) return;
        const conv = get().conversations.find((c) => c.id === conversationId);
        if (!conv) return;

        const quoteId = get().quotingMessageId;
        let quoteText: string | undefined;
        let quoteSender: string | undefined;
        if (quoteId) {
          const quotedMsg = conv.messages.find((m) => m.id === quoteId);
          if (quotedMsg) {
            quoteText = quotedMsg.text || (quotedMsg.sticker ? "[表情包]" : quotedMsg.image ? "[图片]" : "");
            quoteSender = quotedMsg.sender;
          }
        }

        const myMsg: Message = {
          id: uid("me"),
          sender: "me",
          type: "text",
          text: trimmed,
          timestamp: Date.now(),
          quoteId: quoteId || undefined,
          quoteText,
          quoteSender,
        };

        set((s) => ({
          quotingMessageId: null,
          conversations: s.conversations.map((c) =>
            c.id === conversationId
              ? { ...c, messages: [...c.messages, myMsg] }
              : c
          ),
        }));

        const { replySpeedMin, replySpeedMax, waterReminder } = get().chat;
        const myName = get().beauty.myName;

        if (conv.type === "private") {
          const contactId = conv.memberIds[0];
          const contact = get().contacts.find((c) => c.id === contactId);
          const alreadyNotified = (conv as any)._workNotified === contact?.status.work.status;
          if (contact?.status.work.status === "working" && !alreadyNotified) {
            const workMsg: Message = {
              id: uid("work"),
              sender: "system",
              type: "system",
              systemText: `${contact.name} 正在工作中`,
              timestamp: Date.now(),
            };
            set((s) => ({
              conversations: s.conversations.map((c) =>
                c.id === conversationId
                  ? { ...c, messages: [...c.messages, workMsg], _workNotified: contact.status.work.status } as any
                  : c
              ),
            }));
          }
          const replyCount = Math.floor(Math.random() * 3) + 1;

          const sendNextReply = (index: number) => {
            if (index >= replyCount) {
              return;
            }

            const delay = randRange(replySpeedMin * 1000, replySpeedMax * 1000);
            window.setTimeout(() => {
              const state = get();

              if (index === 0 && Math.random() < 0.02 && state.songs.length > 0) {
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

              if (index === 0 && waterReminder && Math.random() < 0.03) {
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

              const stickers = state.stickers;
              const useSticker = stickers.length > 0 && Math.random() < 0.1;

              const moodTag = Math.random() < 0.09 ? state.pickRandomCard(contactId, "mood")?.content : undefined;

              // 对方随机引用（5%概率）
              let quoteId: string | undefined;
              let quoteText: string | undefined;
              let quoteSender: string | undefined;
              if (Math.random() < 0.05) {
                const currentConv = state.conversations.find((c) => c.id === conversationId);
                const recentMsgs = (currentConv?.messages || []).filter((m) => !m.recalled && m.type !== "system").slice(-20);
                if (recentMsgs.length > 0) {
                  const quotedMsg = recentMsgs[Math.floor(Math.random() * recentMsgs.length)];
                  quoteId = quotedMsg.id;
                  quoteText = quotedMsg.text || (quotedMsg.sticker ? "[表情包]" : quotedMsg.image ? "[图片]" : "");
                  quoteSender = quotedMsg.sender;
                }
              }

              let herMsg: Message;
              if (useSticker) {
                const sticker = stickers[Math.floor(Math.random() * stickers.length)];
                herMsg = {
                  id: uid("her"),
                  sender: contactId,
                  type: "sticker",
                  sticker: sticker.image,
                  moodTag,
                  timestamp: Date.now(),
                  quoteId,
                  quoteText,
                  quoteSender,
                };
              } else {
                herMsg = {
                  id: uid("her"),
                  sender: contactId,
                  type: "text",
                  text: card.content,
                  card,
                  moodTag,
                  timestamp: Date.now(),
                  quoteId,
                  quoteText,
                  quoteSender,
                };
              }

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

              // 对方随机撤回（3%概率，撤回刚发的消息）
              if (Math.random() < 0.03) {
                const recallDelay = randRange(1500, 4000);
                const herMsgId = herMsg.id;
                window.setTimeout(() => {
                  set((s) => ({
                    conversations: s.conversations.map((c) =>
                      c.id === conversationId
                        ? {
                            ...c,
                            messages: c.messages.map((m) =>
                              m.id === herMsgId ? { ...m, recalled: true } : m
                            ),
                          }
                        : c
                    ),
                  }));
                }, recallDelay);
              }

              if (document.hidden && "Notification" in window && Notification.permission === "granted") {
                const contact = get().contacts.find((c) => c.id === contactId);
                try {
                  new Notification(contact?.name || "宝宝", {
                    body: card.content.length > 50 ? card.content.slice(0, 50) + "..." : card.content,
                    icon: contact?.avatarImage || undefined,
                    badge: contact?.avatarImage || undefined,
                  });
                } catch (e) {
                  console.log("Notification failed", e);
                }
              }

              sendNextReply(index + 1);
            }, delay);
          };

          sendNextReply(0);
        } else {
          const replyCount = Math.floor(Math.random() * 4) + 2;
          const memberIds = conv.memberIds;

          const sendNextReply = (index: number) => {
            if (index >= replyCount) {
              return;
            }

            const delay = randRange(replySpeedMin * 1000, replySpeedMax * 1000);
            window.setTimeout(() => {
              const state = get();
              const speakerId = memberIds[Math.floor(Math.random() * memberIds.length)];
              const card = state.pickRandomCard(speakerId, "chat");
              if (!card) {
                sendNextReply(index + 1);
                return;
              }

              const stickers = state.stickers;
              const useSticker = stickers.length > 0 && Math.random() < 0.1;

              const moodTag = Math.random() < 0.09 ? state.pickRandomCard(speakerId, "mood")?.content : undefined;

              let msg: Message;
              if (useSticker) {
                const sticker = stickers[Math.floor(Math.random() * stickers.length)];
                msg = {
                  id: uid("grp"),
                  sender: speakerId,
                  type: "sticker",
                  sticker: sticker.image,
                  moodTag,
                  timestamp: Date.now(),
                };
              } else {
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

                msg = {
                  id: uid("grp"),
                  sender: speakerId,
                  type: "text",
                  text: textContent,
                  card,
                  mentionTarget,
                  moodTag,
                  timestamp: Date.now(),
                };
              }

              set((s) => ({
                conversations: s.conversations.map((c) =>
                  c.id === conversationId
                    ? { ...c, messages: [...c.messages, msg] }
                    : c
                ),
              }));

              // 6%概率随机扔番茄给全员（包括自己）
              if (Math.random() < 0.06) {
                const allMembers = ["me", ...memberIds];
                const randomTarget = allMembers[Math.floor(Math.random() * allMembers.length)];
                const throwTomatoDelay = randRange(500, 1500);
                window.setTimeout(() => {
                  const curState = get();
                  const throwFn = curState.throwTomato;
                  if (throwFn) {
                    throwFn(conversationId, speakerId, randomTarget, undefined, true);
                  }
                }, throwTomatoDelay);
              }

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

        if (senderId === "me") {
          const { replySpeedMin, replySpeedMax } = get().chat;
          const contactId = conv.memberIds[0];
          const contact = get().contacts.find((c) => c.id === contactId);

          if (conv.type === "private" && contact) {
            const delay = randRange(replySpeedMin * 1000, replySpeedMax * 1000);
            window.setTimeout(() => {
              const state = get();
              const card = state.pickRandomCard(contactId, "chat");
              if (!card) return;

              const stickers = state.stickers;
              const useSticker = stickers.length > 0 && Math.random() < 0.1;

              const moodTag = Math.random() < 0.09 ? state.pickRandomCard(contactId, "mood")?.content : undefined;

              let herMsg: Message;
              if (useSticker) {
                const sticker = stickers[Math.floor(Math.random() * stickers.length)];
                herMsg = {
                  id: uid("her"),
                  sender: contactId,
                  type: "sticker",
                  sticker: sticker.image,
                  moodTag,
                  timestamp: Date.now(),
                };
              } else {
                herMsg = {
                  id: uid("her"),
                  sender: contactId,
                  type: "text",
                  text: card.content,
                  card,
                  moodTag,
                  timestamp: Date.now(),
                };
              }

              set((s) => ({
                conversations: s.conversations.map((c) =>
                  c.id === conversationId
                    ? { ...c, messages: [...c.messages, herMsg] }
                    : c
                ),
              }));
            }, delay);
          } else if (conv.type === "group") {
            const replyCount = Math.floor(Math.random() * 4) + 2;
            const sendNext = (index: number) => {
              if (index >= replyCount) return;
              const delay = randRange(replySpeedMin * 1000, replySpeedMax * 1000);
              window.setTimeout(() => {
                const state = get();
                const members = state.contacts.filter((c) => conv.memberIds.includes(c.id));
                const randomMember = members[Math.floor(Math.random() * members.length)];
                const card = state.pickRandomCard(randomMember.id, "chat");
                if (!card) { sendNext(index + 1); return; }

                const stickers = state.stickers;
                const useSticker = stickers.length > 0 && Math.random() < 0.1;

                const moodTag = Math.random() < 0.09 ? state.pickRandomCard(randomMember.id, "mood")?.content : undefined;

                let herMsg: Message;
                if (useSticker) {
                  const sticker = stickers[Math.floor(Math.random() * stickers.length)];
                  herMsg = {
                    id: uid("her"),
                    sender: randomMember.id,
                    type: "sticker",
                    sticker: sticker.image,
                    moodTag,
                    timestamp: Date.now(),
                  };
                } else {
                  herMsg = {
                    id: uid("her"),
                    sender: randomMember.id,
                    type: "text",
                    text: card.content,
                    card,
                    moodTag,
                    timestamp: Date.now(),
                  };
                }

                set((s) => ({
                  conversations: s.conversations.map((c) =>
                    c.id === conversationId
                      ? { ...c, messages: [...c.messages, herMsg] }
                      : c
                  ),
                }));
                sendNext(index + 1);
              }, delay);
            };
            sendNext(0);
          }
        }
      },

      sendImageInConv: (conversationId, image, senderId) => {
        const conv = get().conversations.find((c) => c.id === conversationId);
        if (!conv) return;
        const msg: Message = {
          id: uid("img"),
          sender: senderId,
          type: "image",
          image,
          timestamp: Date.now(),
        };
        set((s) => ({
          conversations: s.conversations.map((c) =>
            c.id === conversationId ? { ...c, messages: [...c.messages, msg] } : c
          ),
        }));

        if (senderId === "me") {
          const { replySpeedMin, replySpeedMax } = get().chat;
          const contactId = conv.memberIds[0];
          const contact = get().contacts.find((c) => c.id === contactId);

          if (conv.type === "private" && contact) {
            const delay = randRange(replySpeedMin * 1000, replySpeedMax * 1000);
            window.setTimeout(() => {
              const state = get();
              const card = state.pickRandomCard(contactId, "chat");
              if (!card) return;

              const herMsg: Message = {
                id: uid("her"),
                sender: contactId,
                type: "text",
                text: card.content,
                card,
                timestamp: Date.now(),
              };

              set((s) => ({
                conversations: s.conversations.map((c) =>
                  c.id === conversationId
                    ? { ...c, messages: [...c.messages, herMsg] }
                    : c
                ),
              }));
            }, delay);
          } else if (conv.type === "group") {
            const replyCount = Math.floor(Math.random() * 4) + 2;
            const sendNext = (index: number) => {
              if (index >= replyCount) return;
              const delay = randRange(replySpeedMin * 1000, replySpeedMax * 1000);
              window.setTimeout(() => {
                const state = get();
                const members = state.contacts.filter((c) => conv.memberIds.includes(c.id));
                const randomMember = members[Math.floor(Math.random() * members.length)];
                const card = state.pickRandomCard(randomMember.id, "chat");
                if (!card) return;

                const herMsg: Message = {
                  id: uid("her"),
                  sender: randomMember.id,
                  type: "text",
                  text: card.content,
                  card,
                  timestamp: Date.now(),
                };

                set((s) => ({
                  conversations: s.conversations.map((c) =>
                    c.id === conversationId
                      ? { ...c, messages: [...c.messages, herMsg] }
                      : c
                  ),
                }));
                sendNext(index + 1);
              }, delay);
            };
            sendNext(0);
          }
        }
      },

      quoteMessage: (conversationId, messageId) => {
        set((s) => ({
          quotingMessageId: messageId,
        }));
      },

      recallMessage: (conversationId, messageId) => {
        set((s) => ({
          conversations: s.conversations.map((c) =>
            c.id === conversationId
              ? {
                  ...c,
                  messages: c.messages.map((m) =>
                    m.id === messageId ? { ...m, recalled: true } : m
                  ),
                }
              : c
          ),
        }));
      },

      deleteMessage: (conversationId, messageId) => {
        set((s) => ({
          conversations: s.conversations.map((c) =>
            c.id === conversationId
              ? { ...c, messages: c.messages.filter((m) => m.id !== messageId) }
              : c
          ),
        }));
      },

      clearMessages: (conversationId) => {
        set((s) => ({
          conversations: s.conversations.map((c) =>
            c.id === conversationId
              ? { ...c, messages: [] }
              : c
          ),
        }));
      },

      throwTomato: (conversationId, throwerId, targetId, targetMsgId, auto = false, count = 1) => {
        const state = get();
        const conv = state.conversations.find((c) => c.id === conversationId);
        if (!conv) return;

        const throwerName = throwerId === "me" ? state.beauty.myName : state.contacts.find((c) => c.id === throwerId)?.name || "某人";
        const targetName = targetId === "me" ? state.beauty.myName : state.contacts.find((c) => c.id === targetId)?.name || "某人";

        let resolvedTargetMsgId = targetMsgId || "";
        if (!resolvedTargetMsgId && targetId) {
          const targetMsgs = conv.messages.filter((m) => m.sender === targetId && m.type !== "system" && !m.recalled);
          if (targetMsgs.length > 0) {
            resolvedTargetMsgId = targetMsgs[targetMsgs.length - 1].id;
          }
        }

        const tomatoCount = Math.max(1, Math.min(3, count));
        const tomatoThrowsToAdd: TomatoThrow[] = [];
        const tomatoIds: string[] = [];

        for (let i = 0; i < tomatoCount; i++) {
          const tomatoId = uid("tomato");
          tomatoIds.push(tomatoId);
          tomatoThrowsToAdd.push({
            id: tomatoId,
            throwerId,
            targetId,
            targetMsgId: resolvedTargetMsgId,
            timestamp: Date.now() + i * 200,
            conversationId,
            auto,
          });
        }

        const sysMsg: Message = {
          id: uid("sys"),
          sender: "system",
          type: "system",
          systemText: tomatoCount > 1
            ? `${throwerName}很生气，所以向${targetName}扔了${tomatoCount}个番茄`
            : `${throwerName}很生气，所以向${targetName}扔了番茄`,
          timestamp: Date.now(),
        };

        // 更新番茄统计
        const today = getTodayKey();
        set((s) => {
          const newStats = { ...s.tomatoStats };

          // 我扔向对方 → 在 targetId 的统计中，thrownByMe + count
          if (throwerId === "me" && targetId !== "me") {
            const key = getTomatoStatKey(targetId, today);
            if (!newStats[key]) newStats[key] = { thrownByMe: 0, thrownAtMe: 0 };
            newStats[key].thrownByMe += tomatoCount;
          }

          // 对方扔向我 → 在 throwerId 的统计中，thrownAtMe + count
          if (throwerId !== "me" && targetId === "me") {
            const key = getTomatoStatKey(throwerId, today);
            if (!newStats[key]) newStats[key] = { thrownByMe: 0, thrownAtMe: 0 };
            newStats[key].thrownAtMe += tomatoCount;
          }

          return {
            tomatoThrows: [...s.tomatoThrows, ...tomatoThrowsToAdd],
            tomatoStats: newStats,
            conversations: s.conversations.map((c) =>
              c.id === conversationId
                ? { ...c, messages: [...c.messages, sysMsg] }
                : c
            ),
          };
        });

        // 40秒后清除番茄
        tomatoIds.forEach((id, idx) => {
          window.setTimeout(() => {
            set((s) => ({
              tomatoThrows: s.tomatoThrows.filter((t) => t.id !== id),
            }));
          }, 40000 + idx * 200);
        });

        // 被扔番茄的人是真实联系人时的反应
        // 自动随机扔的番茄不触发被扔人回复，避免循环刷屏
        if (targetId !== "me" && !auto) {
          window.setTimeout(() => {
            const currentState = get();
            const { replySpeedMin, replySpeedMax } = currentState.chat;
            const currentConv = currentState.conversations.find((c) => c.id === conversationId);
            if (!currentConv) return;

            const rand = Math.random();
            if (rand < 0.5) {
              // 50% 不回复
              return;
            } else if (rand < 0.9) {
              // 40% 扔回番茄（1-3 个）
              const throwCount = Math.floor(Math.random() * 3) + 1;
              const delay = randRange(replySpeedMin * 1000, replySpeedMax * 1000);
              window.setTimeout(() => {
                const st = get();
                const throwFn = st.throwTomato;
                if (throwFn) {
                  throwFn(conversationId, targetId, throwerId, "", true, throwCount);
                }
              }, delay);
            } else {
              // 10% 回复 1 条消息
              const delay = randRange(replySpeedMin * 1000, replySpeedMax * 1000);
              window.setTimeout(() => {
                const st = get();
                const card = st.pickRandomCard(targetId, "chat");
                if (!card) return;
                const stickers = st.stickers;
                const useSticker = stickers.length > 0 && Math.random() < 0.1;
                let msg: Message;
                if (useSticker) {
                  const sticker = stickers[Math.floor(Math.random() * stickers.length)];
                  msg = {
                    id: uid("treply"),
                    sender: targetId,
                    type: "sticker",
                    sticker: sticker.image,
                    timestamp: Date.now(),
                  };
                } else {
                  msg = {
                    id: uid("treply"),
                    sender: targetId,
                    type: "text",
                    text: card.content,
                    card,
                    timestamp: Date.now(),
                  };
                }
                set((s) => ({
                  conversations: s.conversations.map((c) =>
                    c.id === conversationId ? { ...c, messages: [...c.messages, msg] } : c
                  ),
                }));
              }, delay);
            }
          }, 600);
        }
      },

      removeTomatoThrow: (tomatoId) => {
        set((s) => ({
          tomatoThrows: s.tomatoThrows.filter((t) => t.id !== tomatoId),
        }));
      },

      sendGroupListenTogether: (conversationId, songIndex) => {
        const state = get();
        const conv = state.conversations.find((c) => c.id === conversationId);
        if (!conv || conv.type !== "group") return;
        if (state.songs.length === 0) return;

        const idx = songIndex !== undefined && songIndex >= 0 && songIndex < state.songs.length
          ? songIndex
          : Math.floor(Math.random() * state.songs.length);
        const song = state.songs[idx];
        const myName = state.beauty.myName;

        const initMsg: Message = {
          id: uid("music"),
          sender: "me",
          type: "music",
          music: song,
          text: `${myName} 发起了一起听「${song.title}」`,
          timestamp: Date.now(),
        };

        set((s) => ({
          conversations: s.conversations.map((c) =>
            c.id === conversationId
              ? { ...c, messages: [...c.messages, initMsg] }
              : c
          ),
        }));

        const { replySpeedMin, replySpeedMax } = state.chat;
        conv.memberIds.forEach((memberId) => {
          const delay = randRange(replySpeedMin * 1000, replySpeedMax * 1000);
          window.setTimeout(() => {
            const joined = Math.random() < 0.7;
            const memberName = state.contacts.find((c) => c.id === memberId)?.name || "某人";
            const sysMsg: Message = {
              id: uid("sys"),
              sender: "system",
              type: "system",
              systemText: joined
                ? `${memberName} 加入了「${song.title}」一起听`
                : `${memberName} 暂时不想一起听`,
              timestamp: Date.now(),
            };
            set((s) => ({
              conversations: s.conversations.map((c) =>
                c.id === conversationId
                  ? { ...c, messages: [...c.messages, sysMsg] }
                  : c
              ),
            }));
          }, delay);
        });
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
        const votes: Record<string, number> = {};
        options.forEach((_, i) => {
          votes[String(i)] = 0;
        });
        const voters: Record<string, number> = {};
        for (const memberId of conv.memberIds) {
          const choice = Math.floor(Math.random() * options.length);
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

      setFloatingPhone: (open, contactId) =>
        set(
          open
            ? { floatingPhone: true, floatingPhoneContactId: contactId ?? null }
            : { floatingPhone: false, floatingPhoneContactId: null }
        ),

      dismissFloatingPhone: () => set({ floatingPhone: false, floatingPhoneContactId: null }),

      setSettingsOpen: (open) => set({ settingsOpen: open }),
      dismissCaught: () => set({ caughtMessage: null }),
      dismissAngry: () => set({ angryAlert: false }),
      dismissMealAlert: () => set({ mealAlert: null }),

      setConversationAvatar: (conversationId, side, text, image) =>
        set((s) => ({
          conversations: s.conversations.map((c) => {
            if (c.id !== conversationId) return c;
            if (side === "my") {
              return { ...c, myAvatarText: text, myAvatarImage: image };
            } else {
              return { ...c, herAvatarText: text, herAvatarImage: image };
            }
          }),
        })),

      // =========== 设置 ===========
      beauty: DEFAULT_BEAUTY,
      chat: DEFAULT_CHAT_SETTINGS,

      setBeauty: (b) => set((s) => ({ beauty: { ...s.beauty, ...b } })),
      setChat: (c) => set((s) => ({ chat: { ...s.chat, ...c } })),
      resetBeauty: () => set({ beauty: DEFAULT_BEAUTY }),
    }),
    {
      name: "cardtalk-store",
      storage: createJSONStorage(() => idbStorage),
      partialize: (state) => ({
        contacts: state.contacts,
        activeContactId: state.activeContactId,
        conversations: state.conversations.map((c) => {
          const { _workNotified, ...rest } = c as any;
          return { ...rest, messages: rest.messages };
        }),
        activeConversationId: state.activeConversationId,
        groupConversationId: state.groupConversationId,
        cardGroups: state.cardGroups,
        stickers: state.stickers,
        songs: state.songs,
        beauty: state.beauty,
        chat: state.chat,
        callRecords: state.callRecords,
        memos: state.memos,
        lastAutoMemoAt: state.lastAutoMemoAt,
        lastAutoMailboxAt: state.lastAutoMailboxAt,
        activeCardLibContactId: state.activeCardLibContactId,
        musicCurrentIndex: state.musicCurrentIndex,
        tomatoStats: state.tomatoStats,
        bottleNoteCards: state.bottleNoteCards,
        bottleWhisperCards: state.bottleWhisperCards,
        bottleReplyCards: state.bottleReplyCards,
        bottleDiary: state.bottleDiary,
        bottleLetters: state.bottleLetters,
        bottleStarPicks: state.bottleStarPicks,
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
          if (!c.cards) {
            c.cards = createDefaultCards();
          } else {
            // 补全所有缺失的模块
            (Object.keys(INITIAL_CARDS) as CardModule[]).forEach((m) => {
              if (!c.cards[m] || c.cards[m].length === 0) {
                c.cards[m] = JSON.parse(JSON.stringify(INITIAL_CARDS[m]));
              }
            });
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
        if (state.chat?.pushNotification === undefined) state.chat.pushNotification = true;
        if (!state.callRecords) state.callRecords = [];
        if (!state.memos) state.memos = [];
        if (state.showMemoBar === undefined) state.showMemoBar = false;
        if (!state.songs) state.songs = [];
        if (state.lastAutoMemoAt === undefined) state.lastAutoMemoAt = 0;
        if (state.lastAutoMailboxAt === undefined) state.lastAutoMailboxAt = 0;
        if (!state.tomatoStats) state.tomatoStats = {};
        if (!state.bottleNoteCards) state.bottleNoteCards = DEFAULT_NOTE_CARDS;
        if (!state.bottleWhisperCards) state.bottleWhisperCards = DEFAULT_WHISPER_CARDS;
        if (!state.bottleReplyCards) state.bottleReplyCards = DEFAULT_REPLY_CARDS;
        if (!state.bottleDiary) state.bottleDiary = [];
        if (!state.bottleLetters) state.bottleLetters = [];
        if (!state.bottleStarPicks) state.bottleStarPicks = {};

        const setupAutoActions = () => {
          const minHours = 3;
          const maxHours = 5;
          const lastAt = useAppStore.getState().lastAutoMemoAt || 0;
          const now = Date.now();
          const minInterval = minHours * 60 * 60 * 1000;
          const maxInterval = maxHours * 60 * 60 * 1000;

          // 如果从未发送过，或者距离上次发送已超过最大间隔，等待一个随机间隔
          // 否则等待剩余时间，确保至少等待最小间隔的一半
          let delay: number;
          if (lastAt === 0) {
            delay = (Math.random() * (maxInterval - minInterval) + minHours) * 60 * 60 * 1000;
          } else {
            const elapsed = now - lastAt;
            const randomInterval = Math.random() * (maxInterval - minInterval) + minInterval;
            const remaining = randomInterval - elapsed;
            delay = Math.max(remaining, minInterval / 2);
          }

          window.setTimeout(() => {
            const store = useAppStore.getState();

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
          }, delay);
        };
        setupAutoActions();

        const setupMailboxSend = () => {
          const minHours = 8;
          const maxHours = 16;
          const lastAt = useAppStore.getState().lastAutoMailboxAt || 0;
          const now = Date.now();
          const minInterval = minHours * 60 * 60 * 1000;
          const maxInterval = maxHours * 60 * 60 * 1000;

          // 如果从未发送过，或者距离上次发送已超过最大间隔，等待一个随机间隔
          // 否则等待剩余时间，确保至少等待最小间隔的一半
          let delay: number;
          if (lastAt === 0) {
            delay = Math.random() * (maxInterval - minInterval) + minInterval;
          } else {
            const elapsed = now - lastAt;
            const randomInterval = Math.random() * (maxInterval - minInterval) + minInterval;
            const remaining = randomInterval - elapsed;
            delay = Math.max(remaining, minInterval / 2);
          }

          window.setTimeout(() => {
            const store = useAppStore.getState();
            store.contacts.forEach((contact) => {
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
              const stickers = store.stickers;
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
              useAppStore.setState((s) => ({
                lastAutoMailboxAt: Date.now(),
                memos: [{
                  id: uid("mbox-auto"),
                  contactId: contact.id,
                  text: mergedText,
                  from: contact.id,
                  timestamp: Date.now(),
                }, ...s.memos].slice(0, 500),
              }));
            });
            setupMailboxSend();
          }, delay);
        };
        setupMailboxSend();

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
