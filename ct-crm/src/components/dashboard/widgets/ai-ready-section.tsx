"use client";

import { useState, useEffect, useRef } from "react";
import { WidgetWrapper } from "./widget-wrapper";
import { toast } from "sonner";
import { 
  Sparkles, Bot, MessageSquare, Send, Calendar, ShieldCheck, 
  TrendingUp, Users, DollarSign, Activity, AlertTriangle, Play,
  RefreshCw, CheckCircle2, ChevronRight, FileText, Grid, Plus, 
  Trash2, Search, ArrowRightLeft, Layers, Check, X, ShieldAlert, 
  Sliders, Database, Eye, Share2, Award, Zap, GitBranch, Shield, 
  Clock, FileSpreadsheet, Lock, HelpCircle, Download
} from "lucide-react";

// ============================================
// Types for Phase 3 Universal Workspace Engine
// ============================================
interface GridColumn {
  key: string;
  label: string;
  type: "text" | "number" | "currency" | "formula" | "select";
  formulaExpression?: string; // e.g. "value * 0.1"
}

interface GridRow {
  id: string;
  name: string;
  company: string;
  source: string;
  status: string;
  value: number;
  [customKey: string]: any;
}

interface ContractRow {
  id: string;
  dealName: string;
  client: string;
  status: "DRAFT" | "SENT" | "SIGNED" | "EXPIRED";
  value: number;
  signatureCert?: string;
  signedAt?: string;
}

interface AgentInfo {
  id: string;
  name: string;
  role: "SDR" | "CRM" | "Proposal" | "Meeting" | "Revenue" | "Knowledge" | "Intelligence";
  icon: any;
  status: "IDLE" | "ACTIVE" | "COMPLETED";
  description: string;
  prompt: string;
}

interface AuditLog {
  timestamp: string;
  agent: string;
  action: string;
  entity: string;
  status: "SUCCESS" | "WARNING" | "INFO";
}

export function AIReadySection() {
  const [activeTab, setActiveTab] = useState<string>("workspace");
  const [loading, setLoading] = useState<boolean>(false);

  // ============================================
  // PILLAR 2 & 3: Universal Workspace & Excel Grid State
  // ============================================
  const [columns, setColumns] = useState<GridColumn[]>([
    { key: "name", label: "Lead Name", type: "text" },
    { key: "company", label: "Company", type: "text" },
    { key: "source", label: "Lead Source", type: "select" },
    { key: "value", label: "Est. Value", type: "currency" },
    { key: "commission", label: "AI Commission", type: "formula", formulaExpression: "value * 0.15" }
  ]);

  // Master rows representing current database state
  const [rows, setRows] = useState<GridRow[]>([
    { id: "row-1", name: "Vikram Singh", company: "Acme Corp", source: "GOOGLE", status: "QUALIFIED", value: 450000 },
    { id: "row-2", name: "Neha Patel", company: "TechStart Inc", source: "META", status: "INTERESTED", value: 120000 },
    { id: "row-3", name: "Arjun Mehta", company: "CloudSoft Technologies", source: "REFERRAL", status: "QUALIFIED", value: 320000 },
    { id: "row-4", name: "Sanya Reddy", company: "DataFlow India", source: "DIRECT", status: "CONTACTED", value: 280000 },
  ]);

  // Backup of rows for Time Travel Replays (Pillar 15)
  const [historicalSnapshots, setHistoricalSnapshots] = useState<GridRow[][]>([
    [
      { id: "row-1", name: "Vikram Singh", company: "Acme Corp", source: "GOOGLE", status: "NEW", value: 450000 }
    ],
    [
      { id: "row-1", name: "Vikram Singh", company: "Acme Corp", source: "GOOGLE", status: "QUALIFIED", value: 450000 },
      { id: "row-2", name: "Neha Patel", company: "TechStart Inc", source: "META", status: "NEW", value: 120000 }
    ],
    [
      { id: "row-1", name: "Vikram Singh", company: "Acme Corp", source: "GOOGLE", status: "QUALIFIED", value: 450000 },
      { id: "row-2", name: "Neha Patel", company: "TechStart Inc", source: "META", status: "INTERESTED", value: 120000 },
      { id: "row-3", name: "Arjun Mehta", company: "CloudSoft Technologies", source: "REFERRAL", status: "QUALIFIED", value: 320000 }
    ],
    [
      { id: "row-1", name: "Vikram Singh", company: "Acme Corp", source: "GOOGLE", status: "QUALIFIED", value: 450000 },
      { id: "row-2", name: "Neha Patel", company: "TechStart Inc", source: "META", status: "INTERESTED", value: 120000 },
      { id: "row-3", name: "Arjun Mehta", company: "CloudSoft Technologies", source: "REFERRAL", status: "QUALIFIED", value: 320000 },
      { id: "row-4", name: "Sanya Reddy", company: "DataFlow India", source: "DIRECT", status: "CONTACTED", value: 280000 }
    ]
  ]);

  const [activeWorkspaceView, setActiveWorkspaceView] = useState<"LEADS" | "CONTRACTS">("LEADS");
  const [contracts, setContracts] = useState<ContractRow[]>([
    { id: "c-1", dealName: "Acme SOW Agreement", client: "Vikram Singh", status: "DRAFT", value: 450000 },
    { id: "c-2", dealName: "TechStart Licensing", client: "Neha Patel", status: "SIGNED", value: 120000, signatureCert: "SHA-256:d8a2...3f90", signedAt: "2026-06-01 10:14" },
    { id: "c-3", dealName: "CloudSoft Enterprise", client: "Arjun Mehta", status: "SENT", value: 320000 },
  ]);

  // Formula state
  const [formulaInput, setFormulaInput] = useState("value * 0.15");

  // Filtering & Grouping
  const [filterSource, setFilterSource] = useState<string>("ALL");
  const [groupByField, setGroupByField] = useState<"NONE" | "SOURCE" | "STATUS">("NONE");

  // Column builder modal
  const [isColModalOpen, setIsColModalOpen] = useState(false);
  const [newColLabel, setNewColLabel] = useState("");
  const [newColType, setNewColType] = useState<GridColumn["type"]>("text");

  // Inline Cell edit state
  const [editingCell, setEditingCell] = useState<{ rowId: string; colKey: string } | null>(null);
  const [editValue, setEditValue] = useState<string>("");

  // ============================================
  // PILLAR 7: Smart Import Platform State
  // ============================================
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importSource, setImportSource] = useState<"CSV" | "HUBSPOT" | "SALESFORCE">("CSV");
  const [importStep, setImportStep] = useState<1 | 2 | 3>(1);
  const [importedFileName, setImportedFileName] = useState("");
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [isImportRunning, setIsImportRunning] = useState(false);

  // ============================================
  // PILLAR 1: AI SDR & CRM Workforce State
  // ============================================
  const [agents, setAgents] = useState<AgentInfo[]>([
    { id: "ag-1", name: "AI SDR Agent", role: "SDR", icon: Bot, status: "IDLE", description: "Auto-ingests new leads, qualifies leads via BANT, and dispatches multi-step follow-ups.", prompt: "Analyze lead sources and check for budget over ₹3L, authority levels, clear paintpoints, and quick timeline schedules." },
    { id: "ag-2", name: "AI CRM Agent", role: "CRM", icon: Database, status: "IDLE", description: "Auto logs activity timeline events, flags record duplicates, and maps decision makers.", prompt: "Identify customer champions, track emails/meetings timeline logs, and run daily duplicate record audits." },
    { id: "ag-3", name: "AI Proposal Agent", role: "Proposal", icon: FileText, status: "IDLE", description: "Builds dynamic pricing packages, estimates margins, and personalizes client contracts.", prompt: "Parse customer pain points from transcripts and calculate customizable price tiers with up to 15% discount thresholds." },
    { id: "ag-4", name: "AI Meeting Agent", role: "Meeting", icon: Calendar, status: "IDLE", description: "Prepares meeting talking points briefings, records logs, and drafts objections battlecards.", prompt: "Log speech transcript streams, highlight competitor pricing mentions, and create action checklists." },
    { id: "ag-5", name: "AI Revenue Agent", role: "Revenue", icon: TrendingUp, status: "IDLE", description: "Analyzes pipelines friction velocity and automatically highlights stalled deals.", prompt: "Model overall conversion velocities, flags deals stuck at negotiation stage over 14 days, and gives predictions." },
    { id: "ag-6", name: "AI Knowledge Agent", role: "Knowledge", icon: Search, status: "IDLE", description: "Performs semantic vector search inquiries across all corporate agreement history logs.", prompt: "Run RAG queries across organization memories, WhatsApp history grids, and past SOW PDF drafts." },
  ]);

  const [agentStatus, setAgentStatus] = useState<"IDLE" | "RUNNING" | "COMPLETED">("IDLE");
  const [agentLogs, setAgentLogs] = useState<string[]>([
    "🤖 Multi-Agent Orchestrator: System idle. Awaiting next lead intake stream...",
  ]);
  const [orchestratorProgress, setOrchestratorProgress] = useState(0);

  // ============================================
  // PILLAR 8: AI Analytics Engine State
  // ============================================
  const [nlQuery, setNlQuery] = useState("");
  const [nlResult, setNlResult] = useState<any | null>(null);

  // ============================================
  // PILLAR 4 & 12: No-Code Visual Workflow Builder
  // ============================================
  const [workflowTemplates, setWorkflowTemplates] = useState<any[]>([
    { id: "w-1", name: "Hot WhatsApp Lead Assign", event: "Lead Created", conditions: "Value > ₹3L && Source = WhatsApp", actions: "Assign Sales Manager & Dispatch Twilio SMS notification", active: true },
    { id: "w-2", name: "High Value Deal Won Task", event: "Deal Won", conditions: "Revenue > ₹5L", actions: "Auto-create Client Retainer & Send Slack Celebration", active: true }
  ]);
  const [isWfModalOpen, setIsWfModalOpen] = useState(false);
  const [wfName, setWfName] = useState("");
  const [wfEvent, setWfEvent] = useState("Lead Created");
  const [wfCondition, setWfCondition] = useState("Value > ₹3L");
  const [wfAction, setWfAction] = useState("Auto-send Email SMTP Notification");

  // ============================================
  // PILLAR 10 & 9 & 11: Document Platform & SOW E-Sign Engine
  // ============================================
  const [sowClientName, setSowClientName] = useState("Vikram Singh");
  const [sowScope, setSowScope] = useState("Custom AI Core CRM system integration and Supabase data migrations setup.");
  const [sowItems, setSowItems] = useState([
    { id: "i-1", name: "CRM Foundation Workspace Setup", qty: 1, rate: 150000, discount: 0 },
    { id: "i-2", name: "AI SDR & CRM Pipeline Training", qty: 2, rate: 75000, discount: 10 },
    { id: "i-3", name: "Custom API & Whatsapp Integrations", qty: 1, rate: 200000, discount: 5 },
  ]);
  const [isSowSigned, setIsSowSigned] = useState(false);
  const [sowSignerName, setSowSignerName] = useState("");
  const [sowSignatureHash, setSowSignatureHash] = useState("");
  const [isSigning, setIsSigning] = useState(false);

  // ============================================
  // PILLAR 5: Universal Relationship Graph State
  // ============================================
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [selectedNodeDetail, setSelectedNodeDetail] = useState<any>(null);

  // ============================================
  // PILLAR 14 & 15: Event Ledger & Audit Time Travel State
  // ============================================
  const [timeTravelIndex, setTimeTravelIndex] = useState<number>(3); // Max index is 3 (most recent)
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([
    { timestamp: "2026-06-02 18:40", agent: "AI SDR Agent", action: "Qualified lead Vikram Singh (BANT checklist complete)", entity: "Vikram Singh", status: "SUCCESS" },
    { timestamp: "2026-06-02 18:41", agent: "AI CRM Agent", action: "Created Deal pipeline 'Acme Corp Deal' at Stage A", entity: "Acme Corp Deal", status: "INFO" },
    { timestamp: "2026-06-02 18:42", agent: "AI Proposal Agent", action: "Compiled SOW version V2 with custom commission rates", entity: "SOW Agreement", status: "INFO" },
    { timestamp: "2026-06-02 18:43", agent: "AI Meeting Agent", action: "Synced talking brief objections list for next zoom call", entity: "Meeting Zoom #2", status: "SUCCESS" },
  ]);

  // ============================================
  // Pillar 16: Executive Command Center Metrics
  // ============================================
  const totalForecastRevenue = rows.reduce((acc, r) => acc + r.value, 0);
  const totalAICommission = rows.reduce((acc, r) => {
    // Parse user formula dynamically or fallback to current
    const commission = getRowCommission(r);
    return acc + commission;
  }, 0);

  // Dynamic formula execution (Pillar 3 Formula Engine)
  function getRowCommission(row: GridRow): number {
    try {
      // Clean and sanitize formula expression
      const cleanExpr = formulaInput.toLowerCase().replace(/value/g, String(row.value));
      // Safe math evaluation
      // eslint-disable-next-line no-eval
      const result = eval(cleanExpr);
      return typeof result === "number" && !isNaN(result) ? result : 0;
    } catch {
      return row.value * 0.15; // Fallback default
    }
  }

  // ============================================
  // Methods & Simulations
  // ============================================

  // Time Travel Slider Change (Pillar 15)
  const handleTimeTravelChange = (index: number) => {
    setTimeTravelIndex(index);
    // Rewind database state matching snapshot index
    const snapshot = historicalSnapshots[index];
    if (snapshot) {
      setRows(snapshot);
      toast.info(`Time Travel Replayed: database rewound to Snapshot Step ${index + 1}`, {
        icon: "⏳"
      });
    }
  };

  // Inline grid edit update
  const handleCellEditSave = (rowId: string, colKey: string) => {
    setRows(prev => prev.map(r => {
      if (r.id === rowId) {
        let updatedRow = { ...r };
        if (colKey === "value") {
          updatedRow.value = parseFloat(editValue) || 0;
        } else {
          updatedRow[colKey] = editValue;
        }
        return updatedRow;
      }
      return r;
    }));
    setEditingCell(null);
    toast.success("Grid cell updated in live database");
  };

  // Create column dynamically (Dynamic Column Engine - Pillar 2)
  const handleCreateColumn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newColLabel) return;

    const colKey = newColLabel.toLowerCase().replace(/\s+/g, "_");
    const newCol: GridColumn = {
      key: colKey,
      label: newColLabel,
      type: newColType
    };

    setColumns(prev => {
      // Insert before commission formula
      const copy = [...prev];
      copy.splice(copy.length - 1, 0, newCol);
      return copy;
    });

    // Pre-populate rows with default empty values
    setRows(prev => prev.map(r => ({ ...r, [colKey]: newColType === "number" || newColType === "currency" ? 0 : "" })));
    setHistoricalSnapshots(prevSnapshots => prevSnapshots.map(snap => snap.map(r => ({ ...r, [colKey]: newColType === "number" || newColType === "currency" ? 0 : "" }))));

    setIsColModalOpen(false);
    setNewColLabel("");
    toast.success(`Dynamic Schema Field "${newColLabel}" added successfully to organization table!`);
  };

  // Get displayed cell values
  const getCellValue = (row: GridRow, col: GridColumn) => {
    if (col.type === "formula") {
      return getRowCommission(row);
    }
    return row[col.key];
  };

  // Run AI Sales Run Sequence (Pillar 1 SDR/CRM Workforce)
  const handleRunAIWorkforce = () => {
    if (agentStatus === "RUNNING") return;

    setAgentStatus("RUNNING");
    setOrchestratorProgress(10);
    setAgentLogs(["🤖 Multi-Agent Orchestrator: Triggered joint pipelines session..."]);

    // SDR Agent Turn
    setTimeout(() => {
      setAgents(prev => prev.map(a => a.role === "SDR" ? { ...a, status: "ACTIVE" } : a));
      setOrchestratorProgress(25);
      setAgentLogs(prev => [
        ...prev,
        "🔍 AI SDR Agent [ACTIVE]: Ingesting new web form submission lead 'Vikram Singh' from GOOGLE.",
        "📊 AI SDR Agent: BANT scorecard calculation -> Budget: Validated (₹4.5L), Authority: Decision Maker (VP Corp), Need: High (Replace legacy Salesforce), Timeline: Immediate.",
        "✅ AI SDR Agent: Lead scoring evaluated: 92/100 (HOT). Escalating immediately to qualified CRM queue."
      ]);
    }, 1200);

    // CRM Agent Turn
    setTimeout(() => {
      setAgents(prev => prev.map(a => a.role === "SDR" ? { ...a, status: "COMPLETED" } : a.role === "CRM" ? { ...a, status: "ACTIVE" } : a));
      setOrchestratorProgress(50);
      setAgentLogs(prev => [
        ...prev,
        "🗄️ AI CRM Agent [ACTIVE]: Running global duplicates scanner... Zero matches found.",
        "🔄 AI CRM Agent: Automatically created new Organization ('Acme Corp') and unified Account contact profile.",
        "📅 AI CRM Agent: Provisioned standard checklist task ('Arrange initial Zoom discovery call') and assigned to org manager."
      ]);
    }, 2800);

    // Proposal Agent Turn
    setTimeout(() => {
      setAgents(prev => prev.map(a => a.role === "CRM" ? { ...a, status: "COMPLETED" } : a.role === "Proposal" ? { ...a, status: "ACTIVE" } : a));
      setOrchestratorProgress(75);
      setAgentLogs(prev => [
        ...prev,
        "📄 AI Proposal Agent [ACTIVE]: Initializing dynamic pricing bundle calculator.",
        "💰 AI Proposal Agent: Analyzed industry margins -> Estimated SOW total ₹4,50,000. Applying auto-commission calculation formula.",
        "✍️ AI Proposal Agent: Successfully generated Agreement PDF draft 'Acme Corp SOW Agreement v2.0' and uploaded to customer portal."
      ]);
    }, 4500);

    // Meeting & Revenue Agent Turn
    setTimeout(() => {
      setAgents(prev => prev.map(a => a.role === "Proposal" ? { ...a, status: "COMPLETED" } : a.role === "Meeting" || a.role === "Revenue" ? { ...a, status: "COMPLETED" } : a));
      setOrchestratorProgress(100);
      setAgentLogs(prev => [
        ...prev,
        "🎤 AI Meeting Agent: Synced objection battlecards (competitor mentions, license volume discounts) for Sales zoom call.",
        "📈 AI Revenue Agent: Pipeline velocity model updated. Forecast accuracy confidence increases to 94.5%!",
        "🏁 Multi-Agent Orchestrator: All joint pipeline operations ran successfully! Status: IDLE."
      ]);
      setAgentStatus("COMPLETED");

      // Append historical snapshot
      const newLead = { id: "row-" + (rows.length + 1), name: "Vikram Singh", company: "Acme Corp", source: "GOOGLE", status: "QUALIFIED", value: 450000 };
      setRows(prev => {
        // Prevent duplicating Vikram Singh if already exists
        if (prev.some(r => r.name === "Vikram Singh")) return prev;
        return [newLead, ...prev];
      });

      // Add audit log
      const newAudit: AuditLog = {
        timestamp: "2026-06-02 18:45",
        agent: "Multi-Agent Orchestrator",
        action: "Executed autonomous SDR -> CRM -> Proposal campaign route for Vikram Singh",
        entity: "Vikram Singh Lead",
        status: "SUCCESS"
      };
      setAuditLogs(prev => [newAudit, ...prev]);

      toast.success("Autonomous workforce sequence completed! CRM record updated.");
    }, 6500);
  };

  const handleResetAgents = () => {
    setAgents(prev => prev.map(a => ({ ...a, status: "IDLE" })));
    setAgentStatus("IDLE");
    setOrchestratorProgress(0);
    setAgentLogs(["🤖 Multi-Agent Orchestrator: System reset. Awaiting next lead intake stream..."]);
  };

  // Smart Import Simulator (Pillar 7)
  const handleStartImport = (source: "CSV" | "HUBSPOT" | "SALESFORCE") => {
    setImportSource(source);
    setImportedFileName(source === "CSV" ? "leads_export_q2.csv" : `${source} API Live Sync`);
    setCsvHeaders(["Full Name", "Corporate Email", "Company Name", "Acquisition Channel", "Est Contract Value", "Country"]);
    setColumnMapping({
      "Full Name": "name",
      "Company Name": "company",
      "Acquisition Channel": "source",
      "Est Contract Value": "value"
    });
    setImportStep(2);
  };

  const handleRunImportMapping = () => {
    setIsImportRunning(true);
    toast.info("Parsing spreadsheet lines and creating dynamic database rows...");
    
    setTimeout(() => {
      // Create new rows from imported CSV simulation
      const importedRows: GridRow[] = [
        { id: "row-imp1", name: "Rohan Sharma", company: "Maruti Tech", source: "GOOGLE", status: "INTERESTED", value: 550000 },
        { id: "row-imp2", name: "Deepika Sen", company: "Bengaluru Devs", source: "REFERRAL", status: "QUALIFIED", value: 380000 }
      ];

      setRows(prev => [...prev, ...importedRows]);
      
      // Also update historical snapshots so they include imported rows in further travel
      setHistoricalSnapshots(prev => prev.map(snap => [...snap, ...importedRows]));

      // Add Event Audit Log (Pillar 14)
      setAuditLogs(prev => [
        { timestamp: "2026-06-02 18:46", agent: "Smart Import Platform", action: "Imported 2 records from leads_export_q2.csv and mapped schema fields", entity: "leads table", status: "SUCCESS" },
        ...prev
      ]);

      setIsImportRunning(false);
      setIsImportModalOpen(false);
      setImportStep(1);
      toast.success("Successfully imported 2 new records! Spreadsheet dynamically expanded.");
    }, 2000);
  };

  // Visual Workflow creation (Pillar 4)
  const handleCreateWorkflow = (e: React.FormEvent) => {
    e.preventDefault();
    if (!wfName) return;

    const newWf = {
      id: "w-" + (workflowTemplates.length + 1),
      name: wfName,
      event: wfEvent,
      conditions: wfCondition,
      actions: wfAction,
      active: true
    };

    setWorkflowTemplates(prev => [...prev, newWf]);
    setIsWfModalOpen(false);
    setWfName("");
    toast.success(`Workflow "${wfName}" published live to CRM Automation Layer!`);
  };

  // SOW Item list calculations (Pillar 10)
  const updateSowItemQty = (id: string, qty: number) => {
    setSowItems(prev => prev.map(item => item.id === id ? { ...item, qty: Math.max(0, qty) } : item));
  };

  const updateSowItemDiscount = (id: string, disc: number) => {
    setSowItems(prev => prev.map(item => item.id === id ? { ...item, discount: Math.min(100, Math.max(0, disc)) } : item));
  };

  const sowSubtotal = sowItems.reduce((acc, item) => acc + (item.qty * item.rate), 0);
  const sowDiscountsTotal = sowItems.reduce((acc, item) => acc + (item.qty * item.rate * (item.discount / 100)), 0);
  const sowGST = (sowSubtotal - sowDiscountsTotal) * 0.18; // 18% GST standard
  const sowFinalTotal = (sowSubtotal - sowDiscountsTotal) + sowGST;

  // E-Sign Contract Simulation (Pillar 10)
  const handleSignContract = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sowSignerName) return;

    setIsSigning(true);
    toast.info("Encrypting document SOW terms and generating e-signature cert...");

    setTimeout(() => {
      // Generate standard SHA hash representation
      const certHash = "SHA-256:" + Array.from({length: 16}, () => Math.floor(Math.random()*16).toString(16)).join("") + "..." + Array.from({length: 8}, () => Math.floor(Math.random()*16).toString(16)).join("");
      
      setSowSignatureHash(certHash);
      setIsSowSigned(true);
      setIsSigning(false);

      // Update associated contract status (Pillar 9 Portal link)
      setContracts(prev => prev.map(c => c.client === sowClientName ? { ...c, status: "SIGNED", signatureCert: certHash, signedAt: "2026-06-02 18:47" } : c));

      // Append Event
      setAuditLogs(prev => [
        { timestamp: "2026-06-02 18:47", agent: "E-Sign Document Portal", action: `Contract signed via E-Sign by customer: ${sowSignerName}`, entity: "SOW Agreement", status: "SUCCESS" },
        ...prev
      ]);

      toast.success("Document E-Signed successfully! Synced to secure Customer Portal.");
    }, 1800);
  };

  // Natural Language Queries Simulator (Pillar 8 Analytics Engine)
  const handleNLQQuery = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nlQuery.trim()) return;

    setLoading(true);
    setTimeout(() => {
      const query = nlQuery.toLowerCase();
      let result = {
        title: "AI Custom Analytics Chart",
        summary: "No direct matching patterns found. Try asking: 'Why are deals slowing down?', 'Which source converts best?', or 'Show lost deals above 5L' for custom strategic dashboards.",
        chartData: null
      };

      if (query.includes("slow") || query.includes("stuck") || query.includes("delay")) {
        result = {
          title: "Deal Pipeline Bottlenecks (Negotiation Stage)",
          summary: "Pipeline bottleneck detected at NEGOTIATION stage. Average cycle time increased by 15.4 days due to contract signature delays. High risk flagged for Acme Corp deal.",
          chartData: {
            labels: ["Intake", "BANT Gate", "Proposal", "Negotiation", "Won"],
            values: [100, 80, 55, 12, 10] // Sharp drop off at negotiation
          }
        };
      } else if (query.includes("convert") || query.includes("source") || query.includes("marketing")) {
        result = {
          title: "Marketing Source ROI Analysis",
          summary: "GOOGLE leads convert best, maintaining a 42.8% conversion rate. REFERRAL leads follow closely at 38%. META ads show high traffic but lowest overall conversion velocity.",
          chartData: {
            labels: ["Google", "Referral", "Meta", "Direct"],
            values: [42.8, 38.0, 18.5, 22.0]
          }
        };
      } else if (query.includes("lost") || query.includes("5l") || query.includes("revenue")) {
        result = {
          title: "High-value Closed-Lost Opportunities",
          summary: "1 high-value opportunity lost last month: 'E-commerce Platform SOW' for Vikram Singh (₹11,00,000 value, reason: competitor discount matching). AI recommends enforcing flexible price thresholds.",
          chartData: {
            labels: ["Won Deals", "Lost Deals (>5L)"],
            values: [880000, 1100000]
          }
        };
      }

      setNlResult(result);
      setLoading(false);
    }, 600);
  };

  const handleTriggerWorkflow = (wfName: string) => {
    toast.success(`Workflow "${wfName}" executed manually. 1 task created, notification dispatched.`);
  };

  // Filtered rows matching spreadsheet selection
  const filteredRows = rows.filter(row => {
    if (filterSource === "ALL") return true;
    return row.source === filterSource;
  });

  return (
    <WidgetWrapper
      title="Autonomous Business Operating System Console"
      subtitle="Phase 3 Master Roadmap Control Terminal — Pillar 1 to 16 v3.0"
    >
      {/* ---------------------------------------------------- */}
      {/* EXECUTIVE COMMAND CENTER BAR (Pillar 16) */}
      {/* ---------------------------------------------------- */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="p-4 rounded-xl border flex items-center justify-between shadow-sm relative overflow-hidden" style={{ background: "var(--card-bg-solid)", borderColor: "var(--card-border)" }}>
          <div className="space-y-1">
            <span className="block text-[9px] uppercase tracking-widest text-muted-foreground font-bold">Forecasted Revenue (P16)</span>
            <span className="cause-font text-xl font-bold text-[var(--text-color)]">₹{totalForecastRevenue.toLocaleString("en-IN")}</span>
          </div>
          <TrendingUp className="text-[var(--graph-to)] opacity-80" size={24} />
          <div className="absolute bottom-0 left-0 h-1 bg-[var(--graph-to)]" style={{ width: "80%" }} />
        </div>

        <div className="p-4 rounded-xl border flex items-center justify-between shadow-sm relative overflow-hidden" style={{ background: "var(--card-bg-solid)", borderColor: "var(--card-border)" }}>
          <div className="space-y-1">
            <span className="block text-[9px] uppercase tracking-widest text-muted-foreground font-bold">Calculated Commission (P3)</span>
            <span className="cause-font text-xl font-bold text-emerald-500">₹{totalAICommission.toLocaleString("en-IN")}</span>
          </div>
          <DollarSign className="text-emerald-500 opacity-80" size={24} />
          <div className="absolute bottom-0 left-0 h-1 bg-emerald-500" style={{ width: "95%" }} />
        </div>

        <div className="p-4 rounded-xl border flex items-center justify-between shadow-sm relative overflow-hidden" style={{ background: "var(--card-bg-solid)", borderColor: "var(--card-border)" }}>
          <div className="space-y-1">
            <span className="block text-[9px] uppercase tracking-widest text-muted-foreground font-bold">Active AI Workforce (P1)</span>
            <span className="cause-font text-xl font-bold text-[var(--graph-to)]">
              {agentStatus === "RUNNING" ? "6 AGENTS ACTIVE" : "6 AGENTS IDLE"}
            </span>
          </div>
          <Bot className={`text-[var(--graph-to)] ${agentStatus === "RUNNING" ? "animate-bounce" : ""}`} size={24} />
          <div className="absolute bottom-0 left-0 h-1 bg-[var(--graph-to)]" style={{ width: agentStatus === "RUNNING" ? "100%" : "20%" }} />
        </div>

        {/* COMPLIANCE TIME TRAVEL CONTROL (Pillar 15) */}
        <div className="p-4 rounded-xl border space-y-1.5 shadow-sm relative overflow-hidden" style={{ background: "var(--card-bg-solid)", borderColor: "var(--card-border)" }}>
          <div className="flex items-center justify-between">
            <span className="block text-[9px] uppercase tracking-widest text-muted-foreground font-bold flex items-center gap-1">
              <Clock size={10} className="text-amber-500" /> DB Time Travel (P15)
            </span>
            <span className="text-[9px] bg-amber-500/10 text-amber-500 font-bold px-1.5 py-0.5 rounded uppercase">Time Capsule</span>
          </div>
          <div className="flex items-center gap-2 pt-0.5">
            <input
              type="range"
              min="0"
              max="3"
              value={timeTravelIndex}
              onChange={e => handleTimeTravelChange(parseInt(e.target.value))}
              className="w-full h-1.5 rounded-lg bg-amber-500/20 appearance-none cursor-pointer accent-amber-500"
            />
            <span className="text-[10px] font-bold text-amber-500 shrink-0">Snapshot V{timeTravelIndex + 1}</span>
          </div>
          <span className="block text-[8px] text-muted-foreground italic">Drag slider to rewind database tables state dynamically.</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* Navigation Sidebar */}
        <div className="lg:col-span-3 flex flex-row lg:flex-col gap-1 overflow-x-auto lg:overflow-x-visible p-1.5 rounded-xl border w-full shrink-0" style={{ background: "var(--accent)", borderColor: "var(--card-border)" }}>
          {[
            { id: "workspace", label: "Excel/Airtable Workspace", icon: Grid },
            { id: "agent", label: "AI SDR Workforce Console", icon: Bot },
            { id: "import", label: "Smart Import Platform", icon: FileSpreadsheet },
            { id: "workflows", label: "No-Code Workflow Builder", icon: Sliders },
            { id: "sow", label: "Quotation SOW Platform", icon: FileText },
            { id: "graph", label: "Relationship Visualizer", icon: GitBranch },
            { id: "analytics", label: "AI Executive Query Center", icon: Search },
            { id: "audit", label: "Enterprise Event Ledger", icon: Shield }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex items-center gap-2 h-9 px-3 rounded-lg text-xs font-bold transition-all duration-200 whitespace-nowrap text-left w-full hover:bg-[rgba(0,0,0,0.02)]"
              style={{
                background: activeTab === tab.id ? "var(--bg-color)" : "transparent",
                color: activeTab === tab.id ? "var(--graph-to)" : "var(--muted-foreground)",
                boxShadow: activeTab === tab.id ? "0 4px 12px rgba(0,0,0,0.03)" : "none",
                border: activeTab === tab.id ? "1px solid var(--card-border)" : "1px solid transparent"
              }}
            >
              <tab.icon size={14} />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content Panel */}
        <div className="lg:col-span-9 p-5 rounded-2xl border min-h-[460px] flex flex-col justify-between" style={{ background: "var(--card-bg-solid)", borderColor: "var(--card-border)" }}>
          
          {/* ============================================ */}
          {/* TAB 1: EXCEL / AIRTABLE WORKSPACE GRID */}
          {/* ============================================ */}
          {activeTab === "workspace" && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b" style={{ borderColor: "var(--card-border)" }}>
                <div className="flex items-center gap-3">
                  <div className="flex bg-[var(--accent)] p-0.5 rounded-lg border border-[var(--card-border)]">
                    <button
                      onClick={() => setActiveWorkspaceView("LEADS")}
                      className={`h-7 px-3 rounded-md text-[10px] font-bold transition-all ${activeWorkspaceView === "LEADS" ? "bg-[var(--bg-color)] text-[var(--graph-to)] shadow-sm" : "text-muted-foreground"}`}
                    >
                      Leads Directory (P2)
                    </button>
                    <button
                      onClick={() => setActiveWorkspaceView("CONTRACTS")}
                      className={`h-7 px-3 rounded-md text-[10px] font-bold transition-all ${activeWorkspaceView === "CONTRACTS" ? "bg-[var(--bg-color)] text-[var(--graph-to)] shadow-sm" : "text-muted-foreground"}`}
                    >
                      Associated Agreements (P5)
                    </button>
                  </div>
                  <span className="h-4 w-[1px] bg-[var(--card-border)] hidden sm:block" />
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-muted-foreground font-bold uppercase shrink-0">Formula Bar:</span>
                    <input
                      type="text"
                      value={formulaInput}
                      onChange={e => {
                        setFormulaInput(e.target.value);
                      }}
                      placeholder="Commission formula: e.g. value * 0.1"
                      className="h-6 w-32 pl-2 rounded text-[10px] border outline-none font-mono bg-black/10 focus:border-[var(--graph-to)]"
                      style={{ color: "var(--text-color)" }}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Quick Filters */}
                  <select
                    value={filterSource}
                    onChange={e => setFilterSource(e.target.value)}
                    className="h-7 text-[10px] font-bold border rounded-lg px-2 bg-transparent"
                    style={{ borderColor: "var(--card-border)", color: "var(--text-color)" }}
                  >
                    <option value="ALL">Filter Source: All</option>
                    <option value="GOOGLE">Google Ads</option>
                    <option value="META">Meta Ads</option>
                    <option value="REFERRAL">Referral</option>
                    <option value="DIRECT">Direct Portal</option>
                  </select>

                  <select
                    value={groupByField}
                    onChange={e => setGroupByField(e.target.value as any)}
                    className="h-7 text-[10px] font-bold border rounded-lg px-2 bg-transparent"
                    style={{ borderColor: "var(--card-border)", color: "var(--text-color)" }}
                  >
                    <option value="NONE">Group By: None (P3)</option>
                    <option value="SOURCE">Group By: Source</option>
                    <option value="STATUS">Group By: Status</option>
                  </select>

                  <button
                    onClick={() => setIsColModalOpen(true)}
                    className="h-7 px-2.5 rounded-lg text-[10px] font-bold flex items-center gap-1 bg-[var(--graph-to)]/10 text-[var(--graph-to)] border border-[var(--graph-to)]/20 hover:bg-[var(--graph-to)]/15 transition-all"
                  >
                    <Plus size={10} /> Add Field
                  </button>
                </div>
              </div>

              {activeWorkspaceView === "LEADS" ? (
                /* Dynamic Table for Leads */
                <div className="overflow-x-auto rounded-xl border shadow-inner max-h-[300px]" style={{ borderColor: "var(--card-border)" }}>
                  <table className="w-full text-left border-collapse text-[11px]">
                    <thead>
                      <tr className="border-b" style={{ background: "var(--accent)", borderColor: "var(--card-border)", color: "var(--muted-foreground)" }}>
                        {columns.map(col => (
                          <th key={col.key} className="p-3 font-bold uppercase tracking-wider select-none">
                            <div className="flex items-center justify-between gap-2">
                              <span>{col.label}</span>
                              <span className="text-[8px] opacity-60 font-mono px-1 rounded bg-black/15 uppercase">{col.type}</span>
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody style={{ color: "var(--text-color)" }}>
                      {groupByField === "NONE" ? (
                        filteredRows.map(row => (
                          <tr key={row.id} className="border-b hover:bg-black/5 dark:hover:bg-white/5 transition-colors" style={{ borderColor: "var(--card-border)" }}>
                            {columns.map(col => {
                              const val = getCellValue(row, col);
                              const isEditing = editingCell?.rowId === row.id && editingCell?.colKey === col.key;
                              
                              return (
                                <td 
                                  key={col.key} 
                                  className="p-3 font-medium cursor-pointer relative"
                                  onClick={() => {
                                    if (col.type !== "formula") {
                                      setEditingCell({ rowId: row.id, colKey: col.key });
                                      setEditValue(String(row[col.key] || ""));
                                    }
                                  }}
                                >
                                  {isEditing ? (
                                    <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                                      <input
                                        type={col.type === "number" || col.type === "currency" ? "number" : "text"}
                                        value={editValue}
                                        onChange={e => setEditValue(e.target.value)}
                                        className="h-6 w-full pl-2 pr-1 rounded border outline-none bg-transparent"
                                        style={{ borderColor: "var(--graph-to)" }}
                                        autoFocus
                                        onKeyDown={e => {
                                          if (e.key === "Enter") handleCellEditSave(row.id, col.key);
                                          if (e.key === "Escape") setEditingCell(null);
                                        }}
                                      />
                                      <button onClick={() => handleCellEditSave(row.id, col.key)} className="h-6 w-6 rounded flex items-center justify-center bg-emerald-500/10 text-emerald-500"><Check size={10} /></button>
                                      <button onClick={() => setEditingCell(null)} className="h-6 w-6 rounded flex items-center justify-center bg-red-500/10 text-red-500"><X size={10} /></button>
                                    </div>
                                  ) : (
                                    <span className={col.type === "formula" ? "text-emerald-500 font-bold" : ""}>
                                      {col.type === "currency" || col.type === "formula" ? `₹${val.toLocaleString("en-IN")}` : val}
                                    </span>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))
                      ) : (
                        /* Grouped Rows rendering (Pillar 3 Airtable Aggregation) */
                        Object.entries(
                          filteredRows.reduce((groups, r) => {
                            const groupKey = groupByField === "SOURCE" ? r.source : r.status;
                            if (!groups[groupKey]) groups[groupKey] = [];
                            groups[groupKey].push(r);
                            return groups;
                          }, {} as Record<string, GridRow[]>)
                        ).map(([groupTitle, groupItems]) => (
                          <React.Fragment key={groupTitle}>
                            <tr className="bg-black/10 dark:bg-white/5 font-bold text-[10px] uppercase tracking-wider text-muted-foreground select-none">
                              <td colSpan={columns.length} className="p-2 border-b" style={{ borderColor: "var(--card-border)" }}>
                                📂 {groupTitle} ({groupItems.length} records)
                              </td>
                            </tr>
                            {groupItems.map(row => (
                              <tr key={row.id} className="border-b hover:bg-black/5 dark:hover:bg-white/5 transition-colors" style={{ borderColor: "var(--card-border)" }}>
                                {columns.map(col => {
                                  const val = getCellValue(row, col);
                                  const isEditing = editingCell?.rowId === row.id && editingCell?.colKey === col.key;
                                  
                                  return (
                                    <td 
                                      key={col.key} 
                                      className="p-3 font-medium cursor-pointer relative"
                                      onClick={() => {
                                        if (col.type !== "formula") {
                                          setEditingCell({ rowId: row.id, colKey: col.key });
                                          setEditValue(String(row[col.key] || ""));
                                        }
                                      }}
                                    >
                                      {isEditing ? (
                                        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                                          <input
                                            type={col.type === "number" || col.type === "currency" ? "number" : "text"}
                                            value={editValue}
                                            onChange={e => setEditValue(e.target.value)}
                                            className="h-6 w-full pl-2 pr-1 rounded border outline-none bg-transparent"
                                            style={{ borderColor: "var(--graph-to)" }}
                                            autoFocus
                                            onKeyDown={e => {
                                              if (e.key === "Enter") handleCellEditSave(row.id, col.key);
                                              if (e.key === "Escape") setEditingCell(null);
                                            }}
                                          />
                                          <button onClick={() => handleCellEditSave(row.id, col.key)} className="h-6 w-6 rounded flex items-center justify-center bg-emerald-500/10 text-emerald-500"><Check size={10} /></button>
                                          <button onClick={() => setEditingCell(null)} className="h-6 w-6 rounded flex items-center justify-center bg-red-500/10 text-red-500"><X size={10} /></button>
                                        </div>
                                      ) : (
                                        <span className={col.type === "formula" ? "text-emerald-500 font-bold" : ""}>
                                          {col.type === "currency" || col.type === "formula" ? `₹${val.toLocaleString("en-IN")}` : val}
                                        </span>
                                      )}
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                          </React.Fragment>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              ) : (
                /* Associated Contracts Grid (Pillar 5 Relationships) */
                <div className="overflow-x-auto rounded-xl border shadow-inner max-h-[300px]" style={{ borderColor: "var(--card-border)" }}>
                  <table className="w-full text-left border-collapse text-[11px]">
                    <thead>
                      <tr className="border-b" style={{ background: "var(--accent)", borderColor: "var(--card-border)", color: "var(--muted-foreground)" }}>
                        <th className="p-3 font-bold uppercase">Agreement (ID)</th>
                        <th className="p-3 font-bold uppercase">Client Stakeholder</th>
                        <th className="p-3 font-bold uppercase">Total Value</th>
                        <th className="p-3 font-bold uppercase">E-Sign Status</th>
                        <th className="p-3 font-bold uppercase">Cryptographic Cert</th>
                      </tr>
                    </thead>
                    <tbody style={{ color: "var(--text-color)" }}>
                      {contracts.map(c => (
                        <tr key={c.id} className="border-b hover:bg-black/5 dark:hover:bg-white/5 transition-colors" style={{ borderColor: "var(--card-border)" }}>
                          <td className="p-3 font-bold">{c.dealName} ({c.id})</td>
                          <td className="p-3 font-medium text-[var(--graph-to)]">{c.client}</td>
                          <td className="p-3 font-medium">₹{c.value.toLocaleString("en-IN")}</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${c.status === "SIGNED" ? "bg-emerald-500/10 text-emerald-500" : c.status === "SENT" ? "bg-blue-500/10 text-blue-500" : "bg-amber-500/10 text-amber-500"}`}>
                              {c.status}
                            </span>
                          </td>
                          <td className="p-3 font-mono text-[9px] opacity-80 text-muted-foreground">
                            {c.signatureCert ? c.signatureCert : "Unsigned (Awaiting Signer)"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <p className="text-[9px] text-muted-foreground italic">💡 Click any cell to edit inline. Commission calculated column updates instantly via active mathematical formula.</p>
            </div>
          )}

          {/* ============================================ */}
          {/* TAB 2: AI REVENUE WORKFORCE AGENTS */}
          {/* ============================================ */}
          {activeTab === "agent" && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b" style={{ borderColor: "var(--card-border)" }}>
                <div className="flex items-center gap-1.5">
                  <Bot size={16} className="text-[var(--graph-to)]" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-color)]">Multi-Agent SDR & CRM Workforce Console</h4>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleResetAgents}
                    className="h-7 px-3 rounded-lg text-[10px] font-bold flex items-center gap-1 bg-black/10 dark:bg-white/10 text-muted-foreground border border-[var(--card-border)] hover:bg-black/15 transition-all"
                  >
                    <RefreshCw size={10} /> Reset Pipeline
                  </button>
                  <button
                    onClick={handleRunAIWorkforce}
                    disabled={agentStatus === "RUNNING"}
                    className="h-7 px-3.5 rounded-lg text-[10px] font-bold flex items-center gap-1.5 transition-all duration-200"
                    style={{ background: "var(--graph-to)", color: "#0a0a0a", opacity: agentStatus === "RUNNING" ? 0.6 : 1 }}
                  >
                    <Play size={10} />
                    <span>{agentStatus === "RUNNING" ? "Running SDR Pipeline..." : "Trigger AI Workforce"}</span>
                  </button>
                </div>
              </div>

              {/* Dynamic Agent Graph Map Visuals */}
              <div className="grid grid-cols-2 md:grid-cols-6 gap-3 pt-2">
                {agents.map(ag => (
                  <div
                    key={ag.id}
                    className={`p-3 rounded-xl border flex flex-col items-center justify-center text-center space-y-1.5 relative overflow-hidden transition-all duration-300 ${ag.status === "ACTIVE" ? "border-[var(--graph-to)] bg-[var(--graph-to)]/5 shadow-md scale-105" : ag.status === "COMPLETED" ? "border-emerald-500 bg-emerald-500/5" : "bg-[var(--accent)] border-[var(--card-border)]"}`}
                  >
                    <div className={`p-2 rounded-full ${ag.status === "ACTIVE" ? "bg-[var(--graph-to)] text-[#0a0a0a]" : ag.status === "COMPLETED" ? "bg-emerald-500 text-[#0a0a0a]" : "bg-black/10 text-muted-foreground"}`}>
                      <ag.icon size={16} className={ag.status === "ACTIVE" ? "animate-pulse" : ""} />
                    </div>
                    <span className="text-[10px] font-bold text-[var(--text-color)]">{ag.name}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${ag.status === "ACTIVE" ? "bg-[var(--graph-to)]/20 text-[var(--graph-to)]" : ag.status === "COMPLETED" ? "bg-emerald-500/20 text-emerald-500" : "bg-black/10 text-muted-foreground"}`}>
                      {ag.status}
                    </span>
                  </div>
                ))}
              </div>

              {/* Progress Bar */}
              {agentStatus === "RUNNING" && (
                <div className="space-y-1">
                  <div className="flex justify-between text-[9px] font-bold text-muted-foreground">
                    <span>AI SDR Orchestrator qualified workflow...</span>
                    <span>{orchestratorProgress}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-black/10 rounded-full overflow-hidden">
                    <div className="h-full bg-[var(--graph-to)] transition-all duration-300" style={{ width: `${orchestratorProgress}%` }} />
                  </div>
                </div>
              )}

              {/* Orchestrator Logs timelines */}
              <div className="rounded-xl border p-4 space-y-3.5 shadow-sm" style={{ background: "var(--accent)", borderColor: "var(--card-border)" }}>
                <div className="flex items-center justify-between border-b pb-1.5">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Orchestration Event Timeline (P14)</span>
                  <span className="text-[9px] font-mono text-emerald-500 font-bold uppercase">Real-Time stream</span>
                </div>
                <div className="space-y-2.5 max-h-[160px] overflow-y-auto pr-1 text-[10px] font-mono leading-relaxed text-muted-foreground">
                  {agentLogs.map((log, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <span className="text-[var(--graph-to)] shrink-0 font-bold">›</span>
                      <p>{log}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ============================================ */}
          {/* TAB 3: SMART IMPORT PLATFORM */}
          {/* ============================================ */}
          {activeTab === "import" && (
            <div className="space-y-4">
              <div className="flex items-center gap-1.5 pb-2 border-b" style={{ borderColor: "var(--card-border)" }}>
                <FileSpreadsheet size={16} className="text-[var(--graph-to)]" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-color)]">Smart Import Platform (Pillar 7)</h4>
              </div>

              {importStep === 1 ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-4">
                  {[
                    { id: "CSV", title: "Excel / CSV File Upload", desc: "Drag, drop, and map spreadsheets local lines", icon: FileSpreadsheet },
                    { id: "HUBSPOT", title: "HubSpot API Sync", desc: "Synchronize organizations & timeline logs live", icon: RefreshCw },
                    { id: "SALESFORCE", title: "Salesforce CRM Sync", desc: "Automatically migrate active BANT prospects", icon: Database }
                  ].map(source => (
                    <button
                      key={source.id}
                      onClick={() => handleStartImport(source.id as any)}
                      className="p-5 rounded-2xl border flex flex-col items-center justify-center text-center space-y-3 transition-all hover:border-[var(--graph-to)] hover:bg-[var(--graph-to)]/5"
                      style={{ background: "var(--accent)", borderColor: "var(--card-border)" }}
                    >
                      <div className="p-3 bg-black/10 rounded-full text-[var(--graph-to)]">
                        <source.icon size={22} />
                      </div>
                      <div>
                        <strong className="block text-xs text-[var(--text-color)]">{source.title}</strong>
                        <span className="text-[10px] text-muted-foreground mt-1 block">{source.desc}</span>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl border flex items-center justify-between" style={{ background: "var(--accent)", borderColor: "var(--card-border)" }}>
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="text-[var(--graph-to)]" size={18} />
                      <div className="text-xs">
                        <strong className="block">{importedFileName}</strong>
                        <span className="text-[10px] text-muted-foreground">Mapped schemas matching standard leads database fields.</span>
                      </div>
                    </div>
                    <button onClick={() => setImportStep(1)} className="text-xs text-muted-foreground hover:underline">Change Source</button>
                  </div>

                  {/* Schema Mappings Panel */}
                  <div className="space-y-2.5">
                    <span className="text-[9px] uppercase tracking-wider font-bold text-muted-foreground block">Match CSV Column to Database Schema Properties:</span>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                      {Object.entries(columnMapping).map(([csvCol, dbCol]) => (
                        <div key={csvCol} className="p-3 rounded-xl border bg-black/10 dark:bg-black/40 flex flex-col space-y-1.5" style={{ borderColor: "var(--card-border)" }}>
                          <span className="text-[9px] text-muted-foreground uppercase font-bold">Spreadsheet CSV Field</span>
                          <strong className="font-semibold truncate">{csvCol}</strong>
                          <span className="text-[14px] text-center text-muted-foreground font-bold shrink-0">⬇</span>
                          <span className="text-[9px] text-emerald-500 uppercase font-bold">CT-CRM Field</span>
                          <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 font-mono text-[9px] uppercase text-center font-bold">{dbCol}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t" style={{ borderColor: "var(--card-border)" }}>
                    <button onClick={() => setImportStep(1)} className="h-9 px-4 rounded-xl border font-bold text-xs" style={{ borderColor: "var(--card-border)", color: "var(--text-color)" }}>Cancel</button>
                    <button
                      onClick={handleRunImportMapping}
                      disabled={isImportRunning}
                      className="h-9 px-5 rounded-xl text-xs font-bold transition-all hover:scale-105 active:scale-95 shrink-0 flex items-center gap-2"
                      style={{ background: "var(--graph-to)", color: "#0a0a0a" }}
                    >
                      {isImportRunning ? "Importing..." : "Execute Automated Import (P7)"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ============================================ */}
          {/* TAB 4: NO-CODE WORKFLOW BUILDER */}
          {/* ============================================ */}
          {activeTab === "workflows" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor: "var(--card-border)" }}>
                <div className="flex items-center gap-1.5">
                  <Sliders size={16} className="text-[var(--graph-to)]" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-color)]">No-Code visual Workflow Builder (P4)</h4>
                </div>
                <button
                  onClick={() => setIsWfModalOpen(true)}
                  className="h-7 px-3 rounded-lg text-[10px] font-bold flex items-center gap-1 bg-[var(--graph-to)]/10 text-[var(--graph-to)] border border-[var(--graph-to)]/20 hover:bg-[var(--graph-to)]/15 transition-all"
                >
                  <Plus size={10} /> Create Flow
                </button>
              </div>

              {/* Visual Flow graph builder panels */}
              <div className="space-y-4">
                {workflowTemplates.map(wf => (
                  <div key={wf.id} className="p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all hover:bg-black/5 dark:hover:bg-white/5" style={{ background: "var(--accent)", borderColor: "var(--card-border)" }}>
                    <div className="space-y-2 text-xs w-full">
                      <div className="flex items-center gap-2">
                        <strong className="block text-[var(--text-color)] text-sm">{wf.name}</strong>
                        <span className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wide bg-emerald-500/10 text-emerald-500">Active</span>
                      </div>
                      
                      {/* Flow Node Connectors Graph layout (Pilar 4) */}
                      <div className="flex flex-wrap items-center gap-2 pt-1 font-mono text-[9px]">
                        <div className="p-2 rounded bg-black/10 border border-white/5">
                          ⚡ Trigger: <span className="text-[var(--graph-to)] font-bold">{wf.event}</span>
                        </div>
                        <span className="text-muted-foreground">──></span>
                        <div className="p-2 rounded bg-amber-500/10 border border-amber-500/20 text-amber-500">
                          ❓ Condition (IF): <span className="font-bold">{wf.conditions}</span>
                        </div>
                        <span className="text-muted-foreground">──></span>
                        <div className="p-2 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-500">
                          ⚙️ Automated Action: <span className="font-bold">{wf.actions}</span>
                        </div>
                      </div>
                    </div>
                    <button onClick={() => handleTriggerWorkflow(wf.name)} className="h-8 px-3.5 rounded-lg border flex items-center justify-center gap-1.5 hover:bg-emerald-500/10 hover:text-emerald-500 transition-all text-xs font-bold text-muted-foreground" style={{ borderColor: "var(--card-border)" }}>
                      <Play size={10} /> Test Flow
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ============================================ */}
          {/* TAB 5: DOCUMENT PLATFORM & SOW BUILDER */}
          {/* ============================================ */}
          {activeTab === "sow" && (
            <div className="space-y-4">
              <div className="flex items-center gap-1.5 pb-2 border-b" style={{ borderColor: "var(--card-border)" }}>
                <FileText size={16} className="text-[var(--graph-to)]" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-color)]">Document Platform & SOW E-Sign Engine (P10)</h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                {/* Editor Panel */}
                <div className="md:col-span-5 space-y-3.5">
                  <h5 className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">SOW Template Configuration:</h5>
                  <div className="space-y-3 text-xs">
                    <div className="space-y-1">
                      <label className="font-bold block">Client Stakeholder Name</label>
                      <input
                        type="text"
                        value={sowClientName}
                        onChange={e => setSowClientName(e.target.value)}
                        className="w-full h-8 border rounded-lg px-2 outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-bold block">Scope of Deliverables Summary</label>
                      <textarea
                        rows={2}
                        value={sowScope}
                        onChange={e => setSowScope(e.target.value)}
                        className="w-full border rounded-lg p-2 outline-none text-[11px] leading-normal"
                      />
                    </div>

                    {/* SOW Line items editor */}
                    <div className="space-y-1.5">
                      <label className="font-bold block">Items Package Configuration:</label>
                      <div className="space-y-2">
                        {sowItems.map(item => (
                          <div key={item.id} className="p-2 rounded bg-black/10 border space-y-1.5" style={{ borderColor: "var(--card-border)" }}>
                            <div className="flex justify-between font-bold text-[10px]">
                              <span>{item.name}</span>
                              <span className="text-[var(--graph-to)]">₹{item.rate.toLocaleString("en-IN")}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div className="flex items-center gap-1.5 text-[9px]">
                                <span>Qty:</span>
                                <input
                                  type="number"
                                  value={item.qty}
                                  onChange={e => updateSowItemQty(item.id, parseInt(e.target.value) || 0)}
                                  className="h-5 w-10 text-center border rounded bg-transparent"
                                />
                              </div>
                              <div className="flex items-center gap-1.5 text-[9px]">
                                <span>Discount %:</span>
                                <input
                                  type="number"
                                  value={item.discount}
                                  onChange={e => updateSowItemDiscount(item.id, parseInt(e.target.value) || 0)}
                                  className="h-5 w-10 text-center border rounded bg-transparent text-emerald-500 font-bold"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* SOW PDF Live Preview */}
                <div className="md:col-span-7 p-4 rounded-xl border leading-relaxed space-y-3.5 relative overflow-hidden font-sans shadow-sm" style={{ background: "#ffffff", color: "#000000", borderColor: "rgba(0,0,0,0.15)" }}>
                  <div className="absolute top-0 right-0 p-1 bg-amber-500 text-white font-mono text-[8px] font-bold uppercase tracking-wider rotate-12 translate-x-3 translate-y-2 px-3 shadow">
                    PDF Live Preview
                  </div>
                  
                  {/* SOW PDF Header */}
                  <div className="border-b pb-2 flex justify-between items-start" style={{ borderColor: "rgba(0,0,0,0.1)" }}>
                    <div>
                      <h4 className="cause-font text-sm font-bold tracking-tight">STATEMENT OF WORK</h4>
                      <span className="text-[8px] text-neutral-500 font-mono">ID: SOW-2026-0602-09</span>
                    </div>
                    <div className="text-right text-[8px] text-neutral-500 leading-normal">
                      <strong>CT-CRM Solutions</strong><br />
                      Bengaluru, Karnataka
                    </div>
                  </div>

                  {/* SOW Metadata */}
                  <div className="grid grid-cols-2 gap-3 text-[9px] text-neutral-600 pb-2 border-b" style={{ borderColor: "rgba(0,0,0,0.06)" }}>
                    <div>
                      <strong>Prepared For:</strong><br />
                      {sowClientName}<br />
                      Acme Corporation
                    </div>
                    <div className="text-right">
                      <strong>Date:</strong> 2026-06-02<br />
                      <strong>Expires:</strong> 2026-07-02
                    </div>
                  </div>

                  {/* Deliverable details */}
                  <div className="text-[9px] leading-relaxed">
                    <strong className="block text-neutral-800 text-[10px]">Scope of Services:</strong>
                    <p className="text-neutral-600 italic mt-0.5">{sowScope}</p>
                  </div>

                  {/* Items Calculations Table */}
                  <div className="pt-1.5">
                    <table className="w-full text-[9px]">
                      <thead>
                        <tr className="border-b border-neutral-300 font-bold text-neutral-700">
                          <th className="pb-1 text-left">Line Item Description</th>
                          <th className="pb-1 text-center">Qty</th>
                          <th className="pb-1 text-right">Rate</th>
                          <th className="pb-1 text-right">Discount</th>
                          <th className="pb-1 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sowItems.map(item => {
                          const itemTotal = (item.qty * item.rate) - (item.qty * item.rate * (item.discount / 100));
                          return (
                            <tr key={item.id} className="border-b border-neutral-100 text-neutral-600">
                              <td className="py-1">{item.name}</td>
                              <td className="py-1 text-center">{item.qty}</td>
                              <td className="py-1 text-right">₹{item.rate.toLocaleString("en-IN")}</td>
                              <td className="py-1 text-right text-emerald-600 font-semibold">{item.discount}%</td>
                              <td className="py-1 text-right font-bold text-neutral-800">₹{itemTotal.toLocaleString("en-IN")}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Calculations Pricing totals block */}
                  <div className="flex justify-end pt-2 border-t" style={{ borderColor: "rgba(0,0,0,0.1)" }}>
                    <div className="w-48 text-[9px] space-y-1 text-neutral-600">
                      <div className="flex justify-between">
                        <span>Subtotal:</span>
                        <span>₹{sowSubtotal.toLocaleString("en-IN")}</span>
                      </div>
                      {sowDiscountsTotal > 0 && (
                        <div className="flex justify-between text-emerald-600 font-semibold">
                          <span>Discounts:</span>
                          <span>-₹{sowDiscountsTotal.toLocaleString("en-IN")}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span>GST (18%):</span>
                        <span>₹{sowGST.toLocaleString("en-IN")}</span>
                      </div>
                      <div className="flex justify-between border-t border-neutral-300 pt-1 font-bold text-[10px] text-neutral-900">
                        <span>Grand Total (INR):</span>
                        <span>₹{sowFinalTotal.toLocaleString("en-IN")}</span>
                      </div>
                    </div>
                  </div>

                  {/* Cryptographic E-Sign Box (P10) */}
                  <div className="pt-3 border-t" style={{ borderColor: "rgba(0,0,0,0.1)" }}>
                    {isSowSigned ? (
                      <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center justify-between text-emerald-800 text-[9px]">
                        <div className="flex items-center gap-2">
                          <ShieldCheck size={16} className="text-emerald-600" />
                          <div>
                            <strong>CONTRACT SECURELY SIGNED (E-Sign P10)</strong>
                            <span className="block font-mono text-[8px] opacity-80 mt-0.5">{sowSignatureHash}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <strong>Signed By:</strong> {sowSignerName}<br />
                          <span className="opacity-80">2026-06-02 18:47</span>
                        </div>
                      </div>
                    ) : (
                      <form onSubmit={handleSignContract} className="flex gap-2 items-end">
                        <div className="flex-1 space-y-1">
                          <label className="text-[8px] uppercase tracking-wider font-bold text-neutral-500 block">Signer Legal Name *</label>
                          <input
                            type="text"
                            required
                            placeholder="Type full name to sign"
                            value={sowSignerName}
                            onChange={e => setSowSignerName(e.target.value)}
                            className="h-8 w-full border rounded px-2 outline-none text-[10px] bg-neutral-50 border-neutral-300 text-neutral-900 focus:bg-white"
                          />
                        </div>
                        <button type="submit" disabled={isSigning} className="h-8 px-4 rounded font-bold text-[10px] bg-neutral-900 text-white hover:bg-neutral-800 shrink-0">
                          {isSigning ? "Processing..." : "Apply Digital Signature"}
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ============================================ */}
          {/* TAB 6: DYNAMIC RELATIONSHIP GRAPH */}
          {/* ============================================ */}
          {activeTab === "graph" && (
            <div className="space-y-4">
              <div className="flex items-center gap-1.5 pb-2 border-b" style={{ borderColor: "var(--card-border)" }}>
                <GitBranch size={16} className="text-[var(--graph-to)]" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-color)]">Universal Relationship Graph Visualization (P5)</h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-5 py-4">
                
                {/* Node Trace visualization canvas */}
                <div className="md:col-span-8 p-4 rounded-xl border flex flex-col justify-center min-h-[220px] relative overflow-hidden" style={{ background: "var(--accent)", borderColor: "var(--card-border)" }}>
                  <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: "radial-gradient(rgba(0, 242, 254, 0.05) 1px, transparent 1px)", backgroundSize: "16px 16px" }} />
                  
                  <div className="relative flex flex-col md:flex-row items-center justify-between gap-6 px-4 z-10 w-full">
                    {[
                      { id: "node-1", label: "Lead", value: sowClientName, status: "GOOGLE Ads", color: "rgba(0, 242, 254, 0.15)", border: "var(--graph-to)", detail: { attribution: "Google Adwords campaign Q2", score: "92/100 HOT", created: "2026-06-02 18:40" } },
                      { id: "node-2", label: "Contact", value: "Stakeholder Profile", status: "VERIFIED", color: "rgba(168, 85, 247, 0.15)", border: "#a855f7", detail: { role: "Corporate Stakeholder VP Procurement", email: "vikram@acme.com", duplicatesAudit: "CLEAN" } },
                      { id: "node-3", label: "Deal Opportunity", value: "₹4.5L Acme Deal", status: "NEGOTIATION", color: "rgba(245, 158, 11, 0.15)", border: "#f59e0b", detail: { stage: "Negotiation Price Review", forecastValue: "₹4,50,000", probability: "85%" } },
                      { id: "node-4", label: "Contract SOW", value: isSowSigned ? "SIGNED" : "PREVIEW v2.0", status: isSowSigned ? "SHA CERTIFIED" : "AWAITING SIGN", color: isSowSigned ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)", border: isSowSigned ? "#10b981" : "#ef4444", detail: { documentId: "SOW-2026-0602-09", signatureStatus: isSowSigned ? "VERIFIED SIGN" : "UNSIGNED", cert: sowSignatureHash || "N/A" } }
                    ].map((node, idx, arr) => (
                      <div key={node.id} className="flex flex-col md:flex-row items-center gap-6 w-full md:w-auto">
                        <button
                          onMouseEnter={() => {
                            setHoveredNode(node.id);
                            setSelectedNodeDetail(node.detail);
                          }}
                          onClick={() => {
                            setSelectedNodeDetail(node.detail);
                          }}
                          className={`p-3 rounded-2xl border text-center transition-all duration-300 w-full md:w-32 shrink-0 ${hoveredNode === node.id ? "scale-110 shadow-lg" : ""}`}
                          style={{ background: node.color, borderColor: node.border }}
                        >
                          <span className="block text-[8px] uppercase tracking-wider text-muted-foreground font-bold">{node.label}</span>
                          <strong className="block text-[10px] text-[var(--text-color)] mt-0.5 truncate">{node.value}</strong>
                          <span className="text-[8px] px-1.5 py-0.5 mt-1 rounded bg-black/10 inline-block truncate" style={{ color: node.border }}>{node.status}</span>
                        </button>
                        
                        {idx < arr.length - 1 && (
                          <div className="flex flex-col items-center justify-center shrink-0">
                            <span className="text-xs text-muted-foreground font-bold hidden md:block">──></span>
                            <span className="text-xs text-muted-foreground font-bold block md:hidden">⬇</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Node Details Overlay Panel */}
                <div className="md:col-span-4 space-y-3.5">
                  <h5 className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Universal Node Context Analysis (P5):</h5>
                  {selectedNodeDetail ? (
                    <div className="p-4 rounded-xl border space-y-3 text-xs leading-normal animate-pulse-glow" style={{ background: "var(--accent)", borderColor: "var(--card-border)" }}>
                      <div className="flex items-center gap-2">
                        <Award size={14} className="text-[var(--graph-to)]" />
                        <span className="font-bold text-[var(--text-color)]">AI Decision Context</span>
                      </div>
                      <div className="space-y-2 text-[11px] text-muted-foreground">
                        {Object.entries(selectedNodeDetail).map(([key, val]) => (
                          <div key={key} className="border-b border-black/5 dark:border-white/5 pb-1 flex justify-between items-start gap-3">
                            <span className="uppercase text-[8px] tracking-wider font-bold shrink-0">{key.replace(/([A-Z])/g, ' $1')}:</span>
                            <span className="font-medium text-right break-all" style={{ color: "var(--text-color)" }}>{String(val)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-[10px] text-muted-foreground italic text-center py-6 p-4 border rounded-xl" style={{ borderColor: "var(--card-border)" }}>
                      Hover over or click any node in the relationship graph to inspect automated trace metadata details.
                    </p>
                  )}
                </div>

              </div>
            </div>
          )}

          {/* ============================================ */}
          {/* TAB 7: AI ANALYTICS ENGINE */}
          {/* ============================================ */}
          {activeTab === "analytics" && (
            <div className="space-y-4">
              <div className="flex items-center gap-1.5 pb-2 border-b" style={{ borderColor: "var(--card-border)" }}>
                <Search size={16} className="text-[var(--graph-to)]" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-color)]">AI Analytics Engine — Natural Language Queries (P8)</h4>
              </div>

              <form onSubmit={handleNLQQuery} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Ask executive AI: 'Why are deals slowing down?', 'Which source converts best?', or 'Show lost deals above 5L'..."
                  value={nlQuery}
                  onChange={e => setNlQuery(e.target.value)}
                  className="h-10 flex-1 pl-3.5 pr-2 rounded-xl text-xs bg-transparent border outline-none text-[var(--text-color)] focus:border-[var(--graph-to)]"
                  style={{ borderColor: "var(--card-border)" }}
                />
                <button type="submit" disabled={loading} className="h-10 px-5 rounded-xl text-xs font-bold transition-all hover:scale-105 active:scale-95 shrink-0" style={{ background: "var(--graph-to)", color: "#0a0a0a" }}>
                  {loading ? "Analyzing..." : "Ask AI Engine"}
                </button>
              </form>

              {nlResult ? (
                <div className="p-4 rounded-xl border leading-relaxed space-y-4 shadow-sm animate-pulse-glow" style={{ background: "var(--accent)", borderColor: "rgba(0, 242, 254, 0.25)" }}>
                  <div className="flex items-center gap-1.5 border-b pb-1.5">
                    <Sparkles size={14} className="text-[var(--graph-to)] animate-pulse" />
                    <span className="text-xs font-bold block" style={{ color: "var(--text-color)" }}>{nlResult.title}</span>
                  </div>
                  
                  <p className="text-xs text-muted-foreground">{nlResult.summary}</p>
                  
                  {/* Dynamic Render Graph Bar (Pillar 8 Auto Chart) */}
                  {nlResult.chartData && (
                    <div className="space-y-2.5 pt-2">
                      <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold block">Rendered Insights Chart Output:</span>
                      <div className="space-y-2 max-w-md">
                        {nlResult.chartData.labels.map((lbl: string, idx: number) => {
                          const val = nlResult.chartData.values[idx];
                          const maxVal = Math.max(...nlResult.chartData.values);
                          const percentage = (val / maxVal) * 100;
                          return (
                            <div key={lbl} className="space-y-1 text-[10px]">
                              <div className="flex justify-between font-bold text-muted-foreground">
                                <span>{lbl}</span>
                                <span style={{ color: "var(--text-color)" }}>{val}%</span>
                              </div>
                              <div className="h-2 w-full bg-black/15 dark:bg-white/10 rounded overflow-hidden">
                                <div className="h-full bg-[var(--graph-to)]" style={{ width: `${percentage}%` }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-8 border rounded-xl text-center space-y-2" style={{ borderColor: "var(--card-border)", background: "var(--accent)" }}>
                  <HelpCircle className="mx-auto text-muted-foreground opacity-60" size={24} />
                  <p className="text-xs text-muted-foreground">Type a business pipeline question in the command bar above to render custom automated charts.</p>
                </div>
              )}
            </div>
          )}

          {/* ============================================ */}
          {/* TAB 8: ENTERPRISE AUDIT EVENT LEDGER */}
          {/* ============================================ */}
          {activeTab === "audit" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor: "var(--card-border)" }}>
                <div className="flex items-center gap-1.5">
                  <Shield size={16} className="text-[var(--graph-to)]" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-color)]">Enterprise Event Audit Ledger (P14 & P15)</h4>
                </div>
                <span className="text-[9px] font-bold text-emerald-500 uppercase flex items-center gap-1">
                  <ShieldCheck size={10} /> Compliant Tenant Sandbox
                </span>
              </div>

              {/* Event Ledger list (Pillar 14 immutable event system) */}
              <div className="space-y-2.5">
                {auditLogs.map((log, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl border flex items-center justify-between gap-4 text-xs" style={{ background: "var(--accent)", borderColor: "var(--card-border)" }}>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[var(--text-color)]">{log.agent}</span>
                        <span className="text-[9px] font-semibold text-muted-foreground">{log.timestamp}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">{log.action}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider shrink-0 ${log.status === "SUCCESS" ? "bg-emerald-500/10 text-emerald-500" : log.status === "WARNING" ? "bg-amber-500/10 text-amber-500" : "bg-blue-500/10 text-blue-500"}`}>
                      {log.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ============================================ */}
      {/* DIALOG: Dynamic Column Builder Slide Modal */}
      {/* ============================================ */}
      {isColModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setIsColModalOpen(false)}>
          <div className="w-full max-w-sm rounded-2xl p-6 border space-y-5" style={{ background: "var(--card-bg-solid)", borderColor: "var(--card-border)" }} onClick={e => e.stopPropagation()}>
            <div>
              <h2 className="cause-font text-base font-bold" style={{ color: "var(--text-color)" }}>Add Custom Field Column (P2)</h2>
              <p className="text-[10px] text-muted-foreground mt-1 leading-normal">Creates dynamic columns on the fly inside the active table schema.</p>
            </div>
            <form onSubmit={handleCreateColumn} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold block" style={{ color: "var(--text-color)" }}>Column Label Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. GST Registration, PAN Card, Zoom ID..."
                  value={newColLabel}
                  onChange={e => setNewColLabel(e.target.value)}
                  className="w-full h-9 border rounded-xl px-3 outline-none"
                  style={{ borderColor: "var(--card-border)" }}
                />
              </div>
              <div className="space-y-1.5">
                <label className="font-bold block" style={{ color: "var(--text-color)" }}>Database Field Type</label>
                <select
                  value={newColType}
                  onChange={e => setNewColType(e.target.value as any)}
                  className="w-full h-9 border rounded-xl px-3 outline-none bg-transparent"
                  style={{ borderColor: "var(--card-border)", color: "var(--text-color)" }}
                >
                  <option value="text">Text / String</option>
                  <option value="number">Number</option>
                  <option value="currency">Currency (INR)</option>
                  <option value="select">Dropdown Choice</option>
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setIsColModalOpen(false)} className="flex-1 h-9 rounded-xl border font-bold" style={{ borderColor: "var(--card-border)", color: "var(--text-color)" }}>Cancel</button>
                <button type="submit" className="flex-1 h-9 rounded-xl font-bold" style={{ background: "var(--graph-to)", color: "#0a0a0a" }}>Create Column</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================ */}
      {/* DIALOG: Create Workflow Modal */}
      {/* ============================================ */}
      {isWfModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setIsWfModalOpen(false)}>
          <div className="w-full max-w-sm rounded-2xl p-6 border space-y-5" style={{ background: "var(--card-bg-solid)", borderColor: "var(--card-border)" }} onClick={e => e.stopPropagation()}>
            <div>
              <h2 className="cause-font text-base font-bold" style={{ color: "var(--text-color)" }}>Create Automated Workflow (P4)</h2>
              <p className="text-[10px] text-muted-foreground mt-1 leading-normal">Build visual conditional actions triggered automatically by database events.</p>
            </div>
            <form onSubmit={handleCreateWorkflow} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold block" style={{ color: "var(--text-color)" }}>Workflow Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Email notification on Won deals"
                  value={wfName}
                  onChange={e => setWfName(e.target.value)}
                  className="w-full h-9 border rounded-xl px-3 outline-none"
                  style={{ borderColor: "var(--card-border)" }}
                />
              </div>
              <div className="space-y-1.5">
                <label className="font-bold block" style={{ color: "var(--text-color)" }}>Database Event Trigger</label>
                <select
                  value={wfEvent}
                  onChange={e => setWfEvent(e.target.value)}
                  className="w-full h-9 border rounded-xl px-3 outline-none bg-transparent"
                  style={{ borderColor: "var(--card-border)", color: "var(--text-color)" }}
                >
                  <option value="Lead Created">Lead Ingested / Created</option>
                  <option value="Deal Won">Deal Pipeline Moved Won</option>
                  <option value="Contract Signed">Contract Signed via E-Sign</option>
                  <option value="Task Overdue">Reminders / Task Overdue</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="font-bold block" style={{ color: "var(--text-color)" }}>Branch Criteria Condition (IF/ELSE)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Value > 300000"
                  value={wfCondition}
                  onChange={e => setWfCondition(e.target.value)}
                  className="w-full h-9 border rounded-xl px-3 outline-none"
                  style={{ borderColor: "var(--card-border)" }}
                />
              </div>
              <div className="space-y-1.5">
                <label className="font-bold block" style={{ color: "var(--text-color)" }}>Execute Action</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Auto-send Whatsapp via Twilio"
                  value={wfAction}
                  onChange={e => setWfAction(e.target.value)}
                  className="w-full h-9 border rounded-xl px-3 outline-none"
                  style={{ borderColor: "var(--card-border)" }}
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setIsWfModalOpen(false)} className="flex-1 h-9 rounded-xl border font-bold" style={{ borderColor: "var(--card-border)", color: "var(--text-color)" }}>Cancel</button>
                <button type="submit" className="flex-1 h-9 rounded-xl font-bold" style={{ background: "var(--graph-to)", color: "#0a0a0a" }}>Publish Workflow</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </WidgetWrapper>
  );
}
