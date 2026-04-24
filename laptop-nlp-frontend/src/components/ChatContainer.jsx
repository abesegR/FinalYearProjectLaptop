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

// --- Helpers: Session ID + Message Management ---
const SESSION_KEY = "laptop_chat_session_id";

const TECH_BITS = Object.freeze([
  {
    id: "nvme",
    title: "NVMe > SATA (usually)",
    body: "For day-to-day speed (boot, apps, projects), an NVMe SSD feels snappier than a SATA SSDâ€”especially with large files.",
    icon: HardDrive,
    tags: ["Storage", "Speed"],
  },
  {
    id: "ram-dual",
    title: "Dual-channel RAM matters",
    body: "2Ã—8GB often beats 1Ã—16GB for integrated graphics and overall responsiveness. Ask for dual-channel if possible.",
    icon: MemoryStick,
    tags: ["RAM", "iGPU"],
  },
  {
    id: "gpu-tgp",
    title: "GPU name â‰  GPU power",
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
    body: "USBâ€‘C with Power Delivery + DisplayPort is a huge quality-of-life win. Dongles are the tax you pay otherwise.",
    icon: Lightbulb,
    tags: ["Ports", "Workflow"],
  },
  {
    id: "weight",
    title: "Portability is physics",
    body: "Under ~1.5kg feels genuinely portable. Over ~2.2kg is a backpack commitmentâ€”especially with a charger.",
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

const getSessionId = () => createNewSessionId();

const makeMessage = (sender, text) => ({
  id: crypto.randomUUID(),
  sender,
  text,
});

const getAssistantText = (payload) =>
  payload?.reply || payload?.assistantMessage || payload?.message || "";

const ChatContainer = () => {
  const [sessionId, setSessionId] = useState(getSessionId);

  // State
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [techBit, setTechBit] = useState(() => pickRandom(TECH_BITS));
  const [collectorScores, setCollectorScores] = useState(null);

  // Ref for auto-scrolling
  const messagesEndRef = useRef(null);
  const bootstrappedSessionRef = useRef(null);

  // Auto-scroll to bottom whenever messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  useEffect(() => {
    if (bootstrappedSessionRef.current === sessionId) return;
    bootstrappedSessionRef.current = sessionId;

    const loadOpeningTurn = async () => {
      setIsTyping(true);
      try {
        const res = await fetch("http://localhost:8080/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, message: "" }),
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data = await res.json();
        const assistantText = getAssistantText(data);
        setMessages(assistantText ? [makeMessage("assistant", assistantText)] : []);

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

  // Shuffle the left panel "random tech" when the conversation moves
  useEffect(() => {
    setTechBit((prev) => pickRandom(TECH_BITS, prev?.id));
  }, [messages.length]);

  // --- Core Logic: Send Message ---
  const sendMessage = async (textOverride = null) => {
    const textToSend = textOverride || input;
    if (!textToSend.trim()) return;

    // 1. Add User Message immediately
    setMessages((prev) => [...prev, makeMessage("user", textToSend)]);
    setInput("");
    setIsTyping(true);

    try {
      // 2. Call your existing Backend API
      const res = await fetch("http://localhost:8080/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, message: textToSend }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      const assistantText = getAssistantText(data);

      // 3. Add Assistant Reply
      if (assistantText) {
        setMessages((prev) => [...prev, makeMessage("assistant", assistantText)]);
      }

      if (data.collectorScores && typeof data.collectorScores === "object") {
        setCollectorScores(data.collectorScores);
      } else {
        setCollectorScores(null);
      }
    } catch {
      // Error handling
      setMessages((prev) => [
        ...prev,
        makeMessage(
          "assistant",
          "âš ï¸ Server error. Is the backend running on port 8080?"
        ),
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  // Handle Enter key
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
    setTechBit(pickRandom(TECH_BITS));
  };

  // --- Render UI ---
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
            onClick={() => setTechBit((prev) => pickRandom(TECH_BITS, prev?.id))}
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
            <p className="card-text">{techBit?.body ?? "â€”"}</p>
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
        {/* HEADER */}
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

        {/* CHAT MESSAGES AREA */}
        <div className="messages-area">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`message-row ${msg.sender === "user" ? "user-row" : "bot-row"}`}
            >
              {/* Bot Avatar */}
              {msg.sender === "assistant" && (
                <div className="avatar bot-avatar">
                  <Bot size={16} color="#60a5fa" />
                </div>
              )}

              {/* Message Bubble */}
              <div
                className={`message-bubble ${msg.sender === "user" ? "user-bubble" : "bot-bubble"}`}
              >
                <p>{msg.text}</p>
              </div>

              {/* User Avatar */}
              {msg.sender === "user" && (
                <div className="avatar user-avatar">
                  <User size={16} color="#c7d2fe" />
                </div>
              )}
            </div>
          ))}

          {/* Typing Indicator Bubble */}
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
          <div ref={messagesEndRef} />
        </div>

        {/* INPUT AREA */}
        <div className="input-area">
          {/* Quick Reply Chips */}
          {!isTyping && messages.length < 5 && (
            <div className="chips-container">
              {[
                { label: "Gaming Laptop ðŸŽ®", action: () => sendMessage("Gaming Laptop ðŸŽ®") },
                { label: "Student Budget ðŸŽ“", action: () => sendMessage("Student Budget ðŸŽ“") },
                { label: "Programming ðŸ’»", action: () => sendMessage("Programming ðŸ’»") },
                { label: "Reset Chat ðŸ”„", action: handleReset },
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
              <div className="panel-subtitle">Auto-scored (0â€“10)</div>
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
                  {collectorScores?.maxPrice ? `$${collectorScores.maxPrice}` : "â€”"}
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
                      {value === null ? "â€”" : `${value}/10`}
                    </div>
                  </div>
                  <div className="weight-bar">
                    <div className="weight-fill" style={{ ["--w"]: `${pct}%` }} />
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

