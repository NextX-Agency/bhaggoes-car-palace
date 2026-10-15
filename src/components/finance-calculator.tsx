"use client";

import { useState } from "react";
import { calculateFinance, formatAmount } from "@/lib/domain";

export function FinanceCalculator({ price = 0, currency = "" }: { price?: number; currency?: string }) {
  const [amount, setAmount] = useState(price);
  const [down, setDown] = useState(Math.round(price * 0.1));
  const [rate, setRate] = useState(10);
  const [months, setMonths] = useState(60);
  const result = calculateFinance(amount, down, rate, months);
  return <section className="calculator-panel">
    <div className="calculator-intro"><h2>Estimate your monthly payment</h2><p>Estimates only. Rates and terms must be confirmed with a provider.</p></div>
    <div className="calculator-controls">
      <label>Car price <span className="input-with-prefix"><span>{currency || "Amount"}</span><input type="number" min="0" value={amount || ""} onChange={(event) => setAmount(Number(event.target.value))} /></span></label>
      <label>Down payment <span className="input-with-prefix"><span>{currency || "Amount"}</span><input type="number" min="0" max={amount} value={down || ""} onChange={(event) => setDown(Number(event.target.value))} /></span></label>
      <label>Annual interest <span className="input-with-suffix"><input type="number" min="0" step="0.1" value={rate} onChange={(event) => setRate(Number(event.target.value))} /><span>%</span></span></label>
      <label>Loan duration<select value={months} onChange={(event) => setMonths(Number(event.target.value))}><option value="24">24 months</option><option value="36">36 months</option><option value="48">48 months</option><option value="60">60 months</option><option value="72">72 months</option></select></label>
    </div>
    <div className="calculator-result"><div><span>Estimated monthly</span><strong>{result ? formatAmount(result.monthlyPayment, currency) : "—"}</strong></div><div><span>Estimated total interest</span><strong>{result ? formatAmount(result.totalInterest, currency) : "—"}</strong></div><div><span>Estimated total repayment</span><strong>{result ? formatAmount(result.totalRepayment, currency) : "—"}</strong></div></div>
  </section>;
}
