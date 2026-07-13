import { useState } from "react";
import PhoneShell from "./PhoneShell";
import ChatApp from "./apps/ChatApp";
import BodyApp from "./apps/BodyApp";
import MoodApp from "./apps/MoodApp";
import WorkApp from "./apps/WorkApp";
import TravelApp from "./apps/TravelApp";
import MealsApp from "./apps/MealsApp";
import PhoneApp from "./apps/PhoneApp";
import MusicApp from "./apps/MusicApp";
import HomeScreen from "./apps/HomeScreen";

export type PhoneAppId = "home" | "chat" | "body" | "mood" | "work" | "travel" | "meals" | "phone" | "music";

// 可爱简约图标（SVG）
const ChatIcon = ({ color }: { color: string }) => (
  <svg viewBox="0 0 32 32" className="h-7 w-7">
    <path
      d="M6 6h20a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3H14l-6 4v-4H6a3 3 0 0 1-3-3V9a3 3 0 0 1 3-3z"
      fill={color}
      opacity="0.2"
    />
    <path
      d="M6 6h20a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3H14l-6 4v-4H6a3 3 0 0 1-3-3V9a3 3 0 0 1 3-3z"
      fill="none"
      stroke={color}
      strokeWidth="1.5"
    />
    <circle cx="12" cy="12" r="1.5" fill={color} />
    <circle cx="16" cy="12" r="1.5" fill={color} />
    <circle cx="20" cy="12" r="1.5" fill={color} />
  </svg>
);

const HeartIcon = ({ color }: { color: string }) => (
  <svg viewBox="0 0 32 32" className="h-7 w-7">
    <path
      d="M16 26s-8-5.5-8-12a5 5 0 0 1 9-3 5 5 0 0 1 9 3c0 6.5-8 12-8 12h-2z"
      fill={color}
      opacity="0.2"
    />
    <path
      d="M16 26s-8-5.5-8-12a5 5 0 0 1 9-3 5 5 0 0 1 9 3c0 6.5-8 12-8 12h-2z"
      fill="none"
      stroke={color}
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
    <path d="M11 13.5c1 1 2.5 1.5 4 1" stroke={color} strokeWidth="1.2" strokeLinecap="round" fill="none" />
  </svg>
);

const FlowerIcon = ({ color }: { color: string }) => (
  <svg viewBox="0 0 32 32" className="h-7 w-7">
    <circle cx="16" cy="10" r="4" fill={color} opacity="0.25" />
    <circle cx="10" cy="15" r="4" fill={color} opacity="0.2" />
    <circle cx="22" cy="15" r="4" fill={color} opacity="0.2" />
    <circle cx="12" cy="21" r="4" fill={color} opacity="0.22" />
    <circle cx="20" cy="21" r="4" fill={color} opacity="0.18" />
    <circle cx="16" cy="16" r="3" fill={color} />
    <path d="M16 26v-4" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const BriefIcon = ({ color }: { color: string }) => (
  <svg viewBox="0 0 32 32" className="h-7 w-7">
    <rect x="4" y="11" width="24" height="16" rx="2" fill={color} opacity="0.2" />
    <rect x="4" y="11" width="24" height="16" rx="2" fill="none" stroke={color} strokeWidth="1.5" />
    <rect x="12" y="7" width="8" height="6" rx="1" fill={color} opacity="0.3" />
    <rect x="12" y="7" width="8" height="6" rx="1" fill="none" stroke={color} strokeWidth="1.5" />
    <line x1="4" y1="17" x2="28" y2="17" stroke={color} strokeWidth="1.2" opacity="0.5" />
    <path d="M14 21h4" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const TrainIcon = ({ color }: { color: string }) => (
  <svg viewBox="0 0 32 32" className="h-7 w-7">
    <rect x="7" y="5" width="18" height="18" rx="3" fill={color} opacity="0.2" />
    <rect x="7" y="5" width="18" height="18" rx="3" fill="none" stroke={color} strokeWidth="1.5" />
    <rect x="10" y="8" width="12" height="5" rx="1" fill={color} opacity="0.4" />
    <circle cx="11" cy="25" r="1.8" fill={color} />
    <circle cx="21" cy="25" r="1.8" fill={color} />
    <path d="M9 22l-2 3M23 22l2 3" stroke={color} strokeWidth="1.2" strokeLinecap="round" />
  </svg>
);

const BowlIcon = ({ color }: { color: string }) => (
  <svg viewBox="0 0 32 32" className="h-7 w-7">
    <path d="M4 14h24c0 7-5 11-12 11S4 21 4 14z" fill={color} opacity="0.2" />
    <path d="M4 14h24c0 7-5 11-12 11S4 21 4 14z" fill="none" stroke={color} strokeWidth="1.5" />
    <ellipse cx="16" cy="14" rx="12" ry="2.5" fill={color} opacity="0.3" />
    <path d="M10 8c0-1.5 1-2.5 2-2.5M16 7c0-1.5 1-2.5 2-2.5M22 8c0-1.5 1-2.5 2-2.5" stroke={color} strokeWidth="1.2" strokeLinecap="round" />
    <circle cx="16" cy="19" r="1" fill={color} />
  </svg>
);

const PhoneCallIcon = ({ color }: { color: string }) => (
  <svg viewBox="0 0 32 32" className="h-7 w-7">
    <path d="M6 6c-1.5 0-3 1.5-3 4v12c0 2.5 1.5 4 3 4h6l4 3v-3h4c2 0 4-1.5 4-4v-4c0-2-1.5-3.5-3-4l-2-2c-1.5-1.5-3-1.5-5-1.5H8c-0.5 0-1-0.5-1-1V7c0-0.5 0.5-1 1-1z" fill={color} opacity="0.2" />
    <path d="M6 6c-1.5 0-3 1.5-3 4v12c0 2.5 1.5 4 3 4h6l4 3v-3h4c2 0 4-1.5 4-4v-4c0-2-1.5-3.5-3-4l-2-2c-1.5-1.5-3-1.5-5-1.5H8c-0.5 0-1-0.5-1-1V7c0-0.5 0.5-1 1-1z" fill="none" stroke={color} strokeWidth="1.5" />
    <path d="M12 11c1.5 1.5 3 1.5 5 0" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const MusicNoteIcon = ({ color }: { color: string }) => (
  <svg viewBox="0 0 32 32" className="h-7 w-7">
    <path d="M8 26V8l8-6v12l-6 4v6z" fill={color} opacity="0.2" />
    <path d="M8 26V8l8-6v12l-6 4v6z" fill="none" stroke={color} strokeWidth="1.5" />
    <circle cx="20" cy="16" r="3" fill={color} opacity="0.3" />
    <circle cx="20" cy="16" r="3" fill="none" stroke={color} strokeWidth="1.5" />
    <path d="M20 10v6" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const APPS: { id: PhoneAppId; name: string; Icon: (p: { color: string }) => JSX.Element; color: string }[] = [
  { id: "chat", name: "聊天", Icon: ChatIcon, color: "#3A7CA5" },
  { id: "meals", name: "三餐", Icon: BowlIcon, color: "#FF8A65" },
  { id: "body", name: "身体", Icon: HeartIcon, color: "#E85C8B" },
  { id: "mood", name: "心情", Icon: FlowerIcon, color: "#F06292" },
  { id: "work", name: "工作", Icon: BriefIcon, color: "#7CB342" },
  { id: "travel", name: "出行", Icon: TrainIcon, color: "#8B6DB8" },
  { id: "phone", name: "电话", Icon: PhoneCallIcon, color: "#2ECC71" },
  { id: "music", name: "音乐", Icon: MusicNoteIcon, color: "#E91E63" },
];

export default function PhoneTabs() {
  const [app, setApp] = useState<PhoneAppId>("home");
  const time = new Date().toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <PhoneShell time={time}>
      <div className="fancy-scroll h-[480px] overflow-y-auto pt-2">
        {app === "home" && <HomeScreen apps={APPS} onOpen={setApp} />}
        {app === "chat" && <ChatApp onBack={() => setApp("home")} />}
        {app === "body" && <BodyApp onBack={() => setApp("home")} />}
        {app === "mood" && <MoodApp onBack={() => setApp("home")} />}
        {app === "work" && <WorkApp onBack={() => setApp("home")} />}
        {app === "travel" && <TravelApp onBack={() => setApp("home")} />}
        {app === "meals" && <MealsApp onBack={() => setApp("home")} />}
        {app === "phone" && <PhoneApp onBack={() => setApp("home")} />}
        {app === "music" && <MusicApp onBack={() => setApp("home")} />}
      </div>

      {/* Home 指示条 */}
      <div
        className="absolute bottom-2 left-1/2 h-1 w-24 -translate-x-1/2 rounded-full"
        style={{ background: "color-mix(in srgb, var(--text) 30%, transparent)" }}
      />
    </PhoneShell>
  );
}

export { APPS };
