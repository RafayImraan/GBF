import { useEffect, useState } from "react";
import {
  Activity,
  ArrowRight,
  BadgeDollarSign,
  Building2,
  Database,
  LayoutDashboard,
  Lock,
  LogOut,
  Menu,
  Radar,
  RefreshCw,
  ShieldCheck,
  TowerControl,
  Users,
  Waves,
  X
} from "lucide-react";
import { fetchAuth, fetchJson, getAuthToken, setAuthToken } from "./lib/api";
import SectionTitle from "./components/SectionTitle";

const statIcons = [BadgeDollarSign, Activity, ShieldCheck, Database];
const categories = ["Wind Energy", "Reforestation", "Carbon Capture", "Solar", "Water Infrastructure"];
const navigationItems = [
  { id: "overview", label: "Overview", path: "/", icon: LayoutDashboard, eyebrow: "Platform Overview", title: "Executive visibility into retail climate finance operations.", body: "Track system health, signer readiness, and portfolio-wide KPIs from a single operating view." },
  { id: "bonds", label: "Bonds", path: "/bonds", icon: Building2, eyebrow: "", title: "Originate, fractionalize, and manage live bond programs.", body: "This page centralizes bond issuance, operational actions, and the full bond registry." },
  { id: "investors", label: "Investors", path: "/investors", icon: Users, eyebrow: "", title: "Manage investor identity, holdings, and secondary activity.", body: "Review portfolios, onboard investors, settle inventory, and manage the holder base." },
  { id: "truth-stream", label: "Oversight", path: "/truth-stream", icon: Radar, eyebrow: "Oversight", title: "Monitor impact verification, operating history, and governance controls.", body: "Impact verification records, transactions, audit activity, and administrative oversight stay accessible from one page." }
];

const defaultBondForm = { name: "", issuer: "", category: "Wind Energy", faceValue: "10000000", couponRate: "6.2", maturity: "2028-12-31", impactMetric: "MWh generated", telemetryUnit: "MWh", telemetryBaseValue: "1842.2", guardianPolicy: "guardian-policy-pending" };
const defaultLoginForm = { email: "admin@gbf.local", password: "ChangeMe123!" };
const defaultUserForm = { email: "", name: "", role: "operator", password: "", investorId: "" };
const defaultInvestorForm = { name: "", email: "", walletAlias: "", accountId: "", region: "Pakistan", kycStatus: "approved", riskTier: "balanced" };
const defaultAllocationForm = { investorId: "", units: "1000", costBasis: "1000" };
const defaultSettlementForm = { investorId: "", units: "250" };
const defaultTransferForm = { fromInvestorId: "", toInvestorId: "", units: "100" };
const defaultListingForm = { sellerInvestorId: "", buyerInvestorId: "", units: "100", pricePerUnit: "1" };

function formatCurrency(value) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

function formatInteger(value) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(Number(value) || 0);
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
  if (mode === "off-ledger") {
    return "bg-sky-400/15 text-sky-300 ring-1 ring-sky-400/20";
  }

  return mode === "live" ? "bg-mint-400/15 text-mint-300 ring-1 ring-mint-400/20" : "bg-white/10 text-slate-300 ring-1 ring-white/10";
}

function explorerBaseUrl(network) {
  const normalized = String(network || "").toLowerCase();

  if (normalized.includes("mainnet")) {
    return "https://hashscan.io/mainnet";
  }

  if (normalized.includes("previewnet")) {
    return "https://hashscan.io/previewnet";
  }

  return "https://hashscan.io/testnet";
}

function transactionExplorerUrl(txId, network) {
  if (!txId || String(txId).startsWith("SIM-") || String(txId).startsWith("ALLOC-")) {
    return null;
  }

  return `${explorerBaseUrl(network)}/transaction/${encodeURIComponent(txId)}`;
}

function entityExplorerUrl(id, network, entityType) {
  if (!id || String(id).startsWith("SIM-")) {
    return null;
  }

  return `${explorerBaseUrl(network)}/${entityType}/${encodeURIComponent(id)}`;
}

function getPageFromPath(pathname) {
  return navigationItems.find((item) => item.path === pathname)?.id || "overview";
}

function TxLink({ txId, network }) {
  const href = transactionExplorerUrl(txId, network);

  if (!href) {
    return <span className="text-slate-200">{txId}</span>;
  }

  return <a className="break-all text-mint-300 underline decoration-mint-300/40 underline-offset-2 hover:text-mint-200" href={href} target="_blank" rel="noreferrer">{txId}</a>;
}

function EntityLink({ id, network, type, fallback }) {
  const href = entityExplorerUrl(id, network, type);

  if (!href) {
    return <span className="text-slate-200">{fallback || id}</span>;
  }

  return <a className="break-all text-mint-300 underline decoration-mint-300/40 underline-offset-2 hover:text-mint-200" href={href} target="_blank" rel="noreferrer">{id}</a>;
}

function HeroPanel({ overview, user, payouts, refreshing, loadData }) {
  return (
    <section className="grid gap-10 xl:grid-cols-[minmax(0,1fr)_26rem] xl:items-start">
      <div>
        <p className="text-xs font-display uppercase tracking-[0.45em] text-mint-300 sm:text-sm">Global Green-Bond Fractionalizer</p>
        <h1 className="mt-4 max-w-3xl font-display text-4xl leading-[0.96] text-white sm:text-5xl lg:text-6xl xl:text-[5.25rem]">
          Institutional green bonds, rebuilt as transparent digital infrastructure.
        </h1>
        <p className="mt-6 max-w-2xl text-base leading-8 text-slate-300 md:text-lg">
          GBF combines Hedera Token Service, Guardian-style policy controls, and a live Truth Stream to turn long-duration green bonds into auditable retail-grade financial products.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          {overview?.narrative?.pillars?.map((pillar) => (
            <span key={pillar} className="rounded-full border border-mint-300/20 bg-mint-300/10 px-4 py-2 text-sm text-mint-200">{pillar}</span>
          ))}
        </div>
      </div>

      <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-panel backdrop-blur xl:mt-10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">System Brief</p>
            <p className="mt-3 text-sm leading-6 text-slate-300">{overview?.thesis}</p>
          </div>
          <button className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.15em] text-white transition hover:bg-white/10" onClick={() => loadData(true)}>
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        <div className="mt-5 space-y-4">
          <div className="flex items-center justify-between rounded-2xl bg-ink-900/80 p-4"><span className="flex items-center gap-3 text-sm text-white"><ShieldCheck className="h-4 w-4 text-mint-300" /> Auth Model</span><span className="text-sm text-slate-300">{user ? `${user.role} session active` : "Signed out"}</span></div>
          <div className="flex items-center justify-between rounded-2xl bg-ink-900/80 p-4"><span className="flex items-center gap-3 text-sm text-white"><Waves className="h-4 w-4 text-mint-300" /> Asset Layer</span><span className="text-sm text-slate-300">{overview?.assetLayer}</span></div>
          <div className="flex items-center justify-between rounded-2xl bg-ink-900/80 p-4"><span className="flex items-center gap-3 text-sm text-white"><TowerControl className="h-4 w-4 text-mint-300" /> Live Signing</span><span className="text-sm text-slate-300">{overview?.liveSigningEnabled ? "Enabled by env flag" : "Disabled by default"}</span></div>
          <div className="flex items-center justify-between rounded-2xl bg-ink-900/80 p-4"><span className="flex items-center gap-3 text-sm text-white"><ShieldCheck className="h-4 w-4 text-mint-300" /> Signer Mode</span><span className="text-sm text-slate-300">{overview?.signer?.mode || "disabled"}</span></div>
          <div className="flex items-center justify-between rounded-2xl bg-ink-900/80 p-4"><span className="flex items-center gap-3 text-sm text-white"><Database className="h-4 w-4 text-mint-300" /> Investor Records</span><span className="text-sm text-slate-300">{overview?.investorsTracked || 0} tracked</span></div>
          <div className="flex items-center justify-between rounded-2xl bg-ink-900/80 p-4"><span className="flex items-center gap-3 text-sm text-white"><BadgeDollarSign className="h-4 w-4 text-mint-300" /> Payout Records</span><span className="text-sm text-slate-300">{formatInteger(payouts.length)} logged</span></div>
        </div>
      </div>
    </section>
  );
}

export default function App() {
  const [overview, setOverview] = useState(null);
  const [bonds, setBonds] = useState([]);
  const [events, setEvents] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [investors, setInvestors] = useState([]);
  const [holdings, setHoldings] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [marketListings, setMarketListings] = useState([]);
  const [users, setUsers] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [selectedBondId, setSelectedBondId] = useState("");
  const [bondForm, setBondForm] = useState(defaultBondForm);
  const [loginForm, setLoginForm] = useState(defaultLoginForm);
  const [userForm, setUserForm] = useState(defaultUserForm);
  const [investorForm, setInvestorForm] = useState(defaultInvestorForm);
  const [allocationForm, setAllocationForm] = useState(defaultAllocationForm);
  const [settlementForm, setSettlementForm] = useState(defaultSettlementForm);
  const [transferForm, setTransferForm] = useState(defaultTransferForm);
  const [listingForm, setListingForm] = useState(defaultListingForm);
  const [selectedListingId, setSelectedListingId] = useState("");
  const [selectedInvestorId, setSelectedInvestorId] = useState("");
  const [selectedPortfolio, setSelectedPortfolio] = useState(null);
  const [activePage, setActivePage] = useState(() => getPageFromPath(window.location.pathname));
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [actionState, setActionState] = useState({ loading: false, title: "Platform actions", detail: "Sign in as an operator or administrator to manage bond onboarding and live operational actions.", transaction: null });

  const isOperator = user && ["admin", "operator"].includes(user.role);
  const isAdmin = user?.role === "admin";
  const isInvestor = user?.role === "investor";
  const selectedBond = bonds.find((bond) => bond.id === selectedBondId) || null;
  const selectedBondHoldings = holdings.filter((holding) => holding.bondId === selectedBondId);
  const currentPage = navigationItems.find((item) => item.id === activePage) || navigationItems[0];

  async function loadData(showLoader = false) {
    if (showLoader) {
      setRefreshing(true);
    }

    try {
      let meResponse = null;

      if (getAuthToken()) {
        meResponse = await fetchAuth("/me").catch(() => null);
      }

      const [overviewResponse, bondsResponse, streamResponse, transactionResponse, investorResponse, holdingsResponse, payoutResponse, transferResponse, listingResponse] = await Promise.all([
        fetchJson("/overview"),
        fetchJson("/bonds"),
        fetchJson("/truth-stream"),
        fetchJson("/transactions"),
        fetchJson("/investors"),
        fetchJson("/holdings"),
        fetchJson("/payouts"),
        fetchJson("/transfers"),
        fetchJson("/market/listings")
      ]);

      let userResponse = { items: [] };
      let auditResponse = { items: [] };

      if (meResponse?.user?.role === "admin") {
        [userResponse, auditResponse] = await Promise.all([fetchAuth("/users"), fetchJson("/audit-logs")]);
      }

      setOverview(overviewResponse);
      setBonds(bondsResponse.items);
      setEvents(streamResponse.items);
      setTransactions(transactionResponse.items);
      setInvestors(investorResponse.items);
      setHoldings(holdingsResponse.items);
      setPayouts(payoutResponse.items);
      setTransfers(transferResponse.items);
      setMarketListings(listingResponse.items);
      setUsers(userResponse.items);
      setAuditLogs(auditResponse.items);
      setUser(meResponse?.user || null);
      setSelectedBondId((current) => current || bondsResponse.items[0]?.id || "");
      setSelectedInvestorId((current) => current || investorResponse.items[0]?.id || "");

      if (meResponse?.user?.role === "investor" && meResponse.user.investorId) {
        setSelectedInvestorId(meResponse.user.investorId);
      }

      setAllocationForm((current) => ({ ...current, investorId: current.investorId || investorResponse.items[0]?.id || current.investorId }));
      setSettlementForm((current) => ({ ...current, investorId: current.investorId || investorResponse.items[0]?.id || current.investorId }));
      setTransferForm((current) => ({
        ...current,
        fromInvestorId: current.fromInvestorId || investorResponse.items[0]?.id || current.fromInvestorId,
        toInvestorId: current.toInvestorId || investorResponse.items[1]?.id || investorResponse.items[0]?.id || current.toInvestorId
      }));
      setListingForm((current) => ({
        ...current,
        sellerInvestorId: current.sellerInvestorId || investorResponse.items[0]?.id || current.sellerInvestorId,
        buyerInvestorId: current.buyerInvestorId || investorResponse.items[1]?.id || investorResponse.items[0]?.id || current.buyerInvestorId
      }));
      setSelectedListingId((current) => current || listingResponse.items[0]?.id || "");
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

  useEffect(() => {
    function handlePopState() {
      setActivePage(getPageFromPath(window.location.pathname));
      setMobileNavOpen(false);
    }

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    async function loadPortfolio() {
      if (isInvestor && user?.investorId) {
        try {
          const response = await fetchJson("/me/portfolio");
          setSelectedPortfolio(response);
          return;
        } catch {
          setSelectedPortfolio(null);
          return;
        }
      }

      if (!selectedInvestorId) {
        setSelectedPortfolio(null);
        return;
      }

      try {
        const response = await fetchJson(`/investors/${selectedInvestorId}/portfolio`);
        setSelectedPortfolio(response);
      } catch {
        setSelectedPortfolio(null);
      }
    }

    loadPortfolio();
  }, [selectedInvestorId, holdings, payouts, isInvestor, user?.investorId]);

  function navigateTo(pageId) {
    const item = navigationItems.find((entry) => entry.id === pageId);

    if (!item) {
      return;
    }

    window.history.pushState({}, "", item.path);
    setActivePage(item.id);
    setMobileNavOpen(false);
  }

  async function handleLogin(event) {
    event.preventDefault();

    try {
      setActionState({ loading: true, title: "Sign in", detail: "Creating authenticated operator session...", transaction: null });
      const response = await fetchAuth("/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loginForm)
      });
      setAuthToken(response.token);
      setUser(response.user);
      setActionState({ loading: false, title: "Sign in", detail: `Signed in as ${response.user.name}.`, transaction: null });
      await loadData(true);
    } catch (err) {
      setActionState({ loading: false, title: "Sign in", detail: err.message || "Unable to sign in.", transaction: null });
    }
  }

  async function handleLogout() {
    try {
      if (getAuthToken()) {
        await fetchAuth("/logout", { method: "POST" }).catch(() => null);
      }
    } finally {
      setAuthToken(null);
      setUser(null);
      setInvestors([]);
      setHoldings([]);
      setPayouts([]);
      setTransfers([]);
      setMarketListings([]);
      setSelectedPortfolio(null);
      setUsers([]);
      setAuditLogs([]);
      setActionState({ loading: false, title: "Sign out", detail: "Session closed.", transaction: null });
    }
  }

  async function runAction(path, title) {
    try {
      setActionState({ loading: true, title, detail: "Submitting protocol action...", transaction: null });

      const response = await fetchJson(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bondId: selectedBondId })
      });

      setActionState({ loading: false, title, detail: response.message, transaction: response.transaction || null });
      await loadData(true);
    } catch (err) {
      setActionState({ loading: false, title, detail: err.message || "Protocol action failed.", transaction: null });
    }
  }

  async function onboardBond(event) {
    event.preventDefault();

    try {
      setActionState({ loading: true, title: "Onboard bond", detail: "Provisioning the bond record and impact reporting infrastructure...", transaction: null });

      const response = await fetchJson("/bonds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...bondForm,
          faceValue: Number(bondForm.faceValue),
          couponRate: Number(bondForm.couponRate),
          telemetryBaseValue: Number(bondForm.telemetryBaseValue)
        })
      });

      setBondForm(defaultBondForm);
      setSelectedBondId(response.bond.id);
      setActionState({ loading: false, title: "Onboard bond", detail: response.message, transaction: response.transaction || null });
      await loadData(true);
    } catch (err) {
      setActionState({ loading: false, title: "Onboard bond", detail: err.message || "Unable to onboard bond.", transaction: null });
    }
  }

  async function resetDemo() {
    try {
      setActionState({ loading: true, title: "Reset database", detail: "Rebuilding the seeded GBF catalog...", transaction: null });
      const response = await fetchJson("/demo/reset", { method: "POST" });
      setActionState({ loading: false, title: "Reset database", detail: response.message, transaction: null });
      await loadData(true);
    } catch (err) {
      setActionState({ loading: false, title: "Reset database", detail: err.message || "Unable to reset database.", transaction: null });
    }
  }

  async function createOperatorUser(event) {
    event.preventDefault();

    try {
      setActionState({ loading: true, title: "Create user", detail: "Provisioning a new platform user...", transaction: null });
      await fetchAuth("/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userForm)
      });
      setUserForm(defaultUserForm);
      setActionState({ loading: false, title: "Create user", detail: "User created successfully.", transaction: null });
      await loadData(true);
    } catch (err) {
      setActionState({ loading: false, title: "Create user", detail: err.message || "Unable to create user.", transaction: null });
    }
  }

  async function createInvestorProfile(event) {
    event.preventDefault();

    try {
      setActionState({ loading: true, title: "Create investor", detail: "Provisioning the investor record and wallet profile...", transaction: null });
      const response = await fetchJson("/investors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(investorForm)
      });
      setInvestorForm(defaultInvestorForm);
      setAllocationForm((current) => ({ ...current, investorId: response.investor.id }));
      setActionState({ loading: false, title: "Create investor", detail: response.message, transaction: null });
      await loadData(true);
    } catch (err) {
      setActionState({ loading: false, title: "Create investor", detail: err.message || "Unable to create investor.", transaction: null });
    }
  }

  async function allocateHoldings(event) {
    event.preventDefault();

    try {
      setActionState({ loading: true, title: "Allocate holdings", detail: "Assigning FBT units to the selected investor...", transaction: null });
      const response = await fetchJson("/actions/allocate-holdings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bondId: selectedBondId,
          investorId: allocationForm.investorId,
          units: Number(allocationForm.units),
          costBasis: Number(allocationForm.costBasis)
        })
      });
      setActionState({ loading: false, title: "Allocate holdings", detail: response.message, transaction: response.transaction || null });
      await loadData(true);
    } catch (err) {
      setActionState({ loading: false, title: "Allocate holdings", detail: err.message || "Unable to allocate holdings.", transaction: null });
    }
  }

  async function settleAllocation(event) {
    event.preventDefault();

    try {
      setActionState({ loading: true, title: "Settle allocation", detail: "Submitting treasury-to-investor token transfer...", transaction: null });
      const response = await fetchJson("/actions/settle-allocation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bondId: selectedBondId,
          investorId: settlementForm.investorId,
          units: Number(settlementForm.units)
        })
      });
      setActionState({ loading: false, title: "Settle allocation", detail: response.message, transaction: response.transaction || null });
      await loadData(true);
    } catch (err) {
      setActionState({ loading: false, title: "Settle allocation", detail: err.message || "Unable to settle allocation.", transaction: null });
    }
  }

  async function transferHoldings(event) {
    event.preventDefault();

    try {
      setActionState({ loading: true, title: "Transfer holdings", detail: "Submitting investor-to-investor token transfer...", transaction: null });
      const response = await fetchJson("/actions/transfer-holdings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bondId: selectedBondId,
          fromInvestorId: transferForm.fromInvestorId,
          toInvestorId: transferForm.toInvestorId,
          units: Number(transferForm.units)
        })
      });
      setActionState({ loading: false, title: "Transfer holdings", detail: response.message, transaction: response.transaction || null });
      await loadData(true);
    } catch (err) {
      setActionState({ loading: false, title: "Transfer holdings", detail: err.message || "Unable to transfer holdings.", transaction: null });
    }
  }

  async function createListing(event) {
    event.preventDefault();

    try {
      setActionState({ loading: true, title: "Create listing", detail: "Running market preflight and opening secondary listing...", transaction: null });
      const response = await fetchJson("/market/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bondId: selectedBondId,
          sellerInvestorId: listingForm.sellerInvestorId,
          units: Number(listingForm.units),
          pricePerUnit: Number(listingForm.pricePerUnit)
        })
      });
      setActionState({ loading: false, title: "Create listing", detail: response.message, transaction: null });
      await loadData(true);
    } catch (err) {
      setActionState({ loading: false, title: "Create listing", detail: err.message || "Unable to create listing.", transaction: null });
    }
  }

  async function cancelListing() {
    try {
      setActionState({ loading: true, title: "Cancel listing", detail: "Closing the selected market listing...", transaction: null });
      const response = await fetchJson(`/market/listings/${selectedListingId}/cancel`, { method: "POST" });
      setActionState({ loading: false, title: "Cancel listing", detail: response.message, transaction: null });
      await loadData(true);
    } catch (err) {
      setActionState({ loading: false, title: "Cancel listing", detail: err.message || "Unable to cancel listing.", transaction: null });
    }
  }

  async function fillListing() {
    try {
      setActionState({ loading: true, title: "Fill listing", detail: "Submitting listing fill and secondary transfer...", transaction: null });
      const response = await fetchJson(`/market/listings/${selectedListingId}/fill`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ buyerInvestorId: listingForm.buyerInvestorId })
      });
      setActionState({ loading: false, title: "Fill listing", detail: response.message, transaction: response.transaction || null });
      await loadData(true);
    } catch (err) {
      setActionState({ loading: false, title: "Fill listing", detail: err.message || "Unable to fill listing.", transaction: null });
    }
  }

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-ink-950 text-slate-200">Loading GBF dashboard...</div>;
  }

  if (error) {
    return <div className="flex min-h-screen items-center justify-center bg-ink-950 px-6 text-center text-rose-300">{error}</div>;
  }

  const navItems = (
    <>
      {navigationItems.map((item) => {
        const Icon = item.icon;
        const isActive = item.id === activePage;

        return (
          <button
            key={item.id}
            className={`inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-medium transition ${
              isActive
                ? "bg-gradient-to-r from-mint-300 to-mint-200 text-ink-950 shadow-[0_12px_36px_rgba(110,231,183,0.18)]"
                : "text-slate-300 hover:bg-white/8 hover:text-white"
            }`}
            onClick={() => navigateTo(item.id)}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </button>
        );
      })}
    </>
  );

  return (
    <div className="min-h-screen overflow-x-hidden bg-ink-950 font-body text-slate-100">
      <div className="absolute inset-0 -z-10 bg-hero-grid" />
      <div className="absolute inset-x-0 top-0 -z-10 h-[420px] bg-[radial-gradient(circle_at_top,_rgba(110,231,183,0.12),_transparent_50%),radial-gradient(circle_at_top_right,_rgba(244,208,63,0.12),_transparent_35%)]" />

      <header className="sticky top-0 z-40 border-b border-white/10 bg-ink-950/80 backdrop-blur-xl">
        <div className="mx-auto max-w-[92rem] px-5 py-4 md:px-8 xl:px-10">
          <div className="flex items-center gap-4 xl:grid xl:grid-cols-[minmax(18rem,1fr)_auto_minmax(18rem,1fr)] xl:gap-8">
          <button className="flex min-w-0 shrink-0 items-center gap-4 text-left" onClick={() => navigateTo("overview")}>
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-mint-300/20 bg-mint-300/10 text-mint-200"><Waves className="h-5 w-5" /></div>
            <div className="min-w-0 xl:max-w-[23rem]">
              <p className="text-[11px] uppercase tracking-[0.28em] text-slate-400">GBF Platform</p>
              <p className="mt-1 text-xl font-semibold leading-tight text-white xl:whitespace-nowrap">Global Green-Bond Fractionalizer</p>
            </div>
          </button>

          <div className="hidden justify-center xl:flex">
            <nav className="flex items-center justify-center gap-2 rounded-[1.75rem] border border-white/10 bg-white/5 p-2 shadow-panel backdrop-blur">
              {navItems}
            </nav>
          </div>

          <div className="ml-auto hidden flex-wrap items-center justify-end gap-3 lg:flex xl:ml-0">
            <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-300">{overview?.network || "testnet"}</div>
            {user ? (
              <div className="flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200">
                <span className="whitespace-nowrap font-medium text-white">{user.name}</span>
                <span className="rounded-full bg-white/6 px-3 py-1 text-xs uppercase tracking-[0.18em] text-slate-400">{user.role}</span>
                <button className="inline-flex items-center gap-2 whitespace-nowrap text-sm font-medium text-white" onClick={handleLogout}><LogOut className="h-4 w-4" />Sign out</button>
              </div>
            ) : (
              <form className="flex flex-wrap items-center justify-end gap-2" onSubmit={handleLogin}>
                <input className="w-32 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white outline-none xl:w-40" placeholder="Email" value={loginForm.email} onChange={(event) => setLoginForm((current) => ({ ...current, email: event.target.value }))} />
                <input className="w-28 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white outline-none xl:w-36" placeholder="Password" type="password" value={loginForm.password} onChange={(event) => setLoginForm((current) => ({ ...current, password: event.target.value }))} />
                <button className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-ink-950" type="submit"><Lock className="h-4 w-4" />Sign in</button>
              </form>
            )}
          </div>

          <button className="ml-auto inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 xl:hidden" onClick={() => setMobileNavOpen((current) => !current)}>
            {mobileNavOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          </div>
        </div>

        {mobileNavOpen ? (
          <div className="border-t border-white/10 px-6 py-4 xl:hidden">
            <div className="flex flex-wrap justify-center gap-2">{navItems}</div>
            <div className="mt-4 space-y-3 lg:hidden">
              {user ? (
                <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200">
                  <span className="font-medium text-white">{user.name} <span className="ml-2 text-xs uppercase tracking-[0.18em] text-slate-400">{user.role}</span></span>
                  <button className="inline-flex items-center gap-2 text-sm font-medium text-white" onClick={handleLogout}><LogOut className="h-4 w-4" />Sign out</button>
                </div>
              ) : (
                <form className="grid gap-2" onSubmit={handleLogin}>
                  <input className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none" placeholder="Email" value={loginForm.email} onChange={(event) => setLoginForm((current) => ({ ...current, email: event.target.value }))} />
                  <input className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none" placeholder="Password" type="password" value={loginForm.password} onChange={(event) => setLoginForm((current) => ({ ...current, password: event.target.value }))} />
                  <button className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-medium text-ink-950" type="submit"><Lock className="h-4 w-4" />Sign in</button>
                </form>
              )}
            </div>
          </div>
        ) : null}
      </header>

      <main className="mx-auto max-w-[92rem] space-y-12 px-5 pb-20 pt-8 md:px-8 xl:px-10">
        {activePage === "overview" ? <HeroPanel overview={overview} user={user} payouts={payouts} refreshing={refreshing} loadData={loadData} /> : null}

        {activePage === "overview" ? (
          <section className="grid gap-6 rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-panel backdrop-blur lg:grid-cols-[0.9fr_1.1fr]">
            <SectionTitle eyebrow={currentPage.eyebrow} title={currentPage.title} body={currentPage.body} />
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {overview?.kpis?.map((kpi, index) => {
                const Icon = statIcons[index] || Activity;
                return (
                  <article key={kpi.label} className="rounded-[1.5rem] bg-ink-900/75 p-5">
                    <Icon className="h-5 w-5 text-mint-300" />
                    <p className="mt-5 text-sm text-slate-400">{kpi.label}</p>
                    <p className="mt-2 text-3xl font-semibold text-white">{kpi.value}</p>
                    <p className="mt-3 text-sm leading-6 text-slate-300">{kpi.detail}</p>
                  </article>
                );
              })}
            </div>
          </section>
        ) : null}

        {activePage === "overview" ? (
          <div className="space-y-8">
            <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
              <div className="rounded-[2rem] border border-white/10 bg-[#091426] p-8 shadow-panel">
                <SectionTitle eyebrow="Platform Overview" title="A unified operating surface for digital green-bond issuance and servicing." body="Overview summarizes platform health. Bonds covers issuance and operations. Investors covers holdings and market activity. Oversight covers verification, transactions, and governance." />
                <div className="mt-8 space-y-4">
                  {overview?.narrative?.workflow?.map((step, index) => (
                    <div key={step} className="flex gap-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-mint-400/15 text-sm font-semibold text-mint-300">0{index + 1}</div>
                      <p className="text-sm leading-7 text-slate-200">{step}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-6">
                <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-panel backdrop-blur">
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Recent transactions</p>
                  <div className="mt-5 space-y-4">
                    {transactions.slice(0, 4).map((transaction) => (
                      <article key={transaction.id} className="rounded-2xl bg-ink-900/70 p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-sm font-semibold text-white">{transaction.summary}</p>
                            <p className="mt-1 text-xs text-slate-400">{transaction.bondName}</p>
                          </div>
                          <span className={`rounded-full px-3 py-1 text-xs font-medium ${integrationTone(transaction.integrationMode)}`}>{transaction.integrationMode}</span>
                        </div>
                        <div className="mt-3 grid gap-2 text-xs text-slate-400 md:grid-cols-2">
                          <p>{new Date(transaction.timestamp).toLocaleString()}</p>
                          <p>Tx ID: <TxLink txId={transaction.txId} network={transaction.network} /></p>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>

                <div className="rounded-[2rem] bg-gradient-to-br from-mint-400/15 via-white/5 to-gold-300/15 p-6">
                  <div className="flex items-center gap-3 text-mint-200"><Radar className="h-5 w-5" /><p className="text-sm uppercase tracking-[0.22em]">System Status</p></div>
                  <p className="mt-4 text-2xl font-semibold text-white">The interface is organized around operating responsibilities.</p>
                  <p className="mt-3 text-sm leading-7 text-slate-200">Each page is structured for a different workflow, making the platform easier to use for issuance, investor management, and ongoing oversight.</p>
                  <button className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-ink-950 transition hover:bg-mint-300" onClick={() => navigateTo("bonds")}>
                    Open bond management
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </section>
          </div>
        ) : null}

        {activePage === "bonds" ? (
          <div className="space-y-10">
            <section className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
              <SectionTitle eyebrow="Bond Setup" title="Create and activate bond programs through authorized sessions." body="Bond creation and state-changing actions require operator or administrator access, while portfolio visibility remains broadly readable." />

              <form className="grid gap-4 rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-panel backdrop-blur md:grid-cols-2" onSubmit={onboardBond}>
                <input disabled={!isOperator} className="rounded-2xl border border-white/10 bg-ink-900/80 px-4 py-3 text-sm text-white outline-none disabled:opacity-50" placeholder="Bond name" value={bondForm.name} onChange={(event) => setBondForm((current) => ({ ...current, name: event.target.value }))} />
                <input disabled={!isOperator} className="rounded-2xl border border-white/10 bg-ink-900/80 px-4 py-3 text-sm text-white outline-none disabled:opacity-50" placeholder="Issuer" value={bondForm.issuer} onChange={(event) => setBondForm((current) => ({ ...current, issuer: event.target.value }))} />
                <select disabled={!isOperator} className="rounded-2xl border border-white/10 bg-ink-900/80 px-4 py-3 text-sm text-white outline-none disabled:opacity-50" value={bondForm.category} onChange={(event) => setBondForm((current) => ({ ...current, category: event.target.value }))}>
                  {categories.map((category) => <option key={category} value={category}>{category}</option>)}
                </select>
                <input disabled={!isOperator} className="rounded-2xl border border-white/10 bg-ink-900/80 px-4 py-3 text-sm text-white outline-none disabled:opacity-50" type="number" min="1" placeholder="Face value" value={bondForm.faceValue} onChange={(event) => setBondForm((current) => ({ ...current, faceValue: event.target.value }))} />
                <input disabled={!isOperator} className="rounded-2xl border border-white/10 bg-ink-900/80 px-4 py-3 text-sm text-white outline-none disabled:opacity-50" type="number" step="0.1" min="0" placeholder="Coupon rate" value={bondForm.couponRate} onChange={(event) => setBondForm((current) => ({ ...current, couponRate: event.target.value }))} />
                <input disabled={!isOperator} className="rounded-2xl border border-white/10 bg-ink-900/80 px-4 py-3 text-sm text-white outline-none disabled:opacity-50" type="date" value={bondForm.maturity} onChange={(event) => setBondForm((current) => ({ ...current, maturity: event.target.value }))} />
                <input disabled={!isOperator} className="rounded-2xl border border-white/10 bg-ink-900/80 px-4 py-3 text-sm text-white outline-none disabled:opacity-50" placeholder="Impact metric" value={bondForm.impactMetric} onChange={(event) => setBondForm((current) => ({ ...current, impactMetric: event.target.value }))} />
                <input disabled={!isOperator} className="rounded-2xl border border-white/10 bg-ink-900/80 px-4 py-3 text-sm text-white outline-none disabled:opacity-50" placeholder="Telemetry unit" value={bondForm.telemetryUnit} onChange={(event) => setBondForm((current) => ({ ...current, telemetryUnit: event.target.value }))} />
                <input disabled={!isOperator} className="rounded-2xl border border-white/10 bg-ink-900/80 px-4 py-3 text-sm text-white outline-none disabled:opacity-50" type="number" step="0.1" min="0" placeholder="Telemetry base value" value={bondForm.telemetryBaseValue} onChange={(event) => setBondForm((current) => ({ ...current, telemetryBaseValue: event.target.value }))} />
                <input disabled={!isOperator} className="rounded-2xl border border-white/10 bg-ink-900/80 px-4 py-3 text-sm text-white outline-none disabled:opacity-50" placeholder="Guardian policy id" value={bondForm.guardianPolicy} onChange={(event) => setBondForm((current) => ({ ...current, guardianPolicy: event.target.value }))} />
                <button disabled={!isOperator} className="md:col-span-2 rounded-2xl bg-mint-400 px-4 py-3 text-sm font-semibold text-ink-950 transition hover:bg-mint-300 disabled:cursor-not-allowed disabled:opacity-50" type="submit">Onboard Bond Program</button>
              </form>
            </section>

            <section className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
              <SectionTitle eyebrow="Bond Operations" title="Execute tokenization, verification, and distribution actions." body="Live Hedera signing only occurs when the session has the right permissions and the environment explicitly enables it." />

              <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-panel backdrop-blur">
                <label className="text-xs uppercase tracking-[0.25em] text-slate-400" htmlFor="bond-select">Active bond</label>
                <select id="bond-select" className="mt-3 w-full rounded-2xl border border-white/10 bg-ink-900/80 px-4 py-3 text-sm text-white outline-none" value={selectedBondId} onChange={(event) => setSelectedBondId(event.target.value)}>
                  {bonds.map((bond) => <option key={bond.id} value={bond.id}>{bond.name}</option>)}
                </select>

                <div className="mt-5 grid gap-3 md:grid-cols-4">
                  <button disabled={!isOperator} className="rounded-2xl bg-mint-400 px-4 py-3 text-sm font-semibold text-ink-950 transition hover:bg-mint-300 disabled:cursor-not-allowed disabled:opacity-50" onClick={() => runAction("/actions/fractionalize", "Fractionalize bond")}>Mint FBTs</button>
                  <button disabled={!isOperator} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50" onClick={() => runAction("/actions/sync-impact", "Publish truth event")}>Sync dMRV</button>
                  <button disabled={!isOperator} className="rounded-2xl border border-gold-300/30 bg-gold-300/10 px-4 py-3 text-sm font-semibold text-gold-300 transition hover:bg-gold-300/20 disabled:cursor-not-allowed disabled:opacity-50" onClick={() => runAction("/actions/distribute-yield", "Distribute yield")}>Schedule coupon</button>
                  <button disabled={!isAdmin} className="rounded-2xl border border-white/10 bg-ink-900/80 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:bg-ink-800 disabled:cursor-not-allowed disabled:opacity-50" onClick={resetDemo}>Reset DB</button>
                </div>

                <div className="mt-5 rounded-[1.5rem] bg-ink-900/80 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm uppercase tracking-[0.2em] text-mint-300">{actionState.title}</p>
                      <p className="mt-3 text-lg text-white">{actionState.loading ? "Processing..." : actionState.detail}</p>
                    </div>
                    {actionState.transaction ? <span className={`rounded-full px-3 py-1 text-xs font-medium ${integrationTone(actionState.transaction.integrationMode)}`}>{actionState.transaction.integrationMode}</span> : null}
                  </div>
                  {actionState.transaction ? (
                    <div className="mt-4 grid gap-2 text-xs text-slate-400 md:grid-cols-2">
                      <p>Tx ID: <TxLink txId={actionState.transaction.txId} network={actionState.transaction.network} /></p>
                      <p>Network: <span className="text-slate-200">{actionState.transaction.network}</span></p>
                    </div>
                  ) : null}
                </div>
              </div>
            </section>

            <section className="space-y-8">
              <SectionTitle eyebrow="Bond Registry" title="Review live bond programs, asset identifiers, and impact progress." body="The registry keeps core commercial, operational, and verification data visible in one place for ongoing portfolio management." />
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
                      <div className="rounded-2xl bg-ink-900/70 p-4"><p className="text-slate-400">Face Value</p><p className="mt-2 text-lg font-semibold text-white">{formatCurrency(bond.faceValue)}</p></div>
                      <div className="rounded-2xl bg-ink-900/70 p-4"><p className="text-slate-400">Coupon Rate</p><p className="mt-2 text-lg font-semibold text-white">{bond.couponRate}%</p></div>
                      <div className="rounded-2xl bg-ink-900/70 p-4"><p className="text-slate-400">Liquidity Score</p><p className="mt-2 text-lg font-semibold text-white">{bond.liquidityScore}/100</p></div>
                      <div className="rounded-2xl bg-ink-900/70 p-4"><p className="text-slate-400">Wallet Holders</p><p className="mt-2 text-lg font-semibold text-white">{bond.walletHolders.toLocaleString()}</p></div>
                    </div>
                    <div className="mt-6">
                      <div className="flex items-center justify-between text-sm text-slate-300"><span>Verified Impact Progress</span><span>{bond.progress}%</span></div>
                      <div className="mt-3 h-2 rounded-full bg-white/10"><div className="h-2 rounded-full bg-gradient-to-r from-mint-400 to-gold-300" style={{ width: `${bond.progress}%` }} /></div>
                      <p className="mt-3 text-sm text-slate-300">{bond.verifiedImpact}</p>
                    </div>
                    <div className="mt-6 space-y-2 text-xs text-slate-400">
                      <p>HTS Token ID: <EntityLink id={bond.tokenId} network={overview?.network} type="token" fallback="Pending fractionalization" /></p>
                      <p>HCS Topic ID: <EntityLink id={bond.topicId} network={overview?.network} type="topic" fallback="Pending topic provisioning" /></p>
                      <p>Guardian Policy: <span className="text-slate-200">{bond.guardianPolicy}</span></p>
                      <p>Tracked investors: <span className="text-slate-200">{formatInteger(holdings.filter((holding) => holding.bondId === bond.id).length || bond.walletHolders)}</span></p>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </div>
        ) : null}

        {activePage === "investors" ? (
          <div className="space-y-10">
            <section className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr]">
              <SectionTitle eyebrow="Investor Registry" title="Manage approved investors, holdings, settlement, and secondary activity." body="This page turns the platform into a holder-aware system with allocations, transfers, and market listings linked to real investor records." />

              <div className="grid gap-6">
                <form className="grid gap-4 rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-panel backdrop-blur md:grid-cols-2" onSubmit={createInvestorProfile}>
                  <input disabled={!isOperator} className="rounded-2xl border border-white/10 bg-ink-900/80 px-4 py-3 text-sm text-white outline-none disabled:opacity-50" placeholder="Investor name" value={investorForm.name} onChange={(event) => setInvestorForm((current) => ({ ...current, name: event.target.value }))} />
                  <input disabled={!isOperator} className="rounded-2xl border border-white/10 bg-ink-900/80 px-4 py-3 text-sm text-white outline-none disabled:opacity-50" placeholder="Investor email" value={investorForm.email} onChange={(event) => setInvestorForm((current) => ({ ...current, email: event.target.value }))} />
                  <input disabled={!isOperator} className="rounded-2xl border border-white/10 bg-ink-900/80 px-4 py-3 text-sm text-white outline-none disabled:opacity-50" placeholder="Wallet alias" value={investorForm.walletAlias} onChange={(event) => setInvestorForm((current) => ({ ...current, walletAlias: event.target.value }))} />
                  <input disabled={!isOperator} className="rounded-2xl border border-white/10 bg-ink-900/80 px-4 py-3 text-sm text-white outline-none disabled:opacity-50" placeholder="Account ID" value={investorForm.accountId} onChange={(event) => setInvestorForm((current) => ({ ...current, accountId: event.target.value }))} />
                  <input disabled={!isOperator} className="rounded-2xl border border-white/10 bg-ink-900/80 px-4 py-3 text-sm text-white outline-none disabled:opacity-50" placeholder="Region" value={investorForm.region} onChange={(event) => setInvestorForm((current) => ({ ...current, region: event.target.value }))} />
                  <select disabled={!isOperator} className="rounded-2xl border border-white/10 bg-ink-900/80 px-4 py-3 text-sm text-white outline-none disabled:opacity-50" value={investorForm.kycStatus} onChange={(event) => setInvestorForm((current) => ({ ...current, kycStatus: event.target.value }))}>
                    <option value="approved">approved</option>
                    <option value="pending">pending</option>
                    <option value="rejected">rejected</option>
                  </select>
                  <select disabled={!isOperator} className="rounded-2xl border border-white/10 bg-ink-900/80 px-4 py-3 text-sm text-white outline-none disabled:opacity-50" value={investorForm.riskTier} onChange={(event) => setInvestorForm((current) => ({ ...current, riskTier: event.target.value }))}>
                    <option value="balanced">balanced</option>
                    <option value="income">income</option>
                    <option value="conservative">conservative</option>
                    <option value="growth">growth</option>
                  </select>
                  <button disabled={!isOperator} className="rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-ink-950 disabled:cursor-not-allowed disabled:opacity-50" type="submit">Create Investor</button>
                </form>

                <form className="grid gap-4 rounded-[2rem] border border-white/10 bg-[#091426] p-6 shadow-panel md:grid-cols-2" onSubmit={allocateHoldings}>
                  <select disabled={!isOperator} className="rounded-2xl border border-white/10 bg-ink-900/80 px-4 py-3 text-sm text-white outline-none disabled:opacity-50" value={allocationForm.investorId} onChange={(event) => setAllocationForm((current) => ({ ...current, investorId: event.target.value }))}>
                    <option value="">Select investor</option>
                    {investors.map((investor) => <option key={investor.id} value={investor.id}>{investor.name}</option>)}
                  </select>
                  <input disabled={!isOperator} className="rounded-2xl border border-white/10 bg-ink-900/80 px-4 py-3 text-sm text-white outline-none disabled:opacity-50" type="number" min="1" placeholder="Units" value={allocationForm.units} onChange={(event) => setAllocationForm((current) => ({ ...current, units: event.target.value }))} />
                  <input disabled={!isOperator} className="rounded-2xl border border-white/10 bg-ink-900/80 px-4 py-3 text-sm text-white outline-none disabled:opacity-50" type="number" min="1" placeholder="Cost basis" value={allocationForm.costBasis} onChange={(event) => setAllocationForm((current) => ({ ...current, costBasis: event.target.value }))} />
                  <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">{selectedBond ? `Allocating into ${selectedBond.name}` : "Select a bond first"}</div>
                  <button disabled={!isOperator || !selectedBondId || !allocationForm.investorId} className="md:col-span-2 rounded-2xl bg-mint-400 px-4 py-3 text-sm font-semibold text-ink-950 disabled:cursor-not-allowed disabled:opacity-50" type="submit">Allocate FBT Units</button>
                </form>

                <div className="grid gap-5 xl:grid-cols-2">
                  <form className="grid gap-4 rounded-[2rem] border border-white/10 bg-[#091426] p-6 shadow-panel md:grid-cols-2" onSubmit={settleAllocation}>
                    <select disabled={!isOperator} className="rounded-2xl border border-white/10 bg-ink-900/80 px-4 py-3 text-sm text-white outline-none disabled:opacity-50" value={settlementForm.investorId} onChange={(event) => setSettlementForm((current) => ({ ...current, investorId: event.target.value }))}>
                      <option value="">Select investor</option>
                      {investors.map((investor) => <option key={investor.id} value={investor.id}>{investor.name}</option>)}
                    </select>
                    <input disabled={!isOperator} className="rounded-2xl border border-white/10 bg-ink-900/80 px-4 py-3 text-sm text-white outline-none disabled:opacity-50" type="number" min="1" placeholder="Units to settle" value={settlementForm.units} onChange={(event) => setSettlementForm((current) => ({ ...current, units: event.target.value }))} />
                    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300 md:col-span-2">Settle treasury inventory into the selected investor wallet for {selectedBond?.name || "the active bond"}.</div>
                    <button disabled={!isOperator || !selectedBondId || !settlementForm.investorId} className="md:col-span-2 rounded-2xl bg-gold-300 px-4 py-3 text-sm font-semibold text-ink-950 disabled:cursor-not-allowed disabled:opacity-50" type="submit">Settle Allocation</button>
                  </form>

                  <form className="grid gap-4 rounded-[2rem] border border-white/10 bg-[#091426] p-6 shadow-panel md:grid-cols-2" onSubmit={transferHoldings}>
                    <select disabled={!isOperator} className="rounded-2xl border border-white/10 bg-ink-900/80 px-4 py-3 text-sm text-white outline-none disabled:opacity-50" value={transferForm.fromInvestorId} onChange={(event) => setTransferForm((current) => ({ ...current, fromInvestorId: event.target.value }))}>
                      <option value="">From investor</option>
                      {investors.map((investor) => <option key={investor.id} value={investor.id}>{investor.name}</option>)}
                    </select>
                    <select disabled={!isOperator} className="rounded-2xl border border-white/10 bg-ink-900/80 px-4 py-3 text-sm text-white outline-none disabled:opacity-50" value={transferForm.toInvestorId} onChange={(event) => setTransferForm((current) => ({ ...current, toInvestorId: event.target.value }))}>
                      <option value="">To investor</option>
                      {investors.map((investor) => <option key={investor.id} value={investor.id}>{investor.name}</option>)}
                    </select>
                    <input disabled={!isOperator} className="rounded-2xl border border-white/10 bg-ink-900/80 px-4 py-3 text-sm text-white outline-none disabled:opacity-50 md:col-span-2" type="number" min="1" placeholder="Units to transfer" value={transferForm.units} onChange={(event) => setTransferForm((current) => ({ ...current, units: event.target.value }))} />
                    <button disabled={!isOperator || !selectedBondId || !transferForm.fromInvestorId || !transferForm.toInvestorId} className="md:col-span-2 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-ink-950 disabled:cursor-not-allowed disabled:opacity-50" type="submit">Transfer Holdings</button>
                  </form>
                </div>

                <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
                  <form className="grid gap-4 rounded-[2rem] border border-white/10 bg-[#091426] p-6 shadow-panel md:grid-cols-2" onSubmit={createListing}>
                    <select disabled={!user || !["admin", "operator", "investor"].includes(user.role)} className="rounded-2xl border border-white/10 bg-ink-900/80 px-4 py-3 text-sm text-white outline-none disabled:opacity-50" value={listingForm.sellerInvestorId} onChange={(event) => setListingForm((current) => ({ ...current, sellerInvestorId: event.target.value }))}>
                      <option value="">Seller investor</option>
                      {investors.map((investor) => <option key={investor.id} value={investor.id}>{investor.name}</option>)}
                    </select>
                    <input disabled={!user || !["admin", "operator", "investor"].includes(user.role)} className="rounded-2xl border border-white/10 bg-ink-900/80 px-4 py-3 text-sm text-white outline-none disabled:opacity-50" type="number" min="1" placeholder="Units to list" value={listingForm.units} onChange={(event) => setListingForm((current) => ({ ...current, units: event.target.value }))} />
                    <input disabled={!user || !["admin", "operator", "investor"].includes(user.role)} className="rounded-2xl border border-white/10 bg-ink-900/80 px-4 py-3 text-sm text-white outline-none disabled:opacity-50" type="number" min="1" step="0.1" placeholder="Price per unit" value={listingForm.pricePerUnit} onChange={(event) => setListingForm((current) => ({ ...current, pricePerUnit: event.target.value }))} />
                    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">Opens a compliant secondary-market offer for {selectedBond?.name || "the active bond"}.</div>
                    <button disabled={!user || !selectedBondId || !listingForm.sellerInvestorId} className="md:col-span-2 rounded-2xl bg-mint-400 px-4 py-3 text-sm font-semibold text-ink-950 disabled:cursor-not-allowed disabled:opacity-50" type="submit">Create Listing</button>
                  </form>

                  <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-panel backdrop-blur">
                    <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Market listings</p>
                    <select className="mt-4 w-full rounded-2xl border border-white/10 bg-ink-900/80 px-4 py-3 text-sm text-white outline-none" value={selectedListingId} onChange={(event) => setSelectedListingId(event.target.value)}>
                      <option value="">Select listing</option>
                      {marketListings.map((listing) => <option key={listing.id} value={listing.id}>{`${listing.bondName} | ${listing.sellerName} | ${formatInteger(listing.units)} units | ${listing.status}`}</option>)}
                    </select>
                    <select className="mt-4 w-full rounded-2xl border border-white/10 bg-ink-900/80 px-4 py-3 text-sm text-white outline-none" value={listingForm.buyerInvestorId} onChange={(event) => setListingForm((current) => ({ ...current, buyerInvestorId: event.target.value }))}>
                      <option value="">Buyer investor</option>
                      {investors.map((investor) => <option key={investor.id} value={investor.id}>{investor.name}</option>)}
                    </select>
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      <button disabled={!selectedListingId} className="rounded-2xl border border-gold-300/30 bg-gold-300/10 px-4 py-3 text-sm font-semibold text-gold-300 disabled:cursor-not-allowed disabled:opacity-50" onClick={fillListing}>Fill Listing</button>
                      <button disabled={!selectedListingId} className="rounded-2xl border border-white/10 bg-ink-900/80 px-4 py-3 text-sm font-semibold text-slate-200 disabled:cursor-not-allowed disabled:opacity-50" onClick={cancelListing}>Cancel Listing</button>
                    </div>
                    <div className="mt-5 space-y-3">
                      {marketListings.slice(0, 4).map((listing) => (
                        <article key={listing.id} className="rounded-2xl bg-ink-900/70 p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div><p className="text-sm font-semibold text-white">{listing.bondName}</p><p className="mt-1 text-xs text-slate-400">{`${listing.sellerName} -> ${listing.buyerName || "Open market"}`}</p></div>
                            <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-slate-200">{listing.status}</span>
                          </div>
                          <div className="mt-3 grid gap-2 text-xs text-slate-400">
                            <p>Units: <span className="text-slate-200">{formatInteger(listing.units)}</span></p>
                            <p>Ask: <span className="text-slate-200">{formatCurrency(listing.pricePerUnit)}</span></p>
                          </div>
                        </article>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid gap-5 xl:grid-cols-2">
                  <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-panel backdrop-blur">
                    <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Approved investors</p>
                    <div className="mt-5 space-y-3">
                      {investors.slice(0, 6).map((investor) => (
                        <article key={investor.id} className="rounded-2xl bg-ink-900/70 p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div><p className="text-sm font-semibold text-white">{investor.name}</p><p className="mt-1 text-xs text-slate-400">{investor.walletAlias}</p></div>
                            <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-slate-200">{investor.kycStatus}</span>
                          </div>
                          <div className="mt-3 text-xs text-slate-400"><p>{investor.region}</p><p className="mt-1">{investor.riskTier} mandate</p></div>
                        </article>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-panel backdrop-blur">
                    <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Selected bond holders</p>
                    <div className="mt-5 space-y-3">
                      {selectedBondHoldings.length ? selectedBondHoldings.map((holding) => (
                        <article key={holding.id} className="rounded-2xl bg-ink-900/70 p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div><p className="text-sm font-semibold text-white">{holding.investorName}</p><p className="mt-1 text-xs text-slate-400">{holding.walletAlias}</p></div>
                            <span className="rounded-full bg-mint-400/15 px-3 py-1 text-xs text-mint-300">{formatInteger(holding.units)} units</span>
                          </div>
                          <div className="mt-3 text-xs text-slate-400"><p>Cost basis: <span className="text-slate-200">{formatCurrency(holding.costBasis)}</span></p><p className="mt-1">KYC: <span className="text-slate-200">{holding.kycStatus}</span></p></div>
                        </article>
                      )) : <div className="rounded-2xl bg-ink-900/70 p-4 text-sm text-slate-400">No investor allocations yet for the selected bond.</div>}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr]">
              <SectionTitle eyebrow="Investor Portfolios" title="Review positions, distributions, and transfer activity by investor." body="The platform provides a clear investor view of holdings, capital deployed, scheduled income, and movement across bond programs." />

              <div className="grid gap-6">
                <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-panel backdrop-blur">
                  <label className="text-xs uppercase tracking-[0.25em] text-slate-400" htmlFor="investor-select">Active investor</label>
                  <select id="investor-select" className="mt-3 w-full rounded-2xl border border-white/10 bg-ink-900/80 px-4 py-3 text-sm text-white outline-none" value={selectedInvestorId} onChange={(event) => setSelectedInvestorId(event.target.value)}>
                    {investors.map((investor) => <option key={investor.id} value={investor.id}>{investor.name}</option>)}
                  </select>

                  {selectedPortfolio ? (
                    <div className="mt-5 grid gap-4 md:grid-cols-4">
                      <div className="rounded-2xl bg-ink-900/70 p-4"><p className="text-xs uppercase tracking-[0.18em] text-slate-400">Positions</p><p className="mt-2 text-2xl font-semibold text-white">{formatInteger(selectedPortfolio.summary.activePositions)}</p></div>
                      <div className="rounded-2xl bg-ink-900/70 p-4"><p className="text-xs uppercase tracking-[0.18em] text-slate-400">Units Held</p><p className="mt-2 text-2xl font-semibold text-white">{formatInteger(selectedPortfolio.summary.totalUnits)}</p></div>
                      <div className="rounded-2xl bg-ink-900/70 p-4"><p className="text-xs uppercase tracking-[0.18em] text-slate-400">Invested</p><p className="mt-2 text-2xl font-semibold text-white">{formatCurrency(selectedPortfolio.summary.investedCapital)}</p></div>
                      <div className="rounded-2xl bg-ink-900/70 p-4"><p className="text-xs uppercase tracking-[0.18em] text-slate-400">Yield Scheduled</p><p className="mt-2 text-2xl font-semibold text-white">{formatCurrency(selectedPortfolio.summary.distributedYield)}</p></div>
                    </div>
                  ) : null}
                </div>

                <div className="grid gap-5 xl:grid-cols-2">
                  <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-panel backdrop-blur">
                    <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Portfolio holdings</p>
                    <div className="mt-5 space-y-3">
                      {selectedPortfolio?.holdings?.length ? selectedPortfolio.holdings.map((holding) => (
                        <article key={holding.id} className="rounded-2xl bg-ink-900/70 p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div><p className="text-sm font-semibold text-white">{holding.bondName}</p><p className="mt-1 text-xs text-slate-400">{holding.walletAlias}</p></div>
                            <span className="rounded-full bg-mint-400/15 px-3 py-1 text-xs text-mint-300">{formatInteger(holding.units)} units</span>
                          </div>
                          <p className="mt-3 text-xs text-slate-400">Cost basis: <span className="text-slate-200">{formatCurrency(holding.costBasis)}</span></p>
                        </article>
                      )) : <div className="rounded-2xl bg-ink-900/70 p-4 text-sm text-slate-400">No active holdings for the selected investor yet.</div>}
                    </div>
                  </div>

                  <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-panel backdrop-blur">
                    <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Payout history</p>
                    <div className="mt-5 space-y-3">
                      {selectedPortfolio?.payouts?.length ? selectedPortfolio.payouts.map((payout) => (
                        <article key={payout.id} className="rounded-2xl bg-ink-900/70 p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div><p className="text-sm font-semibold text-white">{payout.bondName}</p><p className="mt-1 text-xs text-slate-400">{new Date(payout.createdAt).toLocaleString()}</p></div>
                            <span className={`rounded-full px-3 py-1 text-xs font-medium ${integrationTone(payout.integrationMode)}`}>{payout.integrationMode}</span>
                          </div>
                          <div className="mt-3 grid gap-2 text-xs text-slate-400">
                            <p>Scheduled amount: <span className="text-slate-200">{formatCurrency(payout.amount)}</span></p>
                            <p>Units: <span className="text-slate-200">{formatInteger(payout.units)}</span></p>
                            <p>Status: <span className="text-slate-200">{payout.status}</span></p>
                          </div>
                        </article>
                      )) : <div className="rounded-2xl bg-ink-900/70 p-4 text-sm text-slate-400">No payout records yet for the selected investor.</div>}
                    </div>
                  </div>
                </div>

                <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-panel backdrop-blur">
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Transfer history</p>
                  <div className="mt-5 space-y-3">
                    {selectedPortfolio?.transfers?.length ? selectedPortfolio.transfers.map((transfer) => (
                      <article key={transfer.id} className="rounded-2xl bg-ink-900/70 p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div><p className="text-sm font-semibold text-white">{transfer.bondName}</p><p className="mt-1 text-xs text-slate-400">{transfer.transferType}</p></div>
                          <span className={`rounded-full px-3 py-1 text-xs font-medium ${integrationTone(transfer.integrationMode)}`}>{transfer.integrationMode}</span>
                        </div>
                        <div className="mt-3 grid gap-2 text-xs text-slate-400">
                          <p>Units: <span className="text-slate-200">{formatInteger(transfer.units)}</span></p>
                          <p>From: <span className="text-slate-200">{transfer.fromInvestorName || "Treasury"}</span></p>
                          <p>To: <span className="text-slate-200">{transfer.toInvestorName || "Treasury"}</span></p>
                        </div>
                      </article>
                    )) : <div className="rounded-2xl bg-ink-900/70 p-4 text-sm text-slate-400">No transfer records yet for the selected investor.</div>}
                  </div>
                </div>
              </div>
            </section>
          </div>
        ) : null}

        {activePage === "truth-stream" ? (
          <section className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="space-y-8">
              <SectionTitle eyebrow="Impact Verification" title="Monitor verified impact data, transaction history, and governance activity." body="Telemetry and operating history remain transparent to viewers, while operational writes require authenticated sessions." />
              <div className="space-y-4">
                {events.map((event) => (
                  <article key={event.id} className="rounded-[1.5rem] border border-white/10 bg-white/5 p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div><p className="text-sm text-mint-300">{event.source}</p><h3 className="mt-1 text-lg font-semibold text-white">{event.project}</h3><p className="mt-2 text-sm text-slate-300">{event.metric}: <span className="text-white">{event.value}</span></p></div>
                      <div className="text-right text-xs text-slate-400"><p>{new Date(event.timestamp).toLocaleString()}</p><p className="mt-2">Seq #{event.topicSequence}</p></div>
                    </div>
                    <div className="mt-4 flex items-center justify-between text-sm"><span className="rounded-full bg-mint-400/15 px-3 py-1 text-mint-300">{event.status}</span><span className="text-slate-300">{event.integrationMode} mode</span></div>
                  </article>
                ))}
              </div>
            </div>

            <div className="space-y-6">
              <div className="rounded-[2rem] border border-white/10 bg-[#091426] p-8 shadow-panel">
                <SectionTitle eyebrow="Operations & Governance" title="Keep impact reporting, transaction records, and governance controls aligned." body="This page groups the impact feed with transaction records, administrative activity, and operating guidance." />
                <div className="mt-8 rounded-[1.5rem] bg-gradient-to-br from-mint-400/15 via-white/5 to-gold-300/15 p-6">
                  <div className="flex items-center gap-3 text-mint-200"><Radar className="h-5 w-5" /><p className="text-sm uppercase tracking-[0.22em]">Operational Priority</p></div>
                  <p className="mt-4 text-2xl font-semibold text-white">Strengthen key management and controlled signing workflows.</p>
                  <p className="mt-3 text-sm leading-7 text-slate-200">The next operational milestone is a managed signing model with stronger wallet connectivity, settlement controls, and policy integration.</p>
                  <button className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-ink-950 transition hover:bg-mint-300" onClick={() => navigateTo("overview")}>Back to overview<ArrowRight className="h-4 w-4" /></button>
                </div>
              </div>

              <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-panel backdrop-blur">
                <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Recent transactions</p>
                <div className="mt-5 space-y-4">
                  {transactions.slice(0, 6).map((transaction) => (
                    <article key={transaction.id} className="rounded-2xl bg-ink-900/70 p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div><p className="text-sm font-semibold text-white">{transaction.summary}</p><p className="mt-1 text-xs text-slate-400">{transaction.bondName}</p></div>
                        <span className={`rounded-full px-3 py-1 text-xs font-medium ${integrationTone(transaction.integrationMode)}`}>{transaction.integrationMode}</span>
                      </div>
                      <div className="mt-3 grid gap-2 text-xs text-slate-400 md:grid-cols-2"><p>{new Date(transaction.timestamp).toLocaleString()}</p><p>Tx ID: <TxLink txId={transaction.txId} network={transaction.network} /></p></div>
                    </article>
                  ))}
                </div>
              </div>

              {isAdmin ? (
                <div className="space-y-6">
                  <section className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
                    <SectionTitle eyebrow="Admin" title="Manage users and inspect audit activity." body="Admins can provision additional operators or viewers and review recent audit events without leaving the product." />
                    <div className="grid gap-6">
                      <form className="grid gap-4 rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-panel backdrop-blur md:grid-cols-2" onSubmit={createOperatorUser}>
                        <input className="rounded-2xl border border-white/10 bg-ink-900/80 px-4 py-3 text-sm text-white outline-none" placeholder="User name" value={userForm.name} onChange={(event) => setUserForm((current) => ({ ...current, name: event.target.value }))} />
                        <input className="rounded-2xl border border-white/10 bg-ink-900/80 px-4 py-3 text-sm text-white outline-none" placeholder="Email" value={userForm.email} onChange={(event) => setUserForm((current) => ({ ...current, email: event.target.value }))} />
                        <select className="rounded-2xl border border-white/10 bg-ink-900/80 px-4 py-3 text-sm text-white outline-none" value={userForm.role} onChange={(event) => setUserForm((current) => ({ ...current, role: event.target.value }))}>
                          <option value="operator">operator</option>
                          <option value="viewer">viewer</option>
                          <option value="admin">admin</option>
                          <option value="investor">investor</option>
                        </select>
                        <input className="rounded-2xl border border-white/10 bg-ink-900/80 px-4 py-3 text-sm text-white outline-none" placeholder="Temporary password" type="password" value={userForm.password} onChange={(event) => setUserForm((current) => ({ ...current, password: event.target.value }))} />
                        <select className="rounded-2xl border border-white/10 bg-ink-900/80 px-4 py-3 text-sm text-white outline-none" value={userForm.investorId} onChange={(event) => setUserForm((current) => ({ ...current, investorId: event.target.value }))}>
                          <option value="">No linked investor</option>
                          {investors.map((investor) => <option key={investor.id} value={investor.id}>{investor.name}</option>)}
                        </select>
                        <button className="md:col-span-2 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-ink-950" type="submit">Create User</button>
                      </form>

                      <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-panel backdrop-blur">
                        <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Users</p>
                        <div className="mt-4 space-y-3">
                          {users.map((entry) => <div key={entry.id} className="flex items-center justify-between rounded-2xl bg-ink-900/70 p-4 text-sm"><div><p className="text-white">{entry.name}</p><p className="text-slate-400">{entry.email}</p></div><span className="rounded-full bg-white/10 px-3 py-1 text-slate-200">{entry.role}</span></div>)}
                        </div>
                      </div>
                    </div>
                  </section>

                  <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-panel backdrop-blur">
                    <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Recent audit logs</p>
                    <div className="mt-5 space-y-4">
                      {auditLogs.slice(0, 6).map((entry) => (
                        <article key={entry.id} className="rounded-2xl bg-ink-900/70 p-4 text-sm">
                          <div className="flex items-start justify-between gap-4">
                            <div><p className="font-semibold text-white">{entry.action}</p><p className="mt-1 text-xs text-slate-400">{`${entry.actorEmail || "system"} to ${entry.targetType}`}</p></div>
                            <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-slate-200">{entry.status}</span>
                          </div>
                          <p className="mt-3 text-xs text-slate-400">{new Date(entry.createdAt).toLocaleString()}</p>
                        </article>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </section>
        ) : null}
      </main>
    </div>
  );
}
