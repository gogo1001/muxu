import { useState } from "react";
import { useAppStore } from "@/store/app";

export default function ChatSettingPanel() {
  const chat = useAppStore((s) => s.chat);
  const setChat = useAppStore((s) => s.setChat);
  const activeConversationId = useAppStore((s) => s.activeConversationId);
  const clearMessages = useAppStore((s) => s.clearMessages);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  return (
    <div className="flex flex-col gap-5">
      <Section title="回复速度">
        <div className="mb-2 text-[11px]" style={{ color: "var(--text-soft)" }}>
          他回复你的时间范围：{chat.replySpeedMin}s ~ {chat.replySpeedMax}s
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[11px]" style={{ color: "var(--text-soft)" }}>
            最快 {chat.replySpeedMin}s
          </span>
          <input
            type="range"
            min={3}
            max={360}
            value={chat.replySpeedMin}
            onChange={(e) => {
              const v = Number(e.target.value);
              setChat({ replySpeedMin: v, replySpeedMax: Math.max(v, chat.replySpeedMax) });
            }}
            className="flex-1 accent-[var(--accent)]"
          />
        </div>
        <div className="mt-2 flex items-center gap-3">
          <span className="text-[11px]" style={{ color: "var(--text-soft)" }}>
            最慢 {chat.replySpeedMax}s
          </span>
          <input
            type="range"
            min={3}
            max={360}
            value={chat.replySpeedMax}
            onChange={(e) => {
              const v = Number(e.target.value);
              setChat({ replySpeedMax: v, replySpeedMin: Math.min(v, chat.replySpeedMin) });
            }}
            className="flex-1 accent-[var(--accent)]"
          />
        </div>
        <div className="mt-2 flex gap-1">
          {[
            { label: "快速", min: 3, max: 8 },
            { label: "正常", min: 8, max: 20 },
            { label: "慢", min: 30, max: 90 },
            { label: "很慢", min: 120, max: 360 },
          ].map((p) => (
            <button
              key={p.label}
              onClick={() => setChat({ replySpeedMin: p.min, replySpeedMax: p.max })}
              className="flex-1 rounded-lg border py-1 text-[11px] transition hover:bg-black/5"
              style={{
                borderColor: "var(--card-border)",
                color: "var(--text)",
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </Section>

      <Section title="主动发消息">
        <Toggle
          label="开启后他会主动发消息给你"
          checked={chat.autoMessage}
          onChange={(v) => setChat({ autoMessage: v })}
        />
        {chat.autoMessage && (
          <div className="mt-3">
            <div className="mb-2 text-[11px]" style={{ color: "var(--text-soft)" }}>
              主动发消息间隔：{chat.autoIntervalMin} ~ {chat.autoIntervalMax} 分钟
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[10px] w-8" style={{ color: "var(--text-soft)" }}>
                最小
              </span>
              <input
                type="range"
                min={1}
                max={60}
                value={chat.autoIntervalMin}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setChat({
                    autoIntervalMin: v,
                    autoIntervalMax: Math.max(v, chat.autoIntervalMax),
                  });
                }}
                className="flex-1 accent-[var(--accent)]"
              />
            </div>
            <div className="mt-2 flex items-center gap-3">
              <span className="text-[10px] w-8" style={{ color: "var(--text-soft)" }}>
                最大
              </span>
              <input
                type="range"
                min={1}
                max={120}
                value={chat.autoIntervalMax}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setChat({
                    autoIntervalMax: v,
                    autoIntervalMin: Math.min(v, chat.autoIntervalMin),
                  });
                }}
                className="flex-1 accent-[var(--accent)]"
              />
            </div>
          </div>
        )}
      </Section>

      <Section title="已读不回">
        <Toggle
          label="开启后，你发出的消息有概率对方不回复（头像出现红色猫耳标记）"
          checked={chat.readIgnoreEnabled}
          onChange={(v) => setChat({ readIgnoreEnabled: v })}
        />
      </Section>

      <Section title="已读 / 已读不回 标注">
        <Toggle
          label="在你发出的消息旁显示「已读」或红色猫耳（关闭后不再显示任何已读类标识）"
          checked={chat.readBadgeEnabled}
          onChange={(v) => setChat({ readBadgeEnabled: v })}
        />
      </Section>

      <Section title="对方撤回消息">
        <Toggle
          label="开启后，对方有小概率撤回自己刚发的消息"
          checked={chat.recallEnabled}
          onChange={(v) => setChat({ recallEnabled: v })}
        />
      </Section>

      <Section title="私聊回复条数">
        <div className="mb-2 text-[11px]" style={{ color: "var(--text-soft)" }}>
          私聊中，对方每次回复你的消息条数：{chat.privateReplyMin} ~ {chat.privateReplyMax} 条
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[11px] w-8" style={{ color: "var(--text-soft)" }}>
            最少 {chat.privateReplyMin}
          </span>
          <input
            type="range"
            min={1}
            max={12}
            value={chat.privateReplyMin}
            onChange={(e) => {
              const v = Number(e.target.value);
              setChat({ privateReplyMin: v, privateReplyMax: Math.max(v, chat.privateReplyMax) });
            }}
            className="flex-1 accent-[var(--accent)]"
          />
        </div>
        <div className="mt-2 flex items-center gap-3">
          <span className="text-[11px] w-8" style={{ color: "var(--text-soft)" }}>
            最多 {chat.privateReplyMax}
          </span>
          <input
            type="range"
            min={1}
            max={12}
            value={chat.privateReplyMax}
            onChange={(e) => {
              const v = Number(e.target.value);
              setChat({ privateReplyMax: v, privateReplyMin: Math.min(v, chat.privateReplyMin) });
            }}
            className="flex-1 accent-[var(--accent)]"
          />
        </div>
      </Section>

      <Section title="群聊回复条数">
        <div className="mb-2 text-[11px]" style={{ color: "var(--text-soft)" }}>
          群聊中，每次触发回复的总条数：{chat.groupReplyMin} ~ {chat.groupReplyMax} 条
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[11px] w-8" style={{ color: "var(--text-soft)" }}>
            最少 {chat.groupReplyMin}
          </span>
          <input
            type="range"
            min={1}
            max={12}
            value={chat.groupReplyMin}
            onChange={(e) => {
              const v = Number(e.target.value);
              setChat({ groupReplyMin: v, groupReplyMax: Math.max(v, chat.groupReplyMax) });
            }}
            className="flex-1 accent-[var(--accent)]"
          />
        </div>
        <div className="mt-2 flex items-center gap-3">
          <span className="text-[11px] w-8" style={{ color: "var(--text-soft)" }}>
            最多 {chat.groupReplyMax}
          </span>
          <input
            type="range"
            min={1}
            max={12}
            value={chat.groupReplyMax}
            onChange={(e) => {
              const v = Number(e.target.value);
              setChat({ groupReplyMax: v, groupReplyMin: Math.min(v, chat.groupReplyMin) });
            }}
            className="flex-1 accent-[var(--accent)]"
          />
        </div>
      </Section>

      <Section title="喝水提醒">
        <Toggle
          label="6% 概率随机提醒你喝水"
          checked={chat.waterReminder}
          onChange={(v) => setChat({ waterReminder: v })}
        />
      </Section>

      <Section title="后台推送提醒">
        <Toggle
          label="网页在后台时，对方回复消息、发信或回复备忘录，用浏览器推送通知提醒你上线看看"
          checked={chat.pushNotification}
          onChange={(v) => setChat({ pushNotification: v })}
        />
      </Section>

      <Section title="新消息浮窗 & 提示音">
        <div className="space-y-2.5 rounded-xl border p-3" style={{
          background: "var(--card)",
          borderColor: "var(--card-border)",
        }}>
          <Toggle
            label="开启后收到新消息会弹出微信式悬浮小卡片提醒"
            checked={chat.msgToastEnabled}
            onChange={(v) => setChat({ msgToastEnabled: v })}
          />
          {chat.msgToastEnabled && (
            <Toggle
              label="当前正在看的会话也弹出浮窗提醒（默认仅其他会话）"
              checked={chat.msgToastForActiveConv}
              onChange={(v) => setChat({ msgToastForActiveConv: v })}
            />
          )}
        </div>

        <div className="mt-3 space-y-3 rounded-xl border p-3" style={{
          background: "var(--card)",
          borderColor: "var(--card-border)",
        }}>
          <Toggle
            label="新消息提示音（开关）"
            checked={chat.msgSoundEnabled}
            onChange={(v) => setChat({ msgSoundEnabled: v })}
          />
          {chat.msgSoundEnabled && (
            <>
              <div>
                <div className="mb-1.5 text-[11px]" style={{ color: "var(--text-soft)" }}>
                  选择提示音
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: "ding", label: "🔔 经典叮咚" },
                    { id: "dong", label: "🔕 低沉叮咚" },
                    { id: "chord", label: "🎵 柔和和弦" },
                    { id: "pop", label: "🎈 清脆 Pop" },
                    { id: "silent", label: "🚫 静音" },
                    { id: "custom", label: "📂 自定义" },
                  ].map((o) => {
                    const active = chat.msgSoundPreset === o.id;
                    return (
                      <button
                        key={o.id}
                        type="button"
                        onClick={() => setChat({ msgSoundPreset: o.id as any })}
                        className="rounded-lg border px-2 py-1.5 text-[11px] transition hover:bg-black/5"
                        style={{
                          background: active
                            ? "color-mix(in srgb, var(--accent) 14%, transparent)"
                            : "transparent",
                          borderColor: active
                            ? "color-mix(in srgb, var(--accent) 50%, var(--card-border))"
                            : "var(--card-border)",
                          color: active ? "var(--accent)" : "var(--text)",
                          fontWeight: active ? 600 : 400,
                        }}
                      >
                        {o.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {chat.msgSoundPreset === "custom" && (
                <div className="rounded-lg border p-2.5 space-y-2" style={{
                  borderColor: "color-mix(in srgb, var(--accent) 35%, var(--card-border))",
                  background: "color-mix(in srgb, var(--accent) 6%, transparent)",
                }}>
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      if (f.size > 800 * 1024) {
                        alert("音频文件过大，请使用 ≤ 800KB 的 mp3/wav/ogg 等");
                        e.target.value = "";
                        return;
                      }
                      const reader = new FileReader();
                      reader.onload = () => {
                        const url = String(reader.result || "");
                        setChat({ msgSoundCustomDataUrl: url });
                      };
                      reader.readAsDataURL(f);
                      e.target.value = "";
                    }}
                    className="w-full text-[11px]"
                    style={{ color: "var(--text)" }}
                  />
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-[10px] truncate min-w-0 flex-1" style={{ color: "var(--text-soft)" }}>
                      {chat.msgSoundCustomDataUrl
                        ? `✓ 已上传（${Math.round(chat.msgSoundCustomDataUrl.length / 1024 * 0.75)} KB）`
                        : "尚未上传自定义音频（支持 mp3 / wav / ogg，≤800KB）"}
                    </div>
                    {chat.msgSoundCustomDataUrl && (
                      <button
                        type="button"
                        className="shrink-0 rounded-md px-2 py-1 text-[10px] border"
                        style={{
                          color: "var(--text-soft)",
                          borderColor: "var(--card-border)",
                          background: "var(--card)",
                        }}
                        onClick={() => setChat({ msgSoundCustomDataUrl: "" })}
                      >
                        清除
                      </button>
                    )}
                  </div>
                </div>
              )}

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <div className="text-[11px]" style={{ color: "var(--text-soft)" }}>
                    音量
                  </div>
                  <div className="text-[10px]" style={{ color: "var(--text-soft)" }}>
                    {Math.round((chat.msgSoundVolume || 0) * 100)}%
                  </div>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={Math.round((chat.msgSoundVolume || 0.7) * 100)}
                  onChange={(e) => setChat({ msgSoundVolume: Number(e.target.value) / 100 })}
                  className="w-full accent-[var(--accent)]"
                />
              </div>

              <button
                type="button"
                onClick={() => useAppStore.getState().playMsgSound()}
                className="w-full rounded-lg border py-2 text-[12px] font-medium transition hover:scale-[1.01] active:scale-[0.99]"
                style={{
                  borderColor: "color-mix(in srgb, var(--accent) 35%, var(--card-border))",
                  color: "var(--accent)",
                  background: "color-mix(in srgb, var(--accent) 10%, transparent)",
                }}
              >
                ▶ 试听当前提示音
              </button>
            </>
          )}
        </div>
      </Section>

      <Section title="群聊入口开关">
        <Toggle
          label="在「切换联系人」界面显示群聊入口（关闭后群聊依然存在，只是不在联系人切换界面显示）"
          checked={chat.groupChatSwitchEnabled}
          onChange={(v) => setChat({ groupChatSwitchEnabled: v })}
        />
      </Section>

      <Section title="聊天记录">
        <div className="mb-2 text-[11px]" style={{ color: "var(--text-soft)" }}>
          清除当前会话的所有聊天消息，其他数据不受影响。
        </div>
        <button
          onClick={() => setShowClearConfirm(true)}
          className="w-full rounded-lg border py-2.5 text-xs font-medium transition hover:bg-red-50"
          style={{
            borderColor: "rgba(231, 76, 60, 0.3)",
            color: "#E74C3C",
            background: "var(--card)",
          }}
        >
          清除聊天记录
        </button>
      </Section>

      {showClearConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setShowClearConfirm(false)}
        >
          <div
            className="w-[80%] max-w-sm rounded-2xl border p-5"
            style={{
              borderColor: "var(--card-border)",
              background: "var(--card)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-2 text-center font-serif text-base font-bold" style={{ color: "var(--text)" }}>
              确认清除聊天记录？
            </div>
            <div className="mb-4 text-center text-xs" style={{ color: "var(--text-soft)" }}>
              此操作将删除当前会话的所有消息，且不可恢复。其他数据（联系人、字卡、设置等）不受影响。
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 rounded-xl py-2.5 text-sm transition hover:bg-black/5"
                style={{ background: "var(--bg)", color: "var(--text)" }}
              >
                取消
              </button>
              <button
                onClick={() => {
                  if (activeConversationId) {
                    clearMessages(activeConversationId);
                  }
                  setShowClearConfirm(false);
                }}
                className="flex-1 rounded-xl py-2.5 text-sm font-medium text-white transition hover:opacity-90"
                style={{ background: "#E74C3C" }}
              >
                确认清除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-2 font-serif text-sm font-bold" style={{ color: "var(--text)" }}>
        {title}
      </h3>
      {children}
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-left transition hover:bg-black/5"
      style={{
        background: "var(--card)",
        borderColor: "var(--card-border)",
        color: "var(--text)",
      }}
    >
      <span className="text-xs">{label}</span>
      <span
        className="relative h-5 w-9 rounded-full transition"
        style={{ background: checked ? "var(--accent)" : "color-mix(in srgb, var(--text) 20%, transparent)" }}
      >
        <span
          className="absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all"
          style={{ left: checked ? "18px" : "2px" }}
        />
      </span>
    </button>
  );
}
