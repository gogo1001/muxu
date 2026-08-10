import { useState, useEffect, useCallback } from "react";
import { useAppStore } from "@/store/app";
import { AppHeader } from "./HomeScreen";
import { Plus, Send, Shield, Check, X, Trash, BookOpen, FileText, Loader2, Eye } from "lucide-react";
import type { SurveyQuestion } from "@/types";
import { supabase, PUBLIC_SURVEYS_TABLE } from "@/lib/supabase";

const ADMIN_PASSWORD = "711520";

// Supabase 远程问卷类型
type RemoteSurvey = {
  id: string;
  title: string;
  questions: SurveyQuestion[];
  author: string;
  status: string;
  created_at: string;
  approved_at: string | null;
};

export default function SurveyApp({ onBack }: { onBack: () => void }) {
  const surveys = useAppStore((s) => s.surveys);
  const submitSurvey = useAppStore((s) => s.submitSurvey);
  const deleteSurvey = useAppStore((s) => s.deleteSurvey);
  const sendSurveyToChat = useAppStore((s) => s.sendSurveyToChat);
  const sendSurveyDataToChat = useAppStore((s) => s.sendSurveyDataToChat);
  const activeConversationId = useAppStore((s) => s.activeConversationId);

  // tab: "mine" | "library"
  const [tab, setTab] = useState<"mine" | "library">("mine");
  // view: "list" | "create" | "admin" | "preview"
  const [view, setView] = useState<"list" | "create" | "admin" | "preview">("list");
  const [adminPassword, setAdminPassword] = useState("");
  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    try {
      return localStorage.getItem("survey_admin_logged_in") === "1";
    } catch {
      return false;
    }
  });
  const [passwordError, setPasswordError] = useState(false);

  // 预览的问卷
  const [previewSurvey, setPreviewSurvey] = useState<{
    title: string;
    author: string;
    questions: SurveyQuestion[];
    onApply?: () => void;
  } | null>(null);

  // 创建/投稿 共用表单
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [questions, setQuestions] = useState<SurveyQuestion[]>([
    { id: "q1", text: "" },
  ]);

  // 远程公共问卷（Supabase）
  const [remoteApproved, setRemoteApproved] = useState<RemoteSurvey[]>([]);
  const [remotePending, setRemotePending] = useState<RemoteSurvey[]>([]);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [adminLoading, setAdminLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // 我的问卷：个人创建，立即可用（本地存储）
  const mySurveys = surveys.filter((s) => s.scope === "personal");

  // 拉取公共问卷库（已审核通过的）
  const fetchApproved = useCallback(async () => {
    setLibraryLoading(true);
    try {
      const { data, error } = await supabase
        .from(PUBLIC_SURVEYS_TABLE)
        .select("*")
        .eq("status", "approved")
        .order("approved_at", { ascending: false });
      if (error) throw error;
      setRemoteApproved((data as RemoteSurvey[]) || []);
    } catch (e) {
      console.warn("[问卷库] 拉取失败，请先在 Supabase 建表", e);
    } finally {
      setLibraryLoading(false);
    }
  }, []);

  // 拉取待审核（管理员）
  const fetchPending = useCallback(async () => {
    setAdminLoading(true);
    try {
      const { data, error } = await supabase
        .from(PUBLIC_SURVEYS_TABLE)
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setRemotePending((data as RemoteSurvey[]) || []);
    } catch (e) {
      console.warn("[问卷库] 拉取待审核失败", e);
    } finally {
      setAdminLoading(false);
    }
  }, []);

  // 进入问卷库 Tab 时拉取
  useEffect(() => {
    if (tab === "library" && view === "list") {
      fetchApproved();
    }
  }, [tab, view, fetchApproved]);

  // 进入管理员审核时拉取
  useEffect(() => {
    if (view === "admin" && isAdmin) {
      fetchPending();
    }
  }, [view, isAdmin, fetchPending]);

  const handleApplyLocal = (surveyId: string) => {
    sendSurveyToChat(activeConversationId, surveyId);
    setView("list");
  };

  // 套用远程问卷：直接用数据发送到聊天
  const handleApplyRemote = (s: RemoteSurvey) => {
    sendSurveyDataToChat(activeConversationId, {
      id: s.id,
      title: s.title,
      questions: s.questions,
    });
    setView("list");
  };

  const resetCreateForm = () => {
    setTitle("");
    setAuthor("");
    setQuestions([{ id: "q1", text: "" }]);
  };

  // 创建个人问卷（立即可用，本地存储）
  const handleCreate = () => {
    const validQuestions = questions
      .map((q) => ({ ...q, text: q.text.trim() }))
      .filter((q) => q.text);
    if (!title.trim() || !author.trim() || validQuestions.length === 0) return;
    submitSurvey(
      title.trim(),
      validQuestions.map((q) => ({
        id: q.id,
        text: q.text,
        options: q.options?.map((o) => o.trim()).filter(Boolean),
      })),
      author.trim(),
      "personal",
    );
    resetCreateForm();
    setView("list");
    setTab("mine");
  };

  // 投稿到问卷库（存入 Supabase，待审核）
  const handleSubmitToLibrary = async () => {
    const validQuestions = questions
      .map((q) => ({ ...q, text: q.text.trim() }))
      .filter((q) => q.text);
    if (!title.trim() || !author.trim() || validQuestions.length === 0) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from(PUBLIC_SURVEYS_TABLE).insert({
        title: title.trim(),
        questions: validQuestions.map((q) => ({
          id: q.id,
          text: q.text,
          options: q.options?.map((o) => o.trim()).filter(Boolean),
        })),
        author: author.trim(),
        status: "pending",
      });
      if (error) throw error;
      resetCreateForm();
      setView("list");
      setTab("library");
      fetchApproved();
    } catch (e) {
      console.warn("[问卷库] 投稿失败", e);
      alert("投稿失败，请检查网络或是否已在 Supabase 建表");
    } finally {
      setSubmitting(false);
    }
  };

  // 管理员审核通过
  const handleApproveRemote = async (id: string) => {
    try {
      const { error } = await supabase
        .from(PUBLIC_SURVEYS_TABLE)
        .update({ status: "approved", approved_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
      fetchPending();
      fetchApproved();
    } catch (e) {
      console.warn("[问卷库] 审核失败", e);
    }
  };

  // 管理员拒绝
  const handleRejectRemote = async (id: string) => {
    try {
      const { error } = await supabase
        .from(PUBLIC_SURVEYS_TABLE)
        .update({ status: "rejected" })
        .eq("id", id);
      if (error) throw error;
      fetchPending();
      fetchApproved();
    } catch (e) {
      console.warn("[问卷库] 拒绝失败", e);
    }
  };

  // 管理员删除
  const handleDeleteRemote = async (id: string) => {
    try {
      const { error } = await supabase
        .from(PUBLIC_SURVEYS_TABLE)
        .delete()
        .eq("id", id);
      if (error) throw error;
      fetchPending();
      fetchApproved();
    } catch (e) {
      console.warn("[问卷库] 删除失败", e);
    }
  };

  const handleAdminLogin = () => {
    if (adminPassword === ADMIN_PASSWORD) {
      setIsAdmin(true);
      setPasswordError(false);
      setAdminPassword("");
      try { localStorage.setItem("survey_admin_logged_in", "1"); } catch {}
    } else {
      setPasswordError(true);
    }
  };

  // 题目操作
  const addQuestion = () => {
    setQuestions((qs) => [...qs, { id: `q${Date.now()}`, text: "" }]);
  };
  const removeQuestion = (id: string) => {
    setQuestions((qs) => qs.filter((q) => q.id !== id));
  };
  const updateQuestionText = (id: string, text: string) => {
    setQuestions((qs) => qs.map((q) => (q.id === id ? { ...q, text } : q)));
  };
  const toggleChoice = (id: string) => {
    setQuestions((qs) =>
      qs.map((q) =>
        q.id === id ? { ...q, options: q.options ? undefined : ["", ""] } : q,
      ),
    );
  };
  const addOption = (id: string) => {
    setQuestions((qs) =>
      qs.map((q) =>
        q.id === id ? { ...q, options: [...(q.options || []), ""] } : q,
      ),
    );
  };
  const updateOption = (qid: string, idx: number, value: string) => {
    setQuestions((qs) =>
      qs.map((q) =>
        q.id === qid
          ? { ...q, options: q.options?.map((o, i) => (i === idx ? value : o)) }
          : q,
      ),
    );
  };
  const removeOption = (qid: string, idx: number) => {
    setQuestions((qs) =>
      qs.map((q) =>
        q.id === qid
          ? { ...q, options: q.options?.filter((_, i) => i !== idx) }
          : q,
      ),
    );
  };

  const headerTitle =
    view === "preview" ? "问卷预览" :
    view === "create" ? (tab === "mine" ? "新建问卷" : "投稿问卷") :
    view === "admin" ? "管理员审核" : "问卷";
  const headerBack =
    view === "preview" ? () => { setView("list"); setPreviewSurvey(null); } :
    view === "list" ? onBack : () => setView("list");

  return (
    <div className="flex h-full flex-col">
      <AppHeader title={headerTitle} onBack={headerBack} />
      <div className="fancy-scroll flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {/* ===== 列表视图 ===== */}
        {view === "list" && (
          <>
            {/* Tab 切换 */}
            <div
              className="flex rounded-xl p-1"
              style={{ background: "var(--card)", border: "1px solid var(--card-border)" }}
            >
              <button
                onClick={() => setTab("mine")}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-[13px] font-medium transition"
                style={{
                  background: tab === "mine" ? "var(--accent)" : "transparent",
                  color: tab === "mine" ? "var(--card)" : "var(--text-soft)",
                }}
              >
                <FileText className="h-3.5 w-3.5" />
                我的问卷
              </button>
              <button
                onClick={() => setTab("library")}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-[13px] font-medium transition"
                style={{
                  background: tab === "library" ? "var(--accent)" : "transparent",
                  color: tab === "library" ? "var(--card)" : "var(--text-soft)",
                }}
              >
                <BookOpen className="h-3.5 w-3.5" />
                问卷库
              </button>
            </div>

            {/* ===== 我的问卷 ===== */}
            {tab === "mine" && (
              <>
                <button
                  onClick={() => setView("create")}
                  className="flex w-full items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm"
                  style={{ background: "var(--accent)", color: "var(--card)" }}
                >
                  <Plus className="h-4 w-4" />
                  新建问卷
                </button>

                <div className="text-[11px]" style={{ color: "var(--text-soft)" }}>
                  我创建的问卷 · 创建后立即可用 · {mySurveys.length} 份
                </div>

                {mySurveys.length === 0 && (
                  <div
                    className="rounded-xl p-4 text-center text-[12px]"
                    style={{
                      background: "var(--card)",
                      border: "1px solid var(--card-border)",
                      color: "var(--text-soft)",
                    }}
                  >
                    还没有问卷，新建一个吧
                  </div>
                )}

                {mySurveys.map((s) => (
                  <div
                    key={s.id}
                    className="rounded-xl p-3"
                    style={{
                      background: "var(--card)",
                      border: "1px solid var(--card-border)",
                    }}
                  >
                    <div
                      className="font-serif text-sm font-bold"
                      style={{ color: "var(--text)" }}
                    >
                      {s.title}
                    </div>
                    <div
                      className="mt-1 flex items-center gap-2 text-[11px]"
                      style={{ color: "var(--text-soft)" }}
                    >
                      <span>{s.questions.length} 题</span>
                      <span>·</span>
                      <span>by {s.author}</span>
                      {s.responses && s.responses.length > 0 && (
                        <>
                          <span>·</span>
                          <span style={{ color: "var(--accent)" }}>收到 {s.responses.length} 份回答</span>
                        </>
                      )}
                    </div>
                    {s.responses && s.responses.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {s.responses.map((r, i) => (
                          <div key={i} className="rounded-lg px-2 py-1 text-[11px]" style={{ background: "color-mix(in srgb, var(--accent) 6%, transparent)", color: "var(--text)" }}>
                            <span style={{ color: "var(--accent)" }}>{r.respondent}</span>
                            {": "}
                            {r.answers.slice(0, 2).map((a, j) => {
                              const q = s.questions.find(qq => qq.id === a.questionId);
                              return <span key={j}>{j > 0 && " · "}{q?.text?.slice(0, 6)}→{a.answer}</span>;
                            })}
                            {r.answers.length > 2 && "..."}
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="mt-2 flex justify-end gap-2">
                      <button
                        onClick={() => {
                          setPreviewSurvey({
                            title: s.title,
                            author: s.author,
                            questions: s.questions,
                            onApply: () => handleApplyLocal(s.id),
                          });
                          setView("preview");
                        }}
                        className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm"
                        style={{
                          background: "transparent",
                          color: "var(--text)",
                          border: "1px solid var(--card-border)",
                        }}
                      >
                        <Eye className="h-3.5 w-3.5" />
                        预览
                      </button>
                      <button
                        onClick={() => deleteSurvey(s.id)}
                        className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm"
                        style={{
                          background: "transparent",
                          color: "var(--text-soft)",
                          border: "1px solid var(--card-border)",
                        }}
                      >
                        <Trash className="h-3.5 w-3.5" />
                        删除
                      </button>
                      <button
                        onClick={() => handleApplyLocal(s.id)}
                        className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm"
                        style={{ background: "var(--accent)", color: "var(--card)" }}
                      >
                        <Send className="h-3.5 w-3.5" />
                        套用
                      </button>
                    </div>
                  </div>
                ))}
              </>
            )}

            {/* ===== 问卷库 ===== */}
            {tab === "library" && (
              <>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setView("create")}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm"
                    style={{ background: "var(--accent)", color: "var(--card)" }}
                  >
                    <Send className="h-4 w-4" />
                    投稿问卷
                  </button>
                  <button
                    onClick={() => {
                      setIsAdmin(false);
                      setAdminPassword("");
                      setPasswordError(false);
                      try { localStorage.removeItem("survey_admin_logged_in"); } catch {}
                      setView("admin");
                    }}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition active:scale-90"
                    style={{
                      background: "var(--card)",
                      color: "var(--text-soft)",
                      border: "1px solid var(--card-border)",
                    }}
                    title="管理员审核"
                    aria-label="管理员审核"
                  >
                    <Shield className="h-4 w-4" />
                  </button>
                </div>

                <div className="text-[11px]" style={{ color: "var(--text-soft)" }}>
                  公共问卷库 · 投稿经管理员审核后展示 · {remoteApproved.length} 份
                </div>

                {libraryLoading && (
                  <div
                    className="flex items-center justify-center gap-1.5 rounded-xl p-4 text-[12px]"
                    style={{
                      background: "var(--card)",
                      border: "1px solid var(--card-border)",
                      color: "var(--text-soft)",
                    }}
                  >
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    加载中...
                  </div>
                )}

                {!libraryLoading && remoteApproved.length === 0 && (
                  <div
                    className="rounded-xl p-4 text-center text-[12px]"
                    style={{
                      background: "var(--card)",
                      border: "1px solid var(--card-border)",
                      color: "var(--text-soft)",
                    }}
                  >
                    问卷库还没有公共问卷，快来投稿吧
                  </div>
                )}

                {remoteApproved.map((s) => (
                  <div
                    key={s.id}
                    className="rounded-xl p-3"
                    style={{
                      background: "var(--card)",
                      border: "1px solid var(--card-border)",
                    }}
                  >
                    <div
                      className="font-serif text-sm font-bold"
                      style={{ color: "var(--text)" }}
                    >
                      {s.title}
                    </div>
                    <div
                      className="mt-1 flex items-center gap-2 text-[11px]"
                      style={{ color: "var(--text-soft)" }}
                    >
                      <span>{s.questions.length} 题</span>
                      <span>·</span>
                      <span>by {s.author}</span>
                    </div>
                    <div className="mt-2 flex justify-end gap-1.5">
                      <button
                        onClick={() => {
                          setPreviewSurvey({
                            title: s.title,
                            author: s.author,
                            questions: s.questions,
                            onApply: () => handleApplyRemote(s),
                          });
                          setView("preview");
                        }}
                        className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm"
                        style={{
                          background: "transparent",
                          color: "var(--text)",
                          border: "1px solid var(--card-border)",
                        }}
                      >
                        <Eye className="h-3.5 w-3.5" />
                        预览
                      </button>
                      <button
                        onClick={() => handleApplyRemote(s)}
                        className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm"
                        style={{ background: "var(--accent)", color: "var(--card)" }}
                      >
                        <Send className="h-3.5 w-3.5" />
                        套用
                      </button>
                      {isAdmin && (
                        <button
                          onClick={() => handleDeleteRemote(s.id)}
                          className="flex items-center justify-center gap-1 rounded-lg px-2 py-1.5 text-sm"
                          style={{
                            background: "transparent",
                            color: "#E53935",
                            border: "1px solid var(--card-border)",
                          }}
                        >
                          <Trash className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </>
            )}
          </>
        )}

        {/* ===== 创建/投稿表单 ===== */}
        {view === "create" && (
          <>
            <div
              className="space-y-3 rounded-xl p-3"
              style={{
                background: "var(--card)",
                border: "1px solid var(--card-border)",
              }}
            >
              <div>
                <div
                  className="mb-1 text-[11px]"
                  style={{ color: "var(--text-soft)" }}
                >
                  标题
                </div>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="给问卷起个名字"
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                  style={{
                    borderColor: "var(--card-border)",
                    background: "var(--card)",
                    color: "var(--text)",
                  }}
                />
              </div>
              <div>
                <div
                  className="mb-1 text-[11px]"
                  style={{ color: "var(--text-soft)" }}
                >
                  作者
                </div>
                <input
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder="你的名字"
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                  style={{
                    borderColor: "var(--card-border)",
                    background: "var(--card)",
                    color: "var(--text)",
                  }}
                />
              </div>
            </div>

            <div className="text-[11px]" style={{ color: "var(--text-soft)" }}>
              题目 · {questions.length}
            </div>

            {questions.map((q, idx) => (
              <div
                key={q.id}
                className="space-y-2 rounded-xl p-3"
                style={{
                  background: "var(--card)",
                  border: "1px solid var(--card-border)",
                }}
              >
                <div className="flex items-center justify-between">
                  <span
                    className="text-[11px] font-bold"
                    style={{ color: "var(--text-soft)" }}
                  >
                    第 {idx + 1} 题
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => toggleChoice(q.id)}
                      className="rounded-md px-2 py-1 text-[10px]"
                      style={{
                        background: q.options ? "var(--accent)" : "transparent",
                        color: q.options ? "var(--card)" : "var(--text-soft)",
                        border: `1px solid ${
                          q.options ? "var(--accent)" : "var(--card-border)"
                        }`,
                      }}
                    >
                      {q.options ? "选择题" : "简答题"}
                    </button>
                    {questions.length > 1 && (
                      <button
                        onClick={() => removeQuestion(q.id)}
                        className="flex h-6 w-6 items-center justify-center rounded-md"
                        style={{
                          background: "transparent",
                          color: "var(--text-soft)",
                          border: "1px solid var(--card-border)",
                        }}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
                <input
                  value={q.text}
                  onChange={(e) => updateQuestionText(q.id, e.target.value)}
                  placeholder={`题目 ${idx + 1} 的文本`}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                  style={{
                    borderColor: "var(--card-border)",
                    background: "var(--card)",
                    color: "var(--text)",
                  }}
                />
                {q.options && (
                  <div className="space-y-1.5">
                    {q.options.map((opt, i) => (
                      <div key={i} className="flex items-center gap-1">
                        <input
                          value={opt}
                          onChange={(e) => updateOption(q.id, i, e.target.value)}
                          placeholder={`选项 ${i + 1}`}
                          className="flex-1 rounded-lg border px-2.5 py-1.5 text-[12px]"
                          style={{
                            borderColor: "var(--card-border)",
                            background: "var(--card)",
                            color: "var(--text)",
                          }}
                        />
                        {q.options!.length > 1 && (
                          <button
                            onClick={() => removeOption(q.id, i)}
                            className="flex h-6 w-6 items-center justify-center rounded-md"
                            style={{
                              background: "transparent",
                              color: "var(--text-soft)",
                              border: "1px solid var(--card-border)",
                            }}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      onClick={() => addOption(q.id)}
                      className="flex items-center gap-1 rounded-md px-2 py-1 text-[10px]"
                      style={{
                        background: "transparent",
                        color: "var(--accent)",
                        border: "1px solid var(--accent)",
                      }}
                    >
                      <Plus className="h-3 w-3" />
                      添加选项
                    </button>
                  </div>
                )}
              </div>
            ))}

            <button
              onClick={addQuestion}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-sm"
              style={{
                background: "var(--card)",
                color: "var(--accent)",
                border: "1px solid var(--card-border)",
              }}
            >
              <Plus className="h-4 w-4" />
              添加题目
            </button>

            <button
              onClick={tab === "mine" ? handleCreate : handleSubmitToLibrary}
              disabled={
                submitting ||
                !title.trim() ||
                !author.trim() ||
                questions.filter((q) => q.text.trim()).length === 0
              }
              className="flex w-full items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm disabled:opacity-40"
              style={{ background: "var(--accent)", color: "var(--card)" }}
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {tab === "mine" ? "创建问卷" : "投稿到问卷库"}
            </button>
          </>
        )}

        {/* ===== 管理员审核 ===== */}
        {view === "admin" && (
          <>
            {!isAdmin ? (
              <div
                className="space-y-2 rounded-xl p-3"
                style={{
                  background: "var(--card)",
                  border: "1px solid var(--card-border)",
                }}
              >
                <div
                  className="flex items-center gap-1.5 text-[12px]"
                  style={{ color: "var(--text-soft)" }}
                >
                  <Shield className="h-3.5 w-3.5" />
                  请输入管理员密码
                </div>
                <input
                  type="password"
                  value={adminPassword}
                  onChange={(e) => {
                    setAdminPassword(e.target.value);
                    setPasswordError(false);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAdminLogin();
                  }}
                  placeholder="密码"
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                  style={{
                    borderColor: "var(--card-border)",
                    background: "var(--card)",
                    color: "var(--text)",
                  }}
                />
                {passwordError && (
                  <div className="text-[11px]" style={{ color: "#E53935" }}>
                    密码错误
                  </div>
                )}
                <button
                  onClick={handleAdminLogin}
                  className="w-full rounded-lg px-3 py-1.5 text-sm"
                  style={{ background: "var(--accent)", color: "var(--card)" }}
                >
                  进入
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <div
                    className="text-[11px]"
                    style={{ color: "var(--text-soft)" }}
                  >
                    待审核 · {remotePending.length}
                  </div>
                  <button
                    onClick={() => {
                      setIsAdmin(false);
                      try { localStorage.removeItem("survey_admin_logged_in"); } catch {}
                    }}
                    className="text-[11px]"
                    style={{ color: "var(--accent)" }}
                  >
                    退出登录
                  </button>
                </div>

                {adminLoading && (
                  <div
                    className="flex items-center justify-center gap-1.5 rounded-xl p-4 text-[12px]"
                    style={{
                      background: "var(--card)",
                      border: "1px solid var(--card-border)",
                      color: "var(--text-soft)",
                    }}
                  >
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    加载中...
                  </div>
                )}

                {!adminLoading && remotePending.length === 0 && (
                  <div
                    className="rounded-xl p-4 text-center text-[12px]"
                    style={{
                      background: "var(--card)",
                      border: "1px solid var(--card-border)",
                      color: "var(--text-soft)",
                    }}
                  >
                    没有待审核的问卷
                  </div>
                )}

                {remotePending.map((s) => (
                  <div
                    key={s.id}
                    className="space-y-2 rounded-xl p-3"
                    style={{
                      background: "var(--card)",
                      border: "1px solid var(--card-border)",
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div
                        className="font-serif text-sm font-bold"
                        style={{ color: "var(--text)" }}
                      >
                        {s.title}
                      </div>
                      <span
                        className="rounded-full px-2 py-0.5 text-[10px]"
                        style={{
                          background:
                            "color-mix(in srgb, var(--accent) 15%, transparent)",
                          color: "var(--accent)",
                        }}
                      >
                        待审核
                      </span>
                    </div>
                    <div
                      className="text-[11px]"
                      style={{ color: "var(--text-soft)" }}
                    >
                      by {s.author} · {s.questions.length} 题
                    </div>
                    <div className="space-y-1">
                      {s.questions.map((q, i) => (
                        <div
                          key={q.id}
                          className="text-[12px]"
                          style={{ color: "var(--text)" }}
                        >
                          {i + 1}. {q.text}
                          {q.options && q.options.length > 0 && (
                            <span
                              className="ml-1 text-[11px]"
                              style={{ color: "var(--text-soft)" }}
                            >
                              （{q.options.join(" / ")}）
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => handleApproveRemote(s.id)}
                        className="flex flex-1 items-center justify-center gap-1 rounded-lg px-2 py-1.5 text-[12px]"
                        style={{
                          background: "var(--accent)",
                          color: "var(--card)",
                        }}
                      >
                        <Check className="h-3.5 w-3.5" />
                        通过
                      </button>
                      <button
                        onClick={() => handleRejectRemote(s.id)}
                        className="flex flex-1 items-center justify-center gap-1 rounded-lg px-2 py-1.5 text-[12px]"
                        style={{
                          background: "transparent",
                          color: "var(--text)",
                          border: "1px solid var(--card-border)",
                        }}
                      >
                        <X className="h-3.5 w-3.5" />
                        拒绝
                      </button>
                      <button
                        onClick={() => handleDeleteRemote(s.id)}
                        className="flex items-center justify-center gap-1 rounded-lg px-2 py-1.5 text-[12px]"
                        style={{
                          background: "transparent",
                          color: "#E53935",
                          border: "1px solid var(--card-border)",
                        }}
                      >
                        <Trash className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </>
            )}
          </>
        )}

        {/* ===== 问卷预览 ===== */}
        {view === "preview" && previewSurvey && (
              <div
                className="rounded-xl p-4 space-y-3"
                style={{
                  background: "var(--card)",
                  border: "1px solid var(--card-border)",
                }}
              >
                <div>
                  <div
                    className="font-serif text-base font-bold"
                    style={{ color: "var(--text)" }}
                  >
                    📋 {previewSurvey.title}
                  </div>
                  <div
                    className="mt-1 flex items-center gap-2 text-[11px]"
                    style={{ color: "var(--text-soft)" }}
                  >
                    <span>共 {previewSurvey.questions.length} 题</span>
                    <span>·</span>
                    <span>by {previewSurvey.author}</span>
                  </div>
                </div>

                <div
                  className="space-y-2.5 rounded-lg p-3"
                  style={{
                    background:
                      "color-mix(in srgb, var(--text) 3%, transparent)",
                    border:
                      "1px dashed color-mix(in srgb, var(--card-border) 70%, transparent)",
                  }}
                >
                  {previewSurvey.questions.map((q, i) => (
                    <div key={q.id} className="space-y-1">
                      <div
                        className="text-[13px] font-medium"
                        style={{ color: "var(--text)" }}
                      >
                        <span
                          className="mr-1.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px]"
                          style={{
                            background:
                              "color-mix(in srgb, var(--accent) 18%, transparent)",
                            color: "var(--accent)",
                          }}
                        >
                          {i + 1}
                        </span>
                        {q.text}
                      </div>
                      {q.options && q.options.length > 0 ? (
                        <div className="pl-6.5 space-y-1 ml-6">
                          {q.options.map((opt, oi) => (
                            <div
                              key={oi}
                              className="flex items-center gap-1.5 text-[12px]"
                              style={{ color: "var(--text-soft)" }}
                            >
                              <span
                                className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px]"
                                style={{
                                  border:
                                    "1px solid color-mix(in srgb, var(--card-border) 80%, transparent)",
                                  color: "var(--text-soft)",
                                }}
                              >
                                {String.fromCharCode(65 + oi)}
                              </span>
                              {opt}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div
                          className="ml-6 rounded-md px-2 py-1 text-[11px]"
                          style={{
                            color: "var(--text-soft)",
                            background:
                              "color-mix(in srgb, var(--card-border) 30%, transparent)",
                          }}
                        >
                          ✍️ 简答题（自由填写文字回答）
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => {
                      setView("list");
                      setPreviewSurvey(null);
                    }}
                    className="flex flex-1 items-center justify-center gap-1 rounded-lg px-3 py-2 text-sm"
                    style={{
                      background: "transparent",
                      color: "var(--text)",
                      border: "1px solid var(--card-border)",
                    }}
                  >
                    <X className="h-3.5 w-3.5" />
                    返回
                  </button>
                  {previewSurvey.onApply && (
                    <button
                      onClick={() => {
                        previewSurvey.onApply?.();
                        setPreviewSurvey(null);
                      }}
                      className="flex flex-1 items-center justify-center gap-1 rounded-lg px-3 py-2 text-sm"
                      style={{
                        background: "var(--accent)",
                        color: "var(--card)",
                      }}
                    >
                      <Send className="h-3.5 w-3.5" />
                      直接套用
                    </button>
                  )}
                </div>
              </div>
            )}
      </div>
    </div>
  );
}
