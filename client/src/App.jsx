import { useEffect, useState } from "react";
import {
  Activity,
  ArrowRight,
  BadgeDollarSign,
  Database,
  Radar,
  RefreshCw,
  ShieldCheck,
  TowerControl,
  Waves
} from "lucide-react";
import { fetchJson } from "./lib/api";
import SectionTitle from "./components/SectionTitle";

const statIcons = [BadgeDollarSign, Activity, ShieldCheck, Database];
const categories = ["Wind Energy", "Reforestation", "Carbon Capture", "Solar", "Water Infrastructure"];

const defaultBondForm = {
  name: "",
  issuer: "",
  category: "Wind Energy",
  faceValue: "10000000",
  couponRate: "6.2",
  maturity: "2028-12-31",
  impactMetric: "MWh generated",
  telemetryUnit: "MWh",
  telemetryBaseValue: "1842.2",
  guardianPolicy: "guardian-policy-pending"
};

function formatCurrency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(value);
}

function statusTone(status) {
  if (status.toLowerCase().includes("yield") || status.toLowerCase().includes("distribution")) {
    return "bg-mint-400/15 text-mint-300 ring-1 ring-mint-400/20";
  }

  if (status.toLowerCase().includes("onboard")) {
    return "bg-white/10 text-slate-300 ring-1 ring-white/10";
  }

  return "bg-gold-300/15 text-gold-300 ring-1 ring-gold-300/20";
}

function integrationTone(mode) {
  return mode === "live"
    ? "bg-mint-400/15 text-mint-300 ring-1 ring-mint-400/20"
    : "bg-white/10 text-slate-300 ring-1 ring-white/10";
}

export default function App() {
  const [overview, setOverview] = useState(null);
  const [bonds, setBonds] = useState([]);
  const [events, setEvents] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [selectedBondId, setSelectedBondId] = useState("");
  const [bondForm, setBondForm] = useState(defaultBondForm);
  const [actionState, setActionState] = useState({
    loading: false,
    title: "Protocol controls",
    detail: "Onboard a bond, then provision tokens, telemetry, and payout flows from the same lifecycle.",
    transaction: null
  });

  async function loadData(showLoader = false) {
    if (showLoader) {
      setRefreshing(true);
    }

    try {
      const [overviewResponse, bondsResponse, streamResponse, transactionResponse] = await Promise.all([
        fetchJson("/overview"),
        fetchJson("/bonds"),
        fetchJson("/truth-stream"),
        fetchJson("/transactions")
      ]);

      setOverview(overviewResponse);
      setBonds(bondsResponse.items);
      setEvents(streamResponse.items);
      setTransactions(transactionResponse.items);
      setSelectedBondId((current) => current || bondsResponse.items[0]?.id || "");
    } catch (err) {
      setError(err.message || "Unable to load GBF dashboard data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function runAction(path, title) {
    try {
      setActionState({
        loading: true,
        title,
        detail: "Submitting protocol action...",
        transaction: null
      });

      const response = await fetchJson(path, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ bondId: selectedBondId })
      });

      setActionState({
        loading: false,
        title,
        detail: response.message,
        transaction: response.transaction || null
      });
      await loadData(true);
    } catch (err) {
      setActionState({
        loading: false,
        title,
        detail: err.message || "Protocol action failed.",
        transaction: null
      });
    }
  }

  async function onboardBond(event) {
    event.preventDefault();

    try {
      setActionState({
        loading: true,
        title: "Onboard bond",
        detail: "Provisioning the bond record and Truth Stream infrastructure...",
        transaction: null
      });

      const response = await fetchJson("/bonds", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          ...bondForm,
          faceValue: Number(bondForm.faceValue),
          couponRate: Number(bondForm.couponRate),
          telemetryBaseValue: Number(bondForm.telemetryBaseValue)
        })
      });

      setBondForm(defaultBondForm);
      setSelectedBondId(response.bond.id);
      setActionState({
        loading: false,
        title: "Onboard bond",
        detail: response.message,
        transaction: response.transaction || null
      });
      await loadData(true);
    } catch (err) {
      setActionState({
        loading: false,
        title: "Onboard bond",
        detail: err.message || "Unable to onboard bond.",
        transaction: null
      });
    }
  }

  async function resetDemo() {
    try {
      setActionState({
        loading: true,
        title: "Reset database",
        detail: "Rebuilding the seeded GBF catalog...",
        transaction: null
      });

      const response = await fetchJson("/demo/reset", {
        method: "POST"
      });

      setActionState({
        loading: false,
        title: "Reset database",
        detail: response.message,
        transaction: null
      });
      await loadData(true);
    } catch (err) {
      setActionState({
        loading: false,
        title: "Reset database",
        detail: err.message || "Unable to reset database.",
        transaction: null
      });
    }
  }

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-ink-950 text-slate-200">Loading GBF dashboard...</div>;
  }

  if (error) {
    return <div className="flex min-h-screen items-center justify-center bg-ink-950 px-6 text-center text-rose-300">{error}</div>;
  }

  return (
    <div className="min-h-screen bg-ink-950 font-body text-slate-100">
      <div className="absolute inset-0 -z-10 bg-hero-grid" />

      <header className="mx-auto max-w-7xl px-6 pb-10 pt-8 md:px-10">
        <div className="inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.25em] text-slate-300 backdrop-blur">
          Hedera-powered retail climate finance
        </div>

        <div className="mt-10 grid gap-12 lg:grid-cols-[1.25fr_0.75fr] lg:items-end">
          <div>
            <p className="text-sm uppercase tracking-[0.35em] text-mint-300">Global Green-Bond Fractionalizer</p>
            <h1 className="mt-4 max-w-4xl font-display text-5xl leading-tight text-white md:text-7xl">
              Deploy bond programs through a real asset lifecycle, not a hardcoded demo.
            </h1>
            <p className="mt-6 max-w-3xl text-base leading-8 text-slate-300 md:text-lg">
              Phase 1 now persists bond programs in SQL, lets operators onboard new assets from the UI, and provisions Hedera-backed infrastructure that can later be promoted into full production controls.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              {overview?.narrative?.pillars?.map((pillar) => (
                <span key={pillar} className="rounded-full border border-mint-300/20 bg-mint-300/10 px-4 py-2 text-sm text-mint-200">
                  {pillar}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-panel backdrop-blur">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Phase 1 Stack</p>
                <p className="mt-3 text-sm leading-6 text-slate-300">{overview.thesis}</p>
              </div>
              <button
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.15em] text-white transition hover:bg-white/10"
                onClick={() => loadData(true)}
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                Refresh
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <div className="flex items-center justify-between rounded-2xl bg-ink-900/80 p-4">
                <span className="flex items-center gap-3 text-sm text-white"><Database className="h-4 w-4 text-mint-300" /> Persistence</span>
                <span className="text-sm text-slate-300">SQLite lifecycle store</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-ink-900/80 p-4">
                <span className="flex items-center gap-3 text-sm text-white"><Waves className="h-4 w-4 text-mint-300" /> Asset Layer</span>
                <span className="text-sm text-slate-300">{overview.assetLayer}</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-ink-900/80 p-4">
                <span className="flex items-center gap-3 text-sm text-white"><TowerControl className="h-4 w-4 text-mint-300" /> Audit Trail</span>
                <span className="text-sm text-slate-300">{overview.auditTrail}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-24 px-6 pb-20 md:px-10">
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {overview.kpis.map((kpi, index) => {
            const Icon = statIcons[index];

            return (
              <article key={kpi.label} className="rounded-[1.75rem] border border-white/10 bg-white/5 p-6 shadow-panel backdrop-blur">
                <Icon className="h-5 w-5 text-mint-300" />
                <p className="mt-6 text-sm text-slate-400">{kpi.label}</p>
                <p className="mt-2 text-3xl font-semibold text-white">{kpi.value}</p>
                <p className="mt-3 text-sm leading-6 text-slate-300">{kpi.detail}</p>
              </article>
            );
          })}
        </section>

        <section className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
          <SectionTitle
            eyebrow="Onboarding"
            title="Create a live bond program from the product itself."
            body="This is the biggest Phase 1 shift: bond metadata no longer lives only in a seed file. Operators can create new programs, persist them to SQL, and provision a Hedera-backed Truth Stream per asset."
          />

          <form className="grid gap-4 rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-panel backdrop-blur md:grid-cols-2" onSubmit={onboardBond}>
            <input className="rounded-2xl border border-white/10 bg-ink-900/80 px-4 py-3 text-sm text-white outline-none" placeholder="Bond name" value={bondForm.name} onChange={(event) => setBondForm((current) => ({ ...current, name: event.target.value }))} />
            <input className="rounded-2xl border border-white/10 bg-ink-900/80 px-4 py-3 text-sm text-white outline-none" placeholder="Issuer" value={bondForm.issuer} onChange={(event) => setBondForm((current) => ({ ...current, issuer: event.target.value }))} />
            <select className="rounded-2xl border border-white/10 bg-ink-900/80 px-4 py-3 text-sm text-white outline-none" value={bondForm.category} onChange={(event) => setBondForm((current) => ({ ...current, category: event.target.value }))}>
              {categories.map((category) => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
            <input className="rounded-2xl border border-white/10 bg-ink-900/80 px-4 py-3 text-sm text-white outline-none" type="number" min="1" placeholder="Face value" value={bondForm.faceValue} onChange={(event) => setBondForm((current) => ({ ...current, faceValue: event.target.value }))} />
            <input className="rounded-2xl border border-white/10 bg-ink-900/80 px-4 py-3 text-sm text-white outline-none" type="number" step="0.1" min="0" placeholder="Coupon rate" value={bondForm.couponRate} onChange={(event) => setBondForm((current) => ({ ...current, couponRate: event.target.value }))} />
            <input className="rounded-2xl border border-white/10 bg-ink-900/80 px-4 py-3 text-sm text-white outline-none" type="date" value={bondForm.maturity} onChange={(event) => setBondForm((current) => ({ ...current, maturity: event.target.value }))} />
            <input className="rounded-2xl border border-white/10 bg-ink-900/80 px-4 py-3 text-sm text-white outline-none" placeholder="Impact metric" value={bondForm.impactMetric} onChange={(event) => setBondForm((current) => ({ ...current, impactMetric: event.target.value }))} />
            <input className="rounded-2xl border border-white/10 bg-ink-900/80 px-4 py-3 text-sm text-white outline-none" placeholder="Telemetry unit" value={bondForm.telemetryUnit} onChange={(event) => setBondForm((current) => ({ ...current, telemetryUnit: event.target.value }))} />
            <input className="rounded-2xl border border-white/10 bg-ink-900/80 px-4 py-3 text-sm text-white outline-none" type="number" step="0.1" min="0" placeholder="Telemetry base value" value={bondForm.telemetryBaseValue} onChange={(event) => setBondForm((current) => ({ ...current, telemetryBaseValue: event.target.value }))} />
            <input className="rounded-2xl border border-white/10 bg-ink-900/80 px-4 py-3 text-sm text-white outline-none" placeholder="Guardian policy id" value={bondForm.guardianPolicy} onChange={(event) => setBondForm((current) => ({ ...current, guardianPolicy: event.target.value }))} />
            <button className="md:col-span-2 rounded-2xl bg-mint-400 px-4 py-3 text-sm font-semibold text-ink-950 transition hover:bg-mint-300" type="submit">
              Onboard Bond Program
            </button>
          </form>
        </section>

        <section className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
          <SectionTitle
            eyebrow="Operator Console"
            title="Run tokenization and telemetry against stored bond records."
            body="Once a bond is onboarded, the rest of the lifecycle uses persisted IDs and SQL-backed state: token minting, Truth Stream publishing, and policy-gated coupon scheduling."
          />

          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-panel backdrop-blur">
            <label className="text-xs uppercase tracking-[0.25em] text-slate-400" htmlFor="bond-select">
              Active bond
            </label>
            <select
              id="bond-select"
              className="mt-3 w-full rounded-2xl border border-white/10 bg-ink-900/80 px-4 py-3 text-sm text-white outline-none"
              value={selectedBondId}
              onChange={(event) => setSelectedBondId(event.target.value)}
            >
              {bonds.map((bond) => (
                <option key={bond.id} value={bond.id}>
                  {bond.name}
                </option>
              ))}
            </select>

            <div className="mt-5 grid gap-3 md:grid-cols-4">
              <button className="rounded-2xl bg-mint-400 px-4 py-3 text-sm font-semibold text-ink-950 transition hover:bg-mint-300" onClick={() => runAction("/actions/fractionalize", "Fractionalize bond")}>
                Mint FBTs
              </button>
              <button className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10" onClick={() => runAction("/actions/sync-impact", "Publish truth event")}>
                Sync dMRV
              </button>
              <button className="rounded-2xl border border-gold-300/30 bg-gold-300/10 px-4 py-3 text-sm font-semibold text-gold-300 transition hover:bg-gold-300/20" onClick={() => runAction("/actions/distribute-yield", "Distribute yield")}>
                Schedule coupon
              </button>
              <button className="rounded-2xl border border-white/10 bg-ink-900/80 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:bg-ink-800" onClick={resetDemo}>
                Reset DB
              </button>
            </div>

            <div className="mt-5 rounded-[1.5rem] bg-ink-900/80 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm uppercase tracking-[0.2em] text-mint-300">{actionState.title}</p>
                  <p className="mt-3 text-lg text-white">{actionState.loading ? "Processing..." : actionState.detail}</p>
                </div>
                {actionState.transaction ? (
                  <span className={`rounded-full px-3 py-1 text-xs font-medium ${integrationTone(actionState.transaction.integrationMode)}`}>
                    {actionState.transaction.integrationMode}
                  </span>
                ) : null}
              </div>

              {actionState.transaction ? (
                <div className="mt-4 grid gap-2 text-xs text-slate-400 md:grid-cols-2">
                  <p>Tx ID: <span className="text-slate-200">{actionState.transaction.txId}</span></p>
                  <p>Network: <span className="text-slate-200">{actionState.transaction.network}</span></p>
                </div>
              ) : null}
            </div>
          </div>
        </section>

        <section className="space-y-8">
          <SectionTitle
            eyebrow="Bond Registry"
            title="Stored bond programs with provisioned infrastructure."
            body="Every bond card now represents a database record. Topic IDs are created during onboarding when live Hedera calls succeed, and token IDs appear once the fractionalization step is executed."
          />

          <div className="grid gap-5 xl:grid-cols-3">
            {bonds.map((bond) => (
              <article key={bond.id} className="rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-panel backdrop-blur">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm uppercase tracking-[0.22em] text-mint-300">{bond.category}</p>
                    <h3 className="mt-2 text-2xl font-semibold text-white">{bond.name}</h3>
                    <p className="mt-2 text-sm text-slate-400">{bond.issuer}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusTone(bond.status)}`}>{bond.status}</span>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-4 text-sm text-slate-300">
                  <div className="rounded-2xl bg-ink-900/70 p-4">
                    <p className="text-slate-400">Face Value</p>
                    <p className="mt-2 text-lg font-semibold text-white">{formatCurrency(bond.faceValue)}</p>
                  </div>
                  <div className="rounded-2xl bg-ink-900/70 p-4">
                    <p className="text-slate-400">Coupon Rate</p>
                    <p className="mt-2 text-lg font-semibold text-white">{bond.couponRate}%</p>
                  </div>
                  <div className="rounded-2xl bg-ink-900/70 p-4">
                    <p className="text-slate-400">Liquidity Score</p>
                    <p className="mt-2 text-lg font-semibold text-white">{bond.liquidityScore}/100</p>
                  </div>
                  <div className="rounded-2xl bg-ink-900/70 p-4">
                    <p className="text-slate-400">Wallet Holders</p>
                    <p className="mt-2 text-lg font-semibold text-white">{bond.walletHolders.toLocaleString()}</p>
                  </div>
                </div>

                <div className="mt-6">
                  <div className="flex items-center justify-between text-sm text-slate-300">
                    <span>Verified Impact Progress</span>
                    <span>{bond.progress}%</span>
                  </div>
                  <div className="mt-3 h-2 rounded-full bg-white/10">
                    <div className="h-2 rounded-full bg-gradient-to-r from-mint-400 to-gold-300" style={{ width: `${bond.progress}%` }} />
                  </div>
                  <p className="mt-3 text-sm text-slate-300">{bond.verifiedImpact}</p>
                </div>

                <div className="mt-6 space-y-2 text-xs text-slate-400">
                  <p>HTS Token ID: <span className="text-slate-200">{bond.tokenId || "Pending fractionalization"}</span></p>
                  <p>HCS Topic ID: <span className="text-slate-200">{bond.topicId || "Pending topic provisioning"}</span></p>
                  <p>Guardian Policy: <span className="text-slate-200">{bond.guardianPolicy}</span></p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="space-y-8">
            <SectionTitle
              eyebrow="Truth Stream"
              title="Telemetry now targets persisted bond infrastructure."
              body="Truth Stream events no longer depend on placeholder records alone. Each telemetry action resolves the bond from the database and uses its stored topic metadata."
            />

            <div className="space-y-4">
              {events.map((event) => (
                <article key={event.id} className="rounded-[1.5rem] border border-white/10 bg-white/5 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm text-mint-300">{event.source}</p>
                      <h3 className="mt-1 text-lg font-semibold text-white">{event.project}</h3>
                      <p className="mt-2 text-sm text-slate-300">
                        {event.metric}: <span className="text-white">{event.value}</span>
                      </p>
                    </div>
                    <div className="text-right text-xs text-slate-400">
                      <p>{new Date(event.timestamp).toLocaleString()}</p>
                      <p className="mt-2">Seq #{event.topicSequence}</p>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between text-sm">
                    <span className="rounded-full bg-mint-400/15 px-3 py-1 text-mint-300">{event.status}</span>
                    <span className="text-slate-300">{event.integrationMode} mode</span>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-[2rem] border border-white/10 bg-[#091426] p-8 shadow-panel">
              <SectionTitle
                eyebrow="Lifecycle"
                title="Onboard, provision, fractionalize, verify, distribute."
                body="This is the Phase 1 production-shaped flow. The app now stores bond records, infrastructure IDs, and execution history in SQL so the protocol can evolve toward multi-user deployment."
              />

              <div className="mt-8 space-y-4">
                {overview.narrative.workflow.map((step, index) => (
                  <div key={step} className="flex gap-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-mint-400/15 text-sm font-semibold text-mint-300">
                      0{index + 1}
                    </div>
                    <div>
                      <p className="text-sm leading-7 text-slate-200">{step}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8 rounded-[1.5rem] bg-gradient-to-br from-mint-400/15 via-white/5 to-gold-300/15 p-6">
                <div className="flex items-center gap-3 text-mint-200">
                  <Radar className="h-5 w-5" />
                  <p className="text-sm uppercase tracking-[0.22em]">Phase 1 Goal</p>
                </div>
                <p className="mt-4 text-2xl font-semibold text-white">Persist real asset lifecycles before multi-user rollout.</p>
                <p className="mt-3 text-sm leading-7 text-slate-200">
                  The next production layers are auth, wallet custody, Guardian deployment, and operator-grade secrets management.
                </p>
                <button className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-ink-950 transition hover:bg-mint-300">
                  Review architecture
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-panel backdrop-blur">
              <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Recent transactions</p>
              <div className="mt-5 space-y-4">
                {transactions.slice(0, 5).map((transaction) => (
                  <article key={transaction.id} className="rounded-2xl bg-ink-900/70 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-white">{transaction.summary}</p>
                        <p className="mt-1 text-xs text-slate-400">{transaction.bondName}</p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-xs font-medium ${integrationTone(transaction.integrationMode)}`}>
                        {transaction.integrationMode}
                      </span>
                    </div>
                    <div className="mt-3 grid gap-2 text-xs text-slate-400 md:grid-cols-2">
                      <p>{new Date(transaction.timestamp).toLocaleString()}</p>
                      <p>Tx ID: <span className="text-slate-200">{transaction.txId}</span></p>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
