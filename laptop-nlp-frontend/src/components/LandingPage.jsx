import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const LandingPage = () => {
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(t);
  }, []);

  const goToChat = () => {
    setLeaving(true);
    setTimeout(() => navigate("/chat"), 600);
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { background: #0b1326; color: #dae2fd; }

        .landing-root {
          min-height: 100vh; background: #0b1326; color: #dae2fd;
          font-family: 'Inter', sans-serif;
          opacity: 0; transform: translateY(16px);
          transition: opacity 0.5s ease, transform 0.5s ease;
        }
        .landing-root.visible { opacity: 1; transform: translateY(0); }
        .landing-root.leaving { opacity: 0; transform: translateY(-16px); }

        .ln-overlay {
          position: fixed; inset: 0; z-index: 9999; background: #0b1326;
          display: flex; align-items: center; justify-content: center;
          flex-direction: column; gap: 1rem;
          opacity: 0; pointer-events: none; transition: opacity 0.4s ease;
        }
        .ln-overlay.active { opacity: 1; pointer-events: all; }
        .ln-overlay-logo { font-family: 'Space Grotesk', sans-serif; font-size: 2rem; font-weight: 700; color: #fff; }
        .ln-overlay-bar { width: 180px; height: 3px; border-radius: 999px; background: rgba(255,255,255,0.08); overflow: hidden; }
        .ln-overlay-fill { height: 100%; border-radius: 999px; background: linear-gradient(90deg,#6366f1,#a855f7); animation: loadbar 0.55s ease forwards; }
        @keyframes loadbar { from{width:0} to{width:100%} }

        .ln-nav {
          position: fixed; top: 0; width: 100%; z-index: 50;
          border-bottom: 1px solid rgba(255,255,255,0.1);
          background: rgba(2,6,23,0.6); backdrop-filter: blur(12px);
          box-shadow: 0 8px 32px rgba(0,0,0,0.37);
        }
        .ln-nav-inner {
          display: flex; justify-content: space-between; align-items: center;
          padding: 0 2rem; height: 80px; max-width: 1280px; margin: 0 auto;
        }
        .ln-logo { font-family: 'Space Grotesk',sans-serif; font-size: 1.5rem; font-weight: 700; color: #f8fafc; letter-spacing: -0.02em; }
        .ln-nav-links { display: flex; align-items: center; gap: 2rem; }
        .ln-nav-link { color: #94a3b8; text-decoration: none; font-size: 0.875rem; font-weight: 500; transition: color 0.2s; }
        .ln-nav-link:hover { color: #a5b4fc; }
        .ln-nav-link.active { color: #818cf8; border-bottom: 2px solid #6366f1; padding-bottom: 4px; }
        .ln-nav-login { color: #94a3b8; background: none; border: none; cursor: pointer; font-size: 0.875rem; font-family: 'Inter',sans-serif; transition: color 0.2s; }
        .ln-nav-login:hover { color: #fff; }
        .ln-btn-primary {
          background: linear-gradient(135deg,#6366f1,#a855f7); color: #fff; border: none; font-weight: 600;
          padding: 0.6rem 1.5rem; border-radius: 999px; cursor: pointer;
          font-family: 'Inter',sans-serif; font-size: 0.875rem;
          transition: opacity 0.2s, transform 0.15s;
          box-shadow: 0 0 30px -5px rgba(128,131,255,0.5);
        }
        .ln-btn-primary:hover { opacity: 0.9; transform: scale(1.03); }

        .ln-hero {
          position: relative; padding: 140px 2rem 80px;
          max-width: 1280px; margin: 0 auto;
          display: grid; grid-template-columns: 1fr 1fr;
          gap: 4rem; align-items: center; overflow: hidden;
        }
        .ln-hero-glow1 { position:absolute;top:-10%;left:-10%;width:40%;height:40%;background:radial-gradient(circle,rgba(128,131,255,0.15)0%,transparent 70%);border-radius:50%;pointer-events:none; }
        .ln-hero-glow2 { position:absolute;bottom:20%;right:-5%;width:30%;height:30%;background:radial-gradient(circle,rgba(111,0,190,0.1)0%,transparent 70%);border-radius:50%;pointer-events:none; }
        .ln-hero-badge {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 6px 14px; border-radius: 999px;
          border: 1px solid rgba(192,193,255,0.25); background: rgba(192,193,255,0.05);
          color: #c0c1ff; font-size: 0.7rem; font-weight: 600;
          text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 1.5rem;
        }
        .ln-badge-dot { width:8px;height:8px;border-radius:50%;background:#c0c1ff;animation:pulse 2s infinite; }
        @keyframes pulse { 0%,100%{opacity:1}50%{opacity:0.4} }
        .ln-hero-title {
          font-family: 'Space Grotesk',sans-serif;
          font-size: clamp(2.5rem,5vw,4rem); font-weight: 700;
          line-height: 1.1; letter-spacing: -0.02em; color: #fff; margin-bottom: 1.5rem;
        }
        .ln-hero-gradient { background:linear-gradient(135deg,#c0c1ff,#ddb7ff);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text; }
        .ln-hero-sub { font-size: 1.05rem; color: #c7c4d7; line-height: 1.7; max-width: 500px; margin-bottom: 2.5rem; }
        .ln-hero-btns { display: flex; gap: 1rem; flex-wrap: wrap; }
        .ln-btn-cta {
          background: linear-gradient(135deg,#4f47d8,#7c3aed); color: #fff;
          font-family: 'Space Grotesk',sans-serif; font-weight: 600; font-size: 1rem;
          padding: 1rem 2.5rem; border-radius: 12px; border: none; cursor: pointer;
          transition: transform 0.15s, opacity 0.2s;
          box-shadow: 0 0 30px -5px rgba(128,131,255,0.5);
        }
        .ln-btn-cta:hover { transform: scale(1.03); opacity: 0.95; }
        .ln-btn-glass {
          background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.12);
          color: #fff; font-weight: 600; padding: 1rem 2.5rem; border-radius: 12px;
          cursor: pointer; font-family: 'Space Grotesk',sans-serif; font-size: 1rem; transition: background 0.2s;
        }
        .ln-btn-glass:hover { background: rgba(255,255,255,0.1); }

        .ln-chat-card {
          background: rgba(255,255,255,0.03); backdrop-filter: blur(12px);
          border: 1px solid rgba(255,255,255,0.12); border-radius: 24px;
          padding: 1.5rem; position: relative; z-index: 1;
          box-shadow: 0 20px 60px rgba(0,0,0,0.4); transition: border-color 0.25s, box-shadow 0.25s;
        }
        .ln-chat-card:hover { border-color: rgba(192,193,255,0.3); box-shadow: 0 0 20px rgba(128,131,255,0.15); }
        .ln-chat-header { display:flex;align-items:center;gap:12px;padding-bottom:1rem;margin-bottom:1rem;border-bottom:1px solid rgba(255,255,255,0.08); }
        .ln-chat-avatar { width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,#c0c1ff,#ddb7ff);display:flex;align-items:center;justify-content:center;color:#1000a9;font-weight:700;font-size:0.8rem; }
        .ln-chat-name { font-size:0.875rem;font-weight:600;color:#fff; }
        .ln-chat-status { font-size:0.72rem;color:#908fa0; }
        .ln-msg-user { background:rgba(45,52,73,0.8);border-radius:16px;border-top-right-radius:4px;padding:0.75rem 1rem;font-size:0.875rem;color:#dae2fd;margin-bottom:0.75rem;max-width:85%;margin-left:auto; }
        .ln-msg-bot { background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:16px;border-top-left-radius:4px;padding:0.75rem 1rem;font-size:0.875rem;color:#dae2fd;margin-bottom:0.75rem;max-width:85%; }
        .ln-msg-label { font-size:0.65rem;font-weight:700;color:#c0c1ff;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:4px; }
        .ln-chat-input { display:flex;align-items:center;gap:8px;margin-top:0.5rem; }
        .ln-chat-input input { flex:1;background:rgba(6,14,32,0.5);border:1px solid rgba(255,255,255,0.1);border-radius:999px;padding:0.65rem 1.25rem;color:#fff;font-size:0.85rem;outline:none;font-family:'Inter',sans-serif; }
        .ln-chat-input input::placeholder { color:#464554; }
        .ln-chat-send { width:36px;height:36px;border-radius:50%;background:rgba(128,131,255,0.3);border:none;cursor:pointer;color:#fff;display:flex;align-items:center;justify-content:center;font-size:1rem; }

        .ln-section { padding: 96px 2rem; }
        .ln-section-inner { max-width: 1280px; margin: 0 auto; }
        .ln-section-label { font-size:0.7rem;font-weight:600;color:#c0c1ff;text-transform:uppercase;letter-spacing:0.12em;margin-bottom:1rem; }
        .ln-section-title { font-family:'Space Grotesk',sans-serif;font-size:clamp(1.8rem,3.5vw,2.25rem);font-weight:700;color:#fff;letter-spacing:-0.02em;margin-bottom:3rem;line-height:1.2; }
        .ln-section-sub { color:#c7c4d7;font-size:1rem;max-width:600px;margin:0 auto 3rem;line-height:1.6;text-align:center; }

        .ln-features-grid { display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:1.5rem; }
        .ln-feature-card { background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:24px;padding:2rem;transition:transform 0.25s,border-color 0.25s,box-shadow 0.25s;backdrop-filter:blur(12px); }
        .ln-feature-card:hover { transform:translateY(-6px);border-color:rgba(192,193,255,0.25);box-shadow:0 0 20px rgba(128,131,255,0.12); }
        .ln-feature-icon { width:56px;height:56px;border-radius:16px;display:flex;align-items:center;justify-content:center;font-size:1.5rem;margin-bottom:1.25rem; }
        .ln-feature-title { font-family:'Space Grotesk',sans-serif;font-size:1.1rem;font-weight:600;color:#fff;margin-bottom:0.75rem; }
        .ln-feature-desc { font-size:0.9rem;color:#c7c4d7;line-height:1.6; }

        .ln-how-bg { background: rgba(11,19,38,0.5); }
        .ln-steps { display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:2rem;position:relative; }
        .ln-steps-divider { position:absolute;top:32px;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.08),transparent); }
        .ln-step { display:flex;flex-direction:column;align-items:center;text-align:center;gap:1rem;position:relative;z-index:1; }
        .ln-step-num { width:64px;height:64px;border-radius:50%;background:rgba(34,42,61,0.8);display:flex;align-items:center;justify-content:center;font-family:'Space Grotesk',sans-serif;font-size:1.3rem;font-weight:700; }
        .ln-step-num.c1{border:2px solid #c0c1ff;color:#c0c1ff} .ln-step-num.c2{border:2px solid #ddb7ff;color:#ddb7ff} .ln-step-num.c3{border:2px solid #4edea3;color:#4edea3}
        .ln-step-title { font-family:'Space Grotesk',sans-serif;font-size:1rem;font-weight:600;color:#fff; }
        .ln-step-desc { font-size:0.875rem;color:#c7c4d7;line-height:1.6;max-width:200px; }

        .ln-cta-banner { max-width:900px;margin:0 auto;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.1);border-radius:2rem;padding:4rem 3rem;text-align:center;position:relative;overflow:hidden;backdrop-filter:blur(12px); }
        .ln-cta-top-line { position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,#c0c1ff,#ddb7ff,#c0c1ff);animation:pulse 3s infinite; }
        .ln-cta-title { font-family:'Space Grotesk',sans-serif;font-size:clamp(1.8rem,4vw,2.8rem);font-weight:700;color:#fff;margin-bottom:1rem;letter-spacing:-0.02em; }
        .ln-cta-sub { color:#c7c4d7;margin-bottom:2.5rem;font-size:1.05rem; }
        .ln-btn-white { background:#fff;color:#131b2e;font-family:'Space Grotesk',sans-serif;font-weight:700;font-size:1.05rem;padding:1rem 3rem;border-radius:12px;border:none;cursor:pointer;transition:background 0.2s,transform 0.15s; }
        .ln-btn-white:hover { background:#e1e0ff;transform:scale(1.02); }

        .ln-footer { background:#060e20;border-top:1px solid rgba(255,255,255,0.05);padding:3rem 2rem; }
        .ln-footer-inner { max-width:1280px;margin:0 auto;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:1.5rem; }
        .ln-footer-links { display:flex;gap:2rem;flex-wrap:wrap; }
        .ln-footer-link { color:#464554;text-decoration:none;font-size:0.72rem;text-transform:uppercase;letter-spacing:0.08em;font-family:'Space Grotesk',sans-serif;transition:color 0.2s; }
        .ln-footer-link:hover { color:#fff; }
        .ln-footer-copy { color:#464554;font-size:0.72rem;text-transform:uppercase;letter-spacing:0.08em;font-family:'Space Grotesk',sans-serif; }

        @media(max-width:900px){.ln-hero{grid-template-columns:1fr;padding-top:120px}.ln-chat-card{display:none}}
      `}</style>

      {/* Loading overlay */}
      <div className={`ln-overlay ${leaving ? "active" : ""}`}>
        <div className="ln-overlay-logo">LaptopAI</div>
        <div className="ln-overlay-bar">
          <div className="ln-overlay-fill" />
        </div>
      </div>

      <div
        className={`landing-root ${visible ? "visible" : ""} ${leaving ? "leaving" : ""}`}
      >
        {/* NAV */}
        <nav className="ln-nav">
          <div className="ln-nav-inner">
            <div className="ln-logo">LaptopAI</div>
            <div className="ln-nav-links">
              <a href="#features" className="ln-nav-link active">
                Features
              </a>
              <a href="#how-it-works" className="ln-nav-link">
                How it Works
              </a>
              <a href="#cta" className="ln-nav-link">
                Get Started
              </a>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <button
                className="ln-nav-login"
                onClick={() => {
                  setLeaving(true);
                  setTimeout(() => navigate("/login"), 500);
                }}
              >
                Login
              </button>
              <button className="ln-btn-primary" onClick={goToChat}>
                Get Started
              </button>
            </div>
          </div>
        </nav>

        {/* HERO */}
        <section className="ln-hero">
          <div className="ln-hero-glow1" />
          <div className="ln-hero-glow2" />
          <div>
            <div className="ln-hero-badge">
              <span className="ln-badge-dot" />
              Powered by Claude API &amp; Weighted Scoring
            </div>
            <h1 className="ln-hero-title">
              Next-Gen Precision{" "}
              <span className="ln-hero-gradient">Claude Intelligence</span>
            </h1>
            <p className="ln-hero-sub">
              Navigate the complex landscape of hardware specs with a
              precision-engineered chatbot powered by Claude and our proprietary
              Weighted Scoring Algorithm to align tech power with your unique
              workflow.
            </p>
            <div className="ln-hero-btns">
              <button className="ln-btn-cta" onClick={goToChat}>
                Get Started
              </button>
              <button
                className="ln-btn-glass"
                onClick={() =>
                  document
                    .getElementById("how-it-works")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
              >
                Watch Demo
              </button>
            </div>
          </div>
          <div className="ln-chat-card">
            <div className="ln-chat-header">
              <div className="ln-chat-avatar">AI</div>
              <div>
                <div className="ln-chat-name">LaptopAI Assistant</div>
                <div className="ln-chat-status">
                  Claude Engine | Weighted Scoring Active
                </div>
              </div>
            </div>
            <div className="ln-msg-user">
              I need a laptop for Android development and Docker. Budget around
              $1000.
            </div>
            <div className="ln-msg-bot">
              <div className="ln-msg-label">✦ Weighted Analysis Complete</div>
              Based on your dev workload, you'll need strong RAM (16GB+) and a
              capable CPU. I've found 5 laptops that match perfectly.
            </div>
            <div className="ln-chat-input">
              <input placeholder="Describe your workflow..." readOnly />
              <button className="ln-chat-send">↑</button>
            </div>
          </div>
        </section>

        {/* FEATURES */}
        <section className="ln-section" id="features">
          <div className="ln-section-inner">
            <div style={{ textAlign: "center" }}>
              <div className="ln-section-label">What makes it different</div>
              <div className="ln-section-title">
                Advanced Benchmarking Intelligence
              </div>
              <p className="ln-section-sub">
                Our specialized engine deep-dives into real data to extract
                meaningful performance scores for your specific use-case.
              </p>
            </div>
            <div className="ln-features-grid">
              {[
                {
                  icon: "💬",
                  color: "rgba(192,193,255,0.1)",
                  border: "rgba(192,193,255,0.2)",
                  title: "Natural Conversation",
                  desc: "Just talk. Tell LaptopAI what you do — it figures out what you need through a real conversation, no forms or filters.",
                },
                {
                  icon: "⚡",
                  color: "rgba(221,183,255,0.1)",
                  border: "rgba(221,183,255,0.2)",
                  title: "Weighted Scoring Engine",
                  desc: "Every laptop in our database gets a compatibility score based on your priorities — CPU, GPU, RAM, battery, and price.",
                },
                {
                  icon: "🔍",
                  color: "rgba(78,222,163,0.1)",
                  border: "rgba(78,222,163,0.2)",
                  title: "Real Review Sentiment",
                  desc: "We analyse real web reviews for each recommendation so you know what owners actually think, not just specs on paper.",
                },
              ].map((f, i) => (
                <div className="ln-feature-card" key={i}>
                  <div
                    className="ln-feature-icon"
                    style={{
                      background: f.color,
                      border: `1px solid ${f.border}`,
                    }}
                  >
                    {f.icon}
                  </div>
                  <div className="ln-feature-title">{f.title}</div>
                  <div className="ln-feature-desc">{f.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="ln-section ln-how-bg" id="how-it-works">
          <div className="ln-section-inner">
            <div style={{ textAlign: "center", marginBottom: "3rem" }}>
              <div className="ln-section-title">
                Three Steps to Hardware Perfection
              </div>
            </div>
            <div className="ln-steps">
              <div className="ln-steps-divider" />
              {[
                {
                  num: "1",
                  cls: "c1",
                  title: "Tell Us About Yourself",
                  desc: "Chat naturally about what you do, what software you use, and your budget.",
                },
                {
                  num: "2",
                  cls: "c2",
                  title: "Algorithm Processing",
                  desc: "Our Weighted Scoring Algorithm ranks 2,160+ laptops against your exact priorities.",
                },
                {
                  num: "3",
                  cls: "c3",
                  title: "Get Your Top Picks",
                  desc: "Receive ranked recommendations with real review sentiment analysis.",
                },
              ].map((s, i) => (
                <div className="ln-step" key={i}>
                  <div className={`ln-step-num ${s.cls}`}>{s.num}</div>
                  <div className="ln-step-title">{s.title}</div>
                  <div className="ln-step-desc">{s.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="ln-section" id="cta">
          <div className="ln-cta-banner">
            <div className="ln-cta-top-line" />
            <div className="ln-cta-title">Upgrade your reality today</div>
            <p className="ln-cta-sub">
              Find your perfect laptop through a real conversation — no forms,
              no filters, just talk.
            </p>
            <button className="ln-btn-white" onClick={goToChat}>
              Analyse My Needs
            </button>
            <p
              style={{
                marginTop: "1rem",
                color: "#464554",
                fontSize: "0.8rem",
              }}
            >
              Free. Powered by Claude AI.
            </p>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="ln-footer">
          <div className="ln-footer-inner">
            <div className="ln-logo">LaptopAI</div>
            <div className="ln-footer-links">
              <a href="#features" className="ln-footer-link">
                Features
              </a>
              <a href="#how-it-works" className="ln-footer-link">
                How it Works
              </a>
              <a href="#cta" className="ln-footer-link">
                Get Started
              </a>
              <a href="#" className="ln-footer-link">
                Privacy Policy
              </a>
            </div>
            <div className="ln-footer-copy">
              © 2025 LaptopAI · R. Abeseg · AS2022930
            </div>
          </div>
        </footer>
      </div>
    </>
  );
};

export default LandingPage;
