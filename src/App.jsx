import { useMemo, useState } from "react";
import "./App.css";
import logo from "./assets/laboratoire_hibalogique_inc_logo.jpg";

/**
 * Simple tax rates (you can adjust later if Hiba wants different logic)
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

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
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

  const taxRate = useMemo(() => {
    if (quote.country !== "Canada") return 0; // simple default: only auto-tax for Canada
    return TAX_RATES_BY_PROVINCE[quote.province] ?? 0;
  }, [quote.country, quote.province]);

  const computed = useMemo(() => {
    const lineSubtotals = lines.map((l) => {
      const price = toNumber(l.pricePerUnit);
      const samples = toNumber(l.numSamples);
      return price * samples;
    });

    const subtotal = lineSubtotals.reduce((a, b) => a + b, 0);

    const discountPct = Math.max(
      0,
      Math.min(100, toNumber(quote.discountPercent))
    );
    const discountAmount = subtotal * (discountPct / 100);
    const afterDiscount = Math.max(0, subtotal - discountAmount);

    const taxes = afterDiscount * taxRate;
    const total = afterDiscount + taxes;

    return {
      lineSubtotals,
      subtotal,
      discountAmount,
      afterDiscount,
      taxes,
      total,
    };
  }, [lines, quote.discountPercent, taxRate]);

  const updateQuote = (field, value) => {
    setQuote((q) => ({ ...q, [field]: value }));
  };

  const updateLine = (id, field, value) => {
    setLines((prev) =>
      prev.map((l) => (l.id === id ? { ...l, [field]: value } : l))
    );
  };

  const addLine = () => setLines((prev) => [...prev, emptyLine()]);

  const removeLine = (id) =>
    setLines((prev) =>
      prev.length === 1 ? prev : prev.filter((l) => l.id !== id)
    );

  return (
    <div className="page">
      <header className="topbar">
        <div className="brand">
          <img src={logo} alt="Laboratoire Hibalogique" className="logo" />
          <div>
            <h1>Quotation</h1>
            <p className="muted">LH1 — Quotation Prototype</p>
          </div>
        </div>

        <div className="badge">
          <div className="badgeLabel">Tax Rate</div>
          <div className="badgeValue">{(taxRate * 100).toFixed(3)}%</div>
        </div>
      </header>

      {/* HEADER / CLIENT INFO */}
      <section className="card">
        <div className="cardTitle">Header & Client Info</div>

        <div className="grid3">
          <label className="field">
            <span>Reference Number</span>
            <input
              value={quote.referenceNumber}
              onChange={(e) => updateQuote("referenceNumber", e.target.value)}
              placeholder="Quote 0001-26"
            />
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
          <label className="field">
            <span>Sponsor</span>
            <input
              value={quote.sponsor}
              onChange={(e) => updateQuote("sponsor", e.target.value)}
              placeholder="Sponsor name"
            />
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
              onChange={(e) => updateQuote("contactInformation", e.target.value)}
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
            <small className="hint">
              If “Other”, taxes will be 0% (you can change later).
            </small>
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

      {/* LINE ITEMS */}
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
                <th className="num">Price per unit (CAD)</th>
                <th className="num">Nr. of Samples</th>
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
                      onChange={(e) => updateLine(l.id, "panel", e.target.value)}
                      placeholder="e.g. Standard"
                    />
                  </td>
                  <td className="num">
                    <input
                      value={l.timeDays}
                      onChange={(e) =>
                        updateLine(l.id, "timeDays", e.target.value)
                      }
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
                      inputMode="decimal"
                      placeholder="0"
                    />
                  </td>
                  <td className="num">
                    <input
                      value={l.numSamples}
                      onChange={(e) =>
                        updateLine(l.id, "numSamples", e.target.value)
                      }
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

        {/* TOTALS */}
        <div className="totals">
          <label className="field">
            <span>Discount (%)</span>
            <input
              value={quote.discountPercent}
              onChange={(e) => updateQuote("discountPercent", e.target.value)}
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


    </div>
  );
}
