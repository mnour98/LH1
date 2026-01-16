// src/App.jsx
import { useMemo, useRef, useState } from "react";
import "./App.css";

const TAX_RATES = {
  QC: 0.14975,
  ON: 0.13,
};

function money(n) {
  const x = Number(n || 0);
  return x.toLocaleString(undefined, { style: "currency", currency: "CAD" });
}

export default function App() {
  const [country, setCountry] = useState("Canada");
  const [province, setProvince] = useState("QC");

  const [rows, setRows] = useState([
    { id: crypto.randomUUID(), desc: "", qty: 1, unit: 0 },
  ]);

  const step3Ref = useRef(null);

  const rate = TAX_RATES[province] ?? 0;

  const computed = useMemo(() => {
    const safeRows = rows.map((r) => {
      const qty = Math.max(0, Number(r.qty) || 0);
      const unit = Math.max(0, Number(r.unit) || 0);
      const sub = qty * unit;
      const lineTotal = sub * (1 + rate);
      return { ...r, qty, unit, sub, lineTotal };
    });

    const subtotal = safeRows.reduce((sum, r) => sum + r.sub, 0);
    const tax = subtotal * rate;
    const total = subtotal + tax;

    return { safeRows, subtotal, tax, total };
  }, [rows, rate]);

  function addRow() {
    setRows((prev) => [
      ...prev,
      { id: crypto.randomUUID(), desc: "", qty: 1, unit: 0 },
    ]);
  }

  function removeRow(id) {
    setRows((prev) => prev.filter((r) => r.id !== id));
  }

  function resetAll() {
    setCountry("Canada");
    setProvince("QC");
    setRows([{ id: crypto.randomUUID(), desc: "", qty: 1, unit: 0 }]);
  }

  function scrollToStep3() {
    step3Ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="page">
      {/* TOP BAR */}
      <header className="topbar">
        <div className="brand" title="LH1">
          <div className="brandMark" aria-hidden="true" />
          <div>LH1</div>
        </div>

        <nav className="nav">
          <button
            className="navLink"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          >
            Home
          </button>
          <button className="navLink" onClick={scrollToStep3}>
            Quotation
          </button>
          <button
            className="navCta"
            onClick={() => alert("Contact: add your email/phone here")}
          >
            Contact
          </button>
        </nav>
      </header>

      {/* HERO */}
      <section className="heroWrap">
        <div className="hero">
          <div>
            <p className="heroKicker">Unlock clarity with scientific precision</p>
            <h1>Quotation Prototype</h1>
            <p className="heroText">
              Generate accurate quotations with automatic calculations, tailored to
              your province and tax rules. Add multiple items and export totals in seconds.
            </p>

            <div className="heroActions">
              <button className="btnPrimary" onClick={scrollToStep3}>
                Create a quotation
              </button>
              <button className="btnGhost" onClick={resetAll}>
                Reset all
              </button>
            </div>
          </div>

          {/* simple decorative card (keeps it lightweight) */}
          <div className="heroVisual" aria-hidden="true" />
        </div>
      </section>

      {/* MAIN CARD */}
      <div className="card">
        {/* STEP 1 */}
        <h2>Step 1</h2>
        <label>Choose country:</label>
        <select value={country} onChange={(e) => setCountry(e.target.value)}>
          <option>Canada</option>
        </select>
        <p className="mutedLine">
          <b>Selected country:</b> {country}
        </p>

        <hr />

        {/* STEP 2 */}
        <h2>Step 2</h2>
        <label>Choose province:</label>
        <select value={province} onChange={(e) => setProvince(e.target.value)}>
          <option value="QC">Quebec</option>
          <option value="ON">Ontario</option>
        </select>
        <p className="mutedLine">
          <b>Selected province:</b> {province}
        </p>

        <hr />

        {/* STEP 3 */}
        <div ref={step3Ref} />
        <h2>Step 3</h2>
        <p className="smallNote">
          Quotation table (auto calculations). Last column ={" "}
          <b>Line total (incl. tax)</b>.
        </p>

        <div className="table">
          <div className="thead">
            <div>Description</div>
            <div>Qty</div>
            <div>Unit price</div>
            <div>Subtotal</div>
            <div>Line total</div>
            <div />
          </div>

          {computed.safeRows.map((r) => (
            <div className="trow" key={r.id}>
              <input
                placeholder="Service / Product"
                value={r.desc}
                onChange={(e) =>
                  setRows((prev) =>
                    prev.map((x) =>
                      x.id === r.id ? { ...x, desc: e.target.value } : x
                    )
                  )
                }
              />

              <input
                type="number"
                min="0"
                value={r.qty}
                onChange={(e) =>
                  setRows((prev) =>
                    prev.map((x) =>
                      x.id === r.id ? { ...x, qty: e.target.value } : x
                    )
                  )
                }
              />

              <input
                type="number"
                min="0"
                step="0.01"
                value={r.unit}
                onChange={(e) =>
                  setRows((prev) =>
                    prev.map((x) =>
                      x.id === r.id ? { ...x, unit: e.target.value } : x
                    )
                  )
                }
              />

              <div className="cellMoney">{money(r.sub)}</div>

              <div className="cellTotal">
                <div className="big">{money(r.lineTotal)}</div>
                <div className="tiny">
                  incl. tax ({(rate * 100).toFixed(3)}%)
                </div>
              </div>

              <button
                className="iconBtn"
                title="Remove row"
                onClick={() => removeRow(r.id)}
                disabled={rows.length === 1}
              >
                ×
              </button>
            </div>
          ))}

          <div className="summary">
            <div />
            <div className="sumGrid">
              <div>Subtotal</div>
              <div className="right">{money(computed.subtotal)}</div>

              <div>Tax ({(rate * 100).toFixed(3)}%)</div>
              <div className="right">{money(computed.tax)}</div>

              <div className="sumTotalLabel">Total</div>
              <div className="right sumTotalValue">{money(computed.total)}</div>
            </div>
          </div>
        </div>

        <div className="actions">
          <button className="btnGhost" onClick={addRow}>
            + Add row
          </button>
          <button className="btnGhost" onClick={resetAll}>
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}
