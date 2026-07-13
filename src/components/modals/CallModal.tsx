import React, { useState, useEffect, useRef, useCallback } from "react";
import { Phone, PhoneOff } from "lucide-react";
import { useAppStore } from "@/store/app";

interface CallModalProps {
  isOpen: boolean;
  onClose: () => void;
  contactId: string;
  contactName: string;
  contactAvatar: string;
}

type CallStatus = "idle" | "calling" | "rejected" | "connected" | "ended";

/**
 * 打电话弹窗组件
 * - 显示对方头像和名字
 * - 绿色按钮发起拨打
 * - 呼叫中展示等待状态
 * - 15% 概率被对方挂断
 * - 接通后显示通话计时
 * - 红色按钮挂断并结束通话
 */
export default function CallModal({
  isOpen,
  onClose,
  contactId,
  contactName,
  contactAvatar,
}: CallModalProps) {
  const [callStatus, setCallStatus] = useState<CallStatus>("idle");
  const [duration, setDuration] = useState(0);
  const timerRef = useRef<number | null>(null);
  const startCall = useAppStore((s) => s.startCall);

  /** 格式化通话时长为 mm:ss */
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  /** 清理计时器 */
  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  /** 关闭弹窗并重置内部状态 */
  const handleClose = useCallback(() => {
    clearTimer();
    setCallStatus("idle");
    setDuration(0);
    onClose();
  }, [clearTimer, onClose]);

  /** 点击绿色按钮开始拨打电话 */
  const handleStartCall = () => {
    setCallStatus("calling");
    // 调用 store 记录本次通话
    startCall(contactId);

    // 模拟对方响应延迟（1.5~3秒）
    const delay = 1500 + Math.random() * 1500;
    window.setTimeout(() => {
      const isRejected = Math.random() < 0.15;
      if (isRejected) {
        setCallStatus("rejected");
      } else {
        setCallStatus("connected");
        setDuration(0);
        // 启动通话计时器
        timerRef.current = window.setInterval(() => {
          setDuration((d) => d + 1);
        }, 1000);
      }
    }, delay);
  };

  /** 点击红色按钮挂断电话 */
  const handleEndCall = () => {
    clearTimer();
    if (callStatus === "connected") {
      setCallStatus("ended");
      // 短暂展示“通话结束”后自动关闭
      window.setTimeout(() => {
        handleClose();
      }, 800);
    } else {
      handleClose();
    }
  };

  /** 弹窗关闭时清理副作用 */
  useEffect(() => {
    if (!isOpen) {
      clearTimer();
      setCallStatus("idle");
      setDuration(0);
    }
    return () => clearTimer();
  }, [isOpen, clearTimer]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center">
      {/* 背景遮罩 */}
      <div
        className="absolute inset-0 bg-black/60"
        onClick={
          callStatus === "idle" || callStatus === "rejected" || callStatus === "ended"
            ? handleClose
            : undefined
        }
      />

      {/* 弹窗主体 */}
      <div
        className="relative flex w-[90%] max-w-xs flex-col items-center rounded-2xl border p-8 shadow-2xl animate-popIn"
        style={{
          borderColor: "var(--card-border)",
          background: "var(--card)",
        }}
      >
        {/* 对方头像 */}
        <div
          className="mb-4 flex h-20 w-20 items-center justify-center rounded-full text-3xl font-bold"
          style={{ background: "var(--bg)", color: "var(--text)" }}
        >
          {contactAvatar || "他"}
        </div>

        {/* 对方名字 */}
        <div
          className="mb-1 text-lg font-bold"
          style={{ color: "var(--text)" }}
        >
          {contactName}
        </div>

        {/* 状态提示文字 */}
        <div
          className="mb-8 text-sm"
          style={{ color: "var(--text-soft)" }}
        >
          {callStatus === "idle" && "准备拨打"}
          {callStatus === "calling" && "呼叫中..."}
          {callStatus === "rejected" && "对方已挂断"}
          {callStatus === "connected" && formatDuration(duration)}
          {callStatus === "ended" && "通话结束"}
        </div>

        {/* 绿色拨打按钮 */}
        {callStatus === "idle" && (
          <button
            onClick={handleStartCall}
            className="flex h-16 w-16 items-center justify-center rounded-full transition hover:scale-105 active:scale-95"
            style={{
              background: "#2ECC71",
              color: "white",
              boxShadow: "0 4px 15px rgba(46, 204, 113, 0.4)",
            }}
            aria-label="拨打电话"
          >
            <Phone className="h-8 w-8" />
          </button>
        )}

        {/* 红色挂断按钮 */}
        {(callStatus === "calling" ||
          callStatus === "connected" ||
          callStatus === "rejected" ||
          callStatus === "ended") && (
          <button
            onClick={handleEndCall}
            className="flex h-16 w-16 items-center justify-center rounded-full transition hover:scale-105 active:scale-95"
            style={{
              background: "#E74C3C",
              color: "white",
              boxShadow: "0 4px 15px rgba(231, 76, 60, 0.4)",
            }}
            aria-label="挂断电话"
          >
            <PhoneOff className="h-8 w-8" />
          </button>
        )}
      </div>
    </div>
  );
}
