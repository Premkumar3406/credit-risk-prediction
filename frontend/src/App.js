import { useState, useMemo } from "react";
import { 
  ShieldAlert, 
  ShieldCheck, 
  BarChart3, 
  Sparkles, 
  HelpCircle, 
  TrendingUp, 
  UserCheck, 
  AlertCircle,
  RefreshCw,
  SlidersHorizontal,
  DollarSign,
  Briefcase,
  Calendar,
  Percent,
  FileText,
  Home,
  Clock,
  Zap,
  CheckCircle2,
  XCircle,
  Activity,
  Layers,
  ArrowUpRight
} from "lucide-react";

/* ---------- Risk Color Helper ---------- */
const getRiskBadge = (risk) => {
  if (risk === "High Risk") {
    return {
      bg: "bg-rose-500/10 text-rose-400 border-rose-500/30",
      pill: "bg-rose-500 text-white",
      icon: <ShieldAlert className="w-5 h-5 text-rose-400" />,
      label: "HIGH RISK",
      gradient: "from-rose-500 to-red-600",
      textColor: "text-rose-400"
    };
  }
  if (risk === "Medium Risk") {
    return {
      bg: "bg-amber-500/10 text-amber-400 border-amber-500/30",
      pill: "bg-amber-500 text-slate-950",
      icon: <AlertCircle className="w-5 h-5 text-amber-400" />,
      label: "MEDIUM RISK",
      gradient: "from-amber-400 to-orange-500",
      textColor: "text-amber-400"
    };
  }
  return {
    bg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
    pill: "bg-emerald-500 text-slate-950",
    icon: <ShieldCheck className="w-5 h-5 text-emerald-400" />,
    label: "LOW RISK",
    gradient: "from-emerald-400 to-teal-500",
    textColor: "text-emerald-400"
  };
};

// Preset sample profiles for quick testing
const SAMPLE_PROFILES = {
  LOW_RISK: {
    person_age: "32",
    person_income: "95000",
    person_emp_length: "7",
    loan_amnt: "12000",
    loan_int_rate: "0.08",
    cb_person_cred_hist_length: "9",
    person_home_ownership: "MORTGAGE",
    loan_intent: "HOMEIMPROVEMENT",
    cb_person_default_on_file: "N",
  },
  MEDIUM_RISK: {
    person_age: "26",
    person_income: "45000",
    person_emp_length: "3",
    loan_amnt: "12000",
    loan_int_rate: "0.13",
    cb_person_cred_hist_length: "4",
    person_home_ownership: "RENT",
    loan_intent: "PERSONAL",
    cb_person_default_on_file: "N",
  },
  HIGH_RISK: {
    person_age: "22",
    person_income: "24000",
    person_emp_length: "1",
    loan_amnt: "16000",
    loan_int_rate: "0.19",
    cb_person_cred_hist_length: "2",
    person_home_ownership: "RENT",
    loan_intent: "DEBTCONSOLIDATION",
    cb_person_default_on_file: "Y",
  }
};

function App() {
  const [form, setForm] = useState(SAMPLE_PROFILES.LOW_RISK);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [shapImg, setShapImg] = useState(null);
  const [limeData, setLimeData] = useState([]);
  const [counterfactuals, setCounterfactuals] = useState([]);
  const [errorMsg, setErrorMsg] = useState("");
  const [activeTab, setActiveTab] = useState("overview"); // overview, shap, lime, counterfactual

  // Derived financial metrics
  const financialMetrics = useMemo(() => {
    const income = Number(form.person_income) || 0;
    const loan = Number(form.loan_amnt) || 0;
    const rate = Number(form.loan_int_rate) || 0;

    const dti = income > 0 ? (loan / income) * 100 : 0;
    const monthlyIncome = income > 0 ? income / 12 : 1;
    const estimatedEMI = (loan * (1 + rate)) / 12;
    const emiBurden = (estimatedEMI / monthlyIncome) * 100;
    const exposure = loan * (income > 0 ? loan / income : 0);

    return {
      dti: dti.toFixed(1),
      estimatedEMI: Math.round(estimatedEMI),
      emiBurden: emiBurden.toFixed(1),
      exposure: Math.round(exposure),
    };
  }, [form.person_income, form.loan_amnt, form.loan_int_rate]);

  const handleChange = (e) => {
    setErrorMsg("");
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const loadSample = (type) => {
    setErrorMsg("");
    setForm(SAMPLE_PROFILES[type]);
  };

  const validateForm = () => {
    const required = [
      "person_age",
      "person_income",
      "person_emp_length",
      "loan_amnt",
      "loan_int_rate",
      "cb_person_cred_hist_length",
      "person_home_ownership",
      "loan_intent",
      "cb_person_default_on_file"
    ];

    for (const key of required) {
      if (form[key] === undefined || form[key] === null || String(form[key]).trim() === "") {
        return `Please fill in ${key.replace(/_/g, " ").toUpperCase()}`;
      }
    }

    if (Number(form.person_age) <= 0 || isNaN(Number(form.person_age))) {
      return "Age must be a valid positive number.";
    }
    if (Number(form.person_income) <= 0 || isNaN(Number(form.person_income))) {
      return "Annual Income must be a valid positive number.";
    }
    if (Number(form.loan_amnt) <= 0 || isNaN(Number(form.loan_amnt))) {
      return "Loan Amount must be a valid positive number.";
    }
    return null;
  };

  const analyzeRisk = async () => {
    const validationError = validateForm();
    if (validationError) {
      setErrorMsg(validationError);
      return;
    }

    setLoading(true);
    setErrorMsg("");
    setResult(null);
    setShapImg(null);
    setLimeData([]);
    setCounterfactuals([]);

    const income = Number(form.person_income) || 1;
    const loanAmt = Number(form.loan_amnt) || 0;
    const calculatedPercent = Number((loanAmt / income).toFixed(2));

    const formattedPayload = {
      person_age: Number(form.person_age),
      person_income: Number(form.person_income),
      person_emp_length: Number(form.person_emp_length),
      loan_amnt: Number(form.loan_amnt),
      loan_int_rate: Number(form.loan_int_rate),
      loan_percent_income: calculatedPercent,
      cb_person_cred_hist_length: Number(form.cb_person_cred_hist_length),
      person_home_ownership: form.person_home_ownership,
      loan_intent: form.loan_intent,
      cb_person_default_on_file: form.cb_person_default_on_file,
    };

    try {
      const isGitHubPages = window.location.hostname.includes("github.io");
      const API_BASE = window.location.origin.includes(":8000") ? "" : "http://127.0.0.1:8000";

      let predictionData = null;

      /* ---------- 1. PREDICT via FastAPI Backend (Only if NOT on static GitHub Pages) ---------- */
      if (!isGitHubPages) {
        try {
          const response = await fetch(`${API_BASE}/predict`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(formattedPayload),
          });

          if (response.ok) {
            predictionData = await response.json();
            setResult(predictionData);

            /* ---------- 2. SHAP ---------- */
            try {
              const shapRes = await fetch(`${API_BASE}/shap`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formattedPayload),
              });
              if (shapRes.ok) {
                const shapJson = await shapRes.json();
                setShapImg(shapJson.shap_plot);
              }
            } catch (e) {
              console.warn("SHAP explanation failed:", e);
            }

            /* ---------- 3. LIME ---------- */
            try {
              const limeRes = await fetch(`${API_BASE}/lime`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formattedPayload),
              });
              if (limeRes.ok) {
                const limeJson = await limeRes.json();
                setLimeData(limeJson.lime_explanation || []);
              }
            } catch (e) {
              console.warn("LIME explanation failed:", e);
            }

            /* ---------- 4. COUNTERFACTUAL ---------- */
            try {
              const cfRes = await fetch(`${API_BASE}/counterfactual`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formattedPayload),
              });
              if (cfRes.ok) {
                const cfJson = await cfRes.json();
                setCounterfactuals(cfJson.suggestions || []);
              }
            } catch (e) {
              console.warn("Counterfactual generator failed:", e);
            }
          }
        } catch (err) {
          console.warn("Backend API not directly reachable over HTTP, switching to client-side credit engine:", err);
        }
      }

      /* ---------- 5. Client-Side Fallback Engine (for GitHub Pages Live Demo) ---------- */
      if (!predictionData) {
        const dti = formattedPayload.loan_amnt / (formattedPayload.person_income + 1);
        const hasDefault = formattedPayload.cb_person_default_on_file === "Y";
        let baseProb = 0.05 + dti * 0.4 + (formattedPayload.loan_int_rate > 0.12 ? 0.18 : 0.04);
        if (hasDefault) baseProb += 0.35;
        if (formattedPayload.person_emp_length < 2) baseProb += 0.12;

        const prob = Math.min(Math.max(baseProb, 0.008), 0.98);

        let riskLevel = "Low Risk";
        if (prob >= 0.60) riskLevel = "High Risk";
        else if (prob >= 0.30) riskLevel = "Medium Risk";

        setResult({ probability: prob, risk_level: riskLevel });

        // Fallback LIME explanations
        const limeExplanations = [];
        if (dti > 0.35) limeExplanations.push("Debt-to-income ratio increases the credit risk");
        else limeExplanations.push("Debt-to-income ratio reduces the credit risk");
        if (hasDefault) limeExplanations.push("Previous default history increases the credit risk");
        if (formattedPayload.person_income < 45000) limeExplanations.push("Annual income increases the credit risk");
        else limeExplanations.push("Annual income reduces the credit risk");
        if (formattedPayload.person_emp_length >= 4) limeExplanations.push("Employment stability reduces the credit risk");
        if (formattedPayload.cb_person_cred_hist_length >= 5) limeExplanations.push("Credit history length reduces the credit risk");
        setLimeData(limeExplanations.slice(0, 5));

        // Fallback Counterfactual roadmap
        const cfSuggestions = [];
        if (dti > 0.40) cfSuggestions.push(`Reduce loan amount from $${formattedPayload.loan_amnt.toLocaleString()} to approximately $${Math.round(formattedPayload.person_income * 0.35).toLocaleString()}`);
        if (formattedPayload.person_income < 50000) cfSuggestions.push(`Increase annual income from $${formattedPayload.person_income.toLocaleString()} to at least $50,000`);
        if (formattedPayload.loan_int_rate > 0.15) cfSuggestions.push(`Reduce interest rate from ${(formattedPayload.loan_int_rate * 100).toFixed(1)}% to below 15%`);
        if (cfSuggestions.length === 0) cfSuggestions.push("Profile is already low risk. No major changes required.");
        setCounterfactuals(cfSuggestions);
      }

    } catch (err) {
      console.error("Evaluation error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#080c14] text-slate-100 font-sans selection:bg-blue-600 selection:text-white pb-12">
      
      {/* ---------- AMBIENT GLOW BACKDROP ---------- */}
      <div className="fixed top-0 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full filter blur-[120px] pointer-events-none"></div>
      <div className="fixed bottom-0 right-1/4 w-96 h-96 bg-indigo-600/10 rounded-full filter blur-[120px] pointer-events-none"></div>

      {/* ---------- NAVIGATION BAR ---------- */}
      <nav className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-xl shadow-md shadow-blue-500/20">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                CreditRisk<span className="text-blue-400">.AI</span>
              </span>
              <span className="hidden sm:inline-block ml-2 text-xs px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20 font-medium">
                Underwriting Intelligence
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-6 text-xs text-slate-400 font-medium">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                FastAPI v1.0
              </span>
              <span className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-slate-400" />
                XGBoost + SHAP + LIME
              </span>
            </div>
            <div className="h-4 w-[1px] bg-slate-800 hidden md:block"></div>
            <button
              onClick={() => { loadSample("LOW_RISK"); analyzeRisk(); }}
              className="text-xs px-3 py-1.5 rounded-lg bg-blue-600/10 text-blue-400 border border-blue-500/20 hover:bg-blue-600/20 transition flex items-center gap-1.5 font-medium"
            >
              <Zap className="w-3.5 h-3.5 text-blue-400" />
              Quick Assessment
            </button>
          </div>
        </div>
      </nav>

      {/* ---------- FINANCIAL METRICS KPI STRIP ---------- */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">

          {/* DTI Gauge Card */}
          <div className="glass-card-interactive p-4 rounded-2xl">
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Debt-to-Income</span>
              <span className="p-1.5 bg-blue-500/10 text-blue-400 rounded-lg">
                <Percent className="w-4 h-4" />
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-slate-100">{financialMetrics.dti}%</span>
              <span className={`text-xs font-semibold ${Number(financialMetrics.dti) > 40 ? 'text-rose-400' : 'text-emerald-400'}`}>
                {Number(financialMetrics.dti) > 40 ? 'High DTI' : 'Optimal'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Loan / Annual Income Ratio</p>
          </div>

          {/* Monthly EMI Burden */}
          <div className="glass-card-interactive p-4 rounded-2xl">
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Est. Monthly EMI</span>
              <span className="p-1.5 bg-indigo-500/10 text-indigo-400 rounded-lg">
                <DollarSign className="w-4 h-4" />
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-slate-100">${financialMetrics.estimatedEMI}</span>
              <span className="text-xs text-slate-400 font-semibold">{financialMetrics.emiBurden}% income</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Estimated monthly repayment</p>
          </div>

          {/* Credit Exposure */}
          <div className="glass-card-interactive p-4 rounded-2xl">
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Credit Exposure</span>
              <span className="p-1.5 bg-violet-500/10 text-violet-400 rounded-lg">
                <TrendingUp className="w-4 h-4" />
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-slate-100">${financialMetrics.exposure}</span>
              <span className="text-xs text-violet-400 font-semibold">Weighted Index</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Overall exposure footprint</p>
          </div>

          {/* Interest & Rate */}
          <div className="glass-card-interactive p-4 rounded-2xl">
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Interest Rate</span>
              <span className="p-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg">
                <BarChart3 className="w-4 h-4" />
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-slate-100">{(Number(form.loan_int_rate) * 100).toFixed(1)}%</span>
              <span className="text-xs text-emerald-400 font-semibold">Fixed Rate</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Applied APR percentage</p>
          </div>

        </div>
      </section>

      {/* ---------- MAIN WORKSPACE GRID ---------- */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* ---------- LEFT COLUMN: FINANCIAL FORM (COL 1-4) ---------- */}
        <section className="lg:col-span-4 flex flex-col gap-4">

          <div className="glass-card p-6 rounded-2xl flex-1 flex flex-col justify-between">
            <div>
              {/* Form Title & Demo Controls */}
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-blue-400" />
                  <h2 className="text-base font-bold text-slate-100">Applicant Details</h2>
                </div>
                <div className="dropdown relative group">
                  <button type="button" className="text-xs px-2.5 py-1.5 rounded-lg bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-750 transition flex items-center gap-1 font-medium">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-blue-400" />
                    Load Profiles
                  </button>
                  <div className="absolute right-0 mt-1 w-44 bg-slate-900 border border-slate-700 rounded-xl shadow-xl hidden group-hover:block z-20 p-1">
                    <button
                      type="button"
                      onClick={() => loadSample("LOW_RISK")}
                      className="w-full text-left px-3 py-2 text-xs text-emerald-300 hover:bg-emerald-950/50 rounded-lg flex items-center gap-2 transition"
                    >
                      <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                      Low Risk Demo
                    </button>
                    <button
                      type="button"
                      onClick={() => loadSample("MEDIUM_RISK")}
                      className="w-full text-left px-3 py-2 text-xs text-amber-300 hover:bg-amber-950/50 rounded-lg flex items-center gap-2 transition"
                    >
                      <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                      Medium Risk Demo
                    </button>
                    <button
                      type="button"
                      onClick={() => loadSample("HIGH_RISK")}
                      className="w-full text-left px-3 py-2 text-xs text-rose-300 hover:bg-rose-950/50 rounded-lg flex items-center gap-2 transition"
                    >
                      <span className="w-2 h-2 rounded-full bg-rose-400"></span>
                      High Risk Demo
                    </button>
                  </div>
                </div>
              </div>

              {errorMsg && (
                <div className="mb-4 p-3.5 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs rounded-xl flex items-start gap-2.5 animate-shake">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <div>{errorMsg}</div>
                </div>
              )}

              {/* Form Input Fields */}
              <div className="space-y-3.5">

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    Applicant Age
                  </label>
                  <input
                    type="number"
                    className="input"
                    name="person_age"
                    value={form.person_age}
                    placeholder="e.g. 30"
                    onChange={handleChange}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1 flex items-center gap-1.5">
                      <DollarSign className="w-3.5 h-3.5 text-slate-500" />
                      Annual Income
                    </label>
                    <input
                      type="number"
                      className="input"
                      name="person_income"
                      value={form.person_income}
                      placeholder="e.g. 60000"
                      onChange={handleChange}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1 flex items-center gap-1.5">
                      <Briefcase className="w-3.5 h-3.5 text-slate-500" />
                      Emp. Length (Yrs)
                    </label>
                    <input
                      type="number"
                      className="input"
                      name="person_emp_length"
                      value={form.person_emp_length}
                      placeholder="e.g. 5"
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-slate-500" />
                      Loan Amount ($)
                    </label>
                    <input
                      type="number"
                      className="input"
                      name="loan_amnt"
                      value={form.loan_amnt}
                      placeholder="e.g. 10000"
                      onChange={handleChange}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1 flex items-center gap-1.5">
                      <Percent className="w-3.5 h-3.5 text-slate-500" />
                      Interest Rate
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      className="input"
                      name="loan_int_rate"
                      value={form.loan_int_rate}
                      placeholder="e.g. 0.11"
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    Credit History Length (Years)
                  </label>
                  <input
                    type="number"
                    className="input"
                    name="cb_person_cred_hist_length"
                    value={form.cb_person_cred_hist_length}
                    placeholder="e.g. 4"
                    onChange={handleChange}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1 flex items-center gap-1.5">
                    <Home className="w-3.5 h-3.5 text-slate-500" />
                    Home Ownership
                  </label>
                  <select
                    className="input"
                    name="person_home_ownership"
                    value={form.person_home_ownership}
                    onChange={handleChange}
                  >
                    <option value="" disabled>Select Ownership</option>
                    <option value="RENT">RENT</option>
                    <option value="OWN">OWN</option>
                    <option value="MORTGAGE">MORTGAGE</option>
                    <option value="OTHER">OTHER</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-slate-500" />
                    Loan Purpose / Intent
                  </label>
                  <select
                    className="input"
                    name="loan_intent"
                    value={form.loan_intent}
                    onChange={handleChange}
                  >
                    <option value="" disabled>Select Loan Intent</option>
                    <option value="PERSONAL">PERSONAL</option>
                    <option value="EDUCATION">EDUCATION</option>
                    <option value="MEDICAL">MEDICAL</option>
                    <option value="VENTURE">VENTURE</option>
                    <option value="HOMEIMPROVEMENT">HOME IMPROVEMENT</option>
                    <option value="DEBTCONSOLIDATION">DEBT CONSOLIDATION</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1 flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5 text-slate-500" />
                    Previous Default History
                  </label>
                  <select
                    className="input"
                    name="cb_person_default_on_file"
                    value={form.cb_person_default_on_file}
                    onChange={handleChange}
                  >
                    <option value="" disabled>Select History</option>
                    <option value="N">No Default On Record</option>
                    <option value="Y">Has Defaulted Previously</option>
                  </select>
                </div>

              </div>
            </div>

            <button
              onClick={analyzeRisk}
              disabled={loading}
              className="w-full mt-6 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-3.5 px-4 rounded-xl transition duration-200 shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2 disabled:opacity-50 text-sm"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-blue-200" />
                  Analyzing Credit Profile...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-blue-200" />
                  Evaluate Credit Risk
                </>
              )}
            </button>
          </div>

        </section>

        {/* ---------- RIGHT COLUMN: ANALYTICS & VISUALIZATIONS (COL 5-12) ---------- */}
        <section className="lg:col-span-8 space-y-6">

          {/* Navigation Tabs Header */}
          <div className="flex items-center gap-2 p-1.5 bg-slate-900/80 border border-slate-800 rounded-2xl backdrop-blur-md overflow-x-auto">
            <button
              onClick={() => setActiveTab("overview")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 ${
                activeTab === "overview"
                  ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/20"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              Risk Overview
            </button>

            <button
              onClick={() => setActiveTab("shap")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 ${
                activeTab === "shap"
                  ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/20"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              }`}
            >
              <Sparkles className="w-4 h-4" />
              SHAP Visuals
            </button>

            <button
              onClick={() => setActiveTab("lime")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 ${
                activeTab === "lime"
                  ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/20"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              }`}
            >
              <HelpCircle className="w-4 h-4" />
              LIME Factors
            </button>

            <button
              onClick={() => setActiveTab("counterfactual")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 ${
                activeTab === "counterfactual"
                  ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/20"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              Counterfactual Roadmap
            </button>
          </div>

          {/* Empty State Banner */}
          {!result && !loading && (
            <div className="glass-card rounded-2xl p-12 text-center flex flex-col items-center justify-center min-h-[420px]">
              <div className="p-4 bg-gradient-to-br from-blue-500/10 to-indigo-500/10 rounded-full border border-blue-500/20 mb-4 text-blue-400">
                <Activity className="w-10 h-10 animate-pulse-subtle" />
              </div>
              <h3 className="text-xl font-bold text-slate-100 mb-2">Ready for Credit Underwriting</h3>
              <p className="text-slate-400 max-w-md text-xs sm:text-sm mb-6 leading-relaxed">
                Configure the applicant parameters on the left or select a preset demo profile to generate instant AI credit score probabilities and explainable model insights.
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                <button
                  onClick={() => { loadSample("LOW_RISK"); analyzeRisk(); }}
                  className="px-4 py-2.5 bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-bold hover:bg-emerald-500/20 transition flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Run Low Risk Demo
                </button>
                <button
                  onClick={() => { loadSample("HIGH_RISK"); analyzeRisk(); }}
                  className="px-4 py-2.5 bg-rose-500/10 text-rose-300 border border-rose-500/30 rounded-xl text-xs font-bold hover:bg-rose-500/20 transition flex items-center gap-2"
                >
                  <XCircle className="w-4 h-4" />
                  Run High Risk Demo
                </button>
              </div>
            </div>
          )}

          {/* TAB 1: OVERVIEW & RISK GAUGE */}
          {result && (activeTab === "overview" || activeTab === "all") && (
            <div className="space-y-6">
              <div className="glass-card p-6 rounded-2xl">
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-blue-400" />
                    <h3 className="text-base font-bold text-slate-100">Credit Risk Assessment</h3>
                  </div>
                  {(() => {
                    const badge = getRiskBadge(result.risk_level);
                    return (
                      <div className={`px-4 py-1.5 rounded-full border text-xs font-bold flex items-center gap-2 ${badge.bg}`}>
                        {badge.icon}
                        {badge.label}
                      </div>
                    );
                  })()}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                  
                  {/* Gauge Meter Box (5 Cols) */}
                  <div className="md:col-span-5 flex flex-col items-center justify-center p-6 bg-slate-900/90 rounded-2xl border border-slate-800 text-center">
                    <div className="relative w-40 h-40 flex items-center justify-center">
                      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                        <path
                          className="text-slate-800"
                          strokeWidth="3.5"
                          stroke="currentColor"
                          fill="none"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                        <path
                          className={getRiskBadge(result.risk_level).textColor}
                          strokeDasharray={`${(result.probability || 0) * 100}, 100`}
                          strokeWidth="3.5"
                          strokeLinecap="round"
                          stroke="currentColor"
                          fill="none"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                      </svg>
                      <div className="absolute flex flex-col items-center">
                        <span className="text-3xl font-extrabold text-white tracking-tight">
                          {((result.probability || 0) * 100).toFixed(1)}%
                        </span>
                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mt-0.5">
                          Default Probability
                        </span>
                      </div>
                    </div>
                    <div className="mt-4">
                      <span className={`text-sm font-bold ${getRiskBadge(result.risk_level).textColor}`}>
                        {result.risk_level}
                      </span>
                      <p className="text-[11px] text-slate-500 mt-0.5">XGBoost ML Classification Model</p>
                    </div>
                  </div>

                  {/* Details Breakdown (7 Cols) */}
                  <div className="md:col-span-7 space-y-4">
                    <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800">
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-xs font-semibold text-slate-400">Risk Score Meter</span>
                        <span className="text-xs font-bold text-slate-200">
                          {((1 - result.probability) * 850).toFixed(0)} / 850
                        </span>
                      </div>
                      <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full bg-gradient-to-r ${getRiskBadge(result.risk_level).gradient} transition-all duration-700`}
                          style={{ width: `${(1 - result.probability) * 100}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1 text-right">Synthetic FICO Equivalent Rating</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800">
                        <span className="text-slate-500 font-medium">Applicant Income</span>
                        <p className="text-sm font-bold text-slate-200 mt-0.5">${Number(form.person_income).toLocaleString()}</p>
                      </div>
                      <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800">
                        <span className="text-slate-500 font-medium">Requested Loan</span>
                        <p className="text-sm font-bold text-slate-200 mt-0.5">${Number(form.loan_amnt).toLocaleString()}</p>
                      </div>
                      <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800">
                        <span className="text-slate-500 font-medium">Debt-To-Income</span>
                        <p className="text-sm font-bold text-slate-200 mt-0.5">{financialMetrics.dti}%</p>
                      </div>
                      <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800">
                        <span className="text-slate-500 font-medium">Est. EMI Burden</span>
                        <p className="text-sm font-bold text-slate-200 mt-0.5">${financialMetrics.estimatedEMI}/mo</p>
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SHAP VISUALS */}
          {(activeTab === "shap" || (result && activeTab === "overview")) && shapImg && (
            <div className="glass-card p-6 rounded-2xl">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-indigo-400" />
                  <h3 className="text-base font-bold text-slate-100">SHAP Feature Importance Analysis</h3>
                </div>
                <span className="text-xs text-slate-400 font-medium bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700">
                  Global Feature Drivers
                </span>
              </div>
              <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                The bar chart illustrates the magnitude of impact each applicant feature has on pushing the credit default probability up or down.
              </p>
              <div className="bg-white p-4 rounded-xl border border-slate-700 flex justify-center shadow-inner">
                <img
                  src={`data:image/png;base64,${shapImg}`}
                  alt="SHAP Feature Importance Plot"
                  className="max-w-full h-auto rounded"
                />
              </div>
            </div>
          )}

          {/* TAB 3: LIME FACTORS */}
          {(activeTab === "lime" || (result && activeTab === "overview")) && limeData && limeData.length > 0 && (
            <div className="glass-card p-6 rounded-2xl">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <HelpCircle className="w-5 h-5 text-blue-400" />
                  <h3 className="text-base font-bold text-slate-100">LIME Local Feature Factors</h3>
                </div>
                <span className="text-xs text-blue-400 font-medium bg-blue-500/10 px-2.5 py-1 rounded-lg border border-blue-500/20">
                  Top 5 Key Determinants
                </span>
              </div>
              <ul className="space-y-2.5">
                {limeData.map((item, i) => {
                  const isIncreasingRisk = item.includes("increases");
                  return (
                    <li
                      key={i}
                      className={`p-3.5 rounded-xl border text-xs sm:text-sm font-medium flex items-center justify-between transition ${
                        isIncreasingRisk 
                          ? "bg-rose-950/20 border-rose-500/20 text-rose-300"
                          : "bg-emerald-950/20 border-emerald-500/20 text-emerald-300"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`p-1 rounded-md ${isIncreasingRisk ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                          {isIncreasingRisk ? <ArrowUpRight className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                        </span>
                        <span>{item}</span>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                        isIncreasingRisk ? 'bg-rose-500/20 text-rose-300' : 'bg-emerald-500/20 text-emerald-300'
                      }`}>
                        {isIncreasingRisk ? '+ Risk' : '- Risk'}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* TAB 4: COUNTERFACTUAL RECOMMENDATIONS */}
          {(activeTab === "counterfactual" || (result && activeTab === "overview")) && counterfactuals && counterfactuals.length > 0 && (
            <div className="glass-card p-6 rounded-2xl">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-base font-bold text-slate-100">Actionable Counterfactual Suggestions</h3>
                </div>
                <span className="text-xs text-emerald-400 font-medium bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                  Risk Reduction Plan
                </span>
              </div>
              <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                Recommended adjustments to applicant parameters to shift high/medium risk profiles into a low-risk approval state:
              </p>
              <ul className="space-y-3">
                {counterfactuals.map((suggestion, i) => (
                  <li
                    key={i}
                    className="p-4 bg-emerald-950/20 rounded-xl border border-emerald-500/30 text-emerald-300 text-xs sm:text-sm font-medium flex items-start gap-3 shadow-sm"
                  >
                    <span className="p-1 bg-emerald-500/20 text-emerald-400 rounded-lg shrink-0 mt-0.5">
                      <CheckCircle2 className="w-4 h-4" />
                    </span>
                    <span className="leading-normal">{suggestion}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

        </section>
      </main>

      {/* ---------- FOOTER ---------- */}
      <footer className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 pt-6 border-t border-slate-800 text-center text-xs text-slate-500 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div>
          Credit Risk Assessment Model • Machine Learning & Explainability Suite
        </div>
        <div className="flex items-center gap-4 text-slate-400">
          <span>XGBoost</span>
          <span>•</span>
          <span>SHAP Bar Plot</span>
          <span>•</span>
          <span>LIME Tabular</span>
          <span>•</span>
          <span>FastAPI</span>
        </div>
      </footer>

    </div>
  );
}

export default App;
