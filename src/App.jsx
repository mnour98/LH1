// src/App.jsx
import { useMemo, useRef, useState, useEffect } from "react";
import "./App.css";
import logo from "./assets/laboratoire_hibalogique_inc_logo.jpg";

/**
 * Simple tax rates (adjust later if needed)
 * - QC: GST 5% + QST 9.975% = 14.975%
 * - ON: HST 13%
 * - BC: GST 5% + PST 7% = 12%
 * - AB: GST 5%
 */
const TAX_RATES_BY_PROVINCE = {
  QC: 0.14975,
  ON: 0.13,
  BC: 0.12,
  AB: 0.05,
  MB: 0.12,
  SK: 0.11,
  NS: 0.15,
  NB: 0.15,
  NL: 0.15,
  PE: 0.15,
  NT: 0.05,
  NU: 0.05,
  YT: 0.05,
};

const PROVINCES = [
  { code: "QC", name: "Quebec" },
  { code: "ON", name: "Ontario" },
  { code: "BC", name: "British Columbia" },
  { code: "AB", name: "Alberta" },
  { code: "MB", name: "Manitoba" },
  { code: "SK", name: "Saskatchewan" },
  { code: "NS", name: "Nova Scotia" },
  { code: "NB", name: "New Brunswick" },
  { code: "NL", name: "Newfoundland and Labrador" },
  { code: "PE", name: "Prince Edward Island" },
  { code: "NT", name: "Northwest Territories" },
  { code: "NU", name: "Nunavut" },
  { code: "YT", name: "Yukon" },
];

const makeId = () =>
  globalThis.crypto?.randomUUID?.() ??
  `id_${Date.now()}_${Math.random().toString(16).slice(2)}`;

const emptyLine = () => ({
  id: makeId(),
  typeOfTest: "",
  description: "",
  panel: "",
  timeDays: "",
  pricePerUnit: "",
  numSamples: "",
});

function formatMoney(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString("en-CA", { style: "currency", currency: "CAD" });
}

function clamp0(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, x);
}

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function safeISODate(val) {
  const s = String(val ?? "").trim();
  if (!s) return "";
  return s;
}

export default function App() {
  const [quote, setQuote] = useState({
    referenceNumber: "Quote 0001-26",
    date: new Date().toISOString().slice(0, 10),
    validTill: "",
    sponsor: "",
    address: "",
    phone: "",
    email: "",
    contactInformation: "",
    country: "Canada",
    province: "QC",
    discountPercent: 0,
  });

  const [lines, setLines] = useState([emptyLine()]);

  // ✅ edit | preview
  const [mode, setMode] = useState("edit");

  // ✅ Toast (professional replacement for alert)
  const [toast, setToast] = useState(null);
  const showToast = (message) => {
    setToast(message);
    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(() => setToast(null), 2200);
  };

  // ✅ Dirty tracking (for internal/pro look)
  const [isDirty, setIsDirty] = useState(false);

  // =========================
  // Save / Load (LAST) + History (MULTIPLE)
  // =========================
  const STORAGE_KEY = "hibalogique_quote_v1"; // last saved
  const HISTORY_KEY = "hibalogique_quotes_v1"; // many saved

  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);

  // ✅ History search/filter
  const [historySearch, setHistorySearch] = useState("");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");

  // ✅ Import input
  const importRef = useRef(null);

  const taxRate = useMemo(() => {
    if (quote.country !== "Canada") return 0;
    return TAX_RATES_BY_PROVINCE[quote.province] ?? 0;
  }, [quote.country, quote.province]);

  const computed = useMemo(() => {
    const lineSubtotals = lines.map((l) => {
      const price = clamp0(l.pricePerUnit);
      const samples = clamp0(l.numSamples);
      return price * samples;
    });

    const subtotal = lineSubtotals.reduce((a, b) => a + b, 0);

    const discountPct = Math.max(
      0,
      Math.min(100, toNumber(quote.discountPercent))
    );
    const discountAmount = subtotal * (discountPct / 100);
    const afterDiscount = Math.max(0, subtotal - discountAmount);

    const taxes = afterDiscount * clamp0(taxRate);
    const total = Math.max(0, afterDiscount + taxes);

    return {
      lineSubtotals,
      subtotal,
      discountAmount,
      afterDiscount,
      taxes,
      total,
    };
  }, [lines, quote.discountPercent, taxRate]);

  // Ensure loaded lines always have IDs
  const normalizeLines = (arr) => {
    if (!Array.isArray(arr) || !arr.length) return [emptyLine()];
    return arr.map((l) => ({ ...l, id: l?.id ?? makeId() }));
  };

  // Load history on startup
  useEffect(() => {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return;
    try {
      const list = JSON.parse(raw);
      if (Array.isArray(list)) setHistory(list);
    } catch {
      // ignore
    }
  }, []);

  const persistHistory = (list) => {
    setHistory(list);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(list));
  };

  const updateQuote = (field, value) => {
    setIsDirty(true);
    setQuote((q) => ({ ...q, [field]: value }));
  };

  const updateLine = (id, field, value) => {
    setIsDirty(true);
    setLines((prev) =>
      prev.map((l) => (l.id === id ? { ...l, [field]: value } : l))
    );
  };

  const addLine = () => {
    setIsDirty(true);
    setLines((prev) => [...prev, emptyLine()]);
  };

  const removeLine = (id) => {
    setIsDirty(true);
    setLines((prev) =>
      prev.length === 1 ? prev : prev.filter((l) => l.id !== id)
    );
  };

  // Save "last saved" (what Load uses)
  const saveLast = (payloadQuote = quote, payloadLines = lines) => {
    const payload = {
      quote: payloadQuote,
      lines: payloadLines,
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  };

  // =========================
  // ✅ Reference uniqueness helpers + Auto Reference generator
  // =========================
  const normalizeRef = (ref) => String(ref ?? "").trim().toLowerCase();

  const referenceExistsInHistory = (ref, ignoreId = null) => {
    const needle = normalizeRef(ref);
    if (!needle) return false;
    return history.some((h) => {
      if (ignoreId && h.id === ignoreId) return false;
      return normalizeRef(h.quote?.referenceNumber) === needle;
    });
  };

  // Format: Quote 0001-26
  const makeReference = (n, yy2) => {
    const num = String(n).padStart(4, "0");
    return `Quote ${num}-${yy2}`;
  };

  const getNextReference = () => {
    const now = new Date();
    const yy2 = String(now.getFullYear()).slice(-2);

    // Look for max number for current year suffix "-YY"
    let maxN = 0;
    for (const h of history) {
      const ref = String(h?.quote?.referenceNumber ?? "");
      const m = ref.match(/Quote\s+(\d{1,6})-(\d{2})/i);
      if (!m) continue;
      const n = Number(m[1]);
      const yy = m[2];
      if (yy !== yy2) continue;
      if (Number.isFinite(n)) maxN = Math.max(maxN, n);
    }

    // Also check current quote ref (if user typed one)
    {
      const ref = String(quote.referenceNumber ?? "");
      const m = ref.match(/Quote\s+(\d{1,6})-(\d{2})/i);
      if (m && m[2] === yy2) {
        const n = Number(m[1]);
        if (Number.isFinite(n)) maxN = Math.max(maxN, n);
      }
    }

    // Increment
    let candidate = makeReference(maxN + 1, yy2);

    // Ensure unique even if history has weird refs
    while (referenceExistsInHistory(candidate)) {
      maxN += 1;
      candidate = makeReference(maxN + 1, yy2);
    }

    return candidate;
  };

  // ✅ Save: always auto-generate a NEW reference number each save (your request)
  const saveQuote = () => {
    if (!String(quote.sponsor ?? "").trim()) {
      showToast("Sponsor is required.");
      return;
    }

    const newRef = getNextReference();

    const recordQuote = {
      ...quote,
      referenceNumber: newRef,
    };

    saveLast(recordQuote, lines);

    const record = {
      id: makeId(),
      savedAt: new Date().toISOString(),
      total: computed.total,
      subtotal: computed.subtotal,
      taxes: computed.taxes,
      quote: recordQuote,
      lines,
    };

    persistHistory([record, ...history]);

    // Update UI to show new reference after save
    setQuote(recordQuote);

    setIsDirty(false);
    showToast(`Saved ✅ (${newRef})`);
  };

  const loadQuote = () => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return showToast("No saved quote found.");

    try {
      const data = JSON.parse(raw);

      if (data?.quote) setQuote(data.quote);
      setLines(normalizeLines(data?.lines));

      setMode("edit");
      setIsDirty(false);
      showToast("Loaded successfully ✅");
    } catch {
      showToast("Saved data is corrupted.");
    }
  };

  const openFromHistory = (record) => {
    if (record?.quote) setQuote(record.quote);
    setLines(normalizeLines(record?.lines));
    setMode("edit");
    setIsDirty(false);
    showToast("Opened from history ✅");
  };

  // Duplicate record (also generates a new sequential reference)
  const duplicateFromHistory = (record) => {
    if (!record) return;

    const newRef = getNextReference();
    const duplicated = {
      id: makeId(),
      savedAt: new Date().toISOString(),
      total: record.total,
      subtotal: record.subtotal,
      taxes: record.taxes,
      quote: { ...record.quote, referenceNumber: newRef },
      lines: normalizeLines(record.lines),
    };

    persistHistory([duplicated, ...history]);
    showToast(`Duplicated ✅ (${newRef})`);
  };

  // Rename reference (history quick edit) - prevent duplicates
  const renameReferenceInHistory = (id) => {
    const current = history.find((h) => h.id === id);
    if (!current) return;

    const newRef = window.prompt(
      "New reference number:",
      current.quote?.referenceNumber ?? ""
    );
    if (newRef == null) return;

    const cleaned = String(newRef).trim();
    if (!cleaned) {
      showToast("Reference cannot be empty.");
      return;
    }

    if (referenceExistsInHistory(cleaned, id)) {
      showToast("This reference already exists. Choose another one.");
      return;
    }

    const next = history.map((h) =>
      h.id === id
        ? { ...h, quote: { ...h.quote, referenceNumber: cleaned } }
        : h
    );
    persistHistory(next);
    showToast("Reference updated ✅");
  };

  const deleteFromHistory = (id) => {
    const next = history.filter((h) => h.id !== id);
    persistHistory(next);
    showToast("Deleted from history");
  };

  const clearHistory = () => {
    if (!window.confirm("Clear all saved quotes?")) return;
    persistHistory([]);
    showToast("History cleared");
  };

  const newQuote = () => {
    setQuote((q) => ({
      ...q,
      referenceNumber: q.referenceNumber, // keep what is on screen
      date: new Date().toISOString().slice(0, 10),
      validTill: "",
      sponsor: "",
      address: "",
      phone: "",
      email: "",
      contactInformation: "",
      country: "Canada",
      province: "QC",
      discountPercent: 0,
    }));
    setLines([emptyLine()]);
    setMode("edit");
    setIsDirty(false);
    showToast("New quote created");
  };

  // ✅ Export JSON
  const exportJSON = () => {
    const payload = {
      schema: "hibalogique_quotes_backup_v1",
      exportedAt: new Date().toISOString(),
      history,
      last: {
        quote,
        lines,
        savedAt: new Date().toISOString(),
      },
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `hibalogique-quotes-backup-${new Date()
      .toISOString()
      .slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    showToast("Exported JSON ✅");
  };

  // ✅ Import JSON
  const onImportClick = () => importRef.current?.click();

  const importJSONFile = async (file) => {
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      const importedHistory = Array.isArray(data?.history) ? data.history : null;

      if (!importedHistory) {
        showToast("Invalid file: missing history[]");
        return;
      }

      const normalized = importedHistory.map((h) => ({
        ...h,
        id: h?.id ?? makeId(),
        savedAt: h?.savedAt ?? new Date().toISOString(),
        quote: h?.quote ?? {},
        lines: normalizeLines(h?.lines),
      }));

      persistHistory(normalized);
      showToast("Imported history ✅");
    } catch {
      showToast("Import failed: invalid JSON.");
    }
  };

  const onPrint = () => window.print();

  const formatDateTime = (iso) => {
    if (!iso) return "—";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString("en-CA");
  };

  // ✅ Search + filter derived history list
  const filteredHistory = useMemo(() => {
    const q = String(historySearch || "").trim().toLowerCase();

    const from = filterFrom ? new Date(filterFrom + "T00:00:00") : null;
    const to = filterTo ? new Date(filterTo + "T23:59:59") : null;

    return history.filter((h) => {
      const ref = String(h.quote?.referenceNumber ?? "").toLowerCase();
      const sponsor = String(h.quote?.sponsor ?? "").toLowerCase();

      const matchQuery = !q || ref.includes(q) || sponsor.includes(q);

      const d = h.quote?.date ? new Date(h.quote.date + "T12:00:00") : null;

      const matchFrom = !from || (d && d >= from);
      const matchTo = !to || (d && d <= to);

      return matchQuery && matchFrom && matchTo;
    });
  }, [history, historySearch, filterFrom, filterTo]);

  // ✅ Validation in edit mode
  const sponsorEmpty = mode === "edit" && !String(quote.sponsor ?? "").trim();

  const textOrDash = (v) => (String(v ?? "").trim() ? v : "—");

  return (
    <div className="page">
      {toast ? <div className="toast">{toast}</div> : null}

      <header className="topbar">
        <div className="brand">
          <img src={logo} alt="Laboratoire Hibalogique" className="logo" />
          <div>
            <h1>Quotation</h1>
            <p className="muted">LH1 — Internal Quotation Tool</p>
          </div>
        </div>

        <div className="topActions">
          <div
            className={`statusTag ${
              mode === "preview" ? "tagPreview" : "tagDraft"
            }`}
          >
            {mode === "preview" ? "Client-ready Preview" : "Internal Draft"}
            {mode === "edit" && isDirty ? <span className="dot">●</span> : null}
          </div>

          <button className="iconBtn" type="button" onClick={newQuote}>
            New
          </button>
          <button className="iconBtn" type="button" onClick={loadQuote}>
            Load
          </button>
          <button className="btn" type="button" onClick={saveQuote}>
            Save
          </button>

          {mode === "edit" ? (
            <button
              className="btn"
              type="button"
              onClick={() => setMode("preview")}
            >
              Preview
            </button>
          ) : (
            <>
              <button
                className="iconBtn"
                type="button"
                onClick={() => setMode("edit")}
              >
                Back to edit
              </button>
              <button className="btn" type="button" onClick={onPrint}>
                Print / Save PDF
              </button>
            </>
          )}

          <div className="badge">
            <div className="badgeLabel">Tax Rate</div>
            <div className="badgeValue">{(taxRate * 100).toFixed(3)}%</div>
          </div>
        </div>
      </header>

      {/* ✅ Quote History (internal) */}
      <section className="card noPrint">
        <div className="rowBetween">
          <div className="cardTitle">Saved Quotes (Internal)</div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              className="iconBtn"
              type="button"
              onClick={() => setShowHistory((v) => !v)}
            >
              {showHistory ? "Hide" : "Show"}
            </button>

            <button className="iconBtn" type="button" onClick={exportJSON}>
              Export JSON
            </button>

            <button className="iconBtn" type="button" onClick={onImportClick}>
              Import JSON
            </button>

            <input
              ref={importRef}
              type="file"
              accept="application/json"
              style={{ display: "none" }}
              onChange={(e) => importJSONFile(e.target.files?.[0])}
            />

            <button
              className="iconBtn"
              type="button"
              onClick={clearHistory}
              title="Delete all saved history"
            >
              Clear all
            </button>
          </div>
        </div>

        {showHistory ? (
          <>
            {/* ✅ Search + date filters */}
            <div className="historyControls">
              <div className="historySearch">
                <label className="field">
                  <span>Search (Sponsor / Reference)</span>
                  <input
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    placeholder="Type sponsor or reference..."
                  />
                </label>
              </div>

              <div className="historyDates">
                <label className="field">
                  <span>From</span>
                  <input
                    type="date"
                    value={filterFrom}
                    onChange={(e) =>
                      setFilterFrom(safeISODate(e.target.value))
                    }
                  />
                </label>
                <label className="field">
                  <span>To</span>
                  <input
                    type="date"
                    value={filterTo}
                    onChange={(e) => setFilterTo(safeISODate(e.target.value))}
                  />
                </label>

                <button
                  className="iconBtn"
                  type="button"
                  onClick={() => {
                    setHistorySearch("");
                    setFilterFrom("");
                    setFilterTo("");
                  }}
                  title="Reset filters"
                >
                  Reset
                </button>
              </div>
            </div>

            {filteredHistory.length ? (
              <div className="tableWrap">
                <table className="table" style={{ minWidth: 980 }}>
                  <thead>
                    <tr>
                      <th>Reference</th>
                      <th>Date</th>
                      <th>Sponsor</th>
                      <th className="num">Total</th>
                      <th>Saved</th>
                      <th className="actions"> </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredHistory.map((h) => (
                      <tr key={h.id}>
                        <td>{textOrDash(h.quote?.referenceNumber)}</td>
                        <td>{textOrDash(h.quote?.date)}</td>
                        <td>{textOrDash(h.quote?.sponsor)}</td>
                        <td className="num strong">{formatMoney(h.total)}</td>
                        <td>{formatDateTime(h.savedAt)}</td>
                        <td className="actions">
                          <button
                            className="iconBtn"
                            type="button"
                            onClick={() => openFromHistory(h)}
                            style={{ marginRight: 8 }}
                          >
                            Open
                          </button>

                          <button
                            className="iconBtn"
                            type="button"
                            onClick={() => duplicateFromHistory(h)}
                            style={{ marginRight: 8 }}
                          >
                            Duplicate
                          </button>

                          <button
                            className="iconBtn"
                            type="button"
                            onClick={() => renameReferenceInHistory(h.id)}
                            style={{ marginRight: 8 }}
                          >
                            Rename
                          </button>

                          <button
                            className="iconBtn"
                            type="button"
                            onClick={() => deleteFromHistory(h.id)}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="muted" style={{ margin: 0 }}>
                No matching quotes. Try different search or dates.
              </p>
            )}
          </>
        ) : (
          <p className="muted" style={{ margin: 0 }}>
            Click <b>Show</b> to view saved quotes.
          </p>
        )}
      </section>

      {/* ✅ PREVIEW MODE */}
      {mode === "preview" ? (
        <section className="card printArea">
          {/* ✅ Print-only header */}
          <div className="printHeader">
            <div className="printHeaderRow">
              <div>
                <div className="printHeaderTitle">Quotation</div>
                <div className="muted">
                  {textOrDash(quote.referenceNumber)} — {textOrDash(quote.date)}
                </div>
              </div>
              <div className="printHeaderRight">
                <div className="muted">Sponsor</div>
                <div style={{ fontWeight: 800 }}>{textOrDash(quote.sponsor)}</div>
              </div>
            </div>
          </div>

          <div className="cardTitle">Quotation Summary</div>

          <div className="grid3">
            <div className="previewField">
              <div className="previewLabel">Reference Number</div>
              <div className="previewValue">
                {textOrDash(quote.referenceNumber)}
              </div>
            </div>
            <div className="previewField">
              <div className="previewLabel">Date</div>
              <div className="previewValue">{textOrDash(quote.date)}</div>
            </div>
            <div className="previewField">
              <div className="previewLabel">Quotation valid till</div>
              <div className="previewValue">{textOrDash(quote.validTill)}</div>
            </div>
          </div>

          <div className="grid2" style={{ marginTop: 10 }}>
            <div className="previewField">
              <div className="previewLabel">Sponsor</div>
              <div className="previewValue">{textOrDash(quote.sponsor)}</div>
            </div>
            <div className="previewField">
              <div className="previewLabel">Sponsor’s Address</div>
              <div className="previewValue">{textOrDash(quote.address)}</div>
            </div>
          </div>

          <div className="grid3" style={{ marginTop: 10 }}>
            <div className="previewField">
              <div className="previewLabel">Phone Number</div>
              <div className="previewValue">{textOrDash(quote.phone)}</div>
            </div>
            <div className="previewField">
              <div className="previewLabel">Email</div>
              <div className="previewValue">{textOrDash(quote.email)}</div>
            </div>
            <div className="previewField">
              <div className="previewLabel">Contact Information</div>
              <div className="previewValue">
                {textOrDash(quote.contactInformation)}
              </div>
            </div>
          </div>

          <div className="tableWrap" style={{ marginTop: 14 }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Type of Test</th>
                  <th>Description</th>
                  <th>Panel</th>
                  <th className="num">Time (Days)</th>
                  <th className="num">Unit Price (CAD)</th>
                  <th className="num">Number of Samples</th>
                  <th className="num">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((l, idx) => (
                  <tr key={l.id}>
                    <td>{textOrDash(l.typeOfTest)}</td>
                    <td>{textOrDash(l.description)}</td>
                    <td>{textOrDash(l.panel)}</td>
                    <td className="num">{textOrDash(l.timeDays)}</td>
                    <td className="num">{formatMoney(l.pricePerUnit)}</td>
                    <td className="num">{textOrDash(l.numSamples)}</td>
                    <td className="num strong">
                      {formatMoney(computed.lineSubtotals[idx])}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="totals" style={{ marginTop: 14 }}>
            <div className="previewField">
              <div className="previewLabel">Discount (%)</div>
              <div className="previewValue">
                {textOrDash(quote.discountPercent)}
              </div>
            </div>

            <div className="totalsBox">
              <div className="totalRow">
                <span>Subtotal</span>
                <span>{formatMoney(computed.subtotal)}</span>
              </div>
              <div className="totalRow">
                <span>Discount</span>
                <span>- {formatMoney(computed.discountAmount)}</span>
              </div>
              <div className="totalRow">
                <span>Subtotal after discount</span>
                <span>{formatMoney(computed.afterDiscount)}</span>
              </div>
              <div className="totalRow">
                <span>Taxes ({(taxRate * 100).toFixed(3)}%)</span>
                <span>{formatMoney(computed.taxes)}</span>
              </div>
              <div className="totalRow grand">
                <span>Total</span>
                <span>{formatMoney(computed.total)}</span>
              </div>
            </div>
          </div>

          {/* OFFICIAL TEXT */}
          <div className="previewNotes pageBreakBefore" style={{ marginTop: 16 }}>
            <div className="previewSectionTitle">Study Tentative Schedule</div>
            <p className="muted" style={{ marginTop: 6 }}>
              (To be confirmed upon sample registration and scheduling agreement.)
            </p>

            <div className="previewSectionTitle" style={{ marginTop: 14 }}>
              Shipping Instructions
            </div>
            <p style={{ marginTop: 8, fontWeight: 700 }}>
              For Shipments outside Canada:
            </p>
            <p className="muted" style={{ marginTop: 6 }}>
              For customs clearance services, kindly provide the commercial invoice
              with the following:
            </p>
            <ul className="termsList">
              <li>a commercial value of 1$</li>
              <li>the country of manufacture</li>
            </ul>

            <div className="previewSectionTitle" style={{ marginTop: 14 }}>
              Sample Registration Process
            </div>
            <p className="muted" style={{ marginTop: 6 }}>
              Test scheduling for GCP studies must be agreed upon before
              commencement and documented in the study program. The client should
              provide an estimated sample shipping date for study planning.
            </p>
            <p className="muted" style={{ marginTop: 10 }}>
              A Sample Submission Form (SSF) must be completed, signed, and
              submitted electronically to preregister the sample using the
              following form:
            </p>
            <a
              className="termsLink"
              href="https://forms.gle/wy2uSgRojM6XdvJh6"
              target="_blank"
              rel="noreferrer"
            >
              https://forms.gle/wy2uSgRojM6XdvJh6
            </a>
            <p className="muted" style={{ marginTop: 10 }}>
              Failure to submit the SSF may delay study commencement. Upon
              completion of the study, the customer will receive the official
              test report electronically along with related raw data, if
              requested and agreed upon.
            </p>

            <div className="previewSectionTitle" style={{ marginTop: 14 }}>
              Payment Terms &amp; Conditions
            </div>
            <p className="muted" style={{ marginTop: 6 }}>
              The initial invoice must be paid immediately at a rate of 50%. The
              remaining balance indicated on the second invoice must be settled
              before results are communicated or as per the terms agreed upon
              with the account coordinator.
            </p>
            <p className="muted" style={{ marginTop: 8 }}>
              Any delay in the advance payment will consequently delay service
              provision. Lab. Hibalogique Inc. does not impose a minimum order
              requirement.
            </p>
            <p className="termsEmphasis" style={{ marginTop: 10 }}>
              Delays in settling the balance will result in delays in the
              delivery of the results report.
            </p>
            <p className="muted" style={{ marginTop: 8 }}>
              All correspondence charges are the responsibility of the payer.
            </p>

            <div className="previewSectionTitle" style={{ marginTop: 14 }}>
              Purchase Order
            </div>
            <p className="muted" style={{ marginTop: 6 }}>
              Should a purchase order be requisite from the customer prior to
              invoice issuance, Lab. Hibalogique Inc. must receive the purchase
              order within 10 Working Business Days. Failure to do so will
              result in the issuance of the invoice pending receipt of the
              purchase order.
            </p>

            <div className="previewSectionTitle" style={{ marginTop: 14 }}>
              Rush Fees
            </div>
            <p className="muted" style={{ marginTop: 6 }}>
              In instances where expedited delivery of results or execution of a
              study is necessary, an additional fee ranging between 30% will be
              applied.
            </p>

            <div className="previewSectionTitle" style={{ marginTop: 14 }}>
              Cancellation Fees
            </div>
            <p className="muted" style={{ marginTop: 6 }}>
              These apply when a test has been approved and the customer opts to
              cancel the order after more than 5 working days from test
              approval. Fees are based on the total test cost and vary according
              to the time of cancellation in relation to the test start date.
            </p>

            <div className="previewSectionTitle" style={{ marginTop: 14 }}>
              Additional Notes
            </div>
            <ul className="termsList">
              <li>The quoted price excludes charges for further repeats of the test.</li>
              <li>
                The quotation provides a concise overview of services offered by
                Lab. Hibalogique Inc., including a brief description and
                identification code for each test/analysis.
              </li>
              <li>Lead time changes may occur during holidays; clients will be notified accordingly.</li>
              <li>Documentation will be issued in English; additional costs apply for reports in other languages.</li>
              <li>Additional copies of the final report or analytical certificates incur extra charges.</li>
              <li>Correction of reports incurs an additional $80 fee.</li>
              <li>
                Samples and residual materials are stored for 3 months post-test
                completion; further storage or return requests are subject to
                additional charges.
              </li>
              <li>
                In case of non-conformity, Lab. Hibalogique Inc. will conduct a
                formal investigation and notify the client accordingly. Any
                adjustments will be assessed after completion of the original
                terms.
              </li>
              <li>
                Customer confidentiality is maintained; test reports will not be
                disclosed to third parties without written consent.
              </li>
              <li>
                Clients must sign and return the contract, along with providing
                a copy to Lab. Hibalogique Inc. for record-keeping.
              </li>
              <li>
                Late fees will be charged in case of delays in payments. The
                charges are 10% in case of one month of delay, and 20% in case
                of two months in delays.
              </li>
            </ul>

            <div className="previewSectionTitle" style={{ marginTop: 14 }}>
              Acceptance
            </div>
            <p style={{ marginTop: 8 }}>
              I, ______________________________, accept the above offer.
            </p>
            <p style={{ marginTop: 6 }}>Signature: _________________________</p>

            <div className="companyBlock">
              <div style={{ fontWeight: 800, marginTop: 14 }}>
                LABORATOIRE HIBALOGIQUE INC.
              </div>
              <div className="muted" style={{ marginTop: 6 }}>
                Montreal, Quebec, Canada
              </div>
              <div className="muted">Phone: +1 (514) 431-9776</div>
              <div className="muted">Email: info@labhibalogique.com</div>
              <div className="muted">Website: www.labhibalogique.org</div>
            </div>
          </div>
        </section>
      ) : (
        /* ✅ EDIT MODE */
        <>
          <section className="card">
            <div className="cardTitle">Header & Client Info</div>

            <div className="grid3">
              <label className="field">
                <span>Reference Number</span>
                <input
                  value={quote.referenceNumber}
                  onChange={(e) =>
                    updateQuote("referenceNumber", e.target.value)
                  }
                  placeholder="Quote 0001-26"
                />
                <small className="hint">
                  Note: when you press <b>Save</b>, the app will auto-generate a
                  new reference.
                </small>
              </label>

              <label className="field">
                <span>Date</span>
                <input
                  type="date"
                  value={quote.date}
                  onChange={(e) => updateQuote("date", e.target.value)}
                />
              </label>

              <label className="field">
                <span>Quotation valid till</span>
                <input
                  type="date"
                  value={quote.validTill}
                  onChange={(e) => updateQuote("validTill", e.target.value)}
                />
              </label>
            </div>

            <div className="grid2">
              <label className={`field ${sponsorEmpty ? "fieldError" : ""}`}>
                <span>Sponsor *</span>
                <input
                  value={quote.sponsor}
                  onChange={(e) => updateQuote("sponsor", e.target.value)}
                  placeholder="Sponsor name"
                />
                {sponsorEmpty ? (
                  <small className="errorText">Sponsor is required.</small>
                ) : null}
              </label>

              <label className="field">
                <span>Address</span>
                <input
                  value={quote.address}
                  onChange={(e) => updateQuote("address", e.target.value)}
                  placeholder="Full address"
                />
              </label>
            </div>

            <div className="grid3">
              <label className="field">
                <span>Phone</span>
                <input
                  value={quote.phone}
                  onChange={(e) => updateQuote("phone", e.target.value)}
                  placeholder="+1 (___) ___-____"
                />
              </label>

              <label className="field">
                <span>Email</span>
                <input
                  value={quote.email}
                  onChange={(e) => updateQuote("email", e.target.value)}
                  placeholder="name@email.com"
                />
              </label>

              <label className="field">
                <span>Contact Information</span>
                <input
                  value={quote.contactInformation}
                  onChange={(e) =>
                    updateQuote("contactInformation", e.target.value)
                  }
                  placeholder="Contact person / notes"
                />
              </label>
            </div>

            <div className="grid3">
              <label className="field">
                <span>Country</span>
                <select
                  value={quote.country}
                  onChange={(e) => updateQuote("country", e.target.value)}
                >
                  <option value="Canada">Canada</option>
                  <option value="Other">Other</option>
                </select>
                <small className="hint">If “Other”, taxes will be 0%.</small>
              </label>

              <label className="field">
                <span>Province</span>
                <select
                  value={quote.province}
                  onChange={(e) => updateQuote("province", e.target.value)}
                  disabled={quote.country !== "Canada"}
                  title={
                    quote.country !== "Canada"
                      ? "Province disabled unless Country is Canada"
                      : ""
                  }
                >
                  {PROVINCES.map((p) => (
                    <option key={p.code} value={p.code}>
                      {p.code} — {p.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>Taxes (auto)</span>
                <input value={`${(taxRate * 100).toFixed(3)}%`} readOnly />
              </label>
            </div>
          </section>

          <section className="card">
            <div className="rowBetween">
              <div className="cardTitle">Line Items</div>
              <button className="btn" onClick={addLine} type="button">
                + Add line
              </button>
            </div>

            <div className="tableWrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Type of Test</th>
                    <th>Description</th>
                    <th>Panel</th>
                    <th className="num">Time (Days)</th>
                    <th className="num">Unit Price (CAD)</th>
                    <th className="num">Number of Samples</th>
                    <th className="num">Subtotal</th>
                    <th className="actions"> </th>
                  </tr>
                </thead>

                <tbody>
                  {lines.map((l, idx) => (
                    <tr key={l.id}>
                      <td>
                        <input
                          value={l.typeOfTest}
                          onChange={(e) =>
                            updateLine(l.id, "typeOfTest", e.target.value)
                          }
                          placeholder="e.g. Chemistry"
                        />
                      </td>
                      <td>
                        <input
                          value={l.description}
                          onChange={(e) =>
                            updateLine(l.id, "description", e.target.value)
                          }
                          placeholder="e.g. Analysis details"
                        />
                      </td>
                      <td>
                        <input
                          value={l.panel}
                          onChange={(e) =>
                            updateLine(l.id, "panel", e.target.value)
                          }
                          placeholder="e.g. Standard"
                        />
                      </td>
                      <td className="num">
                        <input
                          value={l.timeDays}
                          onChange={(e) =>
                            updateLine(l.id, "timeDays", e.target.value)
                          }
                          type="number"
                          min="0"
                          step="1"
                          inputMode="numeric"
                          placeholder="0"
                        />
                      </td>
                      <td className="num">
                        <input
                          value={l.pricePerUnit}
                          onChange={(e) =>
                            updateLine(l.id, "pricePerUnit", e.target.value)
                          }
                          type="number"
                          min="0"
                          step="0.01"
                          inputMode="decimal"
                          placeholder="0.00"
                        />
                      </td>
                      <td className="num">
                        <input
                          value={l.numSamples}
                          onChange={(e) =>
                            updateLine(l.id, "numSamples", e.target.value)
                          }
                          type="number"
                          min="0"
                          step="1"
                          inputMode="numeric"
                          placeholder="0"
                        />
                      </td>
                      <td className="num strong">
                        {formatMoney(computed.lineSubtotals[idx])}
                      </td>
                      <td className="actions">
                        <button
                          className="iconBtn"
                          type="button"
                          onClick={() => removeLine(l.id)}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="totals">
              <label className="field">
                <span>Discount (%)</span>
                <input
                  value={quote.discountPercent}
                  onChange={(e) =>
                    updateQuote("discountPercent", e.target.value)
                  }
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  inputMode="decimal"
                  placeholder="0"
                />
              </label>

              <div className="totalsBox">
                <div className="totalRow">
                  <span>Subtotal</span>
                  <span>{formatMoney(computed.subtotal)}</span>
                </div>
                <div className="totalRow">
                  <span>Discount</span>
                  <span>- {formatMoney(computed.discountAmount)}</span>
                </div>
                <div className="totalRow">
                  <span>Subtotal after discount</span>
                  <span>{formatMoney(computed.afterDiscount)}</span>
                </div>
                <div className="totalRow">
                  <span>Taxes ({(taxRate * 100).toFixed(3)}%)</span>
                  <span>{formatMoney(computed.taxes)}</span>
                </div>
                <div className="totalRow grand">
                  <span>Total</span>
                  <span>{formatMoney(computed.total)}</span>
                </div>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
