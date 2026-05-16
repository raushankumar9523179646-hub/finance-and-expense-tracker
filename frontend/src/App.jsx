import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, clearAuthToken } from "./api.js";
import { AnimatedGradientBackground } from "./AnimatedGradientBackground.jsx";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function TabButton({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
        active
          ? "glass border-emerald-400/30 bg-gradient-to-r from-emerald-500/25 via-teal-500/10 to-cyan-500/5 text-emerald-100 shadow-[0_0_24px_-6px_rgba(52,211,153,0.4)]"
          : "glass-muted text-slate-400 hover:border-white/15 hover:text-slate-100"
      }`}
    >
      {children}
    </button>
  );
}

function Card({ title, children, action }) {
  return (
    <section className="glass card-fog relative overflow-hidden rounded-2xl p-5">
      <span className="card-fog-vapor" aria-hidden />
      <span className="card-fog-vapor card-fog-vapor--b" aria-hidden />
      <span className="card-fog-noise" aria-hidden />
      <div className="relative z-10">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="font-display text-lg font-semibold tracking-tight text-white">{title}</h2>
          {action}
        </div>
        {children}
      </div>
    </section>
  );
}

function Input({ label, className = "", ...props }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </span>
      <input className={`glass-input ${className}`.trim()} {...props} />
    </label>
  );
}

function Select({ label, className = "", children, ...props }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </span>
      <select className={`glass-select ${className}`.trim()} {...props}>
        {children}
      </select>
    </label>
  );
}

const ACCOUNT_TYPE_OPTIONS = [
  ["checking", "Checking"],
  ["savings", "Savings"],
  ["cash", "Cash"],
  ["credit_card", "Credit card"],
  ["investment", "Investment"],
  ["other", "Other"],
];

function CrudModal({ title, open, onClose, children }) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="crud-modal-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close dialog"
      />
      <div className="glass relative z-10 max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl p-6 shadow-2xl ring-1 ring-white/10">
        <h3 id="crud-modal-title" className="font-display text-lg font-semibold text-white">
          {title}
        </h3>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}

function AccountEditorModal({ draft, onClose, onSaved }) {
  const [name, setName] = useState("");
  const [accountType, setAccountType] = useState("checking");
  const [currency, setCurrency] = useState("USD");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (draft) {
      setName(draft.name ?? "");
      setAccountType(draft.account_type ?? "checking");
      setCurrency(draft.currency ?? "USD");
    }
  }, [draft]);

  if (!draft) return null;

  async function submit(e) {
    e.preventDefault();
    const n = name.trim();
    if (!n) return;
    setBusy(true);
    try {
      if (draft.id != null) {
        await api.updateAccount(draft.id, {
          name: n,
          account_type: accountType,
          currency: currency.trim() || "USD",
        });
      } else {
        await api.createAccount({
          name: n,
          account_type: accountType,
          currency: currency.trim() || "USD",
        });
      }
      await onSaved();
    } catch (err) {
      window.alert(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <CrudModal
      title={draft.id != null ? "Edit account" : "New account"}
      open
      onClose={onClose}
    >
      <form onSubmit={submit} className="space-y-4">
        <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} required />
        <Select label="Type" value={accountType} onChange={(e) => setAccountType(e.target.value)}>
          {ACCOUNT_TYPE_OPTIONS.map(([val, lab]) => (
            <option key={val} value={val}>
              {lab}
            </option>
          ))}
        </Select>
        <Input
          label="Currency"
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
          placeholder="USD"
        />
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            className="rounded-lg glass-muted px-4 py-2 text-sm text-slate-300 hover:text-white"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg border border-emerald-400/25 bg-emerald-600/85 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm hover:bg-emerald-500 disabled:opacity-50"
          >
            {busy ? "Saving…" : draft.id != null ? "Update" : "Create"}
          </button>
        </div>
      </form>
    </CrudModal>
  );
}

function CategoryEditorModal({ draft, onClose, onSaved }) {
  const [name, setName] = useState("");
  const [flow, setFlow] = useState("expense");
  const [color, setColor] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (draft) {
      setName(draft.name ?? "");
      setFlow(draft.flow ?? "expense");
      setColor(draft.color ?? "");
    }
  }, [draft]);

  if (!draft) return null;

  async function submit(e) {
    e.preventDefault();
    const n = name.trim();
    if (!n) return;
    setBusy(true);
    try {
      const body = {
        name: n,
        flow,
        color: color.trim() || null,
      };
      if (draft.id != null) {
        await api.updateCategory(draft.id, body);
      } else {
        await api.createCategory(body);
      }
      await onSaved();
    } catch (err) {
      window.alert(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <CrudModal
      title={draft.id != null ? "Edit category" : "New category"}
      open
      onClose={onClose}
    >
      <form onSubmit={submit} className="space-y-4">
        <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} required />
        <Select label="Flow" value={flow} onChange={(e) => setFlow(e.target.value)}>
          <option value="expense">Expense</option>
          <option value="income">Income</option>
        </Select>
        <Input
          label="Color (hex)"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          placeholder="#22c55e"
        />
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            className="rounded-lg glass-muted px-4 py-2 text-sm text-slate-300 hover:text-white"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg border border-emerald-400/25 bg-emerald-600/85 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm hover:bg-emerald-500 disabled:opacity-50"
          >
            {busy ? "Saving…" : draft.id != null ? "Update" : "Create"}
          </button>
        </div>
      </form>
    </CrudModal>
  );
}

function TransactionEditorModal({ accounts, categories, tx, onClose, onSaved }) {
  const [accountId, setAccountId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [occurredOn, setOccurredOn] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (tx) {
      setAccountId(String(tx.account_id));
      setCategoryId(String(tx.category_id));
      setAmount(String(tx.amount));
      setNote(tx.note ?? "");
      setOccurredOn(tx.occurred_on ?? todayISO());
    }
  }, [tx]);

  if (!tx) return null;

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await api.updateTransaction(tx.id, {
        account_id: Number(accountId),
        category_id: Number(categoryId),
        amount: Number(amount),
        note: note.trim() || null,
        occurred_on: occurredOn,
      });
      await onSaved();
    } catch (err) {
      window.alert(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <CrudModal title="Edit transaction" open onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <Select label="Account" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </Select>
        <Select label="Category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.flow})
            </option>
          ))}
        </Select>
        <Input
          label="Amount"
          type="number"
          step="0.01"
          min="0.01"
          required
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <Input label="Date" type="date" value={occurredOn} onChange={(e) => setOccurredOn(e.target.value)} />
        <Input label="Note" value={note} onChange={(e) => setNote(e.target.value)} />
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            className="rounded-lg glass-muted px-4 py-2 text-sm text-slate-300 hover:text-white"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg border border-emerald-400/25 bg-emerald-600/85 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm hover:bg-emerald-500 disabled:opacity-50"
          >
            {busy ? "Saving…" : "Update"}
          </button>
        </div>
      </form>
    </CrudModal>
  );
}

function BudgetLimitEditor({ budget, onSaved }) {
  const [val, setVal] = useState(String(budget.limit_amount));
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setVal(String(budget.limit_amount));
  }, [budget.id, budget.limit_amount]);

  async function save() {
    setBusy(true);
    try {
      await api.updateBudget(budget.id, { limit_amount: Number(val) });
      await onSaved();
    } catch (err) {
      window.alert(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-3 flex flex-wrap items-end gap-2">
      <label className="block">
        <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
          Adjust limit
        </span>
        <input
          className="glass-input w-36"
          type="number"
          step="0.01"
          min="0"
          value={val}
          onChange={(e) => setVal(e.target.value)}
        />
      </label>
      <button
        type="button"
        disabled={busy}
        onClick={save}
        className="rounded-lg border border-sky-400/25 bg-sky-600/80 px-3 py-2 text-xs font-semibold text-white backdrop-blur-sm hover:bg-sky-500 disabled:opacity-50"
      >
        {busy ? "…" : "Update limit"}
      </button>
    </div>
  );
}

function LiveClock() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex flex-col items-end">
      <p className="text-xs font-bold uppercase tracking-widest text-emerald-400/70">Live Status</p>
      <div className="flex items-baseline gap-2">
        <span className="font-mono text-lg font-bold text-white">
          {now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
        </span>
        <span className="text-[10px] font-medium text-slate-500 uppercase">
          {now.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })}
        </span>
      </div>
    </div>
  );
}

export default function App() {
  const navigate = useNavigate();
  const signOut = useCallback(() => {
    clearAuthToken();
    navigate("/", { replace: true });
  }, [navigate]);

  const [user, setUser] = useState(null);
  const [tab, setTab] = useState("dashboard");
  const [err, setErr] = useState(null);
  const now = useMemo(() => new Date(), []);
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState(null);
  const [balances, setBalances] = useState([]);
  const [budgets, setBudgets] = useState([]);

  const [accountDraft, setAccountDraft] = useState(null);
  const [categoryDraft, setCategoryDraft] = useState(null);
  const [txEdit, setTxEdit] = useState(null);

  const userDisplayName = useMemo(() => {
    const explicit = user?.display_name || user?.name;
    if (explicit && explicit.trim()) return explicit.trim();
    if (user?.email) {
      return user.email.split("@")[0];
    }
    return "Loading...";
  }, [user]);

  const userInitials = useMemo(() => {
    if (!userDisplayName || userDisplayName === "Loading...") return "UR";
    const letters = userDisplayName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("");
    return letters || "UR";
  }, [userDisplayName]);

  const loadCore = useCallback(async () => {
    setErr(null);
    try {
      const [u, a, c] = await Promise.all([api.me(), api.accounts(), api.categories()]);
      setUser(u);
      setAccounts(a);
      setCategories(c);
    } catch (e) {
      setErr(e.message);
    }
  }, []);

  const loadMonth = useCallback(async () => {
    setErr(null);
    try {
      const y = String(year);
      const m = String(month).padStart(2, "0");
      const lastDay = String(new Date(year, month, 0).getDate()).padStart(2, "0");
      const [s, b, bal, tx] = await Promise.all([
        api.summaryMonth(year, month),
        api.budgets(year, month),
        api.accountBalances(),
        api.transactions({
          from: `${y}-${m}-01`,
          to: `${y}-${m}-${lastDay}`,
        }),
      ]);
      setSummary(s);
      setBudgets(b);
      setBalances(bal);
      setTransactions(tx);
    } catch (e) {
      setErr(e.message);
    }
  }, [year, month]);

  useEffect(() => {
    loadCore();
  }, [loadCore]);

  useEffect(() => {
    loadMonth();
  }, [loadMonth]);

  const expenseCats = categories.filter((c) => c.flow === "expense");

  return (
    <div className="relative flex h-screen w-screen flex-col md:flex-row overflow-hidden text-slate-200">
      <AnimatedGradientBackground />
      
      {/* 1. Left Sidebar Navigation */}
      <aside className="relative z-10 flex w-full md:w-72 shrink-0 flex-col border-b md:border-b-0 md:border-r border-white/10 bg-black/20 backdrop-blur-3xl overflow-y-auto">
        <div className="p-8">
          <p className="text-xs font-bold uppercase tracking-widest text-emerald-400/90">Personal Finance</p>
          <h1 className="font-display mt-2 bg-gradient-to-br from-white via-emerald-100 to-cyan-200 bg-clip-text text-2xl font-bold tracking-tight text-transparent">
            Expense Tracker
          </h1>
        </div>

        <nav className="flex flex-1 flex-col gap-2 px-4">
          <TabButton active={tab === "dashboard"} onClick={() => setTab("dashboard")}>
            <div className="flex items-center gap-3">
              <span className="h-2 w-2 rounded-full bg-current" />
              Dashboard
            </div>
          </TabButton>
          <TabButton active={tab === "transactions"} onClick={() => setTab("transactions")}>
            <div className="flex items-center gap-3">
              <span className="h-2 w-2 rounded-full bg-current" />
              Transactions
            </div>
          </TabButton>
          <TabButton active={tab === "accounts"} onClick={() => setTab("accounts")}>
            <div className="flex items-center gap-3">
              <span className="h-2 w-2 rounded-full bg-current" />
              Accounts
            </div>
          </TabButton>
          <TabButton active={tab === "categories"} onClick={() => setTab("categories")}>
            <div className="flex items-center gap-3">
              <span className="h-2 w-2 rounded-full bg-current" />
              Categories
            </div>
          </TabButton>
          <TabButton active={tab === "budgets"} onClick={() => setTab("budgets")}>
            <div className="flex items-center gap-3">
              <span className="h-2 w-2 rounded-full bg-current" />
              Budgets
            </div>
          </TabButton>
        </nav>

        {/* 3. Sidebar Footer: Profile & Sign Out */}
        <div className="mt-auto border-t border-white/5 bg-white/[0.02] p-4 backdrop-blur-md">
          <div className="mb-4 flex items-center gap-3 rounded-2xl glass-muted p-2 pointer-events-auto">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 via-teal-500 to-cyan-500 text-sm font-black text-black shadow-lg shadow-emerald-500/20 ring-2 ring-white/10">
              {userInitials}
            </div>
            <div className="flex flex-col truncate">
              <span className="truncate text-sm font-bold text-white">{userDisplayName}</span>
              <span className="text-[10px] font-medium uppercase tracking-widest text-emerald-400/80">Pro Dashboard</span>
            </div>
          </div>

          <button
            type="button"
            onClick={signOut}
            className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl border border-rose-500/20 bg-rose-500/5 px-4 py-3 text-xs font-bold text-rose-300 shadow-lg shadow-rose-950/20 transition-all duration-300 hover:border-rose-500/40 hover:bg-rose-500/15 hover:text-rose-100 active:scale-95"
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              viewBox="0 0 20 20" 
              fill="currentColor" 
              className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
            >
              <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
            </svg>
            Sign Out
          </button>
        </div>
      </aside>

      {/* 2. Main Content Area (Right) */}
      <main className="relative z-0 flex flex-1 flex-col overflow-y-auto">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-white/5 bg-black/10 px-8 py-4 backdrop-blur-xl">
          <div className="flex items-center gap-8">
            <LiveClock />
          </div>
          
          <div className="flex items-center gap-3 rounded-xl glass-muted p-1 sm:p-1.5">
            <Select label="" value={month} onChange={(e) => setMonth(Number(e.target.value))} className="!py-1 !text-xs">
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {new Date(2000, i, 1).toLocaleString("default", { month: "short" })}
                </option>
              ))}
            </Select>
            <Input
              label=""
              type="number"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="w-20 !py-1 !text-xs"
            />
          </div>
        </header>

        <div className="mx-auto w-full max-w-7xl p-8">
          {err && (
            <div className="mb-8 rounded-xl glass-danger px-4 py-3 text-sm text-rose-50 shadow-lg">
              {err} — is the Flask API running?
            </div>
          )}

          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {tab === "dashboard" && (
              <div className="grid gap-8 lg:grid-cols-2">
                <Card title="Month Overview">
                  {summary && (
                    <div className="grid gap-4 sm:grid-cols-3">
                      <div className="rounded-xl glass-muted p-4 ring-1 ring-emerald-400/20 shadow-inner">
                        <p className="text-[10px] uppercase tracking-wider text-emerald-400/70">Income</p>
                        <p className="mt-1 font-display text-2xl font-bold text-emerald-300">
                           {summary.income_total.toFixed(2)}
                        </p>
                      </div>
                      <div className="rounded-xl glass-muted p-4 ring-1 ring-rose-400/20">
                        <p className="text-[10px] uppercase tracking-wider text-rose-400/70">Expenses</p>
                        <p className="mt-1 font-display text-2xl font-bold text-rose-300">
                           {summary.expense_total.toFixed(2)}
                        </p>
                      </div>
                      <div className="rounded-xl glass-muted p-4 ring-1 ring-sky-400/15">
                        <p className="text-[10px] uppercase tracking-wider text-slate-500">Net</p>
                        <p className={`mt-1 font-display text-2xl font-bold ${summary.net >= 0 ? "text-sky-300" : "text-amber-300"}`}>
                           {summary.net.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  )}
                  <div className="mt-8">
                    <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-slate-500">Breakdown</h3>
                    <ul className="grid gap-3 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                      {summary?.by_category?.map((row) => (
                        <li key={row.category_id} className="flex items-center justify-between rounded-xl glass-muted px-4 py-3 hover:bg-white/5 transition">
                          <span className="font-medium text-slate-300">{row.name}</span>
                          <span className={`${row.flow === "income" ? "text-emerald-400" : "text-rose-300"} font-mono`}>
                            {row.total.toFixed(2)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </Card>

                <Card title="Global Assets">
                  <p className="mb-5 text-sm text-slate-500 leading-relaxed">
                    Cumulative net position per account (all time).
                  </p>
                  <ul className="space-y-3">
                    {balances.map((row) => (
                      <li key={row.account.id} className="flex items-center justify-between rounded-xl glass-muted px-4 py-3 border border-white/5">
                        <span className="font-semibold text-slate-200">{row.account.name}</span>
                        <span className={`${row.balance >= 0 ? "text-emerald-400" : "text-rose-300"} font-mono text-lg`}>
                          {row.balance.toFixed(2)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </Card>
              </div>
            )}

            {tab === "transactions" && (
              <div className="grid gap-8 xl:grid-cols-12">
                <div className="xl:col-span-4">
                  <Card title="New Entry">
                    <TransactionForm 
                      accounts={accounts} 
                      categories={categories} 
                      onCreated={async () => { await loadMonth(); await loadCore(); }} 
                    />
                  </Card>
                </div>
                <div className="xl:col-span-8">
                  <Card title="Activity Feed">
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[600px] text-left">
                        <thead>
                          <tr className="border-b border-white/10 text-[10px] uppercase tracking-widest text-slate-500">
                            <th className="pb-4 font-bold">Date</th>
                            <th className="pb-4 font-bold">Account</th>
                            <th className="pb-4 font-bold">Category</th>
                            <th className="pb-4 font-bold">Amount</th>
                            <th className="pb-4 text-right font-bold">Options</th>
                          </tr>
                        </thead>
                        <tbody className="text-sm">
                          {transactions.map((t) => {
                            const acc = accounts.find((a) => a.id === t.account_id);
                            const cat = categories.find((c) => c.id === t.category_id);
                            return (
                              <tr key={t.id} className="group border-b border-white/[0.04] transition hover:bg-white/[0.02]">
                                <td className="py-4 text-slate-500">{t.occurred_on}</td>
                                <td className="py-4 font-medium">{acc?.name ?? t.account_id}</td>
                                <td className="py-4">
                                  <span className={cat?.flow === "income" ? "text-emerald-400" : "text-rose-300"}>
                                    {cat?.name ?? t.category_id}
                                  </span>
                                </td>
                                <td className="py-4 font-mono font-bold text-lg">{Number(t.amount).toFixed(2)}</td>
                                <td className="py-4 text-right">
                                  <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition">
                                    <button onClick={() => setTxEdit(t)} className="text-sky-400 hover:text-sky-300 transition">Edit</button>
                                    <button onClick={async () => { if (window.confirm("Delete?")) { await api.deleteTransaction(t.id); loadMonth(); loadCore(); }}} className="text-rose-400 hover:text-rose-300 transition">Delete</button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                </div>
              </div>
            )}

            {tab === "accounts" && (
              <div className="max-w-2xl mx-auto">
                <Card 
                  title="Secure Accounts" 
                  action={
                    <button onClick={() => setAccountDraft({ name: "", account_type: "checking", currency: "USD" })} 
                      className="rounded-lg bg-emerald-500 px-4 py-2 text-xs font-bold text-white shadow-xl shadow-emerald-500/20 hover:bg-emerald-400 transition"
                    >
                      + Add
                    </button>
                  }
                >
                  <ul className="divide-y divide-white/5 rounded-xl border border-white/5 bg-white/[0.02]">
                    {accounts.map((a) => (
                      <li key={a.id} className="flex items-center justify-between p-5 group">
                        <div>
                          <p className="font-bold text-lg text-white">{a.name}</p>
                          <p className="text-xs uppercase tracking-widest text-slate-500">{a.account_type} · {a.currency}</p>
                        </div>
                        <div className="flex gap-4 opacity-0 group-hover:opacity-100 transition">
                          <button onClick={() => setAccountDraft({...a})} className="text-xs font-bold text-sky-400 hover:text-sky-300">Edit</button>
                          <button onClick={async () => { if (window.confirm("Delete account?")) { await api.deleteAccount(a.id); loadCore(); loadMonth(); }}} className="text-xs font-bold text-rose-400 hover:text-rose-300">Delete</button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </Card>
              </div>
            )}

            {tab === "categories" && (
              <Card 
                title="Management" 
                action={
                  <button onClick={() => setCategoryDraft({ name: "", flow: "expense", color: "" })} 
                    className="rounded-lg bg-emerald-500 px-4 py-2 text-xs font-bold text-white shadow-xl shadow-emerald-500/20 hover:bg-emerald-400 transition"
                  >
                    + Category
                  </button>
                }
              >
                <div className="grid gap-8 md:grid-cols-2">
                  <div>
                    <h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-emerald-400 text-center">Revenue Streams</h3>
                    <div className="space-y-2">
                      {categories.filter(c => c.flow === "income").map(c => (
                        <div key={c.id} className="group flex items-center justify-between rounded-xl glass-muted px-4 py-3 border border-emerald-500/10 hover:bg-emerald-500/5 transition">
                          <span className="font-medium">{c.name}</span>
                          <div className="flex gap-3 opacity-0 group-hover:opacity-100 transition">
                            <button onClick={() => setCategoryDraft({...c})} className="text-xs font-bold text-sky-400">Edit</button>
                            <button onClick={async () => { if (window.confirm("Delete?")) { await api.deleteCategory(c.id); loadCore(); loadMonth(); }}} className="text-xs font-bold text-rose-400">Delete</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-rose-400 text-center">Expense Channels</h3>
                    <div className="space-y-2">
                      {categories.filter(c => c.flow === "expense").map(c => (
                        <div key={c.id} className="group flex items-center justify-between rounded-xl glass-muted px-4 py-3 border border-rose-500/10 hover:bg-rose-500/5 transition">
                          <div className="flex items-center gap-3">
                            <div className="h-2 w-2 rounded-full shadow-[0_0_8px_currentcolor]" style={{backgroundColor: c.color || "#64748b", color: c.color || "#64748b"}} />
                            <span className="font-medium">{c.name}</span>
                          </div>
                          <div className="flex gap-3 opacity-0 group-hover:opacity-100 transition">
                            <button onClick={() => setCategoryDraft({...c})} className="text-xs font-bold text-sky-400">Edit</button>
                            <button onClick={async () => { if (window.confirm("Delete?")) { await api.deleteCategory(c.id); loadCore(); loadMonth(); }}} className="text-xs font-bold text-rose-400">Delete</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {tab === "budgets" && (
              <div className="max-w-4xl mx-auto">
                <Card title={`Monthly Budgeting · ${month}/${year}`}>
                  <BudgetSection year={year} month={month} expenseCats={expenseCats} budgets={budgets} summary={summary} onChange={loadMonth} />
                </Card>
              </div>
            )}
          </div>
        </div>

        <AccountEditorModal draft={accountDraft} onClose={() => setAccountDraft(null)} onSaved={async () => { setAccountDraft(null); await loadCore(); await loadMonth(); }} />
        <CategoryEditorModal draft={categoryDraft} onClose={() => setCategoryDraft(null)} onSaved={async () => { setCategoryDraft(null); await loadCore(); await loadMonth(); }} />
        <TransactionEditorModal accounts={accounts} categories={categories} tx={txEdit} onClose={() => setTxEdit(null)} onSaved={async () => { setTxEdit(null); await loadMonth(); await loadCore(); }} />
      </main>
    </div>
  );

}

function TransactionForm({ accounts, categories, onCreated }) {
  const [accountId, setAccountId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [occurredOn, setOccurredOn] = useState(todayISO());
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (accounts.length && !accountId) setAccountId(String(accounts[0].id));
  }, [accounts, accountId]);

  useEffect(() => {
    if (categories.length && !categoryId) {
      const firstExp = categories.find((c) => c.flow === "expense");
      setCategoryId(String((firstExp || categories[0]).id));
    }
  }, [categories, categoryId]);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await api.createTransaction({
        account_id: Number(accountId),
        category_id: Number(categoryId),
        amount: Number(amount),
        note,
        occurred_on: occurredOn,
      });
      setAmount("");
      setNote("");
      await onCreated();
    } catch (err) {
      window.alert(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Select label="Account" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
        {accounts.map((a) => (
          <option key={a.id} value={a.id}>
            {a.name}
          </option>
        ))}
      </Select>
      <Select label="Category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name} ({c.flow})
          </option>
        ))}
      </Select>
      <Input
        label="Amount"
        type="number"
        step="0.01"
        min="0.01"
        required
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />
      <Input label="Date" type="date" value={occurredOn} onChange={(e) => setOccurredOn(e.target.value)} />
      <Input label="Note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional" />
      <button
        type="submit"
        disabled={busy || !accounts.length}
        className="w-full rounded-lg border border-emerald-400/30 bg-emerald-600/85 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-950/25 backdrop-blur-sm hover:bg-emerald-500 disabled:opacity-50"
      >
        {busy ? "Saving…" : "Save transaction"}
      </button>
    </form>
  );
}

function BudgetSection({ year, month, expenseCats, budgets, summary, onChange }) {
  const spentByCat = useMemo(() => {
    const m = {};
    summary?.by_category?.forEach((row) => {
      if (row.flow === "expense") m[row.category_id] = row.total;
    });
    return m;
  }, [summary]);

  return (
    <div className="space-y-6">
      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={async (e) => {
          e.preventDefault();
          const fd = new FormData(e.target);
          const category_id = Number(fd.get("category_id"));
          const limit_amount = Number(fd.get("limit_amount"));
          try {
            await api.createBudget({ category_id, year, month, limit_amount });
            e.target.reset();
            await onChange();
          } catch (err) {
            window.alert(err.message);
          }
        }}
      >
        <Select label="Expense category" name="category_id" defaultValue="">
          <option value="" disabled>
            Select…
          </option>
          {expenseCats.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
        <Input label="Monthly limit" name="limit_amount" type="number" step="0.01" min="0" required />
        <button
          type="submit"
          className="rounded-lg border border-emerald-400/25 bg-emerald-600/85 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-emerald-950/20 backdrop-blur-sm hover:bg-emerald-500"
        >
          Set budget
        </button>
      </form>

      <ul className="space-y-3">
        {budgets.map((b) => {
          const cat = expenseCats.find((c) => c.id === b.category_id);
          const spent = spentByCat[b.category_id] || 0;
          const pct = b.limit_amount > 0 ? Math.min(100, (spent / b.limit_amount) * 100) : 0;
          return (
            <li
              key={b.id}
              className="rounded-xl glass p-4"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-white">{cat?.name ?? `Category ${b.category_id}`}</span>
                <button
                  type="button"
                  className="text-xs text-rose-400 hover:underline"
                  onClick={async () => {
                    await api.deleteBudget(b.id);
                    onChange();
                  }}
                >
                  Remove
                </button>
              </div>
              <div className="mt-2 flex justify-between text-sm text-slate-400">
                <span>
                  Spent {spent.toFixed(2)} / {b.limit_amount.toFixed(2)}
                </span>
                <span className={pct > 100 ? "text-amber-400" : "text-slate-500"}>
                  {pct.toFixed(0)}%
                </span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full glass-muted">
                <div
                  className={`h-full rounded-full transition-all ${
                    pct > 100 ? "bg-amber-500" : "bg-emerald-500"
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <BudgetLimitEditor budget={b} onSaved={onChange} />
            </li>
          );
        })}
        {!budgets.length && <p className="text-slate-500">No budgets for this month.</p>}
      </ul>
    </div>
  );
}
