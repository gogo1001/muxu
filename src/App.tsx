import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "@/pages/Home";
import ThemeApplier from "@/theme/ThemeApplier";
import FloatingPhone from "@/components/FloatingPhone";
import FloatingMusic from "@/components/FloatingMusic";
import MusicPlayerModal from "@/components/MusicPlayerModal";
import ErrorBoundary from "@/components/ErrorBoundary";
import { useEffect, useState } from "react";
import { useAppStore } from "@/store/app";

const basename = import.meta.env.BASE_URL;

export default function App() {
  const [notificationGranted, setNotificationGranted] = useState(false);
  const hasHydrated = useAppStore((s) => (s as any)._hasHydrated);
  const messages = useAppStore((s) => {
    const activeConv = s.conversations.find((c) => c.id === s.activeConversationId);
    return activeConv?.messages || [];
  });
  const memos = useAppStore((s) => s.memos);
  const beauty = useAppStore((s) => s.beauty);
  const pushNotification = useAppStore((s) => s.chat.pushNotification);

  useEffect(() => {
    if ("Notification" in window) {
      Notification.requestPermission().then((permission) => {
        setNotificationGranted(permission === "granted");
      });
    }
  }, []);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && notificationGranted && pushNotification) {
        document.title = "💬 苜蓿 · 有新消息";
      } else {
        document.title = "苜蓿";
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [notificationGranted, pushNotification]);

  const NOTIFICATION_ICON = "https://i.postimg.cc/ZKVRS4kH/retouch-2026071501420750.png";

  useEffect(() => {
    if (!notificationGranted || !document.hidden || !pushNotification) return;

    const lastMsg = messages[messages.length - 1];
    if (!lastMsg) return;

    if (lastMsg.type === "system") {
      new Notification("苜蓿", {
        body: lastMsg.systemText,
        icon: NOTIFICATION_ICON,
      });
    } else if (lastMsg.sender !== "me" && lastMsg.text) {
      const senderName = lastMsg.sender === "her" ? beauty.herName :
        useAppStore.getState().contacts.find((c) => c.id === lastMsg.sender)?.name || "对方";
      new Notification(`${senderName} 回复了你的消息`, {
        body: lastMsg.text.substring(0, 100),
        icon: NOTIFICATION_ICON,
      });
    }
  }, [messages.length, notificationGranted, beauty, pushNotification]);

  useEffect(() => {
    if (!notificationGranted || !document.hidden || !pushNotification) return;
    const latest = memos[0];
    if (!latest || latest.from === "me") return;
    if (Date.now() - latest.timestamp > 10000) return;

    const senderName =
      useAppStore.getState().contacts.find((c) => c.id === latest.from)?.name || beauty.herName;
    new Notification(`${senderName} 给你发来一封信`, {
      body: latest.text.substring(0, 100),
      icon: NOTIFICATION_ICON,
    });
  }, [memos.length, notificationGranted, beauty, pushNotification]);

  if (!hasHydrated) {
    return (
      <>
        <ThemeApplier />
        <div className="flex h-full w-full items-center justify-center" style={{ background: "var(--bg)" }}>
          <div className="text-center" style={{ color: "var(--text-soft)" }}>
            <div className="mb-3 text-2xl">💾</div>
            <div className="text-sm">加载中...</div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <ThemeApplier />
      <ErrorBoundary>
        <Router basename={basename}>
          <Routes>
            <Route path="/" element={<Home />} />
          </Routes>
        </Router>
      </ErrorBoundary>
      <ErrorBoundary fallback={<></>}>
        <FloatingPhone />
      </ErrorBoundary>
      <ErrorBoundary fallback={<></>}>
        <FloatingMusic />
      </ErrorBoundary>
      <ErrorBoundary fallback={<></>}>
        <MusicPlayerModal />
      </ErrorBoundary>
    </>
  );
}
