import { useState } from "react";
import { Settings, Phone, Pencil, Vote, Hand, PhoneCall, StickyNote, Mail } from "lucide-react";
import { useAppStore } from "@/store/app";
import ConvSwitchModal from "@/components/modals/ConvSwitchModal";
import RPSModal from "@/components/modals/RPSModal";
import PollModal from "@/components/modals/PollModal";
import CallModal from "@/components/modals/CallModal";
import MemoModal from "@/components/modals/MemoModal";
import MailboxModal from "@/components/modals/MailboxModal";

export default function ChatHeader() {
  const conversations = useAppStore((s) => s.conversations);
  const activeConversationId = useAppStore((s) => s.activeConversationId);
  const contacts = useAppStore((s) => s.contacts);
  const renameGroup = useAppStore((s) => s.renameGroup);
  const setPhoneOpen = useAppStore((s) => s.setPhoneOpen);
  const phoneOpen = useAppStore((s) => s.phoneOpen);
  const setSettingsOpen = useAppStore((s) => s.setSettingsOpen);
  const openMailbox = useAppStore((s) => s.openMailbox);

  const [showConvModal, setShowConvModal] = useState(false);
  const [showRPSModal, setShowRPSModal] = useState(false);
  const [showPollModal, setShowPollModal] = useState(false);
  const [showCallModal, setShowCallModal] = useState(false);
  const [showMemoModal, setShowMemoModal] = useState(false);
  const [showMailboxModal, setShowMailboxModal] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState("");

  const activeConv = conversations.find((c) => c.id === activeConversationId);
  const isGroup = activeConv?.type === "group";
  const isHerView = activeConv?.view === "her";

  const contactId = !isGroup ? activeConv?.memberIds[0] : null;
  const contact = contactId ? contacts.find((c) => c.id === contactId) : undefined;

  const displayName = isHerView && contact?.myNickname ? contact.myNickname : activeConv?.name;

  const handleRenameGroup = () => {
    const name = renameValue.trim();
    if (!name) return;
    renameGroup(name);
    setIsRenaming(false);
    setRenameValue("");
  };

  return (
    <>
      <header
        className="flex items-center justify-between border-b px-4 py-3 backdrop-blur md:px-8"
        style={{
          borderColor: "var(--card-border)",
          background: "color-mix(in srgb, var(--bg) 80%, transparent)",
        }}
      >
        <div className="flex items-center gap-2">
          {isRenaming ? (
            <input
              autoFocus
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onBlur={handleRenameGroup}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleRenameGroup();
                if (e.key === "Escape") {
                  setIsRenaming(false);
                  setRenameValue("");
                }
              }}
              className="w-32 rounded-lg border px-3 py-1.5 text-base font-bold focus:outline-none"
              style={{
                borderColor: "var(--accent)",
                background: "var(--card)",
                color: "var(--text)",
              }}
            />
          ) : (
            <>
              <h1
                className="cursor-pointer rounded-lg px-3 py-1.5 font-serif text-base font-bold transition hover:bg-black/5"
                style={{ color: "var(--text)" }}
                onClick={() => setShowConvModal(true)}
              >
                {displayName}
              </h1>
              {isGroup && (
                <button
                  onClick={() => {
                    setRenameValue(activeConv?.name || "");
                    setIsRenaming(true);
                  }}
                  className="flex h-6 w-6 items-center justify-center rounded-lg transition hover:bg-black/10"
                  style={{ color: "var(--text-soft)" }}
                  title="修改群名"
                >
                  <Pencil className="h-3 w-3" />
                </button>
              )}
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          {!isGroup && contact && (
            <>
              <button
                onClick={() => setShowCallModal(true)}
                className="flex h-10 w-10 items-center justify-center rounded-full border transition hover:scale-105"
                style={{
                  borderColor: "var(--card-border)",
                  background: "var(--card)",
                  color: "#2ECC71",
                }}
                title="打电话"
              >
                <PhoneCall className="h-5 w-5" />
              </button>
              <button
                onClick={() => setShowMemoModal(true)}
                className="flex h-10 w-10 items-center justify-center rounded-full border transition hover:scale-105"
                style={{
                  borderColor: "var(--card-border)",
                  background: "var(--card)",
                  color: "var(--text)",
                }}
                title="备忘录"
              >
                <StickyNote className="h-5 w-5" />
              </button>
              <button
                onClick={() => {
                  if (contactId) {
                    openMailbox(contactId);
                    setShowMailboxModal(true);
                  }
                }}
                className="flex h-10 w-10 items-center justify-center rounded-full border transition hover:scale-105"
                style={{
                  borderColor: "var(--card-border)",
                  background: "var(--card)",
                  color: "var(--text)",
                }}
                title="信箱"
              >
                <Mail className="h-5 w-5" />
              </button>
            </>
          )}

          <button
            onClick={() => setSettingsOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-full border transition hover:scale-105"
            style={{
              borderColor: "var(--card-border)",
              background: "var(--card)",
              color: "var(--accent)",
            }}
            title="设置"
          >
            <Settings className="h-5 w-5" />
          </button>

          {isGroup ? (
            <>
              <button
                onClick={() => setShowRPSModal(true)}
                className="flex h-10 w-10 items-center justify-center rounded-full border transition hover:scale-105"
                style={{
                  borderColor: "var(--card-border)",
                  background: "var(--card)",
                  color: "var(--text)",
                }}
                title="猜拳"
              >
                <Hand className="h-5 w-5" />
              </button>

              <button
                onClick={() => setShowPollModal(true)}
                className="flex h-10 w-10 items-center justify-center rounded-full border transition hover:scale-105"
                style={{
                  borderColor: "var(--card-border)",
                  background: "var(--card)",
                  color: "var(--text)",
                }}
                title="投票"
              >
                <Vote className="h-5 w-5" />
              </button>
            </>
          ) : (
            <button
              onClick={() => setPhoneOpen(!phoneOpen)}
              className="flex h-10 w-10 items-center justify-center rounded-full border transition hover:scale-105"
              style={{
                borderColor: phoneOpen ? "var(--accent)" : "var(--card-border)",
                background: phoneOpen ? "var(--accent)" : "var(--card)",
                color: phoneOpen ? "var(--card)" : "var(--text)",
              }}
              title="他的手机"
            >
              <Phone className="h-5 w-5" />
            </button>
          )}
        </div>
      </header>

      <ConvSwitchModal isOpen={showConvModal} onClose={() => setShowConvModal(false)} />
      <RPSModal isOpen={showRPSModal} onClose={() => setShowRPSModal(false)} />
      <PollModal isOpen={showPollModal} onClose={() => setShowPollModal(false)} />
      {contact && (
        <CallModal
          isOpen={showCallModal}
          onClose={() => setShowCallModal(false)}
          contactId={contact.id}
          contactName={contact.name}
          contactAvatar={contact.avatar}
        />
      )}
      {contactId && (
        <MemoModal
          isOpen={showMemoModal}
          onClose={() => setShowMemoModal(false)}
          contactId={contactId}
        />
      )}
      {contactId && (
        <MailboxModal
          isOpen={showMailboxModal}
          onClose={() => setShowMailboxModal(false)}
          contactId={contactId}
        />
      )}
    </>
  );
}
