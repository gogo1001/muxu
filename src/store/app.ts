import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { INITIAL_CARDS } from "@/data/initialCards";
import { DEFAULT_NOTE_CARDS, DEFAULT_WHISPER_CARDS } from "@/data/driftBottleCards";
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
  Survey,
  SurveyQuestion,
  Product,
  ShopData,
  MsgNotification,
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
  batchImport: (contactId: string, module: CardModule, text: string, group?: string) => { added: number; duplicates: number };
  resetModule: (contactId: string, module: CardModule) => void;
  pickRandomCard: (contactId: string, module: CardModule, excludeId?: string) => Card | undefined;
  pickRandomCards: (contactId: string, module: CardModule, count: number) => Card[];
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
  groupChatEnabled: boolean;
  quotingMessageId: string | null;
  tomatoThrows: TomatoThrow[];
  tomatoStats: Record<string, { thrownByMe: number; thrownAtMe: number }>;
  setActiveConversation: (id: string) => void;
  addPrivateConversation: (contactId: string) => string;
  addToGroup: (contactId: string) => void;
  renameGroup: (name: string) => void;
  setGroupChatEnabled: (enabled: boolean) => void;
  createGroupChat: (name: string, memberIds: string[]) => string;
  updateGroupMembers: (conversationId: string, memberIds: string[]) => void;
  send: (conversationId: string, text: string) => void;
  sendStickerInConv: (conversationId: string, image: string, senderId: string) => void;
  sendImageInConv: (conversationId: string, image: string, senderId: string) => void;
  sendRPS: (conversationId: string, targetId: string, myChoice: "rock" | "paper" | "scissors") => void;
  sendFlyChess: (conversationId: string, playerCount: 2 | 3 | 4) => void;
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
  patPet: (conversationId: string, by: "me" | "her") => void;
  hidePet: (conversationId: string, messageId: string, side: "left" | "right", part: "ear" | "top" | "accessory") => void;
  hidePetManually: (conversationId: string) => void;
  hidePetAtMessage: (conversationId: string, messageId: string, side: "left" | "right") => void;
  findPet: (conversationId: string, by: "me" | "her") => void;
  missPet: (conversationId: string) => void;
  petHidingMode: boolean;
  setPetHidingMode: (on: boolean) => void;
}

interface BottleData {
  noteCards: { id: string; content: string }[];
  whisperCards: { id: string; content: string }[];
  diary: { id: string; type: "star" | "ocean" | "letter"; content: string; reply?: string; herReply?: string; herReplyAt?: number; expectedHerReplyAt?: number; timestamp: number }[];
  letters: { id: string; content: string; font: string; fontSize: number; timestamp: number; expectedReceiveAt?: number; expectedReplyAt?: number; receivedAt?: number; replyAt?: number; reply?: string }[];
  starPicks: Record<string, { morning: boolean; noon: boolean; evening: boolean }>;
}

function createDefaultBottleData(): BottleData {
  return {
    noteCards: JSON.parse(JSON.stringify(DEFAULT_NOTE_CARDS)),
    whisperCards: JSON.parse(JSON.stringify(DEFAULT_WHISPER_CARDS)),
    diary: [],
    letters: [],
    starPicks: {},
  };
}

function getBottleData(data: Record<string, BottleData>, contactId: string): BottleData {
  if (!data[contactId]) {
    data[contactId] = createDefaultBottleData();
  }
  return data[contactId];
}

interface SurveyStore {
  surveys: Survey[];
  submitSurvey: (title: string, questions: SurveyQuestion[], author: string, scope?: "personal" | "public") => void;
  approveSurvey: (id: string) => boolean;
  rejectSurvey: (id: string) => void;
  deleteSurvey: (id: string) => void;
  sendSurveyToChat: (conversationId: string, surveyId: string) => void;
  sendSurveyDataToChat: (conversationId: string, survey: { id: string; title: string; questions: SurveyQuestion[] }) => void;
  saveSurveyResponse: (surveyId: string, response: { respondent: string; answers: { questionId: string; answer: string }[]; completedAt: number }) => void;
}

interface ShopStore {
  shopData: Record<string, ShopData>;
  getShopData: (contactId: string) => ShopData;
  setMyBalance: (contactId: string, amount: number) => void;
  setHerBalance: (contactId: string, amount: number) => void;
  addProduct: (contactId: string, name: string, price: number, emoji: string) => void;
  deleteProduct: (contactId: string, productId: string) => void;
  buyProduct: (conversationId: string, productId: string) => void;
  buyProductByMe: (conversationId: string, productId: string, leaveMessage?: string) => void;
  sendRedpacket: (conversationId: string, amount: number, message?: string, count?: number) => void;
  claimRedpacket: (conversationId: string, messageId: string) => void;
  returnRedpacket: (conversationId: string, messageId: string) => void;
  claimGift: (conversationId: string, messageId: string) => void;
  toggleEnvelope: (conversationId: string, messageId: string) => void;
  pushLetterToast: (conversationId: string, messageId: string) => void;
}

interface GlobalState {
  phoneOpen: boolean;
  phoneAppId: string;
  settingsOpen: boolean;
  caughtMessage: string | null;
  angryAlert: boolean;
  mealAlert: { meal: "breakfast" | "lunch" | "dinner"; name: string } | null;
  activeCardLibContactId: string | null;
  setActiveCardLibContactId: (id: string | null) => void;
  setPhoneAppId: (appId: string) => void;
  rpClaimModal: { conversationId: string; messageId: string } | null;
  setRpClaimModal: (v: { conversationId: string; messageId: string } | null) => void;
  giftClaimModal: { conversationId: string; messageId: string } | null;
  setGiftClaimModal: (v: { conversationId: string; messageId: string } | null) => void;
  // 新消息弹窗队列（微信式浮窗）
  msgNotifications: MsgNotification[];
  pushMsgNotification: (n: Omit<MsgNotification, "id" | "timestamp">) => void;
  dismissMsgNotification: (id: string) => void;
  clearMsgNotifications: () => void;
  // 记录每个会话已发过弹窗的消息数量（用于 subscribe 兜底，避免重复弹窗）
  _notifMsgCountMap: Record<string, number>;
  // 播放新消息音效（按 settings）
  playMsgSound: () => void;
  // 当新消息到达 conv 时统一触发：内部判断是否弹窗+音效
  onIncomingMessage: (conversationId: string, message: Message) => void;
  callRecords: CallRecord[];
  memos: Memo[];
  driftBottles: DriftBottle[];
  // 漂流瓶数据（按联系人ID独立存储）
  bottleData: Record<string, BottleData>;
  driftBottleOpen: boolean;
  setDriftBottleOpen: (open: boolean) => void;
  // 获取当前活动漂流瓶的联系人ID
  getActiveBottleContactId: () => string | null;
  lastAutoMemoAt: number;
  lastAutoMailboxAt: number;
  lastAutoDriftBottleAt: number;
  lastTravelUpdateAt: number;
  startCall: (contactId: string) => void;
  addMemo: (contactId: string, text: string) => void;
  addDriftBottle: (contactId: string, text: string) => void;
  openMailbox: (contactId: string) => void;
  markDriftBottleRead: (id: string) => void;
  // 漂流瓶字卡库操作
  addBottleNoteCards: (contactId: string, cards: string[]) => void;
  deleteBottleNoteCard: (contactId: string, id: string) => void;
  addBottleWhisperCards: (contactId: string, cards: string[]) => void;
  deleteBottleWhisperCard: (contactId: string, id: string) => void;
  // 漂流瓶拾取/写信
  pickBottleStar: (contactId: string, content: string) => void;
  pickBottleOcean: (contactId: string, content: string) => string;
  replyBottleOcean: (contactId: string, id: string, reply: string) => void;
  receiveBottleOceanReply: (contactId: string, id: string, reply: string) => void;
  receiveBottleOceanReplyAt: (contactId: string, id: string, reply: string, replyAt: number) => void;
  sendBottleLetter: (contactId: string, content: string, font: string, fontSize: number) => void;
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
  const defaultContact = createContact(DEFAULT_CONTACT_NAME, DEFAULT_CONTACT_NAME.substring(0, 1));
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
    groupChatEnabled: true,
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
  CardStore & StickerStore & MusicStore & ContactStore & ConversationStore & GlobalState & SettingsState & SurveyStore & ShopStore
>()(
  persist(
    (set, get) => ({
      // =========== 全局状态 ===========
      phoneOpen: false,
      phoneAppId: "home",
      settingsOpen: false,
      caughtMessage: null,
      angryAlert: false,
      mealAlert: null,
      activeCardLibContactId: null,
      setActiveCardLibContactId: (id) => set({ activeCardLibContactId: id }),
      rpClaimModal: null,
      setRpClaimModal: (v) => set({ rpClaimModal: v }),
      giftClaimModal: null,
      setGiftClaimModal: (v) => set({ giftClaimModal: v }),
      msgNotifications: [],
      _notifMsgCountMap: {},
      pushMsgNotification: (n) =>
        set((s) => {
          const item: MsgNotification = { ...n, id: uid("msgtoast"), timestamp: Date.now() };
          // 最多保留 5 条，超出去掉最早的
          const next = [...s.msgNotifications, item].slice(-5);
          return { msgNotifications: next };
        }),
      dismissMsgNotification: (id) =>
        set((s) => ({ msgNotifications: s.msgNotifications.filter((n) => n.id !== id) })),
      clearMsgNotifications: () => set({ msgNotifications: [] }),
      playMsgSound: () => {
        const st = get();
        if (!st.chat.msgSoundEnabled) return;
        const preset = st.chat.msgSoundPreset;
        const volume = Math.max(0, Math.min(1, st.chat.msgSoundVolume || 0.7));
        // 静默模式
        if (preset === "silent") return;
        // 自定义音效
        if (preset === "custom" && st.chat.msgSoundCustomDataUrl) {
          try {
            const audio = new Audio(st.chat.msgSoundCustomDataUrl);
            audio.volume = volume;
            audio.play().catch(() => {});
            return;
          } catch {
            /* fallback to default */
          }
        }
        // WebAudio 合成：预设音效
        try {
          const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
          if (!AC) return;
          const ctx: AudioContext = new AC();
          const now = ctx.currentTime;
          const master = ctx.createGain();
          master.gain.value = volume;
          master.connect(ctx.destination);

          const playNote = (
            freq: number,
            startAt: number,
            duration: number,
            type: OscillatorType = "sine",
            vol = 0.4
          ) => {
            const osc = ctx.createOscillator();
            const g = ctx.createGain();
            osc.type = type;
            osc.frequency.value = freq;
            g.gain.setValueAtTime(0, now + startAt);
            g.gain.linearRampToValueAtTime(vol, now + startAt + 0.01);
            g.gain.exponentialRampToValueAtTime(0.0001, now + startAt + duration);
            osc.connect(g);
            g.connect(master);
            osc.start(now + startAt);
            osc.stop(now + startAt + duration + 0.05);
          };

          switch (preset) {
            case "dong":
              // 低沉叮咚：G4 -> C4
              playNote(783.99, 0, 0.22, "triangle", 0.4);
              playNote(523.25, 0.08, 0.35, "sine", 0.35);
              break;
            case "chord":
              // 柔和三和弦 C E G
              playNote(523.25, 0, 0.35, "sine", 0.28);
              playNote(659.25, 0, 0.35, "sine", 0.28);
              playNote(783.99, 0, 0.4, "sine", 0.28);
              break;
            case "pop":
              // 清脆 Pop D6 -> A5
              playNote(1174.66, 0, 0.08, "square", 0.18);
              playNote(880.0, 0.05, 0.12, "triangle", 0.3);
              break;
            case "ding":
            default:
              // 默认：经典叮咚 E6 -> C6
              playNote(1318.51, 0, 0.12, "sine", 0.38);
              playNote(1046.5, 0.08, 0.22, "triangle", 0.32);
              break;
          }
        } catch {
          /* audio blocked silently */
        }
      },
      onIncomingMessage: (conversationId, message) => {
        // 只处理来自对方/群成员的消息（我发的不弹不响）
        if (message.sender === "me") return;
        if (message.type === "system") return;
        const st = get();
        const conv = st.conversations.find((c) => c.id === conversationId);
        if (!conv) return;

        // 0) 去重保护：每条消息最多弹一次（根据 message.id 本地记录）
        const WIN = (window as any);
        if (!WIN.__notifiedMsgIds) WIN.__notifiedMsgIds = new Set<string>();
        if (WIN.__notifiedMsgIds.has(message.id)) return;
        WIN.__notifiedMsgIds.add(message.id);
        // 最多缓存 500 条，防内存泄漏
        if (WIN.__notifiedMsgIds.size > 500) {
          const arr = Array.from(WIN.__notifiedMsgIds as Set<string>);
          WIN.__notifiedMsgIds = new Set(arr.slice(arr.length - 300));
        }

        // 1) 播放音效
        st.playMsgSound();

        // 2) 决定是否弹窗
        if (!st.chat.msgToastEnabled) return;
        const isActive = conversationId === st.activeConversationId;
        if (isActive && !st.chat.msgToastForActiveConv) return;

        const contact = st.contacts.find((c) => c.id === conv.memberIds[0]);
        const isGroup = conv.type === "group";

        // 发送者：私聊 = 联系人；群聊 = message.sender 对应的群成员
        let senderName = "";
        let senderAvatarText = "?";
        let senderAvatarImage: string | undefined;

        if (isGroup) {
          const memberId = message.sender;
          const member = st.contacts.find((c) => c.id === memberId);
          senderName = member?.name || memberId;
          senderAvatarText = member?.avatar?.slice?.(0, 1) || senderName.slice(0, 1) || "群";
          // 群聊中查找该成员的私聊会话头像
          const privConv = st.conversations.find(
            (c) => c.type === "private" && c.memberIds.includes(memberId)
          );
          senderAvatarImage = member?.avatarImage || privConv?.herAvatarImage || st.beauty.herAvatarImage || undefined;
        } else {
          senderName = contact?.name || "对方";
          senderAvatarText = contact?.avatar?.slice?.(0, 1) || senderName.slice(0, 1) || "?";
          // 私聊：依次查找 contact → 会话设置 → 全局美化设置
          senderAvatarImage = contact?.avatarImage || conv.herAvatarImage || st.beauty.herAvatarImage || undefined;
        }
        const conversationName = conv.name || (isGroup ? "群聊" : contact?.name || "私聊");

        // 消息预览
        let preview = "";
        switch (message.type) {
          case "text":
            preview = message.text || "";
            break;
          case "image":
            preview = "[图片]";
            break;
          case "sticker":
            preview = "[表情包]";
            break;
          case "card":
            preview = `[卡片] ${message.card?.content?.slice?.(0, 24) || ""}`.trim();
            break;
          case "note":
            preview = `[小纸条] ${message.noteMood || ""} ${(message.moodNote || message.text || "").slice(0, 24)}`.trim();
            break;
          case "redpacket":
            preview = message.redpacket?.message
              ? `[红包] ${message.redpacket.message}`
              : "[红包] 恭喜发财，大吉大利";
            break;
          case "shop":
            preview = message.shop
              ? `[礼物] ${message.shop.emoji || "🎁"} ${message.shop.productName || ""}`.trim()
              : "[礼物]";
            break;
          case "music":
            preview = `[音乐] ${message.music?.title || ""}`.trim();
            break;
          case "rps":
            preview = message.rps?.resolved ? "[猜拳] 已出结果" : "[猜拳] 来猜拳吧！";
            break;
          case "poll":
            preview = message.poll ? `[投票] ${message.poll.question}`.slice(0, 32) : "[投票]";
            break;
          case "survey":
            preview = "[问卷]";
            break;
          case "flychess":
            preview = "[飞行棋]";
            break;
          default:
            preview = message.text || "[新消息]";
        }
        st.pushMsgNotification({
          conversationId,
          senderId: message.sender,
          senderName,
          senderAvatarText,
          senderAvatarImage,
          conversationName,
          isGroup,
          preview: preview.slice(0, 48),
          messageType: message.type,
        });
      },
      callRecords: [],
      memos: [],
      driftBottles: [],
      bottleData: {},
      driftBottleOpen: false,
      setDriftBottleOpen: (v: boolean) => {
        if (v) {
          // 打开时确保当前联系人的漂流瓶数据已初始化
          const st = get();
          const activeConv = st.conversations.find((c) => c.id === st.activeConversationId);
          const cid = activeConv?.type === "private" && activeConv.memberIds.length > 0
            ? activeConv.memberIds[0]
            : st.contacts[0]?.id;
          if (cid && !st.bottleData[cid]) {
            set((s) => ({
              bottleData: { ...s.bottleData, [cid]: createDefaultBottleData() },
            }));
          }
        }
        set({ driftBottleOpen: v });
      },
      getActiveBottleContactId: () => {
        const st = get();
        const activeConv = st.conversations.find((c) => c.id === st.activeConversationId);
        if (activeConv?.type === "private" && activeConv.memberIds.length > 0) {
          return activeConv.memberIds[0];
        }
        return st.contacts[0]?.id || null;
      },
      showMemoBar: false,
      lastAutoMemoAt: 0,
      lastAutoMailboxAt: 0,
      lastAutoDriftBottleAt: 0,
      lastTravelUpdateAt: 0,
      toggleMemoBar: () => set((s) => ({ showMemoBar: !s.showMemoBar })),
      incomingCall: null,
      floatingPhone: false,
      floatingPhoneContactId: null,
      petHidingMode: false,
      setPetHidingMode: (on) => set({ petHidingMode: on }),
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
      addBottleNoteCards: (contactId, cards) =>
        set((s) => {
          const data = { ...s.bottleData };
          const bd = getBottleData(data, contactId);
          const existing = new Set(bd.noteCards.map((c) => c.content.trim()));
          const toAdd = cards
            .map((c) => c.trim())
            .filter((c) => c && !existing.has(c) && !existing.add(c))
            .map((c) => ({ id: uid("bn"), content: c }));
          data[contactId] = { ...bd, noteCards: [...bd.noteCards, ...toAdd] };
          return { bottleData: data };
        }),
      deleteBottleNoteCard: (contactId, id) =>
        set((s) => {
          const data = { ...s.bottleData };
          const bd = getBottleData(data, contactId);
          data[contactId] = { ...bd, noteCards: bd.noteCards.filter((c) => c.id !== id) };
          return { bottleData: data };
        }),
      addBottleWhisperCards: (contactId, cards) =>
        set((s) => {
          const data = { ...s.bottleData };
          const bd = getBottleData(data, contactId);
          const existing = new Set(bd.whisperCards.map((c) => c.content.trim()));
          const toAdd = cards
            .map((c) => c.trim())
            .filter((c) => c && !existing.has(c) && !existing.add(c))
            .map((c) => ({ id: uid("bw"), content: c }));
          data[contactId] = { ...bd, whisperCards: [...bd.whisperCards, ...toAdd] };
          return { bottleData: data };
        }),
      deleteBottleWhisperCard: (contactId, id) =>
        set((s) => {
          const data = { ...s.bottleData };
          const bd = getBottleData(data, contactId);
          data[contactId] = { ...bd, whisperCards: bd.whisperCards.filter((c) => c.id !== id) };
          return { bottleData: data };
        }),

      // =========== 漂流瓶拾取/写信 ===========
      pickBottleStar: (contactId, content) =>
        set((s) => {
          const data = { ...s.bottleData };
          const bd = getBottleData(data, contactId);
          data[contactId] = {
            ...bd,
            diary: [
              { id: uid("dstar"), type: "star" as const, content, timestamp: Date.now() },
              ...bd.diary,
            ],
          };
          return { bottleData: data };
        }),
      pickBottleOcean: (contactId, content) => {
        const id = uid("docean");
        set((s) => {
          const data = { ...s.bottleData };
          const bd = getBottleData(data, contactId);
          data[contactId] = {
            ...bd,
            diary: [
              { id, type: "ocean" as const, content, timestamp: Date.now() },
              ...bd.diary,
            ],
          };
          return { bottleData: data };
        });
        return id;
      },
      replyBottleOcean: (contactId, id, reply) => {
        // 4-6分钟后对方回复
        const replyDelay = Math.floor(Math.random() * (6 * 60 * 1000 - 4 * 60 * 1000)) + 4 * 60 * 1000;
        const expectedHerReplyAt = Date.now() + replyDelay;
        set((s) => {
          const data = { ...s.bottleData };
          const bd = getBottleData(data, contactId);
          data[contactId] = {
            ...bd,
            diary: bd.diary.map((d) =>
              d.id === id ? { ...d, reply, expectedHerReplyAt } : d
            ),
          };
          return { bottleData: data };
        });
        // 设置定时器
        window.setTimeout(() => {
          const st = get();
          const contact = st.contacts.find((c) => c.id === contactId);
          const chatCards = contact?.cards.chat || [];
          if (chatCards.length === 0) return;
          const randomCard = chatCards[Math.floor(Math.random() * chatCards.length)];
          get().receiveBottleOceanReply(contactId, id, randomCard.content);
        }, replyDelay);
      },
      receiveBottleOceanReply: (contactId, id, reply) =>
        set((s) => {
          const data = { ...s.bottleData };
          const bd = getBottleData(data, contactId);
          data[contactId] = {
            ...bd,
            diary: bd.diary.map((d) =>
              d.id === id ? { ...d, herReply: reply, herReplyAt: Date.now() } : d
            ),
          };
          return { bottleData: data };
        }),
      receiveBottleOceanReplyAt: (contactId, id, reply, replyAt) =>
        set((s) => {
          const data = { ...s.bottleData };
          const bd = getBottleData(data, contactId);
          data[contactId] = {
            ...bd,
            diary: bd.diary.map((d) =>
              d.id === id ? { ...d, herReply: reply, herReplyAt: replyAt } : d
            ),
          };
          return { bottleData: data };
        }),
      sendBottleLetter: (contactId, content, font, fontSize) => {
        const letterId = uid("bletter");
        const now = Date.now();
        // 20分钟到50分钟后，对方收到漂流瓶
        const receiveDelay = randRange(20 * 60 * 1000, 50 * 60 * 1000);
        const expectedReceiveAt = now + receiveDelay;
        // 5-8小时后回复
        const replyDelay = randRange(5 * 60 * 60 * 1000, 8 * 60 * 60 * 1000);
        const expectedReplyAt = expectedReceiveAt + replyDelay;

        set((s) => {
          const data = { ...s.bottleData };
          const bd = getBottleData(data, contactId);
          data[contactId] = {
            ...bd,
            letters: [...bd.letters, { id: letterId, content, font, fontSize, timestamp: now, expectedReceiveAt, expectedReplyAt }],
            diary: [
              { id: uid("dletter"), type: "letter" as const, content, timestamp: now },
              ...bd.diary,
            ],
          };
          return { bottleData: data };
        });

        window.setTimeout(() => {
          set((s) => {
            const data = { ...s.bottleData };
            const bd = getBottleData(data, contactId);
            data[contactId] = {
              ...bd,
              letters: bd.letters.map((l) =>
                l.id === letterId ? { ...l, receivedAt: Date.now() } : l
              ),
            };
            return { bottleData: data };
          });

          window.setTimeout(() => {
            const st = get();
            const contact = st.contacts.find((c) => c.id === contactId);
            const chatCards = contact?.cards.chat || [];
            if (chatCards.length === 0) return;
            const replyCount = Math.floor(Math.random() * 7) + 6; // 6-12条
            const shuffled = [...chatCards].sort(() => Math.random() - 0.5);
            const selected = shuffled.slice(0, Math.min(replyCount, shuffled.length));
            const replyText = selected.map((c) => c.content).join("\n\n---\n\n");
            set((s) => {
              const data = { ...s.bottleData };
              const bd2 = getBottleData(data, contactId);
              data[contactId] = {
                ...bd2,
                letters: bd2.letters.map((l) =>
                  l.id === letterId
                    ? { ...l, replyAt: expectedReplyAt, reply: replyText }
                    : l
                ),
                diary: bd2.diary.map((d) =>
                  d.type === "letter" && d.content === content && !d.reply
                    ? { ...d, reply: replyText }
                    : d
                ),
              };
              return { bottleData: data };
            });
          }, replyDelay);
        }, receiveDelay);
      },

      // =========== 字卡库 ===========
      cardGroups: ["日常", "撒娇", "关心"],

      addCard: (contactId, module, card) =>
        set((s) => ({
          contacts: s.contacts.map((c) => {
            if (c.id !== contactId) return c;
            const moduleCards = c.cards?.[module] || [];
            return { ...c, cards: { ...c.cards, [module]: [...moduleCards, { ...card, id: uid(module) }] } };
          }),
        })),

      deleteCard: (contactId, module, id) =>
        set((s) => ({
          contacts: s.contacts.map((c) => {
            if (c.id !== contactId) return c;
            const moduleCards = c.cards?.[module] || [];
            return { ...c, cards: { ...c.cards, [module]: moduleCards.filter((x) => x.id !== id) } };
          }),
        })),

      updateCard: (contactId, module, id, updates) =>
        set((s) => ({
          contacts: s.contacts.map((c) => {
            if (c.id !== contactId) return c;
            const moduleCards = c.cards?.[module] || [];
            return {
              ...c,
              cards: {
                ...c.cards,
                [module]: moduleCards.map((x) =>
                  x.id === id ? { ...x, ...updates } : x
                ),
              },
            };
          }),
        })),

      deleteCards: (contactId, module, ids) =>
        set((s) => {
          const idSet = new Set(ids);
          return {
            contacts: s.contacts.map((c) => {
              if (c.id !== contactId) return c;
              const moduleCards = c.cards?.[module] || [];
              return { ...c, cards: { ...c.cards, [module]: moduleCards.filter((x) => !idSet.has(x.id)) } };
            }),
          };
        }),

      batchImport: (contactId, module, text, group) => {
        const contact = get().contacts.find((c) => c.id === contactId);
        if (!contact) return { added: 0, duplicates: 0 };
        const existing = contact.cards?.[module] || [];
        const existingNames = new Set(existing.map((c) => c.name));
        const added: Card[] = [];
        let duplicates = 0;

        const lines = text
          .split(/\r?\n/)
          .map((l) => l.trim())
          .filter(Boolean);

        for (const line of lines) {
          const name = line;
          if (!name) continue;
          if (existingNames.has(name)) {
            duplicates++;
            continue;
          }
          existingNames.add(name);
          added.push({
            id: uid(module),
            name,
            content: name,
            group: module === "chat" ? (group || "日常") : undefined,
          });
        }

        set((s) => ({
          contacts: s.contacts.map((c) => {
            if (c.id !== contactId) return c;
            const moduleCards = c.cards?.[module] || [];
            return { ...c, cards: { ...c.cards, [module]: [...moduleCards, ...added] } };
          }),
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

      pickRandomCards: (contactId, module, count) => {
        const contact = get().contacts.find((c) => c.id === contactId);
        if (!contact) return [];
        const pool = [...contact.cards[module]];
        if (pool.length === 0) return [];
        const shuffled = pool.sort(() => Math.random() - 0.5);
        return shuffled.slice(0, Math.min(count, shuffled.length));
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
                  const groupName = m === "chat" ? (c.group || "日常") : undefined;
                  if (groupName && !newGroups.includes(groupName)) {
                    newGroups.push(groupName);
                  }
                  return {
                    id: `${m}-imp-${i}-${Date.now()}`,
                    name: content || "未命名",
                    content,
                    group: groupName,
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
        set((s) => {
          const remainingContacts = s.contacts.filter((c) => c.id !== id);
          const fallbackId = remainingContacts[0]?.id || null;
          const remainingConvs = s.conversations
            .filter((conv) => !(conv.type === "private" && conv.memberIds[0] === id))
            .map((conv) =>
              conv.type === "group"
                ? { ...conv, memberIds: conv.memberIds.filter((mid) => mid !== id) }
                : conv
            );
          const deletedConvId = s.conversations.find(
            (conv) => conv.type === "private" && conv.memberIds[0] === id
          )?.id;
          return {
            contacts: remainingContacts,
            conversations: remainingConvs,
            activeContactId: s.activeContactId === id ? fallbackId : s.activeContactId,
            activeCardLibContactId: s.activeCardLibContactId === id ? fallbackId : s.activeCardLibContactId,
            activeConversationId: deletedConvId && s.activeConversationId === deletedConvId
              ? (remainingConvs[0]?.id || null)
              : s.activeConversationId,
          };
        }),

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

      setGroupChatEnabled: (enabled) => {
        set({ groupChatEnabled: enabled });
      },

      createGroupChat: (name, memberIds) => {
        const newGroupId = uid("group");
        const sysMsg: Message = {
          id: uid("sys"),
          sender: "system",
          type: "system",
          systemText: `群聊「${name}」已创建`,
          timestamp: Date.now(),
        };
        const newGroup: Conversation = {
          id: newGroupId,
          type: "group",
          name,
          messages: [sysMsg],
          isFlipping: false,
          view: "me",
          memberIds,
        };
        set((s) => ({
          conversations: [...s.conversations, newGroup],
          activeConversationId: newGroupId,
          groupConversationId: newGroupId,
        }));
        return newGroupId;
      },

      updateGroupMembers: (conversationId, memberIds) => {
        set((s) => ({
          conversations: s.conversations.map((conv) =>
            conv.id === conversationId ? { ...conv, memberIds } : conv
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

        const { replySpeedMin, replySpeedMax, waterReminder, privateReplyMin, privateReplyMax, groupReplyMin, groupReplyMax, recallEnabled } = get().chat;
        const myName = get().beauty.myName;

        set((s) => ({
          quotingMessageId: null,
          conversations: s.conversations.map((c) =>
            c.id === conversationId
              ? { ...c, messages: [...c.messages, myMsg] }
              : c
          ),
        }));

        const petEnabledNow = get().beauty.petEnabled;
        if (conv.type === "private" && !conv.petHidden && petEnabledNow && Math.random() < 0.05) {
          const parts: ("ear" | "top" | "accessory")[] = ["ear", "top", "accessory"];
          const part = parts[Math.floor(Math.random() * parts.length)];
          get().hidePet(conversationId, myMsg.id, "right", part);
        }

        const myMsgId = myMsg.id;
        const readDelay = 1000 + Math.random() * 2000;
        window.setTimeout(() => {
          const s2 = useAppStore.getState();
          const { readIgnoreEnabled } = s2.chat;
          const isReadIgnored = readIgnoreEnabled && Math.random() < 0.03;
          useAppStore.setState((s) => ({
            conversations: s.conversations.map((c) =>
              c.id !== conversationId ? c : {
                ...c,
                messages: c.messages.map((m) =>
                  m.id !== myMsgId ? m : (
                    isReadIgnored
                      ? { ...m, readIgnored: true, readStatus: "ignored" as const }
                      : { ...m, readStatus: "read" as const }
                  )
                ),
              }
            ),
          }));
          if (isReadIgnored) return;

          const curConv = useAppStore.getState().conversations.find(c => c.id === conversationId);
          if (!curConv) return;

          if (curConv.type === "private") {
            const contactId = curConv.memberIds[0];
            const contact = useAppStore.getState().contacts.find((c) => c.id === contactId);
            const alreadyNotified = (curConv as any)._workNotified === contact?.status.work.status;
            if (contact?.status.work.status === "working" && !alreadyNotified) {
              const workMsg: Message = {
                id: uid("work"),
                sender: "system",
                type: "system",
                systemText: `${contact.name} 正在工作中`,
                timestamp: Date.now(),
              };
              useAppStore.setState((s) => ({
                conversations: s.conversations.map((c) =>
                  c.id === conversationId
                    ? { ...c, messages: [...c.messages, workMsg], _workNotified: contact.status.work.status } as any
                    : c
                ),
              }));
            }
            const privateLo = Math.max(1, Math.min(12, privateReplyMin));
            const privateHi = Math.max(privateLo, Math.min(12, privateReplyMax));
            const replyCount = privateHi > privateLo
              ? privateLo + Math.floor(Math.random() * (privateHi - privateLo + 1))
              : privateLo;

            const sendNextReply = (index: number) => {
              if (index >= replyCount) {
                if (Math.random() < 0.02) {
                  const state = useAppStore.getState();
                  const contact = state.contacts.find((c) => c.id === contactId);
                  if (contact && !state.incomingCall && !state.activeCall) {
                    window.setTimeout(() => {
                      useAppStore.setState({
                        incomingCall: {
                          contactId: contact.id,
                          contactName: contact.name,
                          contactAvatar: contact.avatar,
                        },
                      });
                    }, randRange(3000, 8000));
                  }
                }
                return;
              }

              const delay = randRange(replySpeedMin * 1000, replySpeedMax * 1000);
              window.setTimeout(() => {
                const state = useAppStore.getState();

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
                  useAppStore.setState((s) => ({
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
                  useAppStore.setState((s) => ({
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

                useAppStore.setState((s) => {
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

                if (index === 0 && useAppStore.getState().beauty.petEnabled && useAppStore.getState().conversations.find(c => c.id === conversationId)?.petHidden) {
                  const findDelay = randRange(800, 2000);
                  window.setTimeout(() => {
                    if (Math.random() < 0.4) {
                      useAppStore.getState().findPet(conversationId, "her");
                    } else {
                      useAppStore.getState().missPet(conversationId);
                    }
                  }, findDelay);
                }

                if (recallEnabled && Math.random() < 0.03) {
                  const recallDelay = randRange(1500, 4000);
                  const herMsgId = herMsg.id;
                  window.setTimeout(() => {
                    useAppStore.setState((s) => ({
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
                  const contact = useAppStore.getState().contacts.find((c) => c.id === contactId);
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
          } else if (curConv.type === "group") {
            const groupLo = Math.max(1, Math.min(12, groupReplyMin));
            const groupHi = Math.max(groupLo, Math.min(12, groupReplyMax));
            const replyCount = groupHi > groupLo
              ? groupLo + Math.floor(Math.random() * (groupHi - groupLo + 1))
              : groupLo;
            const memberIds = curConv.memberIds;

            const sendNextReply = (index: number) => {
              if (index >= replyCount) {
                return;
              }

              const delay = randRange(replySpeedMin * 1000, replySpeedMax * 1000);
              window.setTimeout(() => {
                const state = useAppStore.getState();
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

                useAppStore.setState((s) => ({
                  conversations: s.conversations.map((c) =>
                    c.id === conversationId
                      ? { ...c, messages: [...c.messages, msg] }
                      : c
                  ),
                }));

                if (Math.random() < 0.06) {
                  const allMembers = ["me", ...memberIds];
                  const randomTarget = allMembers[Math.floor(Math.random() * allMembers.length)];
                  const throwTomatoDelay = randRange(500, 1500);
                  window.setTimeout(() => {
                    const curState = useAppStore.getState();
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
        }, readDelay);
      },

      sendStickerInConv: (conversationId, image, senderId) => {
        const conv = get().conversations.find((c) => c.id === conversationId);
        if (!conv) return;

        const { replySpeedMin, replySpeedMax, privateReplyMin, privateReplyMax, groupReplyMin, groupReplyMax } = get().chat;

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
          const myMsgId = msg.id;
          const readDelay = 1000 + Math.random() * 2000;
          window.setTimeout(() => {
            const s2 = useAppStore.getState();
            const { readIgnoreEnabled } = s2.chat;
            const isReadIgnored = readIgnoreEnabled && Math.random() < 0.03;
            useAppStore.setState((s) => ({
              conversations: s.conversations.map((c) =>
                c.id !== conversationId ? c : {
                  ...c,
                  messages: c.messages.map((m) =>
                    m.id !== myMsgId ? m : (
                      isReadIgnored
                        ? { ...m, readIgnored: true, readStatus: "ignored" as const }
                        : { ...m, readStatus: "read" as const }
                    )
                  ),
                }
              ),
            }));
            if (isReadIgnored) return;

            const curConv = useAppStore.getState().conversations.find(c => c.id === conversationId);
            if (!curConv) return;
            const contactId = curConv.memberIds[0];
            const contact = useAppStore.getState().contacts.find((c) => c.id === contactId);

            if (curConv.type === "private" && contact) {
              const privateLo = Math.max(1, Math.min(12, privateReplyMin));
              const privateHi = Math.max(privateLo, Math.min(12, privateReplyMax));
              const replyCount = privateHi > privateLo
                ? privateLo + Math.floor(Math.random() * (privateHi - privateLo + 1))
                : privateLo;
              const sendNext = (index: number) => {
                if (index >= replyCount) return;
                const delay = randRange(replySpeedMin * 1000, replySpeedMax * 1000);
                window.setTimeout(() => {
                  const state = useAppStore.getState();
                  const card = state.pickRandomCard(contactId, "chat");
                  if (!card) { sendNext(index + 1); return; }

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

                useAppStore.setState((s) => ({
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
            } else if (curConv.type === "group") {
              const groupLo = Math.max(1, Math.min(12, groupReplyMin));
              const groupHi = Math.max(groupLo, Math.min(12, groupReplyMax));
              const replyCount = groupHi > groupLo
                ? groupLo + Math.floor(Math.random() * (groupHi - groupLo + 1))
                : groupLo;
              const sendNext = (index: number) => {
                if (index >= replyCount) return;
                const delay = randRange(replySpeedMin * 1000, replySpeedMax * 1000);
                window.setTimeout(() => {
                  const state = useAppStore.getState();
                  const members = state.contacts.filter((c) => curConv.memberIds.includes(c.id));
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

                  useAppStore.setState((s) => ({
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
          }, readDelay);
        }
      },

      sendImageInConv: (conversationId, image, senderId) => {
        const conv = get().conversations.find((c) => c.id === conversationId);
        if (!conv) return;

        const { replySpeedMin, replySpeedMax, privateReplyMin, privateReplyMax, groupReplyMin, groupReplyMax } = get().chat;
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
          const myMsgId = msg.id;
          const readDelay = 1000 + Math.random() * 2000;
          window.setTimeout(() => {
            const s2 = useAppStore.getState();
            const { readIgnoreEnabled } = s2.chat;
            const isReadIgnored = readIgnoreEnabled && Math.random() < 0.03;
            useAppStore.setState((s) => ({
              conversations: s.conversations.map((c) =>
                c.id !== conversationId ? c : {
                  ...c,
                  messages: c.messages.map((m) =>
                    m.id !== myMsgId ? m : (
                      isReadIgnored
                        ? { ...m, readIgnored: true, readStatus: "ignored" as const }
                        : { ...m, readStatus: "read" as const }
                    )
                  ),
                }
              ),
            }));
            if (isReadIgnored) return;

            const curConv = useAppStore.getState().conversations.find(c => c.id === conversationId);
            if (!curConv) return;
            const contactId = curConv.memberIds[0];
            const contact = useAppStore.getState().contacts.find((c) => c.id === contactId);

            if (curConv.type === "private" && contact) {
              const privateLo = Math.max(1, Math.min(12, privateReplyMin));
              const privateHi = Math.max(privateLo, Math.min(12, privateReplyMax));
              const replyCount = privateHi > privateLo
                ? privateLo + Math.floor(Math.random() * (privateHi - privateLo + 1))
                : privateLo;
              const sendNext = (index: number) => {
                if (index >= replyCount) return;
                const delay = randRange(replySpeedMin * 1000, replySpeedMax * 1000);
                window.setTimeout(() => {
                  const state = useAppStore.getState();
                  const card = state.pickRandomCard(contactId, "chat");
                  if (!card) { sendNext(index + 1); return; }

                  const herMsg: Message = {
                    id: uid("her"),
                    sender: contactId,
                    type: "text",
                    text: card.content,
                    card,
                    timestamp: Date.now(),
                  };

                  useAppStore.setState((s) => ({
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
            } else if (curConv.type === "group") {
              const groupLo = Math.max(1, Math.min(12, groupReplyMin));
              const groupHi = Math.max(groupLo, Math.min(12, groupReplyMax));
              const replyCount = groupHi > groupLo
                ? groupLo + Math.floor(Math.random() * (groupHi - groupLo + 1))
                : groupLo;
              const sendNext = (index: number) => {
                if (index >= replyCount) return;
                const delay = randRange(replySpeedMin * 1000, replySpeedMax * 1000);
                window.setTimeout(() => {
                  const state = useAppStore.getState();
                  const members = state.contacts.filter((c) => curConv.memberIds.includes(c.id));
                  const randomMember = members[Math.floor(Math.random() * members.length)];
                  const card = state.pickRandomCard(randomMember.id, "chat");
                  if (!card) { sendNext(index + 1); return; }

                  const herMsg: Message = {
                    id: uid("her"),
                    sender: randomMember.id,
                    type: "text",
                    text: card.content,
                    card,
                    timestamp: Date.now(),
                  };

                  useAppStore.setState((s) => ({
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
          }, readDelay);
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
          readStatus: "read",
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

      patPet: (conversationId, by) => {
        const conv = get().conversations.find((c) => c.id === conversationId);
        if (!conv) return;
        const myName = get().beauty.myName;
        const contactId = conv.type === "private" ? conv.memberIds[0] : (get().contacts[0]?.id || "");
        const herName = get().contacts.find((c) => c.id === contactId)?.name || "对方";
        const sysMsg: Message = {
          id: uid("sys"),
          sender: "system",
          type: "system",
          systemText: by === "her"
            ? `${herName} 摸了摸你的小宠物 🐾`
            : `${myName} 摸了摸小宠物 💕`,
          timestamp: Date.now(),
        };
        set((s) => ({
          conversations: s.conversations.map((c) =>
            c.id === conversationId
              ? { ...c, messages: [...c.messages, sysMsg] }
              : c
          ),
        }));
      },

      hidePet: (conversationId, messageId, side, part) => {
        set((s) => ({
          conversations: s.conversations.map((c) =>
            c.id === conversationId
              ? { ...c, petHidden: { messageId, side, part, hiddenAt: Date.now() } }
              : c
          ),
        }));
      },

      hidePetManually: (conversationId) => {
        const conv = get().conversations.find((c) => c.id === conversationId);
        if (!conv || conv.petHidden) return;
        const myMsgs = conv.messages.filter((m) => m.sender === "me" && !m.recalled);
        if (myMsgs.length === 0) return;
        const targetMsg = myMsgs[myMsgs.length - 1];
        const parts: ("ear" | "top" | "accessory")[] = ["ear", "top", "accessory"];
        const part = parts[Math.floor(Math.random() * parts.length)];
        const sysMsg: Message = {
          id: uid("sys"),
          sender: "system",
          type: "system",
          systemText: "你把小宠物藏了起来，等对方来找～🐾",
          timestamp: Date.now(),
        };
        set((s) => ({
          conversations: s.conversations.map((c) =>
            c.id === conversationId
              ? { ...c, petHidden: { messageId: targetMsg.id, side: "right", part, hiddenAt: Date.now() }, messages: [...c.messages, sysMsg] }
              : c
          ),
          petHidingMode: false,
        }));
      },

      hidePetAtMessage: (conversationId, messageId, side) => {
        const conv = get().conversations.find((c) => c.id === conversationId);
        if (!conv || conv.petHidden) return;
        const parts: ("ear" | "top" | "accessory")[] = ["ear", "top", "accessory"];
        const part = parts[Math.floor(Math.random() * parts.length)];
        const sysMsg: Message = {
          id: uid("sys"),
          sender: "system",
          type: "system",
          systemText: "你把小宠物藏了起来，等对方来找～🐾",
          timestamp: Date.now(),
        };
        set((s) => ({
          conversations: s.conversations.map((c) =>
            c.id === conversationId
              ? { ...c, petHidden: { messageId, side, part, hiddenAt: Date.now() }, messages: [...c.messages, sysMsg] }
              : c
          ),
          petHidingMode: false,
        }));
      },

      findPet: (conversationId, by) => {
        const conv = get().conversations.find((c) => c.id === conversationId);
        if (!conv || !conv.petHidden) return;
        const myName = get().beauty.myName;
        const contactId = conv.type === "private" ? conv.memberIds[0] : (get().contacts[0]?.id || "");
        const herName = get().contacts.find((c) => c.id === contactId)?.name || "对方";
        const sysMsg: Message = {
          id: uid("sys"),
          sender: "system",
          type: "system",
          systemText: by === "her"
            ? `${herName} 找到了躲起来的小宠物！🔍🐾`
            : `你找到了躲起来的小宠物！🎉`,
          timestamp: Date.now(),
        };
        set((s) => ({
          conversations: s.conversations.map((c) =>
            c.id === conversationId
              ? { ...c, petHidden: null, messages: [...c.messages, sysMsg] }
              : c
          ),
        }));
      },

      missPet: (conversationId) => {
        const conv = get().conversations.find((c) => c.id === conversationId);
        if (!conv || !conv.petHidden) return;
        const contactId = conv.type === "private" ? conv.memberIds[0] : (get().contacts[0]?.id || "");
        const herName = get().contacts.find((c) => c.id === contactId)?.name || "对方";
        const sysMsg: Message = {
          id: uid("sys"),
          sender: "system",
          type: "system",
          systemText: `${herName} 找了一下，但没发现小宠物的踪影…🙈 小宠物自己跑出来啦～`,
          timestamp: Date.now(),
        };
        set((s) => ({
          conversations: s.conversations.map((c) =>
            c.id === conversationId
              ? { ...c, petHidden: null, messages: [...c.messages, sysMsg] }
              : c
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
          readStatus: "read",
        };
        set((s) => ({
          conversations: s.conversations.map((c) =>
            c.id === conversationId ? { ...c, messages: [...c.messages, msg] } : c
          ),
        }));
      },

      sendFlyChess: (conversationId, playerCount) => {
        const conv = get().conversations.find((c) => c.id === conversationId);
        if (!conv) return;
        const shuffled = [...conv.memberIds].sort(() => Math.random() - 0.5);
        const selectedPlayers = shuffled.slice(0, playerCount - 1);
        const players = ["me", ...selectedPlayers];
        const msg: Message = {
          id: uid("flychess"),
          sender: "me",
          type: "flychess",
          flychess: {
            playerCount,
            players,
            started: true,
            gameId: uid("flychess"),
          },
          timestamp: Date.now(),
          readStatus: "read",
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
          readStatus: "read",
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
      setPhoneAppId: (appId) => set({ phoneAppId: appId }),

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

      // =========== 问卷 ===========
      surveys: [],
      submitSurvey: (title, questions, author, scope = "personal") =>
        set((s) => ({
          surveys: [...s.surveys, {
            id: uid("survey"),
            title,
            questions,
            author: author || "匿名用户",
            scope,
            status: scope === "personal" ? "approved" : "pending",
            createdAt: Date.now(),
            approvedAt: scope === "personal" ? Date.now() : undefined,
          }],
        })),
      approveSurvey: (id) => {
        const survey = get().surveys.find(s => s.id === id);
        if (!survey) return false;
        set((s) => ({
          surveys: s.surveys.map(survey =>
            survey.id === id ? { ...survey, status: "approved", approvedAt: Date.now() } : survey
          ),
        }));
        return true;
      },
      rejectSurvey: (id) =>
        set((s) => ({
          surveys: s.surveys.map(survey =>
            survey.id === id ? { ...survey, status: "rejected" } : survey
          ),
        })),
      deleteSurvey: (id) =>
        set((s) => ({
          surveys: s.surveys.filter(survey => survey.id !== id),
        })),
      sendSurveyToChat: (conversationId, surveyId) => {
        const survey = get().surveys.find(s => s.id === surveyId);
        if (!survey || survey.status !== "approved") return;
        const conv = get().conversations.find(c => c.id === conversationId);
        if (!conv) return;
        const myMsg: Message = {
          id: uid("survey"),
          sender: "me",
          type: "survey",
          timestamp: Date.now(),
          survey: {
            surveyId: survey.id,
            title: survey.title,
            questions: survey.questions,
          },
          readStatus: "read",
        };
        set((s) => ({
          conversations: s.conversations.map(c =>
            c.id === conversationId ? { ...c, messages: [...c.messages, myMsg] } : c
          ),
        }));
        // 20秒后对方自动回答
        const { replySpeedMin: rplMin, replySpeedMax: rplMax } = get().chat;
        const replyDelay = randRange(rplMin * 1000, (rplMax + 12) * 1000);
        window.setTimeout(() => {
          // 获取联系人字卡库聊天模块
          const chatCards = conv.type === "private"
            ? (get().contacts.find(c => c.id === conv.memberIds[0])?.cards?.chat || [])
            : [];
          const pickShortAnswerFromCards = () => {
            if (chatCards.length > 0 && Math.random() < 0.9) {
              // 随机抽 1-3 句话合并
              const count = 1 + Math.floor(Math.random() * 3);
              const shuffled = [...chatCards].sort(() => Math.random() - 0.5);
              const picks = shuffled.slice(0, Math.min(count, chatCards.length));
              return picks.map(p => p.content || p.name || "").filter(Boolean).join(" ");
            }
            const fallback = ["还好吧", "挺好的", "一般般", "不太确定", "让我想想...", "当然啦", "不是吧", "嗯嗯"];
            return fallback[Math.floor(Math.random() * fallback.length)];
          };
          const answers = survey.questions.map(q => {
            if (q.options && q.options.length > 0) {
              return { questionId: q.id, answer: q.options[Math.floor(Math.random() * q.options.length)] };
            }
            return { questionId: q.id, answer: pickShortAnswerFromCards() };
          });
          const herMsg: Message = {
            id: uid("surveyReply"),
            sender: conv.type === "private" ? conv.memberIds[0] : "her",
            type: "survey",
            timestamp: Date.now(),
            survey: {
              surveyId: survey.id,
              title: survey.title,
              questions: survey.questions,
              answers,
              completedAt: Date.now(),
            },
          };
          set((s) => ({
            conversations: s.conversations.map(c =>
              c.id === conversationId ? { ...c, messages: [...c.messages, herMsg] } : c
            ),
          }));
          // 保存回答到问卷的 responses
          const respondentName = conv.type === "private"
            ? (get().contacts.find(c => c.id === conv.memberIds[0])?.name || "对方")
            : "对方";
          get().saveSurveyResponse(survey.id, { respondent: respondentName, answers, completedAt: Date.now() });
        }, replyDelay);
      },

      sendSurveyDataToChat: (conversationId, survey) => {
        const conv = get().conversations.find(c => c.id === conversationId);
        if (!conv) return;
        const myMsg: Message = {
          id: uid("survey"),
          sender: "me",
          type: "survey",
          timestamp: Date.now(),
          survey: {
            surveyId: survey.id,
            title: survey.title,
            questions: survey.questions,
          },
          readStatus: "read",
        };
        set((s) => ({
          conversations: s.conversations.map(c =>
            c.id === conversationId ? { ...c, messages: [...c.messages, myMsg] } : c
          ),
        }));
        // 20秒后对方自动回答
        const { replySpeedMin: rplMin, replySpeedMax: rplMax } = get().chat;
        const replyDelay = randRange(rplMin * 1000, (rplMax + 12) * 1000);
        window.setTimeout(() => {
          // 获取联系人字卡库聊天模块
          const chatCards = conv.type === "private"
            ? (get().contacts.find(c => c.id === conv.memberIds[0])?.cards?.chat || [])
            : [];
          const pickShortAnswerFromCards = () => {
            if (chatCards.length > 0 && Math.random() < 0.9) {
              // 随机抽 1-3 句话合并
              const count = 1 + Math.floor(Math.random() * 3);
              const shuffled = [...chatCards].sort(() => Math.random() - 0.5);
              const picks = shuffled.slice(0, Math.min(count, chatCards.length));
              return picks.map(p => p.content || p.name || "").filter(Boolean).join(" ");
            }
            const fallback = ["还好吧", "挺好的", "一般般", "不太确定", "让我想想...", "当然啦", "不是吧", "嗯嗯"];
            return fallback[Math.floor(Math.random() * fallback.length)];
          };
          const answers = survey.questions.map(q => {
            if (q.options && q.options.length > 0) {
              return { questionId: q.id, answer: q.options[Math.floor(Math.random() * q.options.length)] };
            }
            return { questionId: q.id, answer: pickShortAnswerFromCards() };
          });
          const herMsg: Message = {
            id: uid("surveyReply"),
            sender: conv.type === "private" ? conv.memberIds[0] : "her",
            type: "survey",
            timestamp: Date.now(),
            survey: {
              surveyId: survey.id,
              title: survey.title,
              questions: survey.questions,
              answers,
              completedAt: Date.now(),
            },
          };
          set((s) => ({
            conversations: s.conversations.map(c =>
              c.id === conversationId ? { ...c, messages: [...c.messages, herMsg] } : c
            ),
          }));
          // 保存回答到问卷的 responses
          const respondentName = conv.type === "private"
            ? (get().contacts.find(c => c.id === conv.memberIds[0])?.name || "对方")
            : "对方";
          get().saveSurveyResponse(survey.id, { respondent: respondentName, answers, completedAt: Date.now() });
        }, replyDelay);
      },
      saveSurveyResponse: (surveyId, response) => {
        set((s) => ({
          surveys: s.surveys.map(survey =>
            survey.id === surveyId
              ? { ...survey, responses: [...(survey.responses || []), response] }
              : survey
          ),
        }));
      },

      // =========== 商店 ===========
      shopData: {},
      getShopData: (contactId) => {
        const data = get().shopData;
        if (!data[contactId]) {
          const defaultData: ShopData = {
            myBalance: 1000,
            herBalance: 1000,
            products: [
              { id: uid("p"), name: "奶茶", price: 15, emoji: "🧋" },
              { id: uid("p"), name: "蛋糕", price: 38, emoji: "🍰" },
              { id: uid("p"), name: "鲜花", price: 99, emoji: "💐" },
            ],
            purchases: [],
          };
          set((s) => ({ shopData: { ...s.shopData, [contactId]: defaultData } }));
          return defaultData;
        }
        return data[contactId];
      },
      setMyBalance: (contactId, amount) =>
        set((s) => {
          const data = s.shopData[contactId] || { myBalance: 1000, herBalance: 1000, products: [], purchases: [] };
          return { shopData: { ...s.shopData, [contactId]: { ...data, myBalance: amount } } };
        }),
      setHerBalance: (contactId, amount) =>
        set((s) => {
          const data = s.shopData[contactId] || { myBalance: 1000, herBalance: 1000, products: [], purchases: [] };
          return { shopData: { ...s.shopData, [contactId]: { ...data, herBalance: amount } } };
        }),
      addProduct: (contactId, name, price, emoji) =>
        set((s) => {
          const data = s.shopData[contactId] || { myBalance: 1000, herBalance: 1000, products: [], purchases: [] };
          return { shopData: { ...s.shopData, [contactId]: { ...data, products: [...data.products, { id: uid("p"), name, price, emoji }] } } };
        }),
      deleteProduct: (contactId, productId) =>
        set((s) => {
          const data = s.shopData[contactId];
          if (!data) return {};
          return { shopData: { ...s.shopData, [contactId]: { ...data, products: data.products.filter(p => p.id !== productId) } } };
        }),
      buyProduct: (conversationId, productId) => {
        const conv = get().conversations.find(c => c.id === conversationId);
        if (!conv || conv.type !== "private") return;
        const contactId = conv.memberIds[0];
        const data = get().shopData[contactId];
        if (!data) return;
        const product = data.products.find(p => p.id === productId);
        if (!product) return;
        // 对方购买，从对方余额扣除
        if (data.herBalance < product.price) return;
        set((s) => ({
          shopData: {
            ...s.shopData,
            [contactId]: {
              ...data,
              herBalance: data.herBalance - product.price,
              purchases: [...data.purchases, { id: uid("purchase"), productId: product.id, productName: product.name, price: product.price, emoji: product.emoji, buyer: "her", timestamp: Date.now() }],
            },
          },
        }));
        const herMsg: Message = {
          id: uid("shopBuy"),
          sender: contactId,
          type: "shop",
          timestamp: Date.now(),
          shop: { productId: product.id, productName: product.name, price: product.price, emoji: product.emoji, action: "bought" },
        };
        set((s) => ({
          conversations: s.conversations.map(c =>
            c.id === conversationId ? { ...c, messages: [...c.messages, herMsg] } : c
          ),
        }));
      },
      buyProductByMe: (conversationId, productId, leaveMessage) => {
        const conv = get().conversations.find(c => c.id === conversationId);
        if (!conv || conv.type !== "private") return;
        const contactId = conv.memberIds[0];
        const data = get().shopData[contactId];
        if (!data) return;
        const product = data.products.find(p => p.id === productId);
        if (!product) return;
        if (data.myBalance < product.price) return;
        set((s) => ({
          shopData: {
            ...s.shopData,
            [contactId]: {
              ...data,
              myBalance: data.myBalance - product.price,
              purchases: [...data.purchases, { id: uid("purchase"), productId: product.id, productName: product.name, price: product.price, emoji: product.emoji, buyer: "me", timestamp: Date.now() }],
            },
          },
        }));
        const myMsg: Message = {
          id: uid("shopBuy"),
          sender: "me",
          type: "shop",
          timestamp: Date.now(),
          shop: { productId: product.id, productName: product.name, price: product.price, emoji: product.emoji, action: "bought", leaveMessage: leaveMessage || undefined },
          readStatus: "read",
        };
        set((s) => ({
          conversations: s.conversations.map(c =>
            c.id === conversationId ? { ...c, messages: [...c.messages, myMsg] } : c
          ),
        }));
        // 对方收到礼物后按回复速度延迟回消息
        const { replySpeedMin, replySpeedMax } = get().chat;
        const replyDelay = randRange(replySpeedMin * 1000, replySpeedMax * 1000);
        window.setTimeout(() => {
          const replies = [
            `谢谢！${product.name}收到了，超开心~`,
            `哇，好喜欢${product.name}！你真好❤️`,
            `${product.name}我收下啦，谢谢你～`,
            `收到${product.name}啦，么么哒`,
          ];
          const replyText = leaveMessage
            ? `收到${product.name}了~「${leaveMessage}」我看到啦，谢谢你！`
            : replies[Math.floor(Math.random() * replies.length)];
          const replyMsg: Message = {
            id: uid("shopReply"),
            sender: contactId,
            type: "text",
            text: replyText,
            timestamp: Date.now(),
          };
          set((s) => ({
            conversations: s.conversations.map(c =>
              c.id === conversationId ? { ...c, messages: [...c.messages, replyMsg] } : c
            ),
          }));
        }, replyDelay);
      },
      sendRedpacket: (conversationId, amount, message, count) => {
        const conv = get().conversations.find(c => c.id === conversationId);
        if (!conv) return;

        if (conv.type === "private") {
          const contactId = conv.memberIds[0];
          const data = get().shopData[contactId];
          if (data && data.myBalance < amount) return;
          if (data) {
            set((s) => ({
              shopData: {
                ...s.shopData,
                [contactId]: { ...data, myBalance: data.myBalance - amount },
              },
            }));
          }
          const myMsg: Message = {
            id: uid("redpacket"),
            sender: "me",
            type: "redpacket",
            timestamp: Date.now(),
            redpacket: {
              amount,
              message: message || "小小红包，收下吧～",
              claimed: false,
            },
            readStatus: "read",
          };
          set((s) => ({
            conversations: s.conversations.map(c =>
              c.id === conversationId ? { ...c, messages: [...c.messages, myMsg] } : c
            ),
          }));
          const { replySpeedMin, replySpeedMax } = get().chat;
          const claimDelay = randRange(replySpeedMin * 1000, replySpeedMax * 1000);
          window.setTimeout(() => {
            const isReturned = Math.random() < 0.4;
            if (isReturned) {
              useAppStore.setState((s) => ({
                conversations: s.conversations.map(c =>
                  c.id === conversationId
                    ? {
                        ...c,
                        messages: c.messages.map(m =>
                          m.id === myMsg.id && m.redpacket
                            ? { ...m, redpacket: { ...m.redpacket, returned: true, returnedAt: Date.now() } }
                            : m
                        ),
                      }
                    : c
                ),
              }));
              const curData = useAppStore.getState().shopData[contactId];
              if (curData) {
                useAppStore.setState((s) => ({
                  shopData: {
                    ...s.shopData,
                    [contactId]: { ...curData, myBalance: curData.myBalance + amount },
                  },
                }));
              }
              const returnMsg: Message = {
                id: uid("rpReturn"),
                sender: contactId,
                type: "text",
                text: `你的红包我不收啦，退给你吧～`,
                timestamp: Date.now(),
              };
              useAppStore.setState((s) => ({
                conversations: s.conversations.map(c =>
                  c.id === conversationId ? { ...c, messages: [...c.messages, returnMsg] } : c
                ),
              }));
            } else {
              useAppStore.setState((s) => ({
                conversations: s.conversations.map(c =>
                  c.id === conversationId
                    ? {
                        ...c,
                        messages: c.messages.map(m =>
                          m.id === myMsg.id && m.redpacket && !m.redpacket.claimed
                            ? { ...m, redpacket: { ...m.redpacket, claimed: true, claimedAt: Date.now() } }
                            : m
                        ),
                      }
                    : c
                ),
              }));
              const curData = useAppStore.getState().shopData[contactId];
              if (curData) {
                useAppStore.setState((s) => ({
                  shopData: {
                    ...s.shopData,
                    [contactId]: { ...curData, herBalance: curData.herBalance + amount },
                  },
                }));
              }
              const claimMsg: Message = {
                id: uid("rpClaim"),
                sender: contactId,
                type: "text",
                text: `红包收到啦，谢谢你～❤️`,
                timestamp: Date.now(),
              };
              useAppStore.setState((s) => ({
                conversations: s.conversations.map(c =>
                  c.id === conversationId ? { ...c, messages: [...c.messages, claimMsg] } : c
                ),
              }));
            }
          }, claimDelay);
        } else if (conv.type === "group") {
          const contactId = conv.memberIds[0];
          const data = get().shopData[contactId];
          const finalAmount = Math.max(0.01, amount);
          if (data && data.myBalance < finalAmount) return;
          if (data) {
            set((s) => ({
              shopData: {
                ...s.shopData,
                [contactId]: { ...data, myBalance: data.myBalance - finalAmount },
              },
            }));
          }
          const finalCount = Math.max(1, Math.min(conv.memberIds.length + 3, count || conv.memberIds.length || 1));
          const rpId = uid("redpacket");
          const myMsg: Message = {
            id: rpId,
            sender: "me",
            type: "redpacket",
            timestamp: Date.now(),
            redpacket: {
              amount: finalAmount,
              totalAmount: finalAmount,
              message: message || "恭喜发财，大吉大利～",
              isGroup: true,
              count: finalCount,
              remaining: finalCount,
              claims: [],
            },
            readStatus: "read",
          };
          set((s) => ({
            conversations: s.conversations.map(c =>
              c.id === conversationId ? { ...c, messages: [...c.messages, myMsg] } : c
            ),
          }));

          // 群聊红包：安排群成员（除我外）自动抢红包 + 写字卡评论
          const memberIds = conv.memberIds.filter((m) => m !== "me");
          const shuffled = [...memberIds].sort(() => Math.random() - 0.5);
          // 能抢到的前 finalCount 个人（如果成员数 < finalCount 则全员有份）
          const claimerCount = Math.min(finalCount, shuffled.length);
          const claimers = shuffled.slice(0, claimerCount);
          const nonClaimers = shuffled.slice(claimerCount);

          // 预计算金额分配：二倍均值法，保证最后一人拿剩余
          let allocated = 0;
          const amounts: number[] = [];
          for (let i = 0; i < claimers.length; i++) {
            const left = claimers.length - i;
            if (left === 1) {
              amounts.push(Number((finalAmount - allocated).toFixed(2)));
            } else {
              const maxRand = Math.max(0.01, (finalAmount - allocated) / left * 2);
              let v = Number((0.01 + Math.random() * (maxRand - 0.01)).toFixed(2));
              if (v > finalAmount - allocated - (left - 1) * 0.01) {
                v = Number(Math.max(0.01, finalAmount - allocated - (left - 1) * 0.01).toFixed(2));
              }
              amounts.push(v);
              allocated = Number((allocated + v).toFixed(2));
            }
          }

          const claimStartAt = Date.now() + randRange(500, 1500);
          claimers.forEach((mid, idx) => {
            const claimAt = claimStartAt + randRange(0, 3000) + idx * 400;
            const commentAt = claimAt + randRange(400, 1500);
            const st0 = useAppStore.getState();
            const card = st0.pickRandomCard(mid, "chat");
            const amount = amounts[idx];
            window.setTimeout(() => {
              useAppStore.setState((s) => ({
                conversations: s.conversations.map((cc) => {
                  if (cc.id !== conversationId) return cc;
                  return {
                    ...cc,
                    messages: cc.messages.map((mm) => {
                      if (mm.id !== rpId || !mm.redpacket) return mm;
                      const claims = [...(mm.redpacket.claims || [])];
                      if (claims.find((cl) => cl.contactId === mid)) return mm;
                      claims.push({ contactId: mid, amount, at: claimAt });
                      const remaining = (mm.redpacket.remaining || 0) - 1;
                      let redpacket = { ...mm.redpacket, claims, remaining };
                      if (remaining <= 0 && claims.length > 0) {
                        let maxIdx = 0;
                        for (let i = 1; i < claims.length; i++) {
                          if (claims[i].amount > claims[maxIdx].amount) maxIdx = i;
                        }
                        redpacket.claims = claims.map((cl, i) => ({ ...cl, isBest: i === maxIdx }));
                      }
                      return { ...mm, redpacket };
                    }),
                  };
                }),
              }));
              // 给收款人加余额
              const balanceData = useAppStore.getState().shopData[contactId];
              if (balanceData) {
                useAppStore.setState((s) => ({
                  shopData: {
                    ...s.shopData,
                    [contactId]: { ...balanceData, herBalance: balanceData.herBalance + amount },
                  },
                }));
              }
            }, claimAt - Date.now());
            if (card) {
              window.setTimeout(() => {
                useAppStore.setState((s) => ({
                  conversations: s.conversations.map((cc) => {
                    if (cc.id !== conversationId) return cc;
                    return {
                      ...cc,
                      messages: cc.messages.map((mm) => {
                        if (mm.id !== rpId || !mm.redpacket) return mm;
                        const claims = (mm.redpacket.claims || []).map((cl) =>
                          cl.contactId === mid ? { ...cl, comment: card.content, commentAt } : cl
                        );
                        return { ...mm, redpacket: { ...mm.redpacket, claims } };
                      }),
                    };
                  }),
                }));
              }, commentAt - Date.now());
            }
          });

          // 没抢到的人也要写字卡评论（以 amount=0 的空 claim 存评论）
          nonClaimers.forEach((mid, idx) => {
            const commentAt = claimStartAt + 2500 + idx * 500 + randRange(0, 1200);
            const st0 = useAppStore.getState();
            const card = st0.pickRandomCard(mid, "chat");
            if (!card) return;
            window.setTimeout(() => {
              useAppStore.setState((s) => ({
                conversations: s.conversations.map((cc) => {
                  if (cc.id !== conversationId) return cc;
                  return {
                    ...cc,
                    messages: cc.messages.map((mm) => {
                      if (mm.id !== rpId || !mm.redpacket) return mm;
                      const claims = [...(mm.redpacket.claims || [])];
                      if (claims.find((cl) => cl.contactId === mid)) {
                        return {
                          ...mm,
                          redpacket: {
                            ...mm.redpacket,
                            claims: claims.map((cl) =>
                              cl.contactId === mid ? { ...cl, comment: card.content, commentAt } : cl
                            ),
                          },
                        };
                      }
                      claims.push({ contactId: mid, amount: 0, at: commentAt, comment: card.content, commentAt });
                      return { ...mm, redpacket: { ...mm.redpacket, claims } };
                    }),
                  };
                }),
              }));
            }, Math.max(0, commentAt - Date.now()));
          });
        }
      },
      claimRedpacket: (conversationId, messageId) => {
        const convBefore = get().conversations.find(c => c.id === conversationId);
        if (!convBefore) return;

        if (convBefore.type === "private") {
          set((s) => ({
            conversations: s.conversations.map(c =>
              c.id === conversationId
                ? {
                    ...c,
                    messages: c.messages.map(m =>
                      m.id === messageId && m.redpacket && !m.redpacket.claimed
                        ? { ...m, redpacket: { ...m.redpacket, claimed: true, claimedAt: Date.now() } }
                        : m
                    ),
                  }
                : c
            ),
          }));
          const conv = get().conversations.find(c => c.id === conversationId);
          if (!conv || conv.type !== "private") return;
          const contactId = conv.memberIds[0];
          const msg = conv.messages.find(m => m.id === messageId);
          if (!msg?.redpacket) return;
          const data = get().shopData[contactId];
          if (data) {
            set((s) => ({
              shopData: {
                ...s.shopData,
                [contactId]: { ...data, myBalance: data.myBalance + msg.redpacket!.amount },
              },
            }));
          }
        } else if (convBefore.type === "group") {
          const msgBefore = convBefore.messages.find(m => m.id === messageId);
          if (!msgBefore?.redpacket || !msgBefore.redpacket.isGroup) return;
          const rp = msgBefore.redpacket;
          if (!rp.claims) return;
          if (rp.remaining === 0 || rp.claims.find(c => c.contactId === "me")) return;

          const claimedTotal = rp.claims.reduce((sum, c) => sum + c.amount, 0);
          const remainingAmount = Number((rp.totalAmount! - claimedTotal).toFixed(2));
          const remainingSlots = rp.remaining - 1;
          let claimAmount: number;
          if (remainingSlots === 0) {
            claimAmount = remainingAmount;
          } else {
            const maxRand = Math.max(0.01, remainingAmount / remainingSlots * 2);
            claimAmount = Number((0.01 + Math.random() * (maxRand - 0.01)).toFixed(2));
            if (claimAmount > remainingAmount - remainingSlots * 0.01) {
              claimAmount = Number(Math.max(0.01, remainingAmount - remainingSlots * 0.01).toFixed(2));
            }
          }
          const now = Date.now();
          const newClaim = {
            contactId: "me",
            amount: claimAmount,
            at: now,
          };

          useAppStore.setState((s) => ({
            conversations: s.conversations.map(c => {
              if (c.id !== conversationId) return c;
              return {
                ...c,
                messages: c.messages.map(m => {
                  if (m.id !== messageId || !m.redpacket) return m;
                  const claims = [...(m.redpacket.claims || []), newClaim];
                  const remaining = (m.redpacket.remaining || 1) - 1;
                  let redpacket = {
                    ...m.redpacket,
                    claims,
                    remaining,
                  };
                  if (remaining === 0 && claims.length > 0) {
                    let maxIdx = 0;
                    for (let i = 1; i < claims.length; i++) {
                      if (claims[i].amount > claims[maxIdx].amount) maxIdx = i;
                    }
                    const bestId = claims[maxIdx].contactId;
                    redpacket.claims = claims.map((cl, idx) => ({
                      ...cl,
                      isBest: idx === maxIdx,
                    }));
                    void bestId;
                  }
                  return { ...m, redpacket };
                }),
              };
            }),
          }));

          const contactIdForBalance = convBefore.memberIds[0];
          const dataBalance = get().shopData[contactIdForBalance];
          if (dataBalance) {
            set((s) => ({
              shopData: {
                ...s.shopData,
                [contactIdForBalance]: { ...dataBalance, myBalance: dataBalance.myBalance + claimAmount },
              },
            }));
          }

          const curConv = useAppStore.getState().conversations.find(c => c.id === conversationId);
          const updatedMsg = curConv?.messages.find(m => m.id === messageId);
          if (updatedMsg?.redpacket && updatedMsg.redpacket.remaining === 0) {
            const memberIds = convBefore.memberIds;
            memberIds.forEach((mid) => {
              if (mid === "me") return;
              const st = useAppStore.getState();
              const card = st.pickRandomCard(mid, "chat");
              if (!card) return;
              const replyDelay = randRange(500, 2000);
              window.setTimeout(() => {
                const replyMsg: Message = {
                  id: uid("grpRp"),
                  sender: mid,
                  type: "text",
                  text: card.content,
                  card,
                  timestamp: Date.now(),
                };
                useAppStore.setState((s) => ({
                  conversations: s.conversations.map((cc) =>
                    cc.id === conversationId ? { ...cc, messages: [...cc.messages, replyMsg] } : cc
                  ),
                }));
              }, replyDelay);
            });
          }

          const st = useAppStore.getState();
          const cardForComment = st.pickRandomCard("me", "chat");
          if (cardForComment) {
            const commentDelay = randRange(500, 1800);
            const now2 = now + commentDelay;
            window.setTimeout(() => {
              useAppStore.setState((s) => ({
                conversations: s.conversations.map(cc => {
                  if (cc.id !== conversationId) return cc;
                  return {
                    ...cc,
                    messages: cc.messages.map(mm => {
                      if (mm.id !== messageId || !mm.redpacket) return mm;
                      const claims = (mm.redpacket.claims || []).map(cl =>
                        cl.contactId === "me"
                          ? { ...cl, comment: cardForComment.content, commentAt: now2 }
                          : cl
                      );
                      return { ...mm, redpacket: { ...mm.redpacket, claims } };
                    }),
                  };
                }),
              }));
            }, commentDelay);
          }
        }
      },
      toggleEnvelope: (conversationId, messageId) => {
        set((s) => ({
          conversations: s.conversations.map((c) => {
            if (c.id !== conversationId) return c;
            return {
              ...c,
              messages: c.messages.map((m) =>
                m.id === messageId ? { ...m, envelopeOpened: !m.envelopeOpened } : m
              ),
            };
          }),
        }));
      },
      returnRedpacket: (conversationId, messageId) => {
        const convBefore = get().conversations.find((c) => c.id === conversationId);
        if (!convBefore || convBefore.type !== "private") return;
        const msg = convBefore.messages.find((m) => m.id === messageId);
        if (!msg?.redpacket || msg.redpacket.claimed || msg.redpacket.returned || msg.sender === "me") return;
        const contactId = convBefore.memberIds[0];
        const amount = msg.redpacket.amount;
        // 把钱退回给发红包的人。对方发的红包：原先是扣对方 herBalance，现在退回去；如果是我发的不处理
        set((s) => {
          const data = s.shopData[contactId];
          const nextShop = data ? {
            ...s.shopData,
            [contactId]: { ...data, herBalance: data.herBalance + amount },
          } : s.shopData;
          return {
            shopData: nextShop,
            conversations: s.conversations.map((c) =>
              c.id !== conversationId ? c : {
                ...c,
                messages: c.messages.map((m) =>
                  m.id !== messageId ? m : {
                    ...m,
                    redpacket: { ...m.redpacket!, returned: true, returnedAt: Date.now() },
                  }
                ),
              }
            ),
          };
        });
        // 加一条退回消息
        const returnMsg: Message = {
          id: uid("rpReturn"),
          sender: "me",
          type: "text",
          text: "你的心意我收到啦～但红包我不收，退给你哦～",
          timestamp: Date.now(),
        };
        set((s) => ({
          conversations: s.conversations.map((c) =>
            c.id === conversationId ? { ...c, messages: [...c.messages, returnMsg] } : c
          ),
        }));
      },
      claimGift: (conversationId, messageId) => {
        const convBefore = get().conversations.find((c) => c.id === conversationId);
        if (!convBefore || convBefore.type !== "private") return;
        const msg = convBefore.messages.find((m) => m.id === messageId);
        if (!msg?.shop || msg.sender === "me" || (msg as any).giftClaimed) return;
        const contactId = convBefore.memberIds[0];
        const shop = msg.shop;
        // 写入礼物赠送记录（对方送我 → buyer: "her"）
        set((s) => {
          const data = s.shopData[contactId];
          const nextShop = data ? {
            ...s.shopData,
            [contactId]: {
              ...data,
              purchases: [...data.purchases, {
                id: uid("purchase"),
                productId: shop.productId,
                productName: shop.productName,
                price: shop.price,
                emoji: shop.emoji || "🎁",
                buyer: "her",
                timestamp: Date.now(),
              }],
            },
          } : s.shopData;
          return {
            shopData: nextShop,
            conversations: s.conversations.map((c) =>
              c.id !== conversationId ? c : {
                ...c,
                messages: c.messages.map((m) =>
                  m.id !== messageId ? m : { ...(m as any), giftClaimed: true, giftClaimedAt: Date.now() }
                ),
              }
            ),
          };
        });
        // 我的感谢回复消息
        const { replySpeedMin, replySpeedMax } = get().chat;
        const delay = randRange(replySpeedMin * 1000 * 0.3, replySpeedMax * 1000 * 0.6);
        window.setTimeout(() => {
          const thanksMsg: Message = {
            id: uid("giftThanks"),
            sender: "me",
            type: "text",
            text: `${shop.productName}收到啦，好喜欢～谢谢你！❤️`,
            timestamp: Date.now(),
            readStatus: "read",
          };
          set((s) => ({
            conversations: s.conversations.map((c) =>
              c.id === conversationId ? { ...c, messages: [...c.messages, thanksMsg] } : c
            ),
          }));
        }, delay);
      },
      pushLetterToast: (conversationId, messageId) => {
        // 使用一次性状态字段触发 UI 侧的提示
        set((s) => {
          const key = `letterToast-${conversationId}-${messageId}`;
          const existing = (s as any)._letterToasts || {};
          if (existing[key]) return {};
          return {
            ...s,
            _letterToasts: { ...existing, [key]: Date.now() },
          } as any;
        });
      },
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
        phoneAppId: state.phoneAppId,
        musicCurrentIndex: state.musicCurrentIndex,
        tomatoStats: state.tomatoStats,
        bottleData: state.bottleData,
        surveys: state.surveys,
        shopData: state.shopData,
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

        const activeConvExists = state.conversations.some((c: any) => c.id === state.activeConversationId);
        if (!activeConvExists) {
          state.activeConversationId = state.conversations[0].id;
        }

        for (const conv of state.conversations) {
          if (!conv.messages || !Array.isArray(conv.messages)) {
            conv.messages = [];
          }
          if (!conv.type) conv.type = "private";
          if (!conv.view) conv.view = "me";
          if (!conv.memberIds || !Array.isArray(conv.memberIds)) {
            conv.memberIds = [];
          }
          if (!conv.isFlipping) conv.isFlipping = false;

          const contactIds = state.contacts.map((c: any) => c.id);
          conv.memberIds = conv.memberIds.filter((mid: string) => contactIds.includes(mid));

          if (conv.type === "private" && conv.memberIds.length === 0) {
            const firstContact = state.contacts[0];
            if (firstContact) {
              conv.memberIds = [firstContact.id];
              conv.name = firstContact.name;
            }
          }

          if (conv.messages.length === 0) {
            if (conv.type === "private") {
              const contact = state.contacts.find((c: any) => c.id === conv.memberIds[0]);
              const contactName = contact?.name || "对方";
              conv.messages = [
                {
                  id: uid("msg-init"),
                  sender: "me",
                  type: "text",
                  text: "在吗？最近怎么样。",
                  timestamp: Date.now() - 1000 * 60 * 6,
                },
                {
                  id: uid("msg-init2"),
                  sender: conv.memberIds[0],
                  type: "text",
                  text: "嗯，在。我在听，你说。",
                  timestamp: Date.now() - 1000 * 60 * 5,
                },
              ];
            } else {
              conv.messages = [
                {
                  id: uid("msg-init"),
                  sender: "system",
                  type: "system",
                  systemText: `${conv.name} 创建了群聊`,
                  timestamp: Date.now() - 1000 * 60 * 30,
                },
              ];
            }
          }
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
          if (c.avatar === "他" && c.name) c.avatar = c.name.substring(0, 1);
          if (!c.cards) {
            c.cards = createDefaultCards();
          } else {
            // 补全所有缺失的模块（仅补全不存在的模块，不覆盖已清空的模块）
            (Object.keys(INITIAL_CARDS) as CardModule[]).forEach((m) => {
              if (!c.cards[m]) {
                c.cards[m] = JSON.parse(JSON.stringify(INITIAL_CARDS[m]));
              }
            });
          }
        }
        if (!state.cardGroups) state.cardGroups = ["日常", "撒娇", "关心"];
        if (!state.phoneAppId) state.phoneAppId = "home";
        if (!state.stickers) state.stickers = [];
        if (!state.activeCardLibContactId) state.activeCardLibContactId = state.contacts.length > 0 ? state.contacts[0].id : null;
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
        if (!state.bottleData) state.bottleData = {};
        if (state.lastTravelUpdateAt === undefined) state.lastTravelUpdateAt = 0;

        // 清理已删除联系人的残留数据
        const contactIds = new Set(state.contacts.map((c: any) => c.id));
        // 从所有会话中移除不存在的成员
        state.conversations = state.conversations
          .filter((conv: any) => {
            // 私聊会话：成员必须存在
            if (conv.type === "private") {
              return conv.memberIds.every((mid: string) => contactIds.has(mid));
            }
            return true;
          })
          .map((conv: any) => {
            if (conv.type === "group") {
              return {
                ...conv,
                memberIds: conv.memberIds.filter((mid: string) => contactIds.has(mid)),
              };
            }
            return conv;
          });
        // 如果当前活动会话已被清理，切换到群聊
        if (!state.conversations.find((c: any) => c.id === state.activeConversationId)) {
          state.activeConversationId = state.groupConversationId;
        }

        // 恢复漂流瓶的待处理定时器
        const setupBottleTimers = () => {
          const st = useAppStore.getState();
          const now = Date.now();

          Object.keys(st.bottleData).forEach((contactId) => {
            const bd = st.bottleData[contactId];
            if (!bd) return;
            const contact = st.contacts.find((c: any) => c.id === contactId);
            const chatCards = contact?.cards?.chat || [];

            const generateReplyText = () => {
              if (chatCards.length === 0) return null;
              const replyCount = Math.floor(Math.random() * 7) + 6;
              const shuffled = [...chatCards].sort(() => Math.random() - 0.5);
              const selected = shuffled.slice(0, Math.min(replyCount, shuffled.length));
              return selected.map((c) => c.content).join("\n\n---\n\n");
            };

            // 1. 恢复海洋小物待回复
            bd.diary.forEach((d) => {
              if (d.type === "ocean" && d.reply && !d.herReply && d.expectedHerReplyAt) {
                if (d.expectedHerReplyAt <= now) {
                  // 时间已过，立即回复
                  const randomCard = chatCards.length > 0 ? chatCards[Math.floor(Math.random() * chatCards.length)] : null;
                  if (randomCard) {
                    useAppStore.getState().receiveBottleOceanReplyAt(contactId, d.id, randomCard.content, d.expectedHerReplyAt);
                  }
                } else {
                  const delay = d.expectedHerReplyAt - now;
                  window.setTimeout(() => {
                    const state2 = useAppStore.getState();
                    const contact2 = state2.contacts.find((c: any) => c.id === contactId);
                    const cards2 = contact2?.cards?.chat || [];
                    if (cards2.length === 0) return;
                    const randomCard = cards2[Math.floor(Math.random() * cards2.length)];
                    useAppStore.getState().receiveBottleOceanReply(contactId, d.id, randomCard.content);
                  }, delay);
                }
              }
            });

            // 2. 恢复信件待收到/待回复
            bd.letters.forEach((letter) => {
              if (!letter.receivedAt && letter.expectedReceiveAt) {
                if (letter.expectedReceiveAt <= now) {
                  // 时间已过，立即标记为已收到
                  useAppStore.setState((s) => {
                    const data = { ...s.bottleData };
                    const bd2 = data[contactId];
                    if (!bd2) return s;
                    data[contactId] = {
                      ...bd2,
                      letters: bd2.letters.map((l) =>
                        l.id === letter.id ? { ...l, receivedAt: l.expectedReceiveAt } : l
                      ),
                    };
                    return { bottleData: data };
                  });
                  // 然后检查是否需要立即回复
                  if (!letter.replyAt && letter.expectedReplyAt && letter.expectedReplyAt <= now) {
                    const replyText = generateReplyText();
                    if (replyText) {
                      useAppStore.setState((s) => {
                        const data = { ...s.bottleData };
                        const bd2 = data[contactId];
                        if (!bd2) return s;
                        data[contactId] = {
                          ...bd2,
                          letters: bd2.letters.map((l) =>
                            l.id === letter.id
                              ? { ...l, replyAt: letter.expectedReplyAt, reply: replyText }
                              : l
                          ),
                          diary: bd2.diary.map((d) =>
                            d.type === "letter" && d.content === letter.content && !d.reply
                              ? { ...d, reply: replyText }
                              : d
                          ),
                        };
                        return { bottleData: data };
                      });
                    }
                  } else if (!letter.replyAt && letter.expectedReplyAt && letter.expectedReplyAt > now) {
                    // 还没到回复时间，设置定时器
                    const replyDelay = letter.expectedReplyAt - now;
                    window.setTimeout(() => {
                      const state4 = useAppStore.getState();
                      const contact4 = state4.contacts.find((c: any) => c.id === contactId);
                      const cards4 = contact4?.cards?.chat || [];
                      if (cards4.length === 0) return;
                      const replyCount = Math.floor(Math.random() * 7) + 6;
                      const shuffled = [...cards4].sort(() => Math.random() - 0.5);
                      const selected = shuffled.slice(0, Math.min(replyCount, shuffled.length));
                      const replyText = selected.map((c) => c.content).join("\n\n---\n\n");
                      useAppStore.setState((s) => {
                        const data = { ...s.bottleData };
                        const bd4 = data[contactId];
                        if (!bd4) return s;
                        data[contactId] = {
                          ...bd4,
                          letters: bd4.letters.map((l) =>
                            l.id === letter.id
                              ? { ...l, replyAt: letter.expectedReplyAt, reply: replyText }
                              : l
                          ),
                          diary: bd4.diary.map((d) =>
                            d.type === "letter" && d.content === letter.content && !d.reply
                              ? { ...d, reply: replyText }
                              : d
                          ),
                        };
                        return { bottleData: data };
                      });
                    }, replyDelay);
                  }
                } else {
                  // 还没到收到时间，设置定时器
                  const receiveDelay = letter.expectedReceiveAt - now;
                  window.setTimeout(() => {
                    useAppStore.setState((s) => {
                      const data = { ...s.bottleData };
                      const bd2 = data[contactId];
                      if (!bd2) return s;
                      data[contactId] = {
                        ...bd2,
                        letters: bd2.letters.map((l) =>
                          l.id === letter.id ? { ...l, receivedAt: Date.now() } : l
                        ),
                      };
                      return { bottleData: data };
                    });
                    // 收到后设置回复定时器
                    const state3 = useAppStore.getState();
                    const bd3 = state3.bottleData[contactId];
                    const updatedLetter = bd3?.letters.find((l) => l.id === letter.id);
                    if (updatedLetter && !updatedLetter.replyAt && updatedLetter.expectedReplyAt && updatedLetter.expectedReplyAt > Date.now()) {
                      const replyDelay = updatedLetter.expectedReplyAt - Date.now();
                      window.setTimeout(() => {
                        const state4 = useAppStore.getState();
                        const contact4 = state4.contacts.find((c: any) => c.id === contactId);
                        const cards4 = contact4?.cards?.chat || [];
                        if (cards4.length === 0) return;
                        const replyCount = Math.floor(Math.random() * 7) + 6;
                        const shuffled = [...cards4].sort(() => Math.random() - 0.5);
                        const selected = shuffled.slice(0, Math.min(replyCount, shuffled.length));
                        const replyText = selected.map((c) => c.content).join("\n\n---\n\n");
                        useAppStore.setState((s) => {
                          const data = { ...s.bottleData };
                          const bd4 = data[contactId];
                          if (!bd4) return s;
                          data[contactId] = {
                            ...bd4,
                            letters: bd4.letters.map((l) =>
                              l.id === letter.id
                                ? { ...l, replyAt: updatedLetter.expectedReplyAt, reply: replyText }
                                : l
                            ),
                            diary: bd4.diary.map((d) =>
                              d.type === "letter" && d.content === letter.content && !d.reply
                                ? { ...d, reply: replyText }
                                : d
                            ),
                          };
                          return { bottleData: data };
                        });
                      }, replyDelay);
                    }
                  }, receiveDelay);
                }
              } else if (letter.receivedAt && !letter.replyAt && letter.expectedReplyAt) {
                if (letter.expectedReplyAt <= now) {
                  // 时间已过，立即回复
                  const replyText = generateReplyText();
                  if (replyText) {
                    useAppStore.setState((s) => {
                      const data = { ...s.bottleData };
                      const bd2 = data[contactId];
                      if (!bd2) return s;
                      data[contactId] = {
                        ...bd2,
                        letters: bd2.letters.map((l) =>
                          l.id === letter.id
                            ? { ...l, replyAt: letter.expectedReplyAt, reply: replyText }
                            : l
                        ),
                        diary: bd2.diary.map((d) =>
                          d.type === "letter" && d.content === letter.content && !d.reply
                            ? { ...d, reply: replyText }
                            : d
                        ),
                      };
                      return { bottleData: data };
                    });
                  }
                } else {
                  // 还没到回复时间，设置定时器
                  const replyDelay = letter.expectedReplyAt - now;
                  window.setTimeout(() => {
                    const state4 = useAppStore.getState();
                    const contact4 = state4.contacts.find((c: any) => c.id === contactId);
                    const cards4 = contact4?.cards?.chat || [];
                    if (cards4.length === 0) return;
                    const replyCount = Math.floor(Math.random() * 7) + 6;
                    const shuffled = [...cards4].sort(() => Math.random() - 0.5);
                    const selected = shuffled.slice(0, Math.min(replyCount, shuffled.length));
                    const replyText = selected.map((c) => c.content).join("\n\n---\n\n");
                    useAppStore.setState((s) => {
                      const data = { ...s.bottleData };
                      const bd4 = data[contactId];
                      if (!bd4) return s;
                      data[contactId] = {
                        ...bd4,
                        letters: bd4.letters.map((l) =>
                          l.id === letter.id
                            ? { ...l, replyAt: letter.expectedReplyAt, reply: replyText }
                            : l
                        ),
                        diary: bd4.diary.map((d) =>
                          d.type === "letter" && d.content === letter.content && !d.reply
                            ? { ...d, reply: replyText }
                            : d
                        ),
                      };
                      return { bottleData: data };
                    });
                  }, replyDelay);
                }
              }
            });
          });
        };

        // 延迟一点执行，确保 store 已经初始化
        window.setTimeout(() => {
          // 先给旧数据补上缺失的预计时间
          const s = useAppStore.getState();
          const data = { ...s.bottleData };
          let changed = false;

          Object.keys(data).forEach((contactId) => {
            const bd = data[contactId];
            if (!bd) return;

            // 给海洋小物补预计回复时间
            const now = Date.now();
            bd.diary = bd.diary.map((d) => {
              if (d.type === "ocean" && d.reply && !d.herReply && !d.expectedHerReplyAt) {
                changed = true;
                const delay = Math.floor(Math.random() * (6 * 60 * 1000 - 4 * 60 * 1000)) + 4 * 60 * 1000;
                return { ...d, expectedHerReplyAt: now + delay };
              }
              return d;
            });

            // 给信件补预计时间
            bd.letters = bd.letters.map((l) => {
              if (!l.receivedAt && !l.expectedReceiveAt) {
                changed = true;
                const receiveDelay = Math.floor(Math.random() * (50 * 60 * 1000 - 20 * 60 * 1000)) + 20 * 60 * 1000;
                const replyDelay = Math.floor(Math.random() * (8 * 60 * 60 * 1000 - 5 * 60 * 60 * 1000)) + 5 * 60 * 60 * 1000;
                return {
                  ...l,
                  expectedReceiveAt: now + receiveDelay,
                  expectedReplyAt: now + receiveDelay + replyDelay,
                };
              }
              if (l.receivedAt && !l.replyAt && !l.expectedReplyAt) {
                changed = true;
                const replyDelay = Math.floor(Math.random() * (8 * 60 * 60 * 1000 - 5 * 60 * 60 * 1000)) + 5 * 60 * 60 * 1000;
                return { ...l, expectedReplyAt: now + replyDelay };
              }
              return l;
            });
          });

          if (changed) {
            useAppStore.setState({ bottleData: data });
          }

          // 然后设置定时器
          setupBottleTimers();
        }, 1000);

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

        const setupTravelUpdate = () => {
          const hours = 2;
          const interval = hours * 60 * 60 * 1000;
          const lastAt = useAppStore.getState().lastTravelUpdateAt || 0;
          const now = Date.now();
          const elapsed = now - lastAt;
          const delay = Math.max(interval - elapsed, 5 * 60 * 1000); // 至少5分钟

          window.setTimeout(() => {
            const store = useAppStore.getState();
            store.contacts.forEach((contact) => {
              const travelCards = contact.cards.travel;
              if (travelCards.length > 0) {
                const randomCard = travelCards[Math.floor(Math.random() * travelCards.length)];
                const weathers = ["晴", "多云", "阴", "小雨", "微风", "晴转多云", "多云转阴"];
                const temps = [18, 20, 22, 24, 26, 28, 19, 21, 23, 25];
                // 生成随机行程
                const scheduleCount = Math.floor(Math.random() * 3) + 2; // 2-4个行程
                const newSchedule = [];
                for (let i = 0; i < scheduleCount; i++) {
                  const scheduleCard = travelCards[Math.floor(Math.random() * travelCards.length)];
                  const hours = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
                  newSchedule.push({
                    time: `${hours[Math.floor(Math.random() * hours.length)]}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}`,
                    place: scheduleCard.content,
                    note: undefined,
                  });
                }
                // 按时间排序
                newSchedule.sort((a, b) => a.time.localeCompare(b.time));
                useAppStore.setState((s) => ({
                  contacts: s.contacts.map((c) =>
                    c.id === contact.id
                      ? {
                          ...c,
                          status: {
                            ...c.status,
                            travel: {
                              ...c.status.travel,
                              location: randomCard.content,
                              weather: weathers[Math.floor(Math.random() * weathers.length)],
                              temperature: temps[Math.floor(Math.random() * temps.length)],
                              schedule: newSchedule,
                            },
                          },
                        }
                      : c
                  ),
                  lastTravelUpdateAt: Date.now(),
                }));
              }
            });
            setupTravelUpdate();
          }, delay);
        };
        setupTravelUpdate();

        const setupWorkUpdate = () => {
          const updateWork = () => {
            const store = useAppStore.getState();
            store.contacts.forEach((contact) => {
              const workContents = contact.cards.workContent || [];
              const workLocations = contact.cards.workLocation || [];
              const workStatuses = contact.cards.workStatus || [];
              if (workContents.length === 0 && workLocations.length === 0 && workStatuses.length === 0) return;

              const newContent = workContents.length > 0
                ? workContents[Math.floor(Math.random() * workContents.length)].content
                : contact.status.work.content;
              const newLocation = workLocations.length > 0
                ? workLocations[Math.floor(Math.random() * workLocations.length)].content
                : contact.status.work.location;
              const newStatus = workStatuses.length > 0
                ? workStatuses[Math.floor(Math.random() * workStatuses.length)].content
                : contact.status.work.status;

              useAppStore.setState((s) => ({
                contacts: s.contacts.map((c) =>
                  c.id === contact.id
                    ? {
                        ...c,
                        status: {
                          ...c.status,
                          work: {
                            ...c.status.work,
                            content: newContent,
                            location: newLocation,
                            status: (newStatus === "工作中" || newStatus === "休息中" || newStatus === "下班") ? newStatus as any : c.status.work.status,
                            lastStatusChange: Date.now(),
                          },
                        },
                      }
                    : c
                ),
              }));
            });
          };

          const scheduleNextUpdate = () => {
            const updatesPerDay = Math.floor(Math.random() * 3) + 5; // 5-7次
            const baseInterval = (24 * 60 * 60 * 1000) / updatesPerDay;
            const variation = baseInterval * 0.3; // 30%波动
            const delay = baseInterval + (Math.random() - 0.5) * 2 * variation;
            window.setTimeout(() => {
              updateWork();
              scheduleNextUpdate();
            }, Math.max(delay, 1 * 60 * 60 * 1000)); // 至少1小时
          };

          scheduleNextUpdate();
        };
        setupWorkUpdate();

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

        // ========= 后台保活：可靠定时器工具 =========
        // 浏览器切后台后 setTimeout/setInterval 会被严重节流，
        // 这里封装一个基于"时间戳 + 监听 recovery 事件"的可靠调度器：
        //  - 每次触发后把"下次应该触发的时间戳"记录下来
        //  - 收到 recovery tick 时，如果"应该触发时间 <= 现在"就立即补一次
        //  - 补完后重新计算下次触发时间
        type ReliableSchedule = {
          // 返回值：可以调用以立即尝试触发（用于 recovery tick）
          tryTriggerNow: () => void;
          // 取消调度
          cancel: () => void;
        };

        const createReliableScheduler = (
          label: string,
          workFn: () => void,
          nextDelayMs: () => number, // 每次触发后计算下次间隔
          opts?: { fireProbability?: number } // 额外：触发时再做一次概率判断
        ): ReliableSchedule => {
          const storageKey = `__sched_next_${label}__`;
          let timerId: number | null = null;
          let cancelled = false;

          const readNextAt = (): number | null => {
            try {
              const v = sessionStorage.getItem(storageKey);
              return v ? parseInt(v, 10) || null : null;
            } catch {
              return null;
            }
          };
          const writeNextAt = (ts: number) => {
            try { sessionStorage.setItem(storageKey, String(ts)); } catch {}
          };
          const clearNextAt = () => {
            try { sessionStorage.removeItem(storageKey); } catch {}
          };

          const run = () => {
            const prob = opts?.fireProbability;
            if (prob === undefined || Math.random() < prob) {
              try { workFn(); } catch {}
            }
            const delay = Math.max(1000, nextDelayMs());
            const nextAt = Date.now() + delay;
            writeNextAt(nextAt);
            if (!cancelled) {
              // 重新挂一个超时
              if (timerId !== null) window.clearTimeout(timerId);
              timerId = window.setTimeout(run, delay);
            }
          };

          const tryTriggerNow = () => {
            if (cancelled) return;
            const nextAt = readNextAt();
            const now = Date.now();
            // 如果还没到"应该触发"的时间，就等正常 setTimeout 自己触发
            // 但是由于后台可能延迟了"本该到期"的工作，这里补一下
            // 另外：为了避免 recovery 每次都 100% 触发概率任务（如 sendMail），
            // 对于有 fireProbability 的调度，补触发也走相同概率
            if (nextAt === null || now >= nextAt) {
              // 到时间了，补触发
              if (timerId !== null) { window.clearTimeout(timerId); timerId = null; }
              run();
            }
          };

          const onRecovery = () => { tryTriggerNow(); };
          if (typeof window !== "undefined") {
            window.addEventListener("background-recovery-tick", onRecovery);
          }

          // 启动首次
          const initialDelay = Math.max(1000, nextDelayMs());
          const initialNext = Date.now() + initialDelay;
          writeNextAt(initialNext);
          timerId = window.setTimeout(run, initialDelay);

          return {
            tryTriggerNow,
            cancel: () => {
              cancelled = true;
              if (timerId !== null) { window.clearTimeout(timerId); timerId = null; }
              clearNextAt();
              if (typeof window !== "undefined") {
                window.removeEventListener("background-recovery-tick", onRecovery);
              }
            },
          };
        };

        // 商店推荐定时器 - 每10分钟5%概率对方送礼物给我
        const setupShopRecommend = () => {
          createReliableScheduler(
            "shopRecommend",
            () => {
              {
                const state = useAppStore.getState();
                const myName = state.beauty.myName;
                for (const conv of state.conversations) {
                  if (conv.type !== "private") continue;
                  const contactId = conv.memberIds[0];
                  const data = state.shopData[contactId];
                  if (!data || data.products.length === 0) continue;
                  const product = data.products[Math.floor(Math.random() * data.products.length)];
                  // 余额够就扣对方 herBalance，不够也照样送（表现心意）
                  let updated = false;
                  if (data.herBalance >= product.price) {
                    useAppStore.setState((s) => ({
                      shopData: {
                        ...s.shopData,
                        [contactId]: {
                          ...data,
                          herBalance: data.herBalance - product.price,
                          purchases: [
                            ...data.purchases,
                            {
                              id: uid("purchase"),
                              productId: product.id,
                              productName: product.name,
                              price: product.price,
                              emoji: product.emoji || "🎁",
                              buyer: "her",
                              timestamp: Date.now(),
                          },
                        ],
                      },
                    },
                  }));
                  updated = true;
                }
                const giftMsg: Message = {
                  id: uid("shopRec"),
                  sender: contactId,
                  type: "shop",
                  text: `${myName}，给你挑了个礼物~`,
                  timestamp: Date.now(),
                  shop: { productId: product.id, productName: product.name, price: product.price, emoji: product.emoji, action: "bought" },
                };
                useAppStore.setState((s) => {
                  if (updated) return {
                    conversations: s.conversations.map((c) =>
                      c.id === conv.id ? { ...c, messages: [...c.messages, giftMsg] } : c
                    ),
                  };
                  // 没扣到余额的这次再补写一次 purchases
                  const d0 = s.shopData[contactId];
                  return {
                    shopData: d0 ? {
                      ...s.shopData,
                      [contactId]: {
                        ...d0,
                        purchases: [
                          ...d0.purchases,
                          {
                            id: uid("purchase"),
                            productId: product.id,
                            productName: product.name,
                            price: product.price,
                            emoji: product.emoji || "🎁",
                            buyer: "her",
                            timestamp: Date.now(),
                          },
                        ],
                      },
                    } : s.shopData,
                    conversations: s.conversations.map((c) =>
                      c.id === conv.id ? { ...c, messages: [...c.messages, giftMsg] } : c
                    ),
                  };
                });
              }
            }
          },
            () => 10 * 60 * 1000, // 每10分钟
            { fireProbability: 0.05 } // 5% 概率
          );
        };

        // 红包定时器 - 每8分钟4%概率发红包
        const setupRedPacket = () => {
          createReliableScheduler(
            "redPacket",
            () => {
              const state = useAppStore.getState();
              for (const conv of state.conversations) {
                if (conv.type !== "private") continue;
                const contactId = conv.memberIds[0];
                const data = state.shopData[contactId];
                const amount = Math.floor(Math.random() * 50) + 10; // 10-60元随机
                if (data && data.herBalance >= amount) {
                  // 扣除对方余额
                  useAppStore.setState((s) => ({
                    shopData: {
                      ...s.shopData,
                      [contactId]: { ...data, herBalance: data.herBalance - amount },
                    },
                  }));
                }
                const redpacketMsg: Message = {
                  id: uid("redpacket"),
                  sender: contactId,
                  type: "redpacket",
                  timestamp: Date.now(),
                  redpacket: {
                    amount,
                    message: ["给你个小红包～", "辛苦啦，买点好吃的", "随机红包，收下吧", "今天开心，发个红包", "小小心意～"][Math.floor(Math.random() * 5)],
                  },
                };
                useAppStore.setState((s) => ({
                  conversations: s.conversations.map(c =>
                    c.id === conv.id ? { ...c, messages: [...c.messages, redpacketMsg] } : c
                  ),
                }));
              }
            },
            () => 8 * 60 * 1000, // 每 8 分钟
            { fireProbability: 0.04 } // 4% 概率
          );
        };

        setupShopRecommend();
        setupRedPacket();

        // 主动发消息定时器：按 ChatSettings.autoMessage / autoIntervalMin/Max 控制
        const setupAutoChatMessage = () => {
          // 注意：autoMessage 开关/间隔是用户动态设置的，所以我们把"下次间隔"动态计算
          createReliableScheduler(
            "autoChatMessage",
            () => {
              const st = useAppStore.getState();
              const ch = st.chat;
              // 开关可能中途关闭，关闭时不触发消息生成，下次调度继续检查
              if (!ch.autoMessage) return;
              if (st.contacts.length === 0 || st.conversations.length === 0) return;

              const privateConvs = st.conversations.filter((c) => c.type === "private" && c.memberIds.length > 0);
              const convs = privateConvs.length > 0 ? privateConvs : st.conversations;
              const targetConv = convs[Math.floor(Math.random() * convs.length)];
              if (!targetConv) return;

              const contactId = targetConv.memberIds[0];
              const stickers = st.stickers;
              const useSticker = stickers.length > 0 && Math.random() < 0.1;

              let msg: Message | null = null;
              if (useSticker) {
                const last3Stickers = (targetConv.messages || [])
                  .filter(m => m.sender === contactId && m.isAutoInitiated && m.type === "sticker")
                  .slice(-3)
                  .map(m => m.sticker)
                  .filter(Boolean) as string[];

                let sticker = stickers[Math.floor(Math.random() * stickers.length)];
                for (let t = 0; last3Stickers.includes(sticker.image) && t < 4; t++) {
                  sticker = stickers[Math.floor(Math.random() * stickers.length)];
                }
                msg = {
                  id: uid("her"),
                  sender: contactId,
                  type: "sticker",
                  sticker: sticker.image,
                  timestamp: Date.now(),
                  isAutoInitiated: true,
                };
              } else {
                const last3Texts = (targetConv.messages || [])
                  .filter(m => m.sender === contactId && m.isAutoInitiated && m.type === "text")
                  .slice(-3)
                  .map(m => m.text);

                let card = st.pickRandomCard(contactId, "chat");
                for (let t = 0; card && last3Texts.includes(card.content) && t < 4; t++) {
                  card = st.pickRandomCard(contactId, "chat");
                }
                if (!card) {
                  return;
                }
                msg = {
                  id: uid("her"),
                  sender: contactId,
                  type: "text",
                  text: card.content,
                  card,
                  timestamp: Date.now(),
                  isAutoInitiated: true,
                };
              }

              if (msg) {
                useAppStore.setState((s) => ({
                  conversations: s.conversations.map((c) =>
                    c.id === targetConv.id ? { ...c, messages: [...c.messages, msg!] } : c
                  ),
                }));
                // 主动写信内容记入备忘录（文本类型）
                if (msg.type === "text" && msg.text) {
                  const st2 = useAppStore.getState();
                  if (typeof st2.addMemo === "function") {
                    st2.addMemo(contactId, msg.text);
                  }
                }
              }
            },
            () => {
              // 动态读取用户设置：关闭时 60s 后再检查
              const chat = useAppStore.getState().chat;
              if (!chat.autoMessage) return 60 * 1000;
              const minMs = Math.max(1, chat.autoIntervalMin) * 60 * 1000;
              const maxMs = Math.max(minMs, chat.autoIntervalMax) * 60 * 1000;
              return minMs + Math.random() * (maxMs - minMs);
            },
            { fireProbability: 0.5 } // 每次定时到期仅 50% 概率真正发消息，避免"一直发"
          );
        };
        setupAutoChatMessage();

        // 信件生成定时器：每25分钟有2%概率生成一封手写信
        const LETTER_SEAL_EMOJIS = ["😊", "🥰", "😌", "🤔", "😴", "😤", "🥺", "😇", "🤗", "😏", "😎", "🤭", "😳", "😚", "😋"];
        const setupLetterGeneration = () => {
          createReliableScheduler(
            "letterGeneration",
            () => {
              const st = useAppStore.getState();
              if (st.contacts.length === 0 || st.conversations.length === 0) return;
              const privateConvs = st.conversations.filter((c) => c.type === "private" && c.memberIds.length > 0);
              const convs = privateConvs.length > 0 ? privateConvs : st.conversations;
              const targetConv = convs[Math.floor(Math.random() * convs.length)];
              if (!targetConv) return;
              const contactId = targetConv.memberIds[0];
              const cardCount = 5 + Math.floor(Math.random() * 4);
              const cards = st.pickRandomCards(contactId, "chat", cardCount);
              if (cards.length === 0) return;
              // 每张字卡合并为 "名称\n内容" 格式，多张卡之间用空行分隔
              const letterText = cards
                .map((c) => (c.name && c.content ? `${c.name}\n${c.content}` : c.name || c.content || ""))
                .filter(Boolean)
                .join("\n\n");
              const sealEmoji = LETTER_SEAL_EMOJIS[Math.floor(Math.random() * LETTER_SEAL_EMOJIS.length)];
              const letterMsg: Message = {
                id: uid("letter"),
                sender: contactId,
                type: "text",
                text: letterText,
                timestamp: Date.now(),
                isAutoInitiated: true,
                isLetter: true,
                letterSeal: sealEmoji,
                envelopeOpened: false,
              };
              useAppStore.setState((s) => ({
                conversations: s.conversations.map((c) =>
                  c.id === targetConv.id ? { ...c, messages: [...c.messages, letterMsg] } : c
                ),
              }));
            },
            () => 25 * 60 * 1000, // 每 25 分钟
            { fireProbability: 0.02 } // 2% 概率
          );
        };
        setupLetterGeneration();
      },
    },
  ),
);

export { MODULE_LABELS, createInitialState, createDefaultCards, createDefaultStatus, bumpHerStatus };
