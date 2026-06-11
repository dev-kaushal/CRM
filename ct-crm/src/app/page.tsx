"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { useTheme } from "@/components/theme-provider";
import "./landing.css";

// Lucide icons
import {
  Plus,
  User,
  Mail,
  Phone,
  Building,
  DollarSign,
  Search,
  Filter,
  Table2,
  Kanban as KanbanIcon,
  Grid,
  Sun,
  Moon,
  ArrowRight,
  ShieldCheck,
  Zap,
  BarChart3,
  Workflow,
  Users,
  Check,
  X,
  Cpu,
  ChevronDown
} from "lucide-react";

export default function Home() {
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // 1. Hero Stepper Stage
  const [activeHeroStage, setActiveHeroStage] = useState("lead");

  // 2. Trust Numbers Count Up State
  const [customersCount, setCustomersCount] = useState("0");
  const [dealsCount, setDealsCount] = useState("0");
  const [revCount, setRevCount] = useState("0");
  const [countriesCount, setCountriesCount] = useState("0");
  const trustRef = useRef<HTMLDivElement>(null);

  // 3. Operational Flow Active Stage
  const [activePipelineStage, setActivePipelineStage] = useState("lead");

  // 4. Sandbox Terminal Active Showcase Tab
  const [activeShowcaseTab, setActiveShowcaseTab] = useState("dash");

  // 5. FAQ States
  const [activeFaqCategory, setActiveFaqCategory] = useState("all");
  const [expandedFaqId, setExpandedFaqId] = useState<number | null>(null);

  useEffect(() => {
    setMounted(true);
    // Check auth state
    const sb = createClient();
    sb.auth.getSession().then(({ data }) => {
      setIsLoggedIn(!!data.session?.user);
    });
  }, []);

  // Trust numbers intersection trigger
  useEffect(() => {
    if (!mounted || !trustRef.current) return;

    let started = false;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !started) {
          started = true;
          // Count up numbers
          animateValue(0, 10000, 2000, (v) => setCustomersCount(Math.floor(v).toLocaleString() + "+"));
          animateValue(0, 4.2, 2000, (v) => setDealsCount("₹" + v.toFixed(1) + "Cr+"));
          animateValue(0, 85, 2000, (v) => setRevCount("₹" + Math.floor(v).toLocaleString() + "L+"));
          animateValue(0, 50, 2000, (v) => setCountriesCount(Math.floor(v).toLocaleString() + "+"));
          observer.unobserve(trustRef.current!);
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(trustRef.current);
    return () => observer.disconnect();
  }, [mounted]);

  const animateValue = (
    start: number,
    end: number,
    duration: number,
    callback: (value: number) => void
  ) => {
    let startTimestamp: number | null = null;
    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      const current = progress * (end - start) + start;
      callback(current);
      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };
    window.requestAnimationFrame(step);
  };


  // Stepper Data mapping
  const heroStepperData: Record<string, { tag: string; kpi: string; title: string; desc: string; icon: string }> = {
    lead: {
      tag: "Intake Stream",
      kpi: "Response Time: < 3 mins",
      title: "1. Leads Intake Management",
      desc: "All inbound lead streams—Meta Ads, Google Leads, Whatsapp, and direct contact forms—are consolidated automatically into a single, clean intake stream with lead attribution mapping.",
      icon: "🎯"
    },
    prospect: {
      tag: "BANT Matrix",
      kpi: "Qualification Rate: +38%",
      title: "2. BANT Qualification Gate",
      desc: "Identify sales-readiness through an embedded BANT framework. Sales reps score inbound contacts against verified budgets, authority flags, exact need lists, and purchase schedules.",
      icon: "⚡"
    },
    deal: {
      tag: "Custom pipeline",
      kpi: "Weighted Yield: ₹4.2Cr+",
      title: "3. Opportunity Pipeline Tracking",
      desc: "Convert qualified prospects into pipeline value. Reps move opportunities through customizable stages (New -> Proposal -> Negotiation -> Contract) with weighted forecasts.",
      icon: "💰"
    },
    contract: {
      tag: "Encrypted E-Sign",
      kpi: "Signoff Cycles: -72% time",
      title: "4. Contract Generation & E-Sign",
      desc: "Draft proposals and standard retainers in seconds, send to clients immediately, and verify signature logs in real-time. Secure, audited, and linked with opportunities.",
      icon: "✍️"
    },
    customer: {
      tag: "Lifecycle Retention",
      kpi: "LTV Optimization: +45%",
      title: "5. Customer Retainer Lifecycle",
      desc: "Once signed, accounts are provisioned and retainers are active. Track monthly recurring revenue, customer satisfaction metrics, and retainers in a centralized customer panel.",
      icon: "🏆"
    }
  };

  const getProgressWidth = () => {
    const idx = Object.keys(heroStepperData).indexOf(activeHeroStage);
    return `${(idx / 4) * 100}%`;
  };

  // Testimonials Array for Marquee (Continuous Vertical)
  const testimonials = [
    {
      quote: "CT-CRM completely transformed our sales operation. By moving our leads out of spreadsheet spreadsheets and grouping our contract signings directly inside the database ledger, we reduced our response times to under 3 minutes.",
      name: "Kaushal Patel",
      role: "Founder, Cosmic Tech",
      avatar: "KP"
    },
    {
      quote: "The BANT qualification matrix alone saved my sales team 20+ hours a week. We no longer chase dead-end leads. Every prospect is scored and qualified, and the automatically generated contract templates send directly.",
      name: "Priya Sharma",
      role: "Revenue Operations, TechStart",
      avatar: "PS"
    },
    {
      quote: "As an agency owner, having our recurring retainer lifecycles, weighted forecasts, task centers, and legal agreements visible under a single screen is incredible. Highly recommended for B2B teams.",
      name: "Rahul Kumar",
      role: "Managing Director, NovaTech Labs",
      avatar: "RK"
    },
    {
      quote: "Data leakage was our biggest bottleneck. Supabase Row Level Security ensures our lead isolation has zero-risk of visibility mismatches. Client retention velocity has hit an all-time high.",
      name: "Siddharth Mehta",
      role: "Operations Chief, CloudSoft",
      avatar: "SM"
    }
  ];

  // FAQ Data List
  const faqData = [
    {
      id: 1,
      cat: "general",
      q: "What is CT-CRM?",
      a: "CT-CRM is a next-generation cloud-native Customer Relationship Management platform designed specifically for founders, sales teams, and agencies to qualify prospects, track sales pipelines, and execute client contracts under a unified terminal."
    },
    {
      id: 2,
      cat: "general",
      q: "How does BANT scoring function?",
      a: "BANT scoring is built natively into our lead details cards. Reps score leads across Budget targets, Authority confirmations, Need scope listings, and Timeline schedules to qualify them before escalation."
    },
    {
      id: 3,
      cat: "general",
      q: "Can I manage tasks and follow-ups?",
      a: "Yes. The Task Center allows owners to log follow-up VoIP calls, draft emails, set contract review schedules, and track overdue tasks in a dynamic timeline."
    },
    {
      id: 4,
      cat: "security",
      q: "How is our customer data isolated and secured?",
      a: "We host on enterprise-grade Supabase infrastructure. Data access is sandboxed using robust Row Level Security (RLS) parameters mapped to organization IDs."
    },
    {
      id: 5,
      cat: "security",
      q: "Are contract documents encrypted?",
      a: "Yes, all signed agreement retainers are stored in encrypted cloud storage with strict compliance tracking and detailed cryptographic audit log files."
    },
    {
      id: 6,
      cat: "pricing",
      q: "Do you offer a free trial plan?",
      a: "Yes. We offer a 14-day free trial on our Hobby and Pro plans so you can evaluate our pipeline boards, task centers, and e-sign features with no credit card required."
    },
    {
      id: 7,
      cat: "pricing",
      q: "Are there hidden charges for E-Signatures?",
      a: "No. Standard e-signature ledgers and contract drafts are fully included in our monthly subscriptions. There are no per-envelope transaction charges."
    },
    {
      id: 8,
      cat: "migration",
      q: "Can we import leads from spreadsheets?",
      a: "Yes. The Leads Intake section supports direct spreadsheet uploads (.xlsx, .csv) with automatic field mapping to seed your records queue instantly."
    },
    {
      id: 9,
      cat: "integrations",
      q: "Does CT-CRM integrate with WhatsApp Business?",
      a: "Yes, you can link WhatsApp channels natively to trigger automatic welcome logs and message sequences after a lead progress check."
    }
  ];

  const filteredFaqs = activeFaqCategory === "all" 
    ? faqData 
    : faqData.filter(item => item.cat === activeFaqCategory);

  const toggleFaq = (id: number) => {
    setExpandedFaqId(expandedFaqId === id ? null : id);
  };

  return (
    <div className="min-h-screen relative overflow-x-hidden" style={{ background: "var(--bg-color)", color: "var(--text-color)" }}>
      
      {/* Ambient Blobs */}
      <div className="background-animation">
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
        <div className="blob blob-3"></div>
      </div>

      {/* Navigation Header */}
      <nav className="navbar" id="main-nav">
        <div className="container nav-container">
          <Link href="#" className="logo">
            <div className="logo-icon">CT</div>
            <span>CT-<span className="accent">CRM</span></span>
          </Link>
          
          <div className="nav-links">
            <Link href="#features">Core Features</Link>
            <Link href="#pipeline">The Pipeline</Link>
            <Link href="#sales-ops">Operations</Link>
            <Link href="#showcase">Dashboard Sandbox</Link>
            <Link href="#comparison">Why CT-CRM</Link>
            <Link href="#faq">FAQ</Link>
          </div>
          
          <div className="nav-actions">
            <button 
              onClick={toggleTheme} 
              className="w-[42px] h-[42px] rounded-full flex items-center justify-center transition-transform hover:scale-105 active:scale-95"
              style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", color: "var(--text-color)" }}
              aria-label="Toggle Theme Mode"
            >
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            {isLoggedIn ? (
              <Link href="/dashboard" className="wm-btn wm-btn-storm" style={{ padding: "0.5rem 1.2rem", fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <span>Go to Dashboard</span>
                <ArrowRight size={14} />
              </Link>
            ) : (
              <>
                <Link href="/login" className="wm-btn wm-btn-neu" style={{ padding: "0.5rem 1rem", fontSize: "0.8rem" }}>Login</Link>
                <Link href="/register" className="wm-btn wm-btn-storm" style={{ padding: "0.5rem 1.2rem", fontSize: "0.8rem" }}><span>Sign Up</span></Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <main>
        
        {/* SECTION 1: HERO */}
        <section className="hero-section container fade-in-up" id="hero">
          <span className="badge">🔥 Next-Gen Enterprise CRM</span>
          <h1 className="cause-font">Turn More Leads Into Signed Contracts.</h1>
          <p>Manage leads, qualify prospects with BANT metrics, track weighted deals, automate follow-ups, and securely execute client retainers from a single unified platform.</p>
          
          <div className="hero-ctas">
            <div className="relative inline-block group">
              {isLoggedIn ? (
                <Link href="/dashboard" className="wm-btn wm-btn-storm" id="hero-cta-trial" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span>Go to Dashboard</span>
                  <ArrowRight size={16} />
                </Link>
              ) : (
                <Link href="/register" className="wm-btn wm-btn-storm" id="hero-cta-trial"><span>Start Free Trial</span></Link>
              )}
            </div>
            <div className="relative inline-block group">
              <Link href="#showcase" className="wm-btn wm-btn-neu" id="hero-cta-demo">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 inline"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>
                Explore Sandbox Demo
              </Link>
            </div>
          </div>

          {/* HERO PIPELINE PREVIEW VISUAL */}
          <div className="hero-pipeline-preview" id="hero-pipeline-stepper">
            <div className="pipeline-stepper">
              <div className="pipeline-progress-bar" style={{ width: getProgressWidth() }} />
              {Object.entries(heroStepperData).map(([key, data]) => (
                <button 
                  key={key}
                  className={`step-node ${activeHeroStage === key ? "active" : ""}`} 
                  onClick={() => setActiveHeroStage(key)}
                  data-label={key}
                >
                  {data.icon}
                </button>
              ))}
            </div>

            <div className="pipeline-visual-details">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <span className="badge" style={{ marginBottom: 0 }}>{heroStepperData[activeHeroStage].tag}</span>
                <strong style={{ color: "var(--brand-accent)", fontSize: "0.9rem" }}>{heroStepperData[activeHeroStage].kpi}</strong>
              </div>
              <h3 className="cause-font" style={{ fontSize: "1.35rem", marginBottom: "0.5rem", color: "var(--text-color)" }}>{heroStepperData[activeHeroStage].title}</h3>
              <p style={{ fontSize: "0.95rem", color: "var(--muted-foreground)", lineHeight: 1.6 }}>{heroStepperData[activeHeroStage].desc}</p>
            </div>
          </div>
        </section>

        {/* SECTION 2: TRUST BAR */}
        <section className="trust-bar" ref={trustRef} id="trust">
          <div className="container">
            <div className="trust-stats">
              <div className="stat-item">
                <h3 className="cause-font">{customersCount}</h3>
                <p>Customers Active</p>
              </div>
              <div className="stat-item">
                <h3 className="cause-font">{dealsCount}</h3>
                <p>Deals Managed</p>
              </div>
              <div className="stat-item">
                <h3 className="cause-font">{revCount}</h3>
                <p>Revenue Processed</p>
              </div>
              <div className="stat-item">
                <h3 className="cause-font">{countriesCount}</h3>
                <p>Countries Served</p>
              </div>
            </div>
            
            <div className="trust-logos text-muted-foreground select-none">
              <span className="font-extrabold tracking-widest text-sm">TECHSTART</span>
              <span className="font-extrabold tracking-widest text-sm">ACMECORP</span>
              <span className="font-extrabold tracking-widest text-sm">CLOUDSOFT</span>
              <span className="font-extrabold tracking-widest text-sm">DATAFLOW</span>
            </div>
            <div style={{ marginTop: "2.5rem", fontSize: "0.85rem", color: "var(--muted-foreground)", fontWeight: 700 }}>
              ⭐ Rated 4.9/5 stars based on 1,200+ enterprise reviews
            </div>
          </div>
        </section>

        {/* SECTION 3: PROBLEM SECTION */}
        <section className="problem-section container" id="problems">
          <div className="section-header">
            <span className="badge">⚠️ The Pain Points</span>
            <h2 className="cause-font">The Spreadsheets are Costing You Deals.</h2>
            <p>Manual sales processes, disconnected data silos, and lost follow-ups drag down close rates.</p>
          </div>
          
          <div className="grid-2">
            <div className="pain-list">
              <div className="pain-card">
                <div className="pain-icon">📊</div>
                <div>
                  <h4 className="cause-font">Leads Lost in Spreadsheets</h4>
                  <p>Important customer requests sit unassigned on static spreadsheets, resulting in slow lead response cycles and missed sales windows.</p>
                </div>
              </div>

              <div className="pain-card">
                <div className="pain-icon">⏰</div>
                <div>
                  <h4 className="cause-font">Missed Follow-Ups</h4>
                  <p>Without clear task tracking, sales reps miss scheduled follow-up calls or proposal review meetings, leaving revenue on the table.</p>
                </div>
              </div>
              
              <div className="pain-card">
                <div className="pain-icon">📁</div>
                <div>
                  <h4 className="cause-font">Scattered Customer Context</h4>
                  <p>Negotiation notes, initial requirement documents, signed retainers, and deal values are stored across separate files, emails, and chats.</p>
                </div>
              </div>
            </div>

            <div className="pain-list">
              <div className="pain-card">
                <div className="pain-icon">🚫</div>
                <div>
                  <h4 className="cause-font">No Visibility Into Pipeline Performance</h4>
                  <p>Sales managers lack direct insight into team performance leaderboard rankings, active deal conversion percentages, or revenue forecasts.</p>
                </div>
              </div>

              <div className="pain-card">
                <div className="pain-icon">📝</div>
                <div>
                  <h4 className="cause-font">Slow and Manual Reporting</h4>
                  <p>Generating monthly sales pipeline updates requires manually compiling data from multiple sources, eating up hours of valuable operational time.</p>
                </div>
              </div>

              <div className="pain-card">
                <div className="pain-icon">🐌</div>
                <div>
                  <h4 className="cause-font">Frictional E-Sign & Retainer Execution</h4>
                  <p>Drafting standard legal contracts and getting client e-signatures involves using three different single-purpose apps, slowing down close cycles.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 4: SOLUTION SECTION */}
        <section className="container" style={{ padding: "6rem 0" }} id="solution">
          <div className="glass-card grid-2" style={{ background: "linear-gradient(135deg, var(--card-bg), rgba(0, 242, 254, 0.03))", padding: "4rem" }}>
            <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
              <span className="badge" style={{ alignSelf: "flex-start" }}>💡 The Solution</span>
              <h2 className="cause-font" style={{ fontSize: "2.5rem", lineHeight: 1.2, marginBottom: "1.5rem", color: "var(--text-color)" }}>Centralized Sales Operations, Unified.</h2>
              <p style={{ fontSize: "1.05rem", color: "var(--muted-foreground)", marginBottom: "2rem", lineHeight: 1.6 }}>CT-CRM brings lead intake, BANT qualification matrices, sales opportunity pipelines, and secure e-signature contract management into a single, high-performance platform.</p>
              <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "2rem", textAlign: "left", fontSize: "0.95rem" }}>
                <li style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}><strong style={{ color: "var(--brand-accent)" }}>✓</strong> 100% cloud-native database tracking</li>
                <li style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}><strong style={{ color: "var(--brand-accent)" }}>✓</strong> Fully integrated document signoff ledger</li>
                <li style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}><strong style={{ color: "var(--brand-accent)" }}>✓</strong> Interactive revenue forecasting metrics</li>
              </ul>
              <Link href="/register" className="wm-btn wm-btn-slide" style={{ alignSelf: "flex-start", padding: "0.85rem 2rem" }}>Unlock Sales Velocity</Link>
            </div>
            
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ width: "100%", height: "320px", borderRadius: "16px", border: "1px solid var(--card-border)", background: "rgba(0,0,0,0.3)", padding: "2rem", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--card-border)", paddingBottom: "1rem" }}>
                  <strong style={{ fontSize: "0.8rem", letterSpacing: "0.05em", textTransform: "uppercase" }}>Sales Terminal v1.0</strong>
                  <div style={{ width: "8px", height: "8px", background: "#10b981", borderRadius: "50%", boxShadow: "0 0 10px #10b981" }}></div>
                </div>
                <div style={{ fontFamily: "monospace", fontSize: "0.8rem", color: "var(--brand-accent)", lineHeight: 1.6 }}>
                  <div>$ ct-crm init --tenant-id=&quot;cosmic-trio&quot;</div>
                  <div style={{ color: "var(--text-color)" }}>[OK] Supabase auth session established...</div>
                  <div style={{ color: "var(--text-color)" }}>[OK] Realtime sync active (6 clients online)</div>
                  <div>$ ct-crm pipeline --forecast --weighted</div>
                  <div style={{ color: "#10b981" }}>&gt;&gt; Calculated Weighted Forecast: ₹42.5L [LTV Target]</div>
                </div>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--card-border)" }}></div>
                  <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--card-border)" }}></div>
                  <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--card-border)" }}></div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 5: COMPLETE SALES PIPELINE (INTERACTIVE) */}
        <section className="sales-pipeline-section container" id="pipeline">
          <div className="section-header">
            <span className="badge">⚙️ Operational Flow</span>
            <h2 className="cause-font">The Complete Sales Pipeline Ledger</h2>
            <p>Move prospects from interest to retainers smoothly. Every phase operates with structural integrity.</p>
          </div>
          
          <div className="pipeline-interactive-box">
            <div className="pipeline-stage-nav">
              <button className={`stage-btn ${activePipelineStage === "lead" ? "active" : ""}`} onClick={() => setActivePipelineStage("lead")}>1. Inbound Lead</button>
              <button className={`stage-btn ${activePipelineStage === "prospect" ? "active" : ""}`} onClick={() => setActivePipelineStage("prospect")}>2. BANT Prospect</button>
              <button className={`stage-btn ${activePipelineStage === "deal" ? "active" : ""}`} onClick={() => setActivePipelineStage("deal")}>3. Weighted Deal</button>
              <button className={`stage-btn ${activePipelineStage === "contract" ? "active" : ""}`} onClick={() => setActivePipelineStage("contract")}>4. E-Sign Contract</button>
              <button className={`stage-btn ${activePipelineStage === "customer" ? "active" : ""}`} onClick={() => setActivePipelineStage("customer")}>5. Retained Customer</button>
            </div>

            <div className="stage-contents">
              {/* Stage 1 */}
              <div className={`stage-pane ${activePipelineStage === "lead" ? "active" : ""}`}>
                <div className="pane-meta">
                  <span className="badge">Stage 01</span>
                  <h3 className="cause-font" style={{ fontSize: "1.75rem", marginBottom: "1rem", color: "var(--text-color)" }}>Inbound Lead Intake</h3>
                  <p style={{ color: "var(--muted-foreground)", fontSize: "0.95rem", marginBottom: "1.5rem", lineHeight: 1.6 }}>Consolidate and attribute marketing channels in real-time. Know exactly where your opportunities are coming from.</p>
                  <ul style={{ listStyle: "none", paddingLeft: 0, fontSize: "0.9rem", display: "flex", flexDirection: "column", gap: "0.5rem", color: "var(--text-color)" }}>
                    <li><strong>Purpose:</strong> Route organic, Meta, Google, and Whatsapp inquiries into a single queue.</li>
                    <li><strong>Actions:</strong> Assign owners, record source codes, log early background notes.</li>
                    <li><strong>KPIs:</strong> Response Time (&lt;3 mins), First Contact Rate (&gt;85%).</li>
                  </ul>
                </div>
                <div className="pane-visual-card">
                  <h4 className="cause-font" style={{ marginBottom: "1rem", fontSize: "1rem" }}>Inbound Records Queue</h4>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", fontSize: "0.8rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "0.75rem", border: "1px solid var(--card-border)", borderRadius: "8px", background: "var(--card-bg)" }}>
                      <strong>Vikram Singh (Acme Corp)</strong>
                      <span style={{ color: "#3b82f6", fontWeight: 700 }}>GOOGLE ADS</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "0.75rem", border: "1px solid var(--card-border)", borderRadius: "8px", background: "var(--card-bg)" }}>
                      <strong>Neha Patel (TechStart)</strong>
                      <span style={{ color: "#f97316", fontWeight: 700 }}>META ADS</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "0.75rem", border: "1px solid var(--card-border)", borderRadius: "8px", background: "var(--card-bg)" }}>
                      <strong>Arjun Mehta (CloudSoft)</strong>
                      <span style={{ color: "#10b981", fontWeight: 700 }}>WHATSAPP</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Stage 2 */}
              <div className={`stage-pane ${activePipelineStage === "prospect" ? "active" : ""}`}>
                <div className="pane-meta">
                  <span className="badge">Stage 02</span>
                  <h3 className="cause-font" style={{ fontSize: "1.75rem", marginBottom: "1rem", color: "var(--text-color)" }}>BANT Qualification Gate</h3>
                  <p style={{ color: "var(--muted-foreground)", fontSize: "0.95rem", marginBottom: "1.5rem", lineHeight: 1.6 }}>Score and filter leads according to Budget, Authority, Need, and Timeline parameters to qualify real opportunities.</p>
                  <ul style={{ listStyle: "none", paddingLeft: 0, fontSize: "0.9rem", display: "flex", flexDirection: "column", gap: "0.5rem", color: "var(--text-color)" }}>
                    <li><strong>Purpose:</strong> Filter unqualified noise so reps can focus entirely on high-intent sales pipelines.</li>
                    <li><strong>Actions:</strong> Log verified budgets, decision-maker permissions, scope of requirements.</li>
                    <li><strong>KPIs:</strong> Pipeline Progression Rate (+38%), Lead Quality Score.</li>
                  </ul>
                </div>
                <div className="pane-visual-card">
                  <h4 className="cause-font" style={{ marginBottom: "1rem", fontSize: "1rem" }}>BANT Matrix Criteria</h4>
                  <div style={{ fontSize: "0.8rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <span style={{ color: "#10b981", fontWeight: "bold" }}>[B] Budget:</span>
                      <span>₹50,000+ confirmed corporate budget</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <span style={{ color: "#10b981", fontWeight: "bold" }}>[A] Authority:</span>
                      <span>Direct signoff authority validated</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <span style={{ color: "#10b981", fontWeight: "bold" }}>[N] Need:</span>
                      <span>Enterprise dashboard and API retainer scope</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <span style={{ color: "#10b981", fontWeight: "bold" }}>[T] Timeline:</span>
                      <span>Near-term onboarding scale (30-60 days)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Stage 3 */}
              <div className={`stage-pane ${activePipelineStage === "deal" ? "active" : ""}`}>
                <div className="pane-meta">
                  <span className="badge">Stage 03</span>
                  <h3 className="cause-font" style={{ fontSize: "1.75rem", marginBottom: "1rem", color: "var(--text-color)" }}>Weighted Deal Opportunity</h3>
                  <p style={{ color: "var(--muted-foreground)", fontSize: "0.95rem", marginBottom: "1.5rem", lineHeight: 1.6 }}>Track deals visually through kanban columns with custom probabilities applied automatically to compute weighted forecasts.</p>
                  <ul style={{ listStyle: "none", paddingLeft: 0, fontSize: "0.9rem", display: "flex", flexDirection: "column", gap: "0.5rem", color: "var(--text-color)" }}>
                    <li><strong>Purpose:</strong> Provide clear visibility into sales pipelines and close probabilities.</li>
                    <li><strong>Actions:</strong> Draft proposals, schedule demos, adjust stages, manage tasks.</li>
                    <li><strong>KPIs:</strong> Forecast Accuracy (+92%), Win/Loss Ratio.</li>
                  </ul>
                </div>
                <div className="pane-visual-card">
                  <h4 className="cause-font" style={{ marginBottom: "1rem", fontSize: "1rem" }}>Weighted Forecast Board</h4>
                  <div style={{ fontSize: "0.8rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "0.5rem", borderBottom: "1px solid var(--card-border)" }}>
                      <span>Proposal Review (30%)</span>
                      <strong style={{ color: "var(--brand-accent)" }}>₹1,35,000 [Weighted]</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "0.5rem", borderBottom: "1px solid var(--card-border)" }}>
                      <span>Negotiation (60%)</span>
                      <strong style={{ color: "var(--brand-accent)" }}>₹1,92,000 [Weighted]</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "0.5rem" }}>
                      <span>Contract Sent (80%)</span>
                      <strong style={{ color: "var(--brand-accent)" }}>₹3,60,000 [Weighted]</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Stage 4 */}
              <div className={`stage-pane ${activePipelineStage === "contract" ? "active" : ""}`}>
                <div className="pane-meta">
                  <span className="badge">Stage 04</span>
                  <h3 className="cause-font" style={{ fontSize: "1.75rem", marginBottom: "1rem", color: "var(--text-color)" }}>Integrated Contract E-Sign</h3>
                  <p style={{ color: "var(--muted-foreground)", fontSize: "0.95rem", marginBottom: "1.5rem", lineHeight: 1.6 }}>Draft agreement paperwork instantly. Send secure signature invite links and track sign-offs directly inside the CRM ledger.</p>
                  <ul style={{ listStyle: "none", paddingLeft: 0, fontSize: "0.9rem", display: "flex", flexDirection: "column", gap: "0.5rem", color: "var(--text-color)" }}>
                    <li><strong>Purpose:</strong> Standardize and accelerate client onboarding and legal clearance.</li>
                    <li><strong>Actions:</strong> Generate contracts, trigger email invite codes, write to signed audits.</li>
                    <li><strong>KPIs:</strong> Signature Turnaround (&lt; 24h), Compliance Rating (100%).</li>
                  </ul>
                </div>
                <div className="pane-visual-card">
                  <h4 className="cause-font" style={{ marginBottom: "1rem", fontSize: "1rem" }}>Signature Ledger Audit</h4>
                  <div style={{ fontFamily: "monospace", fontSize: "0.75rem", display: "flex", flexDirection: "column", gap: "0.5rem", color: "#10b981" }}>
                    <div>[AUDIT LOG] CT-2026-0001</div>
                    <div style={{ color: "var(--text-color)" }}>* Signee IP: 192.168.1.144</div>
                    <div style={{ color: "var(--text-color)" }}>* Verified: operational authority validated</div>
                    <div>[COMPLETED] Agreement finalized successfully</div>
                  </div>
                </div>
              </div>

              {/* Stage 5 */}
              <div className={`stage-pane ${activePipelineStage === "customer" ? "active" : ""}`}>
                <div className="pane-meta">
                  <span className="badge">Stage 05</span>
                  <h3 className="cause-font" style={{ fontSize: "1.75rem", marginBottom: "1rem", color: "var(--text-color)" }}>Active Customer Retainer</h3>
                  <p style={{ color: "var(--muted-foreground)", fontSize: "0.95rem", marginBottom: "1.5rem", lineHeight: 1.6 }}>Once contracts are executed, provision corporate accounts, monitor lifetime value targets, and manage recurring agreements.</p>
                  <ul style={{ listStyle: "none", paddingLeft: 0, fontSize: "0.9rem", display: "flex", flexDirection: "column", gap: "0.5rem", color: "var(--text-color)" }}>
                    <li><strong>Purpose:</strong> Maintain long-term commercial relationships and retain recurring revenues.</li>
                    <li><strong>Actions:</strong> Monitor retainer health, evaluate renewals, track customer support tasks.</li>
                    <li><strong>KPIs:</strong> Retention Rate (96.4%), Lifetime Value (LTV) Optimization.</li>
                  </ul>
                </div>
                <div className="pane-visual-card">
                  <h4 className="cause-font" style={{ marginBottom: "1rem", fontSize: "1rem" }}>Retainer Summary</h4>
                  <div style={{ fontSize: "0.8rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "0.5rem", borderBottom: "1px solid var(--card-border)" }}>
                      <span>LTV Realized</span>
                      <strong style={{ color: "#10b981" }}>₹4,50,000 [ACTIVE]</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "0.5rem", borderBottom: "1px solid var(--card-border)" }}>
                      <span>Renewal Cycle</span>
                      <span>12 Months</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "0.5rem" }}>
                      <span>Status</span>
                      <span style={{ color: "#10b981", fontWeight: 700 }}>VERIFIED ACCOUNT</span>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* SECTION 6: FEATURE GRID */}
        <section className="feature-grid-section" id="features">
          <div className="container">
            <div className="section-header">
              <span className="badge">⚡ Product Capabilities</span>
              <h2 className="cause-font">Engineered for High-Velocity Teams</h2>
              <p>Unlock structured customer data operations. No generic features—just pure CRM control.</p>
            </div>
            
            <div className="grid-3">
              <div className="glass-card feature-card">
                <div className="feat-icon">🎯</div>
                <h3 className="cause-font">Centralized Intake</h3>
                <p>Automatically route organic, Google, and Meta campaign leads into a single dashboard queue.</p>
              </div>
              <div className="glass-card feature-card">
                <div className="feat-icon">👥</div>
                <h3 className="cause-font">Stakeholder Profiling</h3>
                <p>Store corporate customer contacts with complete context, lifetime value metrics, and notes.</p>
              </div>
              <div className="glass-card feature-card">
                <div className="feat-icon">⚡</div>
                <h3 className="cause-font">BANT Scorecard</h3>
                <p>Grade leads dynamically against budgets, authority flags, direct pain scope, and timeline parameters.</p>
              </div>
              <div className="glass-card feature-card">
                <div className="feat-icon">💰</div>
                <h3 className="cause-font">Visual Pipelines</h3>
                <p>Track opportunity stages with weighted closes. Manage your forecasts without mathematical complex files.</p>
              </div>
              <div className="glass-card feature-card">
                <div className="feat-icon">✍️</div>
                <h3 className="cause-font">Audited E-Signatures</h3>
                <p>Draft standard contracts, transmit signature invite links, and write to secure signature ledger logs.</p>
              </div>
              <div className="glass-card feature-card">
                <div className="feat-icon">📋</div>
                <h3 className="cause-font">Tasks & Actions</h3>
                <p>Assign follow-up calls, proposal emails, and contract review dates. Keep your sales reps aligned.</p>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 7: COMMUNICATION HUB */}
        <section className="communication-hub-section" id="comm-hub">
          <div className="container grid-2">
            <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
              <span className="badge" style={{ alignSelf: "flex-start" }}>🔌 Communication Integrations</span>
              <h2 className="cause-font" style={{ fontSize: "2.5rem", lineHeight: 1.2, marginBottom: "1.5rem", color: "var(--text-color)" }}>The Connected Sales Network</h2>
              <p style={{ fontSize: "1.05rem", color: "var(--muted-color)", marginBottom: "2rem", lineHeight: 1.6 }}>CT-CRM coordinates all communications channels natively. Log client emails, SMS streams, discovery calls, WhatsApp syncs, and Zoom scheduler invites in one timeline.</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", fontSize: "0.9rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}><strong>✉</strong> Outlook / Gmail Sync</div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}><strong>💬</strong> WhatsApp Business</div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}><strong>📞</strong> VoIP Call Logging</div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}><strong>📅</strong> Calendar Schedules</div>
              </div>
            </div>
            
            <div className="network-hub">
              <div className="hub-center">CT</div>
              <div className="hub-node hub-node-1" title="Gmail Integration">✉️</div>
              <div className="hub-node hub-node-2" title="WhatsApp Business">💬</div>
              <div className="hub-node hub-node-3" title="VoIP Telephony">📞</div>
              <div className="hub-node hub-node-4" title="Google Meet / Zoom">📅</div>
              <div className="hub-node hub-node-5" title="SMS Gateway">📱</div>
              <div className="hub-node hub-node-6" title="Hub Spot / Slack">🔌</div>
              
              <svg className="hub-svg-lines">
                <line x1="50%" y1="50%" x2="50%" y2="10%" />
                <line x1="50%" y1="50%" x2="85%" y2="25%" />
                <line x1="50%" y1="50%" x2="85%" y2="75%" />
                <line x1="50%" y1="50%" x2="50%" y2="90%" />
                <line x1="50%" y1="50%" x2="15%" y2="75%" />
                <line x1="50%" y1="50%" x2="15%" y2="25%" />
              </svg>
            </div>
          </div>
        </section>

        {/* SECTION 8: SALES OPERATIONS */}
        <section className="container" style={{ padding: "6rem 0" }} id="sales-ops">
          <div className="section-header">
            <span className="badge">📈 Revenue Operations</span>
            <h2 className="cause-font">Automate Proposal & Commission Tracking</h2>
            <p>Run your sales operations with complete precision. Eliminate guessing from forecast cycles.</p>
          </div>
          
          <div className="grid-2">
            <div className="glass-card" style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
              <span className="badge" style={{ alignSelf: "flex-start" }}>Weighted Forecasting</span>
              <h3 className="cause-font" style={{ fontSize: "1.5rem", marginBottom: "1rem", color: "var(--text-color)" }}>Predictable Closed-Won Pipeline</h3>
              <p style={{ fontSize: "0.95rem", color: "var(--muted-foreground)", lineHeight: 1.6, marginBottom: "1.5rem" }}>Configure progression milestones. Our calculations automatically apply stage percentages to your pipeline volume, ensuring exact revenue projections every month.</p>
              <div style={{ fontSize: "0.85rem", borderTop: "1px solid var(--card-border)", paddingTop: "1rem", color: "var(--brand-accent)", fontWeight: 700 }}>
                📈 Forecast Precision Rate: 98.4%
              </div>
            </div>

            <div className="glass-card" style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
              <span className="badge" style={{ alignSelf: "flex-start" }}>Commission Management</span>
              <h3 className="cause-font" style={{ fontSize: "1.5rem", marginBottom: "1rem", color: "var(--text-color)" }}>Leaderboards & Commission Ledgers</h3>
              <p style={{ fontSize: "0.95rem", color: "var(--muted-foreground)", lineHeight: 1.6, marginBottom: "1.5rem" }}>Keep sales reps motivated. CT-CRM lists live performance statistics, closed-won metrics, call logs, and calculated commission logs directly inside the team admin panel.</p>
              <div style={{ fontSize: "0.85rem", borderTop: "1px solid var(--card-border)", paddingTop: "1rem", color: "var(--brand-accent)", fontWeight: 700 }}>
                🏆 Top rep this month: Kaushal Patel (₹18.5L Won)
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 9: AUTOMATION ENGINE */}
        <section className="container" style={{ padding: "6rem 0" }} id="automation">
          <div className="glass-card grid-2" style={{ background: "linear-gradient(135deg, var(--card-bg), rgba(168, 85, 247, 0.05))", padding: "4rem" }}>
            <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
              <span className="badge" style={{ alignSelf: "flex-start" }}>🤖 Workflows Engine</span>
              <h2 className="cause-font" style={{ fontSize: "2.5rem", lineHeight: 1.2, marginBottom: "1.5rem", color: "var(--text-color)" }}>Automate Your Operations.</h2>
              <p style={{ fontSize: "1.05rem", color: "var(--muted-foreground)", marginBottom: "2rem", lineHeight: 1.6 }}>Remove the manual workload. CT-CRM triggers automatic ownership assignments, schedules overdue tasks, sends WhatsApp sequence updates, and logs email templates.</p>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", fontSize: "0.9rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}><strong style={{ color: "var(--brand-accent)" }}>➔</strong> Trigger: Lead Status qualifies for BANT</div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}><strong style={{ color: "var(--brand-accent)" }}>➔</strong> Action: Provision Prospect, generate deal opportunity</div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}><strong style={{ color: "var(--brand-accent)" }}>➔</strong> Action: Notify Sales Rep, schedule 24h follow-up call</div>
              </div>
            </div>
            
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ border: "1px solid var(--card-border)", borderRadius: "16px", width: "100%", background: "rgba(0,0,0,0.3)", padding: "2rem" }}>
                <h4 className="cause-font" style={{ fontSize: "1rem", marginBottom: "1rem", color: "var(--text-color)" }}>Workflow: Qualify Escalate</h4>
                <div style={{ position: "relative", paddingLeft: "1.5rem", borderLeft: "2px solid var(--card-border)", display: "flex", flexDirection: "column", gap: "1.5rem", fontSize: "0.8rem" }}>
                  <div>
                    <span style={{ color: "var(--brand-accent)", fontWeight: 700 }}>IF</span> lead status is <strong style={{ color: "#10b981" }}>QUALIFIED</strong>
                  </div>
                  <div>
                    <span style={{ color: "var(--brand-accent)", fontWeight: 700 }}>THEN</span> auto-generate <strong style={{ color: "var(--text-color)" }}>Contract Draft</strong> (Value = LTV)
                  </div>
                  <div>
                    <span style={{ color: "var(--brand-accent)", fontWeight: 700 }}>THEN</span> trigger email to Client and assign to Owner
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 10: ANALYTICS & REPORTING */}
        <section className="container" style={{ padding: "6rem 0" }} id="analytics">
          <div className="section-header">
            <span className="badge">📊 Analytics Dashboard</span>
            <h2 className="cause-font">Conversion & Funnel Intelligence</h2>
            <p>Complete statistical summaries across all marketing attribution streams and pipeline conversions.</p>
          </div>
          
          <div className="grid-3">
            <div className="glass-card text-left">
              <h3 className="cause-font" style={{ fontSize: "1.15rem", marginBottom: "0.75rem" }}>Marketing Attribution</h3>
              <p style={{ fontSize: "0.9rem", color: "var(--muted-foreground)", lineHeight: 1.6, marginBottom: "1.5rem" }}>See exact metrics on where your high-value leads are converting, allowing you to allocate ad budget with complete visibility.</p>
              <strong style={{ color: "var(--brand-accent)", fontSize: "0.9rem" }}>Funnel Leader: Google Ads (42.8% Conversion)</strong>
            </div>
            <div className="glass-card text-left">
              <h3 className="cause-font" style={{ fontSize: "1.15rem", marginBottom: "0.75rem" }}>Conversion Funnel</h3>
              <p style={{ fontSize: "0.9rem", color: "var(--muted-foreground)", lineHeight: 1.6, marginBottom: "1.5rem" }}>Track bottlenecks between BANT qualification gates, negotiation discussions, and finalized contract sign-offs.</p>
              <strong style={{ color: "var(--brand-accent)", fontSize: "0.9rem" }}>BANT to Deal Progression: 75.4%</strong>
            </div>
            <div className="glass-card text-left">
              <h3 className="cause-font" style={{ fontSize: "1.15rem", marginBottom: "0.75rem" }}>LTV Retention</h3>
              <p style={{ fontSize: "0.9rem", color: "var(--muted-foreground)", lineHeight: 1.6, marginBottom: "1.5rem" }}>Monitor recurring retainer accounts, evaluate renewal deadlines, and analyze cohort churn rates monthly.</p>
              <strong style={{ color: "var(--brand-accent)", fontSize: "0.9rem" }}>Client Retainer Churn Rate: 3.6%</strong>
            </div>
          </div>
        </section>

        {/* SECTION 11: AI ROADMAP */}
        <section className="container" style={{ padding: "6rem 0" }} id="ai-roadmap">
          <div className="glass-card" style={{ background: "linear-gradient(135deg, var(--card-bg), rgba(8, 145, 178, 0.05))", padding: "4rem", textAlign: "left" }}>
            <span className="badge">🧠 AI Intelligence Roadmap — Phase 2</span>
            <h2 className="cause-font" style={{ fontSize: "2.5rem", lineHeight: 1.2, marginBottom: "1.5rem" }}>Predictive AI Sales Intelligence</h2>
            <p style={{ fontSize: "1.05rem", color: "var(--muted-foreground)", maxWidth: "800px", marginBottom: "3rem", lineHeight: 1.6 }}>No hype—just core machine learning features built for real utility. Our upcoming Phase 2 models operate directly on secure database nodes.</p>
            
            <div className="grid-4" style={{ fontSize: "0.9rem" }}>
              <div style={{ borderLeft: "2px solid var(--brand-accent)", paddingLeft: "1rem" }}>
                <h4 className="cause-font" style={{ marginBottom: "0.25rem" }}>AI Lead Scoring</h4>
                <p style={{ fontSize: "0.8rem", color: "var(--muted-foreground)" }}>PGVector proximity metrics to rank high-intent buyers.</p>
              </div>
              <div style={{ borderLeft: "2px solid var(--brand-accent)", paddingLeft: "1rem" }}>
                <h4 className="cause-font" style={{ marginBottom: "0.25rem" }}>Auto Follow-Ups</h4>
                <p style={{ fontSize: "0.8rem", color: "var(--muted-foreground)" }}>Intelligent email drafts written automatically after call logs.</p>
              </div>
              <div style={{ borderLeft: "2px solid var(--brand-accent)", paddingLeft: "1rem" }}>
                <h4 className="cause-font" style={{ marginBottom: "0.25rem" }}>Call Intelligence</h4>
                <p style={{ fontSize: "0.8rem", color: "var(--muted-foreground)" }}>Speech-to-text models that generate BANT checklists instantly.</p>
              </div>
              <div style={{ borderLeft: "2px solid var(--brand-accent)", paddingLeft: "1rem" }}>
                <h4 className="cause-font" style={{ marginBottom: "0.25rem" }}>Predictive Forecast</h4>
                <p style={{ fontSize: "0.8rem", color: "var(--muted-foreground)" }}>ML models mapping cohort metrics to projected won agreements.</p>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 12: DASHBOARD SHOWCASE (INTERACTIVE SWITCHER) */}
        <section className="dashboard-showcase-section container" id="showcase">
          <div className="section-header">
            <span className="badge">🖥️ Sandbox Terminal</span>
            <h2 className="cause-font">Interactive Dashboard Showcase</h2>
            <p>Click the panels below to preview the visual elegance and details of our internal CRM screens.</p>
          </div>
          
          <div className="showcase-switcher">
            <div className="showcase-tabs">
              <button className={`showcase-tab-btn ${activeShowcaseTab === "dash" ? "active" : ""}`} onClick={() => setActiveShowcaseTab("dash")}>Operations Center</button>
              <button className={`showcase-tab-btn ${activeShowcaseTab === "leads" ? "active" : ""}`} onClick={() => setActiveShowcaseTab("leads")}>Leads Intake</button>
              <button className={`showcase-tab-btn ${activeShowcaseTab === "deals" ? "active" : ""}`} onClick={() => setActiveShowcaseTab("deals")}>Opportunities Board</button>
              <button className={`showcase-tab-btn ${activeShowcaseTab === "contracts" ? "active" : ""}`} onClick={() => setActiveShowcaseTab("contracts")}>Agreements Ledger</button>
            </div>

            <div className="showcase-viewports">
              {/* Showcase Pane 1: Dashboard */}
              <div className={`showcase-pane ${activeShowcaseTab === "dash" ? "active" : ""}`}>
                <div className="mockup-header">
                  <div>
                    <strong style={{ fontSize: "1.15rem", color: "var(--text-color)" }}>Operations Center Overview</strong>
                    <span style={{ display: "block", fontSize: "0.75rem", color: "var(--muted-foreground)" }}>Centralized pipeline statistics</span>
                  </div>
                  <span className="badge" style={{ marginBottom: 0, background: "rgba(16,185,129,0.1)", color: "#10b981" }}>LIVE SYNCED</span>
                </div>
                <div className="grid-3" style={{ marginBottom: "2rem", textAlign: "left" }}>
                  <div style={{ border: "1px solid var(--card-border)", padding: "1rem", borderRadius: "12px", background: "var(--card-bg)" }}>
                    <span style={{ fontSize: "0.7rem", textTransform: "uppercase", color: "var(--muted-foreground)" }}>Total Revenue</span>
                    <strong style={{ display: "block", fontSize: "1.5rem", color: "var(--text-color)", marginTop: "0.25rem" }}>₹4,25,00,000</strong>
                  </div>
                  <div style={{ border: "1px solid var(--card-border)", padding: "1rem", borderRadius: "12px", background: "var(--card-bg)" }}>
                    <span style={{ fontSize: "0.7rem", textTransform: "uppercase", color: "var(--muted-foreground)" }}>Open Deals Value</span>
                    <strong style={{ display: "block", fontSize: "1.5rem", color: "var(--text-color)", marginTop: "0.25rem" }}>₹1,20,00,000</strong>
                  </div>
                  <div style={{ border: "1px solid var(--card-border)", padding: "1rem", borderRadius: "12px", background: "var(--card-bg)" }}>
                    <span style={{ fontSize: "0.7rem", textTransform: "uppercase", color: "var(--muted-foreground)" }}>Contracts Signed</span>
                    <strong style={{ display: "block", fontSize: "1.5rem", color: "var(--text-color)", marginTop: "0.25rem" }}>12 Active</strong>
                  </div>
                </div>
                <p style={{ fontSize: "0.85rem", color: "var(--muted-foreground)", textAlign: "left" }}>&gt;&gt; The core operations center aggregates KPIs, showing weighted pipelines, deal health tracking charts, task center timelines, and team leaderboards seamlessly.</p>
              </div>

              {/* Showcase Pane 2: Leads */}
              <div className={`showcase-pane ${activeShowcaseTab === "leads" ? "active" : ""}`}>
                <div className="mockup-header">
                  <div>
                    <strong style={{ fontSize: "1.15rem", color: "var(--text-color)" }}>Leads Intake Stream</strong>
                    <span style={{ display: "block", fontSize: "0.75rem", color: "var(--muted-foreground)" }}>Incoming pipeline marketing attribution</span>
                  </div>
                  <span className="badge" style={{ marginBottom: 0 }}>Attribution Enabled</span>
                </div>
                <div style={{ overflowX: "auto" }}>
                  <table className="mockup-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Company</th>
                        <th>Contact Email</th>
                        <th>Source</th>
                        <th>Value Estimate</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td><strong>Vikram Singh</strong></td>
                        <td>Acme Corp</td>
                        <td>vikram@acmecorp.in</td>
                        <td><span style={{ background: "var(--card-border)", padding: "0.25rem 0.5rem", borderRadius: "4px" }}>GOOGLE ADS</span></td>
                        <td style={{ color: "var(--brand-accent)", fontWeight: 700 }}>₹4,50,000</td>
                        <td><span style={{ background: "rgba(16,185,129,0.1)", color: "#10b981", padding: "0.25rem 0.5rem", borderRadius: "4px", fontWeight: 700 }}>QUALIFIED</span></td>
                      </tr>
                      <tr>
                        <td><strong>Neha Patel</strong></td>
                        <td>TechStart</td>
                        <td>neha@techstart.io</td>
                        <td><span style={{ background: "var(--card-border)", padding: "0.25rem 0.5rem", borderRadius: "4px" }}>META ADS</span></td>
                        <td style={{ color: "var(--brand-accent)", fontWeight: 700 }}>₹1,20,000</td>
                        <td><span style={{ background: "rgba(249,115,22,0.1)", color: "#f97316", padding: "0.25rem 0.5rem", borderRadius: "4px", fontWeight: 700 }}>INTERESTED</span></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Showcase Pane 3: Deals */}
              <div className={`showcase-pane ${activeShowcaseTab === "deals" ? "active" : ""}`}>
                <div className="mockup-header">
                  <div>
                    <strong style={{ fontSize: "1.15rem", color: "var(--text-color)" }}>Opportunity Pipeline Board</strong>
                    <span style={{ display: "block", fontSize: "0.75rem", color: "var(--muted-foreground)" }}>Custom weighted forecasts</span>
                  </div>
                  <span className="badge" style={{ marginBottom: 0, background: "rgba(0,242,254,0.1)", color: "var(--brand-accent)" }}>WEIGHTED ESTIMATIONS</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem", fontSize: "0.8rem", textAlign: "left" }}>
                  <div style={{ border: "1px solid var(--card-border)", padding: "1rem", borderRadius: "12px", background: "var(--card-bg)" }}>
                    <h5 className="cause-font" style={{ marginBottom: "0.5rem" }}>Proposal Sent (30%)</h5>
                    <div style={{ padding: "0.75rem", border: "1px solid var(--card-border)", borderRadius: "6px", background: "var(--card-bg-solid)" }}>
                      <strong style={{ display: "block" }}>DataFlow Platform</strong>
                      <span style={{ color: "var(--muted-foreground)", fontSize: "0.7rem" }}>Est. ₹5,50,000</span>
                    </div>
                  </div>
                  <div style={{ border: "1px solid var(--card-border)", padding: "1rem", borderRadius: "12px", background: "var(--card-bg)" }}>
                    <h5 className="cause-font" style={{ marginBottom: "0.5rem" }}>Negotiation (60%)</h5>
                    <div style={{ padding: "0.75rem", border: "1px solid var(--card-border)", borderRadius: "6px", background: "var(--card-bg-solid)" }}>
                      <strong style={{ display: "block" }}>API Suite</strong>
                      <span style={{ color: "var(--muted-foreground)", fontSize: "0.7rem" }}>Est. ₹3,20,000</span>
                    </div>
                  </div>
                  <div style={{ border: "1px solid var(--card-border)", padding: "1rem", borderRadius: "12px", background: "var(--card-bg)" }}>
                    <h5 className="cause-font" style={{ marginBottom: "0.5rem" }}>Contract Sent (80%)</h5>
                    <div style={{ padding: "0.75rem", border: "1px solid var(--card-border)", borderRadius: "6px", background: "var(--card-bg-solid)" }}>
                      <strong style={{ display: "block" }}>Cloud Migration</strong>
                      <span style={{ color: "var(--muted-foreground)", fontSize: "0.7rem" }}>Est. ₹7,80,000</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Showcase Pane 4: Contracts */}
              <div className={`showcase-pane ${activeShowcaseTab === "contracts" ? "active" : ""}`}>
                <div className="mockup-header">
                  <div>
                    <strong style={{ fontSize: "1.15rem", color: "var(--text-color)" }}>E-Signature & Contracts Ledger</strong>
                    <span style={{ display: "block", fontSize: "0.75rem", color: "var(--muted-foreground)" }}>Audited agreement execution log</span>
                  </div>
                  <span className="badge" style={{ marginBottom: 0, background: "rgba(16,185,129,0.1)", color: "#10b981" }}>SECURE & ENCRYPTED</span>
                </div>
                <div style={{ overflowX: "auto" }}>
                  <table className="mockup-table">
                    <thead>
                      <tr>
                        <th>Contract Number</th>
                        <th>Client Account</th>
                        <th>Opportunity</th>
                        <th>Value (INR)</th>
                        <th>E-Sign Status</th>
                        <th>Ledger Lock</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td><strong>CT-2026-0001</strong></td>
                        <td>Acme Corp</td>
                        <td>Enterprise CRM License</td>
                        <td style={{ color: "var(--brand-accent)", fontWeight: 700 }}>₹4,50,000</td>
                        <td><span style={{ background: "rgba(16,185,129,0.1)", color: "#10b981", padding: "0.25rem 0.5rem", borderRadius: "4px", fontWeight: 700 }}>EXECUTED</span></td>
                        <td><span style={{ color: "#10b981" }}>✓ Locked & Audited</span></td>
                      </tr>
                      <tr>
                        <td><strong>CT-2026-0002</strong></td>
                        <td>TechStart</td>
                        <td>Cloud Migration Package</td>
                        <td style={{ color: "var(--brand-accent)", fontWeight: 700 }}>₹7,80,000</td>
                        <td><span style={{ background: "rgba(249,115,22,0.1)", color: "#f97316", padding: "0.25rem 0.5rem", borderRadius: "4px", fontWeight: 700 }}>SENT FOR E-SIGN</span></td>
                        <td><span style={{ color: "var(--muted-foreground)" }}>— Pending Signatures</span></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 13: CUSTOMIZATION */}
        <section className="container" style={{ padding: "6rem 0" }} id="customization">
          <div className="glass-card grid-2" style={{ background: "var(--card-bg)", padding: "4rem" }}>
            <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", textAlign: "left" }}>
              <span className="badge" style={{ alignSelf: "flex-start" }}>🔧 High Adaptability</span>
              <h2 className="cause-font" style={{ fontSize: "2.25rem", lineHeight: 1.2, marginBottom: "1.5rem", color: "var(--text-color)" }}>Tailor CT-CRM to Your Organization</h2>
              <p style={{ fontSize: "0.95rem", color: "var(--muted-foreground)", lineHeight: 1.6, marginBottom: "2rem" }}>Every sales operation has unique parameters. Customize database fields, setup pipeline stages, save filters, and configure custom dashboards natively.</p>
              <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.75rem", fontSize: "0.9rem" }}>
                <li><strong style={{ color: "var(--brand-accent)" }}>➔</strong> Add custom status metrics and industry taxonomies</li>
                <li><strong style={{ color: "var(--brand-accent)" }}>➔</strong> Save customized filters for specific sales rep dashboards</li>
                <li><strong style={{ color: "var(--brand-accent)" }}>➔</strong> Define role-based permissions across admin and manager nodes</li>
              </ul>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ border: "1px dashed var(--card-border)", borderRadius: "20px", width: "100%", height: "260px", background: "rgba(0,0,0,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "1rem", padding: "2rem" }}>
                <span style={{ fontSize: "2rem" }}>🛠️</span>
                <strong className="cause-font" style={{ fontSize: "1.15rem", color: "var(--text-color)" }}>Custom Dashboard Nodes</strong>
                <p style={{ fontSize: "0.8rem", color: "var(--muted-foreground)", textAlign: "center", maxWidth: "300px" }}>Drag-and-drop widget center configured natively using high-fidelity CSS layout structures.</p>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 14 & 15: SECURITY & PERFORMANCE */}
        <section className="container" style={{ padding: "6rem 0" }} id="security-perf">
          <div className="grid-2">
            <div className="glass-card text-left">
              <span className="badge">🔒 Enterprise Security</span>
              <h3 className="cause-font" style={{ fontSize: "1.5rem", marginBottom: "1rem", color: "var(--text-color)" }}>Supabase RLS & Encrypted Ledgers</h3>
              <p style={{ fontSize: "0.9rem", color: "var(--muted-foreground)", lineHeight: 1.6, marginBottom: "1.5rem" }}>Data isolation is enforced natively. With Row Level Security (RLS) policies mapping users to organization nodes, client data remains securely sandboxed.</p>
              <ul style={{ listStyle: "none", paddingLeft: 0, fontSize: "0.85rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <li><strong>✓</strong> Row Level Security (RLS) data sandboxing</li>
                <li><strong>✓</strong> Encrypted storage for finalized legal retainers</li>
                <li><strong>✓</strong> Comprehensive audit log files</li>
              </ul>
            </div>

            <div className="glass-card text-left">
              <span className="badge">⚡ Blazing Speed</span>
              <h3 className="cause-font" style={{ fontSize: "1.5rem", marginBottom: "1rem", color: "var(--text-color)" }}>100/100 Lighthouse Performance</h3>
              <p style={{ fontSize: "0.9rem", color: "var(--muted-foreground)", lineHeight: 1.6, marginBottom: "1.5rem" }}>Built with static HTML layout systems, lightweight CSS templates, and parallel database fetching. Enjoy instant responsiveness when navigating, changing tabs, or logging calls.</p>
              <ul style={{ listStyle: "none", paddingLeft: 0, fontSize: "0.85rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <li><strong>✓</strong> Concurrently batched data loading queries</li>
                <li><strong>✓</strong> Highly optimized static assets</li>
                <li><strong>✓</strong> Sub-100ms client-side page transitions</li>
              </ul>
            </div>
          </div>
        </section>

        {/* SECTION 16: TESTIMONIALS (AUTO-SCROLLING VERTICAL MARQUEE) */}
        <section className="testimonials-section container" id="testimonials">
          <div className="section-header">
            <span className="badge">💬 Client Feedback</span>
            <h2 className="cause-font">What Enterprise Leaders Say</h2>
            <p>Hear from founders, directors, and sales managers who replaced spreadsheets with CT-CRM. Hover to pause scroll.</p>
          </div>
          
          <div className="testimonials-marquee-container">
            <div className="testimonials-marquee-track">
              {/* Render testimonials list */}
              {testimonials.map((t, idx) => (
                <div key={`t1-${idx}`} className="testimonial-scroll-card">
                  <p className="testimonial-quote">&ldquo;{t.quote}&rdquo;</p>
                  <div className="testimonial-profile">
                    <div className="testimonial-avatar">{t.avatar}</div>
                    <div>
                      <strong style={{ display: "block", color: "var(--text-color)", fontSize: "0.95rem" }}>{t.name}</strong>
                      <span style={{ color: "var(--muted-foreground)", fontSize: "0.8rem" }}>{t.role}</span>
                    </div>
                  </div>
                </div>
              ))}
              {/* Duplicate list to enable seamless vertical looping scroll */}
              {testimonials.map((t, idx) => (
                <div key={`t2-${idx}`} className="testimonial-scroll-card">
                  <p className="testimonial-quote">&ldquo;{t.quote}&rdquo;</p>
                  <div className="testimonial-profile">
                    <div className="testimonial-avatar">{t.avatar}</div>
                    <div>
                      <strong style={{ display: "block", color: "var(--text-color)", fontSize: "0.95rem" }}>{t.name}</strong>
                      <span style={{ color: "var(--muted-foreground)", fontSize: "0.8rem" }}>{t.role}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* SECTION 17: CASE STUDIES */}
        <section className="container" style={{ padding: "6rem 0" }} id="case-studies">
          <div className="section-header">
            <span className="badge">🏆 Proven Success</span>
            <h2 className="cause-font">Enterprise Growth Case Studies</h2>
            <p>Discover how corporate operations scale pipeline velocities using our structured CRM standards.</p>
          </div>
          
          <div className="grid-3">
            <div className="glass-card text-left">
              <span className="badge" style={{ background: "rgba(16,185,129,0.1)", color: "#10b981", border: "1px solid rgba(16,185,129,0.3)" }}>+140% REVENUE</span>
              <h3 className="cause-font" style={{ fontSize: "1.25rem", marginTop: "1rem", marginBottom: "0.75rem" }}>Cosmic Tech scale</h3>
              <p style={{ fontSize: "0.9rem", color: "var(--muted-foreground)", lineHeight: 1.6, marginBottom: "1.5rem" }}><strong>Before:</strong> Lead details were stored on multiple scattered Excel spreadsheets, with an average response time of 2 hours.<br /><strong>After:</strong> Fully centralized pipeline with e-sign contract loops.</p>
              <strong style={{ color: "var(--brand-accent)", fontSize: "0.95rem" }}>Turnaround Time: &lt;3 mins</strong>
            </div>

            <div className="glass-card text-left">
              <span className="badge" style={{ background: "rgba(16,185,129,0.1)", color: "#10b981", border: "1px solid rgba(16,185,129,0.3)" }}>-72% SIGN CYCLE</span>
              <h3 className="cause-font" style={{ fontSize: "1.25rem", marginTop: "1rem", marginBottom: "0.75rem" }}>TechStart Retainer Gate</h3>
              <p style={{ fontSize: "0.9rem", color: "var(--muted-foreground)", lineHeight: 1.6, marginBottom: "1.5rem" }}><strong>Before:</strong> E-signature and legal clearances involved using three disconnected single-purpose apps, taking up to 5 days.<br /><strong>After:</strong> Unified e-signature audit ledger.</p>
              <strong style={{ color: "var(--brand-accent)", fontSize: "0.95rem" }}>Avg Signoff Cycle: 12 Hours</strong>
            </div>

            <div className="glass-card text-left">
              <span className="badge" style={{ background: "rgba(16,185,129,0.1)", color: "#10b981", border: "1px solid rgba(16,185,129,0.3)" }}>+38% progressions</span>
              <h3 className="cause-font" style={{ fontSize: "1.25rem", marginTop: "1rem", marginBottom: "0.75rem" }}>NovaTech BANT Qualification</h3>
              <p style={{ fontSize: "0.9rem", color: "var(--muted-foreground)", lineHeight: 1.6, marginBottom: "1.5rem" }}><strong>Before:</strong> Sales reps spent 50% of their working hours pursuing leads without verified budgets or timing checklists.<br /><strong>After:</strong> Hard BANT scorecard qualification.</p>
              <strong style={{ color: "var(--brand-accent)", fontSize: "0.95rem" }}>Win/Loss Rate: +22%</strong>
            </div>
          </div>
        </section>

        {/* SECTION 18: COMPARISON TABLE */}
        <section className="comparison-section container" id="comparison">
          <div className="section-header">
            <span className="badge">⚔️ Market Comparison</span>
            <h2 className="cause-font">Why CT-CRM is Better</h2>
            <p>Evaluate our structural capabilities against manual spreadsheet tracking and bloated generic CRM products.</p>
          </div>
          
          <div className="table-wrapper">
            <table className="comparison-table">
              <thead>
                <tr>
                  <th>Capabilities</th>
                  <th>CT-CRM Platform</th>
                  <th>Traditional Spreadsheet</th>
                  <th>Legacy Bloated CRM</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Centralized Leads Intake</strong></td>
                  <td className="feature-check">✓ Fully Integrated</td>
                  <td className="feature-cross">✗ Manual Entry</td>
                  <td className="feature-check">✓ Yes (Complex setup)</td>
                </tr>
                <tr>
                  <td><strong>BANT Qualification Framework</strong></td>
                  <td className="feature-check">✓ Embedded Scorecard</td>
                  <td className="feature-cross">✗ None</td>
                  <td className="feature-cross">✗ Requires add-ons</td>
                </tr>
                <tr>
                  <td><strong>Integrated E-Signature Ledger</strong></td>
                  <td className="feature-check">✓ Native Audited E-Sign</td>
                  <td className="feature-cross">✗ Disconnected PDF</td>
                  <td className="feature-cross">✗ Third-party costs</td>
                </tr>
                <tr>
                  <td><strong>Weighted Sales Forecasting</strong></td>
                  <td className="feature-check">✓ Auto Calculated</td>
                  <td className="feature-cross">✗ Complex Excel equations</td>
                  <td className="feature-check">✓ Yes</td>
                </tr>
                <tr>
                  <td><strong>Supabase Data Isolation (RLS)</strong></td>
                  <td className="feature-check">✓ Active Security</td>
                  <td className="feature-cross">✗ Shared sheets risk</td>
                  <td className="feature-check">✓ Yes</td>
                </tr>
                <tr>
                  <td><strong>Page Transition Performance</strong></td>
                  <td className="feature-check">✓ Blazing (Sub-100ms)</td>
                  <td className="feature-check">✓ Yes</td>
                  <td className="feature-cross">✗ Slow & Bloated</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* SECTION 19: FAQ ACCORDION */}
        <section className="faq-section container" id="faq">
          <div className="section-header">
            <span className="badge">❓ Common Questions</span>
            <h2 className="cause-font">Frequently Answered Ledger</h2>
            <p>Everything you need to understand about our features, database infrastructure, security, and setup.</p>
          </div>
          
          <div className="faq-categories">
            <button className={`faq-cat-btn ${activeFaqCategory === "all" ? "active" : ""}`} onClick={() => setActiveFaqCategory("all")}>All FAQs</button>
            <button className={`faq-cat-btn ${activeFaqCategory === "general" ? "active" : ""}`} onClick={() => setActiveFaqCategory("general")}>General</button>
            <button className={`faq-cat-btn ${activeFaqCategory === "pricing" ? "active" : ""}`} onClick={() => setActiveFaqCategory("pricing")}>Pricing</button>
            <button className={`faq-cat-btn ${activeFaqCategory === "security" ? "active" : ""}`} onClick={() => setActiveFaqCategory("security")}>Security</button>
            <button className={`faq-cat-btn ${activeFaqCategory === "migration" ? "active" : ""}`} onClick={() => setActiveFaqCategory("migration")}>Migration</button>
            <button className={`faq-cat-btn ${activeFaqCategory === "integrations" ? "active" : ""}`} onClick={() => setActiveFaqCategory("integrations")}>Integrations</button>
          </div>

          <div className="faq-list">
            {filteredFaqs.map((faq) => (
              <div key={faq.id} className={`faq-item ${expandedFaqId === faq.id ? "active" : ""}`}>
                <button className="faq-question" onClick={() => toggleFaq(faq.id)}>
                  <span>{faq.q}</span>
                  <span className="faq-icon-arrow"><ChevronDown size={16} /></span>
                </button>
                <div className="faq-answer">
                  <p>{faq.a}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* SECTION 20: FINAL CTA */}
        <section className="final-cta-section container" id="cta-block">
          <div className="final-cta-card">
            <h2 className="cause-font">Ready to Close More Deals?</h2>
            <p>Stop losing potential revenue in scattered spreadsheets. Bring structure, speed, and automated e-signatures to your sales pipeline today.</p>
            <div className="hero-ctas">
              <Link href="/register" className="wm-btn wm-btn-storm" id="final-cta-trial"><span>Start Free 14-Day Trial</span></Link>
              <Link href="#showcase" className="wm-btn wm-btn-neu" id="final-cta-demo">Explore Sandbox</Link>
              <Link href="mailto:sales@ct-crm.enterprise" className="wm-btn wm-btn-outline" id="final-cta-sales">Talk to Sales</Link>
            </div>
          </div>
        </section>

      </main>

      {/* SECTION 21: FOOTER */}
      <footer className="footer">
        <div className="container">
          <div className="footer-grid">
            <div className="footer-col" style={{ textAlign: "left" }}>
              <Link href="#" className="logo" style={{ marginBottom: "1.5rem" }}>
                <div className="logo-icon">CT</div>
                <span>CT-<span className="accent">CRM</span></span>
              </Link>
              <p style={{ fontSize: "0.85rem", lineHeight: 1.6, maxWidth: "250px", marginBottom: "1.5rem" }}>Enterprise-grade sales pipeline, BANT qualification checklist, and secure e-signature contract management system.</p>
              <p>&copy; 2026 Cosmic Trio Enterprise. All rights reserved.</p>
            </div>
            
            <div className="footer-col" style={{ textAlign: "left" }}>
              <h4>Product</h4>
              <ul>
                <li><Link href="#features">Core Features</Link></li>
                <li><Link href="#pipeline">Sales Pipeline</Link></li>
                <li><Link href="#solution">Workflows</Link></li>
                <li><Link href="#ai-roadmap">AI Intelligence</Link></li>
              </ul>
            </div>

            <div className="footer-col" style={{ textAlign: "left" }}>
              <h4>Security & Operations</h4>
              <ul>
                <li><Link href="#security-perf">Supabase Security</Link></li>
                <li><Link href="#security-perf">Performance Nodes</Link></li>
                <li><Link href="/login">Sales Portal</Link></li>
              </ul>
            </div>

            <div className="footer-col" style={{ textAlign: "left" }}>
              <h4>Company</h4>
              <ul>
                <li><Link href="#">About Us</Link></li>
                <li><Link href="#">Security Center</Link></li>
                <li><Link href="#">Careers</Link></li>
                <li><Link href="#">Press Kit</Link></li>
              </ul>
            </div>

            <div className="footer-col" style={{ textAlign: "left" }}>
              <h4>Legal</h4>
              <ul>
                <li><Link href="#">Privacy Agreement</Link></li>
                <li><Link href="#">Terms of Use</Link></li>
                <li><Link href="#">DPA Annex</Link></li>
                <li><Link href="#">Compliance Registry</Link></li>
              </ul>
            </div>
          </div>

          <div className="footer-bottom">
            <div>
              Status: <span style={{ color: "#10b981", fontWeight: 700 }}>🟢 ALL SYSTEMS ONLINE</span>
            </div>
            <div className="footer-links" style={{ display: "flex", gap: "1rem" }}>
              <Link href="#">Twitter</Link>
              <Link href="#">Github</Link>
              <Link href="#">LinkedIn</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
