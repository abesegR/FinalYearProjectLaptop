import React, { useEffect, useRef, useState } from "react";
import {
  Battery,
  Bot,
  Cpu,
  Gauge,
  HardDrive,
  Lightbulb,
  MemoryStick,
  RefreshCw,
  Scale,
  Send,
  Sparkles,
  TrendingUp,
  User,
  Weight,
  Zap,
} from "lucide-react";
import "../styles/chat.css";

const SESSION_KEY = "laptop_chat_session_id";
const API_BASE_URL = "http://localhost:8080";

const TECH_BITS = Object.freeze([
  {
    id: "nvme",
    title: "NVMe > SATA (usually)",
    body: "For day-to-day speed (boot, apps, projects), an NVMe SSD feels snappier than a SATA SSD, especially with large files.",
    icon: HardDrive,
    tags: ["Storage", "Speed"],
  },
  {
    id: "ram-dual",
    title: "Dual-channel RAM matters",
    body: "2x8GB often beats 1x16GB for integrated graphics and overall responsiveness. Ask for dual-channel if possible.",
    icon: MemoryStick,
    tags: ["RAM", "iGPU"],
  },
  {
    id: "gpu-tgp",
    title: "GPU name != GPU power",
    body: "An RTX 4060 can perform very differently across laptops depending on TGP/thermals. Same label, different beast.",
    icon: Zap,
    tags: ["GPU", "Thermals"],
  },
  {
    id: "cpu-suffix",
    title: "CPU suffix cheat code",
    body: "Intel: U/P = efficiency, H/HX = performance. AMD: U = efficient, HS/H = faster but warmer. Choose based on portability.",
    icon: Cpu,
    tags: ["CPU", "Battery"],
  },
  {
    id: "screen-nits",
    title: "Brightness = usability",
    body: "Look for ~300 nits minimum. If you work near windows, 400+ nits is the comfy zone.",
    icon: Gauge,
    tags: ["Display", "Comfort"],
  },
  {
    id: "battery-real",
    title: "Battery claims are optimistic",
    body: "Real-life battery depends on screen brightness, CPU class, and GPU usage. Efficient CPUs + 60Hz screens usually last longer.",
    icon: Battery,
    tags: ["Battery", "Reality check"],
  },
  {
    id: "ports",
    title: "Ports save your sanity",
    body: "USB-C with Power Delivery + DisplayPort is a huge quality-of-life win. Dongles are the tax you pay otherwise.",
    icon: Lightbulb,
    tags: ["Ports", "Workflow"],
  },
  {
    id: "weight",
    title: "Portability is physics",
    body: "Under ~1.5kg feels genuinely portable. Over ~2.2kg is a backpack commitment, especially with a charger.",
    icon: Weight,
    tags: ["Portability", "Weight"],
  },
  {
    id: "cooling",
    title: "Cooling = performance",
    body: "If cooling is weak, the laptop will throttle. Reviews that mention sustained performance and fan noise are gold.",
    icon: TrendingUp,
    tags: ["Thermals", "Sustained load"],
  },
]);

const clamp01 = (n) => Math.max(0, Math.min(1, n));

const pickRandom = (items, excludeId = null) => {
  if (!items.length) return null;
  const pool = excludeId ? items.filter((x) => x.id !== excludeId) : items;
  const list = pool.length ? pool : items;
  return list[Math.floor(Math.random() * list.length)];
};

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

const getAssistantText = (payload) =>
  payload?.reply || payload?.assistantMessage || payload?.message || "";

const RANK_COLORS = ["#ffd700", "#c0c0c0", "#cd7f32", "#60a5fa", "#a78bfa"];

const ChatContainer = () => {
  const [sessionId, setSessionId] = useState(getSessionId);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [techBit, setTechBit] = useState(() => pickRandom(TECH_BITS));
  const [collectorScores, setCollectorScores] = useState(null);
  const [recommendations, setRecommendations] = useState([]);

  const messagesEndRef = useRef(null);
  const bootstrappedSessionRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping, recommendations]);

  useEffect(() => {
    if (bootstrappedSessionRef.current === sessionId) return;
    bootstrappedSessionRef.current = sessionId;

    const loadOpeningTurn = async () => {
      setIsTyping(true);
      try {
        const res = await fetch(`${API_BASE_URL}/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, message: "" }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const assistantText = getAssistantText(data);
        setMessages(
          assistantText ? [makeMessage("assistant", assistantText)] : [],
        );
        if (data.collectorScores && typeof data.collectorScores === "object") {
          setCollectorScores(data.collectorScores);
        } else {
          setCollectorScores(null);
        }
      } catch {
        setMessages([]);
        setCollectorScores(null);
      } finally {
        setIsTyping(false);
      }
    };

    loadOpeningTurn();
  }, [sessionId]);

  useEffect(() => {
    setTechBit((prev) => pickRandom(TECH_BITS, prev?.id));
  }, [messages.length]);

  const sendMessage = async (textOverride = null) => {
    const textToSend = textOverride || input;
    if (!textToSend.trim()) return;

    setMessages((prev) => [...prev, makeMessage("user", textToSend)]);
    setInput("");
    setIsTyping(true);

    try {
      const res = await fetch(`${API_BASE_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, message: textToSend }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const assistantText = getAssistantText(data);

      if (assistantText) {
        setMessages((prev) => [
          ...prev,
          makeMessage("assistant", assistantText),
        ]);
      }
      if (data.collectorScores && typeof data.collectorScores === "object") {
        setCollectorScores(data.collectorScores);
      } else {
        setCollectorScores(null);
      }
      if (
        Array.isArray(data.recommendations) &&
        data.recommendations.length > 0
      ) {
        setRecommendations(data.recommendations);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        makeMessage(
          "assistant",
          "Server error. Check whether the backend is running on port 8080.",
        ),
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleReset = () => {
    setIsTyping(false);
    setInput("");
    setMessages([]);
    setSessionId(createNewSessionId());
    setCollectorScores(null);
    setRecommendations([]);
    setTechBit(pickRandom(TECH_BITS));
  };

  return (
    <div className="chat-layout">
      {/* LEFT: Random Tech */}
      <aside className="side-panel left-panel">
        <div className="panel-header">
          <div className="panel-header-left">
            <div className="panel-icon">
              <Sparkles size={18} />
            </div>
            <div>
              <div className="panel-title">Tech Sparks</div>
              <div className="panel-subtitle">Random but useful</div>
            </div>
          </div>
          <button
            type="button"
            className="panel-icon-button"
            onClick={() =>
              setTechBit((prev) => pickRandom(TECH_BITS, prev?.id))
            }
            aria-label="Shuffle tech tip"
            title="Shuffle"
            disabled={TECH_BITS.length < 2}
          >
            <RefreshCw size={16} />
          </button>
        </div>

        <div className="panel-body">
          <div className="panel-card">
            <div className="card-title-row">
              <div className="card-title">{techBit?.title ?? "Tech tip"}</div>
              {techBit?.icon ? (
                <techBit.icon className="card-icon" size={16} />
              ) : null}
            </div>
            <p className="card-text">{techBit?.body ?? "-"}</p>
            {techBit?.tags?.length ? (
              <div className="tag-row">
                {techBit.tags.map((tag) => (
                  <span key={tag} className="tag-pill">
                    {tag}
                  </span>
                ))}
              </div>
            ) : null}
          </div>

          <div className="panel-card">
            <div className="card-title-row">
              <div className="card-title">Mini checklist</div>
              <Scale className="card-icon" size={16} />
            </div>
            <ul className="checklist">
              <li>Match CPU class to your workload.</li>
              <li>For gaming/ML, prioritize GPU + cooling.</li>
              <li>16GB RAM is the modern sweet spot.</li>
              <li>512GB SSD minimum if you install big apps.</li>
            </ul>
          </div>
        </div>
      </aside>

      {/* CENTER: Chat */}
      <div className="chat-container">
        <header className="chat-header">
          <div className="bot-icon-wrapper">
            <Bot size={24} color="#fff" />
          </div>
          <div className="header-info">
            <h1 className="bot-name">LaptopAI</h1>
            <div className="status-indicator">
              <span className="status-dot"></span>
              <span className="status-text">Online & Ready</span>
            </div>
          </div>
        </header>

        <div className="messages-area">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`message-row ${msg.sender === "user" ? "user-row" : "bot-row"}`}
            >
              {msg.sender === "assistant" && (
                <div className="avatar bot-avatar">
                  <Bot size={16} color="#60a5fa" />
                </div>
              )}
              <div
                className={`message-bubble ${msg.sender === "user" ? "user-bubble" : "bot-bubble"}`}
              >
                <p>{msg.text}</p>
              </div>
              {msg.sender === "user" && (
                <div className="avatar user-avatar">
                  <User size={16} color="#c7d2fe" />
                </div>
              )}
            </div>
          ))}

          {isTyping && (
            <div className="message-row bot-row">
              <div className="avatar bot-avatar">
                <Bot size={16} color="#60a5fa" />
              </div>
              <div className="message-bubble bot-bubble typing-bubble">
                <span className="dot"></span>
                <span className="dot"></span>
                <span className="dot"></span>
              </div>
            </div>
          )}

          {/* Recommendations Section */}
          {recommendations.length > 0 && (
            <div className="recommendations-section">
              <div className="recommendations-header">
                <Sparkles size={16} />
                <span>Top Picks For You</span>
              </div>
              <div className="recommendations-grid">
                {recommendations.map((laptop, i) => (
                  <div key={i} className="laptop-card">
                    <div className="laptop-card-top">
                      <div
                        className="laptop-rank"
                        style={{ color: RANK_COLORS[i] }}
                      >
                        #{i + 1}
                      </div>
                      <div className="laptop-score">
                        {Math.round((laptop.score ?? 0) * 100)}% match
                      </div>
                    </div>
                    <div className="laptop-name">{laptop.name}</div>
                    <div className="laptop-specs">
                      <span>
                        <Cpu size={11} /> {laptop.cpu}
                      </span>
                      <span>
                        <MemoryStick size={11} /> {laptop.ram}GB RAM
                      </span>
                      <span>
                        <HardDrive size={11} /> {laptop.storage}GB SSD
                      </span>
                      {laptop.gpu && laptop.gpu.trim() !== "" && (
                        <span>
                          <Zap size={11} /> {laptop.gpu}
                        </span>
                      )}
                    </div>
                    <div className="laptop-price">
                      ${laptop.price?.toFixed(0)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <div className="input-area">
          {!isTyping && messages.length < 5 && (
            <div className="chips-container">
              {[
                {
                  label: "Gaming Laptop 🎮",
                  action: () => sendMessage("Gaming Laptop"),
                },
                {
                  label: "Student Budget 💸",
                  action: () => sendMessage("Student Budget"),
                },
                {
                  label: "Programming 💻",
                  action: () => sendMessage("Programming"),
                },
                { label: "Reset Chat 🔄", action: handleReset },
              ].map((chip) => (
                <button
                  key={chip.label}
                  onClick={chip.action}
                  className="chip-button"
                >
                  {chip.label}
                </button>
              ))}
            </div>
          )}

          <div className="input-wrapper">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your message..."
              className="chat-input"
            />
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || isTyping}
              className="send-button"
            >
              <Send size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* RIGHT: Preference Scores */}
      <aside className="side-panel right-panel">
        <div className="panel-header">
          <div className="panel-header-left">
            <div className="panel-icon">
              <Scale size={18} />
            </div>
            <div>
              <div className="panel-title">Preference Scores</div>
              <div className="panel-subtitle">Auto-scored (0-10)</div>
            </div>
          </div>
        </div>

        <div className="panel-body">
          <div className="panel-card">
            <div className="card-title-row">
              <div className="card-title">Your profile</div>
              <Scale className="card-icon" size={16} />
            </div>

            <div className="spec-grid">
              <div className="spec-row">
                <div className="spec-label">
                  <Gauge size={14} /> Budget
                </div>
                <div className="spec-value">
                  {collectorScores?.maxPrice
                    ? `$${collectorScores.maxPrice}`
                    : "-"}
                </div>
              </div>
            </div>

            {[
              { key: "cpuWeight", label: "Performance", icon: Cpu },
              { key: "gpuWeight", label: "Graphics", icon: Zap },
              { key: "ramWeight", label: "Multitasking", icon: MemoryStick },
              { key: "batteryWeight", label: "Battery", icon: Battery },
            ].map(({ key, label, icon }) => {
              const Icon = icon;
              const rawValue = collectorScores?.[key];
              const value =
                typeof rawValue === "number" && Number.isFinite(rawValue)
                  ? rawValue
                  : null;
              const pct = Math.round(clamp01((value ?? 0) / 10) * 100);

              return (
                <div key={key} className="weight-row">
                  <div className="weight-top">
                    <div className="weight-label">
                      <Icon size={14} /> {label}
                    </div>
                    <div className="weight-value">
                      {value === null ? "-" : `${value}/10`}
                    </div>
                  </div>
                  <div className="weight-bar">
                    <div
                      className="weight-fill"
                      style={{ ["--w"]: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <button
            type="button"
            className="panel-button secondary"
            onClick={handleReset}
            disabled={isTyping}
          >
            Reset chat
          </button>
        </div>
      </aside>
    </div>
  );
};

export default ChatContainer;
