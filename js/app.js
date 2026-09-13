(() => {
  "use strict";

  const FA_DIGITS = ["۰","۱","۲","۳","۴","۵","۶","۷","۸","۹"];
  const toFa = (str) => String(str).replace(/[0-9]/g, (d) => FA_DIGITS[d]);
  const toEn = (str) => String(str).replace(/[۰-۹]/g, (d) => String(FA_DIGITS.indexOf(d)));

  const displayEl = document.getElementById("display");
  const historyEl = document.getElementById("history");
  const padEl = document.getElementById("pad");
  const themeBtn = document.getElementById("themeToggle");
  const statusDot = document.getElementById("statusDot");
  const statusText = document.getElementById("statusText");

  const OP_MAP = { "÷": "/", "×": "*", "−": "-", "+": "+" };

  const state = {
    current: "0",
    previous: null,
    operator: null,
    justEvaluated: false,
  };

  function formatNumber(numStr) {
    if (numStr === "خطا") return numStr;
    const [intPart, decPart] = numStr.split(".");
    const negative = intPart.startsWith("-");
    const digits = negative ? intPart.slice(1) : intPart;
    const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    let out = (negative ? "-" : "") + grouped;
    if (decPart !== undefined) out += "." + decPart;
    return out;
  }

  function render() {
    displayEl.textContent = toFa(formatNumber(state.current));
    if (state.operator && state.previous !== null) {
      historyEl.textContent = toFa(formatNumber(state.previous)) + " " + state.operator;
    } else {
      historyEl.textContent = "";
    }
  }

  function inputDigit(d) {
    if (state.justEvaluated) {
      state.current = "0";
      state.previous = null;
      state.operator = null;
      state.justEvaluated = false;
    }
    if (state.current.replace("-", "").replace(".", "").length >= 15) return;
    state.current = state.current === "0" ? d : state.current + d;
  }

  function inputDecimal() {
    if (state.justEvaluated) {
      state.current = "0";
      state.previous = null;
      state.operator = null;
      state.justEvaluated = false;
    }
    if (!state.current.includes(".")) state.current += ".";
  }

  function clearAll() {
    state.current = "0";
    state.previous = null;
    state.operator = null;
    state.justEvaluated = false;
  }

  function negate() {
    if (state.current === "0") return;
    state.current = state.current.startsWith("-")
      ? state.current.slice(1)
      : "-" + state.current;
  }

  function percent() {
    const val = parseFloat(state.current);
    if (Number.isNaN(val)) return;
    state.current = String(val / 100);
  }

  function compute(a, op, b) {
    switch (op) {
      case "+": return a + b;
      case "-": return a - b;
      case "*": return a * b;
      case "/": return b === 0 ? NaN : a / b;
      default: return b;
    }
  }

  function chooseOperator(sym) {
    if (state.operator && !state.justEvaluated && state.previous !== null) {
      equals();
    }
    state.previous = state.current;
    state.operator = sym;
    state.current = "0";
    state.justEvaluated = false;
  }

  function equals() {
    if (state.operator === null || state.previous === null) return;
    const a = parseFloat(state.previous);
    const b = parseFloat(state.current);
    const result = compute(a, OP_MAP[state.operator], b);
    state.current = Number.isNaN(result) ? "خطا" : trimResult(result);
    state.previous = null;
    state.operator = null;
    state.justEvaluated = true;
  }

  function trimResult(n) {
    if (!Number.isFinite(n)) return "خطا";
    const rounded = Math.round(n * 1e9) / 1e9;
    return String(rounded);
  }

  padEl.addEventListener("click", (e) => {
    const btn = e.target.closest(".key");
    if (!btn) return;
    if (btn.dataset.num !== undefined) {
      inputDigit(toEn(btn.dataset.num));
    } else if (btn.dataset.op) {
      chooseOperator(btn.dataset.op);
    } else if (btn.dataset.action === "decimal") {
      inputDecimal();
    } else if (btn.dataset.action === "clear") {
      clearAll();
    } else if (btn.dataset.action === "negate") {
      negate();
    } else if (btn.dataset.action === "percent") {
      percent();
    } else if (btn.dataset.action === "equals") {
      equals();
    }
    render();
  });

  window.addEventListener("keydown", (e) => {
    const k = e.key;
    if (/^[0-9]$/.test(k)) { inputDigit(k); render(); return; }
    if (k === ".") { inputDecimal(); render(); return; }
    if (k === "+" ) { chooseOperator("+"); render(); return; }
    if (k === "-" ) { chooseOperator("−"); render(); return; }
    if (k === "*" ) { chooseOperator("×"); render(); return; }
    if (k === "/" ) { e.preventDefault(); chooseOperator("÷"); render(); return; }
    if (k === "Enter" || k === "=") { equals(); render(); return; }
    if (k === "Backspace") {
      state.current = state.current.length > 1 ? state.current.slice(0, -1) : "0";
      render();
      return;
    }
    if (k === "Escape") { clearAll(); render(); return; }
    if (k === "%") { percent(); render(); return; }
  });

  // Theme dial: cycles the panel's accent hue and remembers the choice.
  const HUES = ["ember", "verdigris", "signal"];
  let hueIndex = 0;
  try {
    const saved = localStorage.getItem("panel9-hue");
    if (saved && HUES.includes(saved)) hueIndex = HUES.indexOf(saved);
  } catch (_) { /* storage unavailable */ }

  function applyHue() {
    document.documentElement.setAttribute("data-hue", HUES[hueIndex]);
  }
  applyHue();

  themeBtn.addEventListener("click", () => {
    hueIndex = (hueIndex + 1) % HUES.length;
    applyHue();
    try { localStorage.setItem("panel9-hue", HUES[hueIndex]); } catch (_) { /* ignore */ }
  });

  // Online/offline status readout.
  function updateStatus() {
    const online = navigator.onLine;
    statusDot.classList.toggle("offline", !online);
    statusText.textContent = online ? "آماده به کار" : "حالت آفلاین — محاسبه همچنان کار می‌کند";
  }
  window.addEventListener("online", updateStatus);
  window.addEventListener("offline", updateStatus);
  updateStatus();

  render();

  // Register the service worker for offline/installable behavior.
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("sw.js").catch(() => {
        /* offline support simply won't be available */
      });
    });
  }
})();
