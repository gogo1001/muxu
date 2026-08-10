import type { CardModule } from "./card";

export type Sender = "me" | string;
export type ViewSide = "me" | "her";

export interface Message {
  id: string;
  sender: Sender;
  type: "text" | "card" | "note" | "sticker" | "system" | "rps" | "poll" | "music" | "image" | "flychess" | "survey" | "shop" | "redpacket";
  text?: string;
  card?: import("./card").Card;
  noteMood?: string;
  moodNote?: string;
  sticker?: string;
  image?: string;
  timestamp: number;
  showMoodLabel?: boolean;
  mentionTarget?: string;
  moodTag?: string;
  music?: { title: string; url: string };
  rps?: {
    challenger: string;
    target: string;
    challengerChoice?: "rock" | "paper" | "scissors";
    targetChoice?: "rock" | "paper" | "scissors";
    result?: "win" | "lose" | "draw";
    resolved: boolean;
  };
  poll?: {
    question: string;
    options: [string, string];
    votes: Record<string, number>;
    voters: Record<string, number>;
    resolved: boolean;
  };
  flychess?: {
    playerCount: 2 | 3 | 4;
    players: string[];
    started: boolean;
    gameId: string;
  };
  systemText?: string;
  quoteId?: string;
  quoteText?: string;
  quoteSender?: string;
  recalled?: boolean;
  isAutoInitiated?: boolean;
  isLetter?: boolean;
  letterSeal?: string;
  envelopeOpened?: boolean;
  survey?: {
    surveyId: string;
    title: string;
    questions: { id: string; text: string; options?: string[] }[];
    answers?: { questionId: string; answer: string }[];
    completedAt?: number;
  };
  shop?: {
    productId: string;
    productName: string;
    price: number;
    emoji?: string;
    action: "recommend" | "buy" | "bought";
    leaveMessage?: string; // 给对方买完后的留言
  };
  readIgnored?: boolean;
  readStatus?: "none" | "read" | "ignored";
  redpacket?: {
    amount: number;
    message?: string;
    claimed?: boolean;
    claimedAt?: number;
    returned?: boolean;
    returnedAt?: number;
    isGroup?: boolean;
    count?: number;
    remaining?: number;
    totalAmount?: number;
    claims?: Array<{
      contactId: string;
      amount: number;
      isBest?: boolean;
      at: number;
      comment?: string;
      commentAt?: number;
    }>;
  };
}

export interface MealRecord {
  date: string;
  meal: "breakfast" | "lunch" | "dinner";
  name: string;
  content: string;
  time: string;
}

export interface CallRecord {
  id: string;
  contactId: string;
  contactName: string;
  direction: "outgoing" | "incoming";
  status: "missed" | "connected" | "rejected";
  duration: number;
  timestamp: number;
}

export interface Memo {
  id: string;
  contactId: string;
  text: string;
  from: "me" | string;
  timestamp: number;
}

export interface DriftBottle {
  id: string;
  contactId: string;
  text: string;
  from: "me" | string;
  timestamp: number;
  isRead: boolean;
}

export interface HerStatus {
  body: {
    temp: number;
    heartRate: number;
    sleepHours: number;
    fatigue: number;
    heartRateHistory: number[];
    lastUpdateAt: number;
  };
  mood: {
    current: string;
    keyword: string;
    curve: number[];
    emoji: string;
    level: number;
    isAngry: boolean;
  };
  work: {
    status: "working" | "resting" | "off";
    content: string;
    location: string;
    tasks: { id: string; title: string; done: boolean }[];
    overtime: boolean;
    progress: number;
    lastStatusChange: number;
  };
  travel: {
    location: string;
    weather: string;
    temperature: number;
    schedule: { time: string; place: string; note?: string }[];
  };
  meals: MealRecord[];
  notes: { id: string; text: string; timestamp: number }[];
  battery: number;
  lastBatteryUpdate: number;
}

export interface Contact {
  id: string;
  name: string;
  avatar: string;
  avatarImage: string;
  cards: Record<CardModule, import("./card").Card[]>;
  status: HerStatus;
  riceFullness: number;
  myNickname: string;
}

export type ConversationType = "private" | "group";

export interface TomatoThrow {
  id: string;
  throwerId: string;
  targetId: string;
  targetMsgId: string;
  timestamp: number;
  conversationId: string;
  auto?: boolean;
}

export interface TomatoDailyStat {
  date: string;
  thrownByMe: number;
  thrownAtMe: number;
}

export interface Conversation {
  id: string;
  type: ConversationType;
  name: string;
  messages: Message[];
  isFlipping: boolean;
  view: ViewSide;
  memberIds: string[];
  myAvatarText?: string;
  myAvatarImage?: string;
  herAvatarText?: string;
  herAvatarImage?: string;
  petHidden?: {
    messageId: string;
    side: "left" | "right";
    part: "ear" | "top" | "accessory";
    hiddenAt: number;
  } | null;
}

// =========== 新消息弹窗（微信式浮窗） ===========
export interface MsgNotification {
  id: string;
  conversationId: string;
  senderId: string; // 消息发送者ID (可能是"me" / 联系人ID / 群成员ID)
  senderName: string;
  senderAvatarText: string;
  senderAvatarImage?: string;
  conversationName: string;
  isGroup: boolean;
  preview: string; // 消息预览文案
  messageType: Message["type"];
  timestamp: number;
}

// =========== 问卷 ===========
export interface SurveyQuestion {
  id: string;
  text: string;
  options?: string[];
}

export interface SurveyResponse {
  respondent: string;
  answers: { questionId: string; answer: string }[];
  completedAt: number;
}

export interface Survey {
  id: string;
  title: string;
  questions: SurveyQuestion[];
  author: string;
  status: "pending" | "approved" | "rejected";
  scope: "personal" | "public";
  createdAt: number;
  approvedAt?: number;
  responses?: SurveyResponse[];
}

// =========== 商店 ===========
export interface Product {
  id: string;
  name: string;
  price: number;
  emoji: string;
}

export interface ShopData {
  myBalance: number;
  herBalance: number;
  products: Product[];
  purchases: { id: string; productId: string; productName: string; price: number; emoji: string; buyer: "me" | "her"; timestamp: number }[];
}
