import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import {
  Cpu,
  HardDrive,
  MemoryStick,
  Send,
  Sparkles,
  Zap,
  ChevronDown,
  ChevronUp,
  Star,
  ArrowLeft,
  Gauge,
} from "lucide-react";

const SESSION_KEY = "laptop_chat_session_id";
const API_BASE_URL = "http://localhost:8080";
const getAuthHeaders = () => {
  const token = localStorage.getItem("laptopai_token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const ASPECT_ICONS = {
  performance: "⚡",
  battery: "🔋",
  thermals: "🌡️",
  value: "💰",
  build_quality: "🏗️",
};
const LABEL_COLORS = {
  Excellent: {
    bg: "rgba(78,222,163,0.12)",
    text: "#4edea3",
    border: "rgba(78,222,163,0.25)",
  },
  Good: {
    bg: "rgba(192,193,255,0.12)",
    text: "#c0c1ff",
    border: "rgba(192,193,255,0.25)",
  },
  Mixed: {
    bg: "rgba(251,191,36,0.12)",
    text: "#fbbf24",
    border: "rgba(251,191,36,0.25)",
  },
  Poor: {
    bg: "rgba(248,113,113,0.12)",
    text: "#f87171",
    border: "rgba(248,113,113,0.25)",
  },
};
const RANK_COLORS = ["#ffd700", "#c0c0c0", "#cd7f32", "#c0c1ff", "#ddb7ff"];
const WEIGHTS_CONFIG = [
  { key: "cpuWeight", label: "Performance", color: "#c0c1ff" },
  { key: "gpuWeight", label: "Graphics", color: "#ddb7ff" },
  { key: "ramWeight", label: "Multitasking", color: "#4edea3" },
  { key: "batteryWeight", label: "Battery", color: "#8083ff" },
];

const clamp01 = (n) => Math.max(0, Math.min(1, n));
const createNewSessionId = () => {
  const id = crypto.randomUUID();
  localStorage.setItem(SESSION_KEY, id);
  return id;
};
const getSessionId = () =>
  localStorage.getItem(SESSION_KEY) || createNewSessionId();
const makeMessage = (sender, text) => ({
  id: crypto.randomUUID(),
  sender,
  text,
});
const getAssistantText = (p) =>
  p?.reply || p?.assistantMessage || p?.message || "";

const AnimatedNumber = ({ value }) => {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let start = 0;
    const inc = value / 20;
    const t = setInterval(() => {
      start += inc;
      if (start >= value) {
        setDisplay(value);
        clearInterval(t);
      } else setDisplay(Math.round(start));
    }, 30);
    return () => clearInterval(t);
  }, [value]);
  return <span>{display}/10</span>;
};

const SentimentPanel = ({ sentiment }) => {
  if (!sentiment)
    return (
      <div
        style={{
          fontSize: "0.75rem",
          color: "#464554",
          padding: "8px 0",
          fontStyle: "italic",
        }}
      >
        No review data available.
      </div>
    );
  const aspects = sentiment.aspects || {};
  const overall = sentiment.overall ?? 0;
  const sources = sentiment.sources || [];
  const overallPct = Math.round(clamp01((overall + 1) / 2) * 100);
  return (
    <div
      style={{
        marginTop: 12,
        paddingTop: 12,
        borderTop: "1px solid rgba(255,255,255,0.06)",
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          fontSize: "0.65rem",
          fontWeight: 600,
          color: "#908fa0",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
        }}
      >
        <Star size={11} />
        <span>Review Sentiment</span>
        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <div
            style={{
              width: 50,
              height: 3,
              borderRadius: 999,
              background: "rgba(255,255,255,0.05)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${overallPct}%`,
                background: "linear-gradient(90deg,#c0c1ff,#4edea3)",
                borderRadius: "inherit",
              }}
            />
          </div>
          <span
            style={{ fontSize: "0.65rem", color: "#4edea3", fontWeight: 600 }}
          >
            {overallPct}%
          </span>
        </div>
      </div>
      {Object.entries(aspects).map(([key, val]) => {
        const colors = LABEL_COLORS[val.label] || LABEL_COLORS.Mixed;
        const pct = Math.round(clamp01((val.score + 1) / 2) * 100);
        return (
          <div
            key={key}
            style={{ display: "flex", flexDirection: "column", gap: 3 }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span
                style={{
                  fontSize: "0.7rem",
                  color: "#c7c4d7",
                  textTransform: "capitalize",
                }}
              >
                {ASPECT_ICONS[key]} {key.replace("_", " ")}
              </span>
              <span
                style={{
                  fontSize: "0.6rem",
                  fontWeight: 600,
                  padding: "1px 6px",
                  borderRadius: 999,
                  background: colors.bg,
                  color: colors.text,
                  border: `1px solid ${colors.border}`,
                }}
              >
                {val.label}
              </span>
            </div>
            <div
              style={{
                height: 3,
                background: "rgba(255,255,255,0.05)",
                borderRadius: 999,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${pct}%`,
                  background: colors.text,
                  opacity: 0.75,
                  borderRadius: "inherit",
                }}
              />
            </div>
            {val.snippet && (
              <div
                style={{
                  fontSize: "0.67rem",
                  color: "#464554",
                  fontStyle: "italic",
                }}
              >
                "{val.snippet}"
              </div>
            )}
          </div>
        );
      })}
      {sources.length > 0 && (
        <div
          style={{
            fontSize: "0.62rem",
            color: "#464554",
            paddingTop: 4,
            borderTop: "1px solid rgba(255,255,255,0.05)",
          }}
        >
          Sources: {sources.join(", ")}
        </div>
      )}
    </div>
  );
};

export default function ChatContainer() {
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [sessionId, setSessionId] = useState(getSessionId);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [collectorScores, setCollectorScores] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [expandedCard, setExpandedCard] = useState(null);
  const messagesEndRef = useRef(null);
  const bootstrappedRef = useRef(null);
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    setTimeout(() => setVisible(true), 50);
  }, []);
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping, recommendations]);

  useEffect(() => {
    if (bootstrappedRef.current === sessionId) return;
    bootstrappedRef.current = sessionId;
    const init = async () => {
      setIsTyping(true);
      try {
        const res = await fetch(`${API_BASE_URL}/chat`, {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({ sessionId, message: "" }),
        });
        if (res.status === 401) {
          localStorage.removeItem("laptopai_token");
          navigate("/login");
          return;
        }
        if (res.status === 429) {
          const error = await res.json().catch(() => ({}));
          setMessages([
            makeMessage(
              "assistant",
              error.message || "Too many requests. Please wait a moment and try again.",
            ),
          ]);
          return;
        }
        const data = await res.json();
        const text = getAssistantText(data);
        setMessages(text ? [makeMessage("assistant", text)] : []);
        if (data.collectorScores) setCollectorScores(data.collectorScores);
      } catch {
        setMessages([]);
      } finally {
        setIsTyping(false);
      }
    };
    init();
  }, [sessionId]);

  useEffect(() => {
    const close = () => setProfileOpen(false);
    if (profileOpen) document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [profileOpen]);

  const sendMessage = async (textOverride = null) => {
    const text = textOverride || input;
    if (!text.trim()) return;
    setMessages((prev) => [...prev, makeMessage("user", text)]);
    setInput("");
    setIsTyping(true);
    try {
      const res = await fetch(`${API_BASE_URL}/chat`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ sessionId, message: text }),
      });
      if (res.status === 401) {
        localStorage.removeItem("laptopai_token");
        navigate("/login");
        return;
      }
      if (res.status === 429) {
        const error = await res.json().catch(() => ({}));
        setMessages((prev) => [
          ...prev,
          makeMessage(
            "assistant",
            error.message || "Too many requests. Please wait a moment and try again.",
          ),
        ]);
        return;
      }
      const data = await res.json();
      const assistantText = getAssistantText(data);
      if (assistantText)
        setMessages((prev) => [
          ...prev,
          makeMessage("assistant", assistantText),
        ]);
      if (data.collectorScores) setCollectorScores(data.collectorScores);
      if (
        Array.isArray(data.recommendations) &&
        data.recommendations.length > 0
      ) {
        setRecommendations(data.recommendations);
        setExpandedCard(null);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        makeMessage(
          "assistant",
          "Server error. Check backend is running on port 8080.",
        ),
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleReset = () => {
    setMessages([]);
    setInput("");
    setCollectorScores(null);
    setRecommendations([]);
    setExpandedCard(null);
    setSessionId(createNewSessionId());
  };

  const goBack = () => {
    setLeaving(true);
    setTimeout(() => navigate("/"), 500);
  };

  const showRecommendationLoading =
    isTyping && messages.some((msg) => msg.sender === "user");

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600&display=swap');
        *{margin:0;padding:0;box-sizing:border-box;}
        html,body,#root{height:100%;overflow:hidden;}
        body{background:radial-gradient(circle at 50% 50%,#131b2e 0%,#0b1326 100%);color:#dae2fd;font-family:'Inter',sans-serif;}
        .chat-root{height:100vh;display:flex;flex-direction:column;overflow:hidden;opacity:0;transform:translateY(12px);transition:opacity 0.45s ease,transform 0.45s ease;}
        .chat-root.visible{opacity:1;transform:translateY(0);}
        .chat-root.leaving{opacity:0;transform:translateY(-12px);}
        .msgs-scroll{flex:1;overflow-y:auto;padding:1.5rem 1rem;display:flex;flex-direction:column;gap:1.25rem;scroll-behavior:smooth;}
        .msgs-scroll::-webkit-scrollbar{width:4px;}
        .msgs-scroll::-webkit-scrollbar-thumb{background:rgba(192,193,255,0.15);border-radius:4px;}
        .sidebar-scroll{overflow-y:auto;flex:1;}
        .sidebar-scroll::-webkit-scrollbar{width:3px;}
        .sidebar-scroll::-webkit-scrollbar-thumb{background:rgba(192,193,255,0.1);border-radius:3px;}
        .msg-in{animation:msgIn 0.3s ease;}
        @keyframes msgIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        .typing-dot{width:6px;height:6px;border-radius:50%;background:#c0c1ff;display:inline-block;animation:td 1.3s ease-in-out infinite;}
        .typing-dot:nth-child(2){animation-delay:0.15s}.typing-dot:nth-child(3){animation-delay:0.3s}
        @keyframes td{0%,60%,100%{transform:translateY(0);opacity:0.4}30%{transform:translateY(-5px);opacity:1}}
        .chip-btn{padding:0.35rem 0.9rem;border-radius:999px;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.04);color:#c7c4d7;font-family:'Inter',sans-serif;font-size:0.75rem;font-weight:500;cursor:pointer;transition:all 0.2s;white-space:nowrap;}
        .chip-btn:hover{border-color:rgba(192,193,255,0.4);color:#c0c1ff;background:rgba(192,193,255,0.08);}
        .send-btn{width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,#8083ff,#ddb7ff);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#1000a9;transition:transform 0.2s,opacity 0.2s;flex-shrink:0;}
        .send-btn:hover:not(:disabled){transform:scale(1.08)}.send-btn:disabled{opacity:0.3;cursor:not-allowed;}
        .review-btn{display:flex;align-items:center;gap:4px;font-size:0.68rem;font-weight:500;color:#c0c1ff;background:rgba(192,193,255,0.08);border:1px solid rgba(192,193,255,0.2);border-radius:6px;padding:3px 8px;cursor:pointer;transition:all 0.2s;font-family:'Inter',sans-serif;}
        .review-btn:hover{background:rgba(192,193,255,0.15);}
        .laptop-card{background:rgba(23,31,51,0.6);border:1px solid rgba(255,255,255,0.08);border-radius:14px;padding:12px 14px;transition:border-color 0.2s;backdrop-filter:blur(12px);}
        .laptop-card:hover{border-color:rgba(192,193,255,0.2);}
        .laptop-card.expanded{border-color:rgba(192,193,255,0.3);}
        .wfill{height:100%;border-radius:inherit;transition:width 0.5s cubic-bezier(0.4,0,0.2,1);}
        .score-fill{height:100%;border-radius:inherit;background:linear-gradient(90deg,#8083ff,#4edea3);transition:width 0.5s cubic-bezier(0.4,0,0.2,1);}
        .nav-btn{background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);color:#908fa0;cursor:pointer;font-family:'Inter',sans-serif;border-radius:8px;transition:all 0.2s;}
        .nav-btn:hover{border-color:rgba(192,193,255,0.3);color:#c0c1ff;}
        @keyframes loadbar{from{width:0}to{width:100%}}
        @keyframes scan{0%{transform:translateX(-100%)}100%{transform:translateX(220%)}}
        .analysis-line{position:relative;height:5px;border-radius:999px;background:rgba(255,255,255,0.06);overflow:hidden;}
        .analysis-line::after{content:"";position:absolute;inset:0;width:45%;border-radius:inherit;background:linear-gradient(90deg,transparent,rgba(192,193,255,0.8),transparent);animation:scan 1.25s ease-in-out infinite;}
        @media (max-width: 980px){
          .work-area{flex-direction:column;}
          .left-score-pane{width:100% !important;max-height:32vh;border-right:none !important;border-bottom:1px solid rgba(255,255,255,0.07);}
          .chat-pane{min-height:45vh;}
          .recommendation-pane{width:100% !important;max-height:44vh;border-left:none !important;border-top:1px solid rgba(255,255,255,0.07);}
        }
      `}</style>

      {/* Transition overlay */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 9999,
          background: "#0b1326",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: "1rem",
          opacity: leaving ? 1 : 0,
          pointerEvents: leaving ? "all" : "none",
          transition: "opacity 0.4s ease",
        }}
      >
        <div
          style={{
            fontFamily: "'Space Grotesk',sans-serif",
            fontSize: "2rem",
            fontWeight: 700,
            color: "#fff",
          }}
        >
          LaptopAI
        </div>
        <div
          style={{
            width: 180,
            height: 3,
            borderRadius: 999,
            background: "rgba(255,255,255,0.08)",
            overflow: "hidden",
          }}
        >
          {leaving && (
            <div
              style={{
                height: "100%",
                borderRadius: 999,
                background: "linear-gradient(90deg,#c0c1ff,#ddb7ff)",
                animation: "loadbar 0.5s ease forwards",
              }}
            />
          )}
        </div>
      </div>

      {/* Bg glows */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: -1,
          pointerEvents: "none",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: "20%",
            right: "-5%",
            width: 500,
            height: 500,
            background:
              "radial-gradient(circle,rgba(128,131,255,0.08),transparent 70%)",
            borderRadius: "50%",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: "-10%",
            left: "-10%",
            width: 400,
            height: 400,
            background:
              "radial-gradient(circle,rgba(192,193,255,0.05),transparent 70%)",
            borderRadius: "50%",
          }}
        />
      </div>

      <div
        className={`chat-root ${visible ? "visible" : ""} ${leaving ? "leaving" : ""}`}
      >
        {/* HEADER */}
        <header
          style={{
            flexShrink: 0,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "0 1.5rem",
            height: 60,
            background: "rgba(9,11,18,0.6)",
            backdropFilter: "blur(12px)",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
            boxShadow: "0 0 20px rgba(99,102,241,0.08)",
            overflow: "visible",
          }}
        >
          <div
            style={{ display: "flex", alignItems: "center", gap: "1.25rem" }}
          >
            <button
              className="nav-btn"
              onClick={goBack}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                padding: "0.35rem 0.75rem",
                fontSize: "0.8rem",
              }}
            >
              <ArrowLeft size={14} /> Back
            </button>
            <span
              style={{
                fontFamily: "'Space Grotesk',sans-serif",
                fontSize: "1.2rem",
                fontWeight: 700,
                letterSpacing: "-0.02em",
                background: "linear-gradient(135deg,#c0c1ff,#ddb7ff)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              LaptopAI
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            {/* Profile dropdown */}
            <div
              style={{ position: "relative" }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className="nav-btn"
                onClick={() => setProfileOpen((o) => !o)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "0.35rem 0.75rem",
                  fontSize: "0.78rem",
                }}
              >
                <div
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: "50%",
                    background: "linear-gradient(135deg,#8083ff,#ddb7ff)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.65rem",
                    fontWeight: 700,
                    color: "#1000a9",
                  }}
                >
                  {(localStorage.getItem("laptopai_username") ||
                    "U")[0].toUpperCase()}
                </div>
                {localStorage.getItem("laptopai_username") || "User"}
              </button>

              {profileOpen &&
                createPortal(
                  <div
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      position: "fixed",
                      right: "70px",
                      top: "74px",
                      width: 220,
                      background: "#171f33",
                      border: "1px solid rgba(255,255,255,0.15)",
                      borderRadius: 12,
                      padding: "0.5rem",
                      zIndex: 99999,
                      boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
                    }}
                  >
                    <div
                      style={{
                        padding: "0.6rem 0.75rem",
                        borderBottom: "1px solid rgba(255,255,255,0.08)",
                        marginBottom: "0.25rem",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "0.8rem",
                          fontWeight: 600,
                          color: "#ffffff",
                        }}
                      >
                        {localStorage.getItem("laptopai_username")}
                      </div>
                      <div
                        style={{
                          fontSize: "0.7rem",
                          color: "#908fa0",
                          marginTop: 2,
                        }}
                      >
                        {localStorage.getItem("laptopai_email")}
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        localStorage.removeItem("laptopai_token");
                        localStorage.removeItem("laptopai_username");
                        localStorage.removeItem("laptopai_email");
                        navigate("/login");
                      }}
                      style={{
                        width: "100%",
                        padding: "0.6rem 0.75rem",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "#f87171",
                        fontSize: "0.8rem",
                        textAlign: "left",
                        borderRadius: 8,
                        fontFamily: "'Inter',sans-serif",
                      }}
                    >
                      Sign Out
                    </button>
                  </div>,
                  document.body,
                )}
            </div>
            <button
              className="nav-btn"
              onClick={handleReset}
              style={{ padding: "0.35rem 0.9rem", fontSize: "0.78rem" }}
            >
              New Chat
            </button>
          </div>
        </header>

        {/* BODY */}
        <div
          className="work-area"
          style={{ flex: 1, display: "flex", overflow: "hidden", minHeight: 0 }}
        >
          {/* SCORE SIDEBAR */}
          <aside
            className="left-score-pane"
            style={{
              width: 280,
              flexShrink: 0,
              display: "flex",
              flexDirection: "column",
              background: "rgba(17,23,41,0.46)",
              backdropFilter: "blur(24px)",
              borderRight: "1px solid rgba(255,255,255,0.07)",
              overflow: "hidden",
            }}
          >
            <div
              className="sidebar-scroll"
              style={{ flex: 1, padding: "1.25rem" }}
            >
              <div style={{ marginBottom: "1.5rem" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: "1rem",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "'Space Grotesk',sans-serif",
                      fontSize: "0.65rem",
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: "0.18em",
                      color: "#c0c1ff",
                    }}
                  >
                    Preference Scores
                  </span>
                  <Gauge size={13} style={{ color: "#464554" }} />
                </div>

                <div
                  style={{
                    marginBottom: "1rem",
                    padding: "0.6rem 0.85rem",
                    background: "rgba(255,255,255,0.03)",
                    borderRadius: 10,
                    border: "1px solid rgba(255,255,255,0.06)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span
                    style={{
                      fontSize: "0.68rem",
                      color: "#908fa0",
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      fontWeight: 500,
                    }}
                  >
                    Budget
                  </span>
                  <span
                    style={{
                      fontSize: "0.95rem",
                      fontWeight: 700,
                      color: "#c0c1ff",
                      fontFamily: "'Space Grotesk',sans-serif",
                    }}
                  >
                    {collectorScores?.maxPrice
                      ? `Rs. ${Number(collectorScores.maxPrice).toLocaleString()}`
                      : "—"}
                  </span>
                </div>

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.85rem",
                  }}
                >
                  {WEIGHTS_CONFIG.map(({ key, label, color }) => {
                    const raw = collectorScores?.[key];
                    const val =
                      typeof raw === "number" && Number.isFinite(raw)
                        ? raw
                        : null;
                    const pct = Math.round(clamp01((val ?? 0) / 10) * 100);
                    return (
                      <div key={key}>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            marginBottom: 5,
                          }}
                        >
                          <span
                            style={{
                              fontSize: "0.72rem",
                              color: "#94a3b8",
                              fontWeight: 500,
                            }}
                          >
                            {label}
                          </span>
                          <span
                            style={{
                              fontSize: "0.72rem",
                              color,
                              fontWeight: 600,
                            }}
                          >
                            {val === null ? "—" : <AnimatedNumber value={val} />}
                          </span>
                        </div>
                        <div
                          style={{
                            height: 5,
                            background: "rgba(255,255,255,0.05)",
                            borderRadius: 999,
                            overflow: "hidden",
                          }}
                        >
                          <div
                            className="wfill"
                            style={{
                              width: `${pct}%`,
                              background: color,
                              opacity: 0.8,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div
                style={{
                  height: 1,
                  background: "rgba(255,255,255,0.05)",
                  marginBottom: "1.25rem",
                }}
              />

              <div>
                <span
                  style={{
                    fontFamily: "'Space Grotesk',sans-serif",
                    fontSize: "0.65rem",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.18em",
                    color: "#c0c1ff",
                    display: "block",
                    marginBottom: "0.85rem",
                  }}
                >
                  Quick Tips
                </span>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.55rem",
                  }}
                >
                  {[
                    "Match CPU class to your workload",
                    "For gaming/ML, prioritize GPU + cooling",
                    "16GB RAM is the modern sweet spot",
                    "512GB SSD minimum for big apps",
                  ].map((tip, i) => (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        gap: 8,
                        fontSize: "0.78rem",
                        color: "#c7c4d7",
                        lineHeight: 1.5,
                      }}
                    >
                      <span
                        style={{
                          color: "#c0c1ff",
                          flexShrink: 0,
                          marginTop: 1,
                        }}
                      >
                        ·
                      </span>
                      {tip}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </aside>

          {/* CHAT */}
          <div
            className="chat-pane"
            style={{
              flex: 1,
              display: "flex",
              justifyContent: "center",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: "100%",
                maxWidth: 740,
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
              }}
            >
              {/* Messages scroll area */}
              <div className="msgs-scroll">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className="msg-in"
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems:
                        msg.sender === "user" ? "flex-end" : "flex-start",
                    }}
                  >
                    {msg.sender === "assistant" && (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 5,
                          marginBottom: 5,
                        }}
                      >
                        <Sparkles size={11} style={{ color: "#c0c1ff" }} />
                        <span
                          style={{
                            fontFamily: "'Space Grotesk',sans-serif",
                            fontSize: "0.6rem",
                            fontWeight: 600,
                            textTransform: "uppercase",
                            letterSpacing: "0.18em",
                            color: "rgba(192,193,255,0.5)",
                          }}
                        >
                          LaptopAI
                        </span>
                      </div>
                    )}
                    <div
                      style={{
                        maxWidth: "82%",
                        padding: "0.875rem 1.1rem",
                        borderRadius:
                          msg.sender === "user"
                            ? "16px 16px 4px 16px"
                            : "16px 16px 16px 4px",
                        background:
                          msg.sender === "user"
                            ? "rgba(45,52,73,0.9)"
                            : "rgba(23,31,51,0.7)",
                        border:
                          msg.sender === "user"
                            ? "1px solid rgba(255,255,255,0.07)"
                            : "1px solid rgba(192,193,255,0.12)",
                        borderLeft:
                          msg.sender === "assistant"
                            ? "2px solid #8083ff"
                            : undefined,
                        backdropFilter: "blur(20px)",
                        fontSize: "0.9rem",
                        lineHeight: 1.65,
                        color: "#dae2fd",
                        boxShadow: "0 4px 20px rgba(0,0,0,0.25)",
                      }}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))}

                {isTyping && (
                  <div
                    className="msg-in"
                    style={{ display: "flex", alignItems: "center" }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 5,
                        padding: "0.75rem 1rem",
                        borderRadius: "16px 16px 16px 4px",
                        background: "rgba(23,31,51,0.7)",
                        border: "1px solid rgba(192,193,255,0.12)",
                        borderLeft: "2px solid #8083ff",
                        backdropFilter: "blur(20px)",
                      }}
                    >
                      <span className="typing-dot" />
                      <span className="typing-dot" />
                      <span className="typing-dot" />
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* INPUT */}
              <div style={{ flexShrink: 0, padding: "0.75rem 1rem 1rem" }}>
                <div
                  style={{
                    background: "rgba(23,31,51,0.6)",
                    backdropFilter: "blur(24px)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 999,
                    padding: "0.4rem 0.4rem 0.4rem 1.25rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    boxShadow: "0 0 20px rgba(128,131,255,0.08)",
                  }}
                >
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                    placeholder="Type a message..."
                    style={{
                      flex: 1,
                      background: "transparent",
                      border: "none",
                      outline: "none",
                      color: "#dae2fd",
                      fontFamily: "'Inter',sans-serif",
                      fontSize: "0.9rem",
                    }}
                  />
                  <button
                    className="send-btn"
                    onClick={() => sendMessage()}
                    disabled={!input.trim() || isTyping}
                  >
                    <Send size={17} />
                  </button>
                </div>
                <p
                  style={{
                    textAlign: "center",
                    fontSize: "0.6rem",
                    color: "#2d3449",
                    marginTop: "0.5rem",
                    letterSpacing: "0.04em",
                  }}
                >
                  Powered by Claude AI · Weighted Scoring Algorithm · © R.
                  Abeseg AS2022930
                </p>
              </div>
            </div>
          </div>

          {/* RECOMMENDATIONS PANEL */}
          <aside
            className="recommendation-pane"
            style={{
              width: 520,
              flexShrink: 0,
              display: "flex",
              flexDirection: "column",
              background: "rgba(17,23,41,0.5)",
              backdropFilter: "blur(24px)",
              borderLeft: "1px solid rgba(255,255,255,0.07)",
              overflow: "hidden",
            }}
          >
            <div
              className="sidebar-scroll"
              style={{ flex: 1, padding: "1.25rem" }}
            >
              <div style={{ marginBottom: "1.35rem" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: "0.85rem",
                  }}
                >
                  <div>
                    <span
                      style={{
                        fontFamily: "'Space Grotesk',sans-serif",
                        fontSize: "0.72rem",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.16em",
                        color: "#c0c1ff",
                        display: "block",
                      }}
                    >
                      Recommendations
                    </span>
                    <span
                      style={{
                        fontSize: "0.72rem",
                        color: "#5f6680",
                        marginTop: 3,
                        display: "block",
                      }}
                    >
                      Matches appear here while the chat stays focused.
                    </span>
                  </div>
                  <Sparkles size={16} style={{ color: "#ddb7ff" }} />
                </div>

                {showRecommendationLoading && (
                  <div
                    style={{
                      padding: "0.9rem",
                      borderRadius: 12,
                      background: "rgba(23,31,51,0.65)",
                      border: "1px solid rgba(192,193,255,0.14)",
                      marginBottom: "0.85rem",
                    }}
                  >
                    {[
                      "Finding laptops",
                      "Scoring performance fit",
                      "Doing sentiment analysis",
                    ].map((step, i) => (
                      <div
                        key={step}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "140px 1fr",
                          alignItems: "center",
                          gap: 10,
                          marginBottom: i === 2 ? 0 : 9,
                        }}
                      >
                        <span
                          style={{
                            fontSize: "0.72rem",
                            color: i === 0 ? "#dae2fd" : "#908fa0",
                            fontWeight: 600,
                          }}
                        >
                          {step}
                        </span>
                        <div className="analysis-line" />
                      </div>
                    ))}
                  </div>
                )}

                {!isTyping && recommendations.length === 0 && (
                  <div
                    style={{
                      padding: "1rem",
                      borderRadius: 12,
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.06)",
                      color: "#908fa0",
                      fontSize: "0.78rem",
                      lineHeight: 1.55,
                    }}
                  >
                    Once I know your workload, budget, and portability needs,
                    the best laptop matches will show up here.
                  </div>
                )}

                {recommendations.length > 0 && (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 10,
                    }}
                  >
                    {recommendations.map((laptop, i) => {
                      const match = Math.round((laptop.score ?? 0) * 100);
                      return (
                        <div
                          key={i}
                          className={`laptop-card ${expandedCard === i ? "expanded" : ""}`}
                        >
                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns: "1fr 142px",
                              gap: 16,
                              alignItems: "start",
                              marginBottom: 8,
                            }}
                          >
                            <div>
                              <span
                                style={{
                                  fontFamily: "'Space Grotesk',sans-serif",
                                  fontSize: "0.68rem",
                                  fontWeight: 700,
                                  color: RANK_COLORS[i],
                                  display: "block",
                                  marginBottom: 4,
                                }}
                              >
                                #{i + 1}
                              </span>
                              <div
                                style={{
                                  fontSize: "0.9rem",
                                  fontWeight: 600,
                                  color: "#dae2fd",
                                  lineHeight: 1.35,
                                  fontFamily: "'Space Grotesk',sans-serif",
                                }}
                              >
                                {laptop.name}
                              </div>
                            </div>

                            <div
                              style={{
                                justifySelf: "end",
                                width: "100%",
                              }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                  marginBottom: 5,
                                }}
                              >
                                <span
                                  style={{
                                    fontSize: "0.64rem",
                                    color: "#908fa0",
                                    textTransform: "uppercase",
                                    letterSpacing: "0.08em",
                                    fontWeight: 700,
                                  }}
                                >
                                  Match
                                </span>
                                <span
                                  style={{
                                    fontSize: "0.9rem",
                                    color: "#4edea3",
                                    fontWeight: 700,
                                  }}
                                >
                                  {match}%
                                </span>
                              </div>
                              <div
                                style={{
                                  height: 8,
                                  borderRadius: 999,
                                  background: "rgba(255,255,255,0.07)",
                                  overflow: "hidden",
                                }}
                              >
                                <div
                                  className="score-fill"
                                  style={{ width: `${match}%` }}
                                />
                              </div>
                            </div>
                          </div>

                          <div
                            style={{
                              display: "flex",
                              flexWrap: "wrap",
                              gap: 4,
                              marginBottom: 8,
                            }}
                          >
                            {[
                              { icon: <Cpu size={9} />, text: laptop.cpu },
                              {
                                icon: <MemoryStick size={9} />,
                                text: `${laptop.ram}GB RAM`,
                              },
                              {
                                icon: <HardDrive size={9} />,
                                text: `${laptop.storage}GB SSD`,
                              },
                              laptop.gpu && laptop.gpu.trim() !== ""
                                ? { icon: <Zap size={9} />, text: laptop.gpu }
                                : null,
                            ]
                              .filter(Boolean)
                              .map((spec, j) => (
                                <span
                                  key={j}
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 3,
                                    fontSize: "0.65rem",
                                    color: "#c7c4d7",
                                    background: "rgba(255,255,255,0.04)",
                                    border: "1px solid rgba(255,255,255,0.07)",
                                    padding: "2px 6px",
                                    borderRadius: 5,
                                  }}
                                >
                                  {spec.icon}
                                  {spec.text}
                                </span>
                              ))}
                          </div>

                          <div style={{ marginBottom: 9 }}>
                            <span
                              style={{
                                fontFamily: "'Space Grotesk',sans-serif",
                                fontSize: "1rem",
                                fontWeight: 700,
                                color: "#c0c1ff",
                              }}
                            >
                              Rs.{" "}
                              {laptop.bestPriceLkr
                                ? Math.round(
                                    laptop.bestPriceLkr,
                                  ).toLocaleString()
                                : "N/A"}
                            </span>
                            <span
                              style={{
                                marginLeft: 8,
                                fontSize: "0.62rem",
                                color: laptop.anyInStock ? "#4edea3" : "#f87171",
                                background: laptop.anyInStock
                                  ? "rgba(78,222,163,0.1)"
                                  : "rgba(248,113,113,0.1)",
                                border: laptop.anyInStock
                                  ? "1px solid rgba(78,222,163,0.2)"
                                  : "1px solid rgba(248,113,113,0.2)",
                                padding: "1px 7px",
                                borderRadius: 999,
                              }}
                            >
                              {laptop.anyInStock ? "Available" : "Out of Stock"}
                            </span>
                          </div>

                          {Array.isArray(laptop.whereToBuy) &&
                            laptop.whereToBuy.length > 0 && (
                              <div style={{ marginBottom: 8 }}>
                                <div
                                  style={{
                                    fontSize: "0.6rem",
                                    color: "#908fa0",
                                    textTransform: "uppercase",
                                    letterSpacing: "0.08em",
                                    marginBottom: 5,
                                    fontWeight: 600,
                                  }}
                                >
                                  Where to Buy
                                </div>
                                <div
                                  style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: 4,
                                  }}
                                >
                                  {laptop.whereToBuy.map((site, si) => (
                                    <a
                                      key={si}
                                      href={site.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      style={{
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                        padding: "5px 8px",
                                        borderRadius: 7,
                                        border:
                                          "1px solid rgba(255,255,255,0.06)",
                                        background: "rgba(255,255,255,0.03)",
                                        textDecoration: "none",
                                        opacity: site.inStock ? 1 : 0.4,
                                        transition:
                                          "opacity 0.2s, border-color 0.2s",
                                      }}
                                      onMouseEnter={(e) => {
                                        if (site.inStock)
                                          e.currentTarget.style.borderColor =
                                            "rgba(192,193,255,0.3)";
                                      }}
                                      onMouseLeave={(e) =>
                                        (e.currentTarget.style.borderColor =
                                          "rgba(255,255,255,0.06)")
                                      }
                                    >
                                      <div
                                        style={{
                                          display: "flex",
                                          alignItems: "center",
                                          gap: 6,
                                        }}
                                      >
                                        <span
                                          style={{
                                            fontSize: "0.7rem",
                                            fontWeight: 600,
                                            color: "#dae2fd",
                                          }}
                                        >
                                          {site.site}
                                        </span>
                                        <span
                                          style={{
                                            fontSize: "0.58rem",
                                            color: site.inStock
                                              ? "#4edea3"
                                              : "#f87171",
                                            fontWeight: 600,
                                          }}
                                        >
                                          {site.inStock
                                            ? "In Stock"
                                            : "Out of Stock"}
                                        </span>
                                      </div>
                                      <span
                                        style={{
                                          fontSize: "0.72rem",
                                          fontWeight: 700,
                                          color: "#c0c1ff",
                                          fontFamily:
                                            "'Space Grotesk',sans-serif",
                                        }}
                                      >
                                        Rs. {site.priceLkr?.toLocaleString()}
                                      </span>
                                    </a>
                                  ))}
                                </div>
                              </div>
                            )}

                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              gap: 8,
                            }}
                          >
                            <button
                              className="chip-btn"
                              onClick={() =>
                                sendMessage(`Tell me more about #${i + 1}`)
                              }
                            >
                              About #{i + 1}
                            </button>
                            <button
                              className="review-btn"
                              onClick={() =>
                                setExpandedCard(expandedCard === i ? null : i)
                              }
                            >
                              {expandedCard === i ? (
                                <>
                                  <ChevronUp size={11} /> Hide
                                </>
                              ) : (
                                <>
                                  <ChevronDown size={11} /> Reviews
                                </>
                              )}
                            </button>
                          </div>
                          {expandedCard === i && (
                            <SentimentPanel sentiment={laptop.sentiment} />
                          )}
                        </div>
                      );
                    })}

                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "0.5rem",
                        marginTop: 2,
                      }}
                    >
                      <button
                        className="chip-btn"
                        onClick={() => sendMessage("I need more RAM")}
                      >
                        Need more RAM
                      </button>
                      <button
                        className="chip-btn"
                        onClick={() => sendMessage("I need a better GPU")}
                      >
                        Better GPU
                      </button>
                      <button
                        className="chip-btn"
                        onClick={() => sendMessage("Increase my budget")}
                      >
                        Change budget
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* SIDEBAR FOOTER */}
            <div
              style={{
                flexShrink: 0,
                padding: "0.85rem 1.25rem",
                borderTop: "1px solid rgba(255,255,255,0.05)",
                background: "rgba(0,0,0,0.15)",
              }}
            >
              <p
                style={{
                  fontSize: "0.65rem",
                  color: "#2d3449",
                  lineHeight: 1.6,
                  textAlign: "center",
                }}
              >
                Powered by Claude AI + Weighted Scoring Algorithm
              </p>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
