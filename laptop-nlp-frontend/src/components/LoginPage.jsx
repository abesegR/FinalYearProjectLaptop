import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE_URL = "http://localhost:8080";

export default function LoginPage() {
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setTimeout(() => setVisible(true), 50);
  }, []);

  // If already logged in, redirect to chat
  useEffect(() => {
    if (localStorage.getItem("laptopai_token")) navigate("/chat");
  }, []);

  const goTo = (path) => {
    setLeaving(true);
    setTimeout(() => navigate(path), 500);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    if (!email.trim() || !password.trim()) {
      setError("All fields are required.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem("laptopai_token", data.token);
        localStorage.setItem("laptopai_username", data.username);
        localStorage.setItem("laptopai_email", data.email);
        goTo("/chat");
      } else {
        setError(data.message || "Login failed.");
      }
    } catch {
      setError("Cannot connect to server. Check backend is running.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600&display=swap');
        *{margin:0;padding:0;box-sizing:border-box;}
        html,body,#root{height:100%;overflow:hidden;}
        body{background:radial-gradient(circle at 50% 50%,#131b2e 0%,#0b1326 100%);color:#dae2fd;font-family:'Inter',sans-serif;}
        .auth-root{height:100vh;display:flex;align-items:center;justify-content:center;opacity:0;transform:translateY(12px);transition:opacity 0.45s ease,transform 0.45s ease;position:relative;}
        .auth-root.visible{opacity:1;transform:translateY(0);}
        .auth-root.leaving{opacity:0;transform:translateY(-12px);}
        .auth-card{width:100%;max-width:420px;background:rgba(23,31,51,0.5);backdrop-filter:blur(24px);border:1px solid rgba(255,255,255,0.1);border-radius:24px;padding:2.5rem;box-shadow:0 8px 32px rgba(0,0,0,0.4);position:relative;z-index:1;}
        .auth-label{display:block;font-size:0.72rem;font-weight:600;color:#908fa0;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px;}
        .auth-input{width:100%;background:rgba(6,14,32,0.6);border:1px solid rgba(255,255,255,0.1);border-radius:10px;padding:0.75rem 1rem;color:#dae2fd;font-family:'Inter',sans-serif;font-size:0.9rem;outline:none;transition:border-color 0.2s;}
        .auth-input:focus{border-color:rgba(192,193,255,0.4);}
        .auth-input::placeholder{color:#464554;}
        .auth-btn{width:100%;padding:0.85rem;border-radius:12px;border:none;background:linear-gradient(135deg,#8083ff,#ddb7ff);color:#1000a9;font-family:'Space Grotesk',sans-serif;font-weight:700;font-size:0.95rem;cursor:pointer;transition:opacity 0.2s,transform 0.15s;letter-spacing:0.02em;}
        .auth-btn:hover:not(:disabled){opacity:0.9;transform:scale(1.01);}
        .auth-btn:disabled{opacity:0.5;cursor:not-allowed;}
        .auth-link{color:#c0c1ff;background:none;border:none;cursor:pointer;font-family:'Inter',sans-serif;font-size:0.875rem;font-weight:500;text-decoration:underline;text-underline-offset:2px;transition:color 0.2s;}
        .auth-link:hover{color:#ddb7ff;}
        .auth-error{background:rgba(248,113,113,0.1);border:1px solid rgba(248,113,113,0.25);border-radius:8px;padding:0.65rem 0.9rem;font-size:0.82rem;color:#f87171;margin-bottom:1rem;}
        @keyframes loadbar{from{width:0}to{width:100%}}
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
          zIndex: 0,
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: "-20%",
            left: "-10%",
            width: 500,
            height: 500,
            background:
              "radial-gradient(circle,rgba(128,131,255,0.1),transparent 70%)",
            borderRadius: "50%",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "-20%",
            right: "-10%",
            width: 400,
            height: 400,
            background:
              "radial-gradient(circle,rgba(221,183,255,0.08),transparent 70%)",
            borderRadius: "50%",
          }}
        />
      </div>

      <div
        className={`auth-root ${visible ? "visible" : ""} ${leaving ? "leaving" : ""}`}
      >
        <div className="auth-card">
          {/* Logo */}
          <div style={{ textAlign: "center", marginBottom: "2rem" }}>
            <div
              style={{
                fontFamily: "'Space Grotesk',sans-serif",
                fontSize: "1.75rem",
                fontWeight: 700,
                background: "linear-gradient(135deg,#c0c1ff,#ddb7ff)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                marginBottom: 6,
              }}
            >
              LaptopAI
            </div>
            <div style={{ fontSize: "0.85rem", color: "#908fa0" }}>
              Sign in to your account
            </div>
          </div>

          {error && <div className="auth-error">{error}</div>}

          <form
            onSubmit={handleLogin}
            style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}
          >
            <div>
              <label className="auth-label">Email</label>
              <input
                className="auth-input"
                type="email"
                placeholder="you@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>
            <div>
              <label className="auth-label">Password</label>
              <input
                className="auth-input"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>

            <button
              className="auth-btn"
              type="submit"
              disabled={loading}
              style={{ marginTop: "0.5rem" }}
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <div
            style={{
              textAlign: "center",
              marginTop: "1.5rem",
              fontSize: "0.875rem",
              color: "#908fa0",
            }}
          >
            Don't have an account?{" "}
            <button className="auth-link" onClick={() => goTo("/register")}>
              Create one
            </button>
          </div>

          <div style={{ textAlign: "center", marginTop: "0.75rem" }}>
            <button
              className="auth-link"
              style={{ fontSize: "0.8rem", color: "#464554" }}
              onClick={() => goTo("/")}
            >
              ← Back to home
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
