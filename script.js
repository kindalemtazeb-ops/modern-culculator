const displayEl = document.getElementById('display');
const exprEl = document.getElementById('expression');
const themeToggle = document.getElementById('themeToggle');
const historyToggle = document.getElementById('historyToggle');
const historyPanel = document.getElementById('historyPanel');
const historyList = document.getElementById('historyList');
const clearHistoryBtn = document.getElementById('clearHistory');
const exportBtn = document.getElementById('exportBtn');
const copyBtn = document.getElementById('copyBtn');
const angleModeBtn = document.getElementById('angleModeBtn');
const memBadge = document.getElementById('memBadge');

const STORAGE_KEY = 'procalc_suite_state_v1';

let currentValue = '0';
let expressionText = '';
let shouldReset = false;
let historyItems = [];
let angleMode = 'DEG';
let memoryValue = 0;

function saveState() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
            historyItems,
            angleMode,
            memoryValue,
            lightTheme: document.body.classList.contains('light-theme')
        }));
    } catch {}
}

function loadState() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return;
        const data = JSON.parse(raw);
        if (Array.isArray(data.historyItems)) historyItems = data.historyItems;
        if (data.angleMode === 'RAD' || data.angleMode === 'DEG') {
            angleMode = data.angleMode;
            angleModeBtn.textContent = angleMode;
        }
        if (typeof data.memoryValue === 'number') memoryValue = data.memoryValue;
        if (data.lightTheme) {
            document.body.classList.add('light-theme');
            themeToggle.textContent = '☀️';
        }
    } catch {}
}

function formatNumber(num) {
    if (typeof num !== 'number' || !isFinite(num)) {
        throw new Error('Math error');
    }
    return Number(num.toFixed(10)).toString();
}

function updateDisplay() {
    displayEl.innerText = currentValue;
    exprEl.innerText = expressionText;
}

function updateMemoryBadge() {
    memBadge.hidden = memoryValue === 0;
}

function addHistory(expr, result) {
    historyItems.unshift({ expr, result });
    if (historyItems.length > 30) historyItems.pop();
    renderHistory();
    saveState();
}

function renderHistory() {
    if (historyItems.length === 0) {
        historyList.innerHTML = '<li class="history-empty">No calculations yet</li>';
        return;
    }
    historyList.innerHTML = '';
    historyItems.forEach(item => {
        const li = document.createElement('li');
        li.className = 'history-item';
        li.textContent = `${item.expr} = ${item.result}`;
        li.addEventListener('click', () => {
            currentValue = item.result;
            expressionText = `${item.expr} =`;
            shouldReset = true;
            updateDisplay();
        });
        historyList.appendChild(li);
    });
}

function appendValue(val) {
    if (shouldReset || currentValue === 'Error') {
        currentValue = /[0-9.(y]/.test(val) ? val : '0' + val;
        expressionText = '';
        shouldReset = false;
    } else if (currentValue === '0' && !['.', '+', '-', '*', '/', '%', '^', ')'].includes(val)) {
        currentValue = val;
    } else {
        const lastChar = currentValue.slice(-1);
        const ops = ['+', '-', '*', '/', '%', '^'];
        if (ops.includes(lastChar) && ops.includes(val)) {
            currentValue = currentValue.slice(0, -1) + val;
        } else {
            currentValue += val;
        }
    }
    updateDisplay();
}

function insertConstant(constName) {
    const val = constName === 'PI' ? Math.PI.toFixed(8) : Math.E.toFixed(8);
    if (shouldReset || currentValue === '0' || currentValue === 'Error') {
        currentValue = val;
        expressionText = '';
        shouldReset = false;
    } else {
        currentValue += val;
    }
    updateDisplay();
}

function factorial(n) {
    if (n < 0 || !Number.isInteger(n) || n > 170) {
        throw new Error('Invalid factorial');
    }
    let res = 1;
    for (let i = 2; i <= n; i++) res *= i;
    return res;
}

function toRadians(deg) {
    return angleMode === 'DEG' ? (deg * Math.PI) / 180 : deg;
}

function fromRadians(rad) {
    return angleMode === 'DEG' ? (rad * 180) / Math.PI : rad;
}

function applyUnaryFunction(fnName) {
    try {
        if (fnName === 'rand') {
            const r = formatNumber(Math.random());
            expressionText = 'Rand =';
            currentValue = r;
            shouldReset = true;
            addHistory('Rand', r);
            updateDisplay();
            return;
        }

        const baseVal = currentValue === 'Error' ? 0 : evaluateExpression(currentValue);
        let result;
        let label;

        switch (fnName) {
            case 'sqrt':
                if (baseVal < 0) throw new Error('Negative radical');
                result = Math.sqrt(baseVal);
                label = `√(${baseVal})`;
                break;
            case 'cbrt':
                result = Math.cbrt(baseVal);
                label = `∛(${baseVal})`;
                break;
            case 'square':
                result = Math.pow(baseVal, 2);
                label = `(${baseVal})²`;
                break;
            case 'cube':
                result = Math.pow(baseVal, 3);
                label = `(${baseVal})³`;
                break;
            case 'sq10':
                result = Math.pow(10, baseVal);
                label = `10^(${baseVal})`;
                break;
            case 'inv':
                if (baseVal === 0) throw new Error('Division by zero');
                result = 1 / baseVal;
                label = `1/(${baseVal})`;
                break;
            case 'sign':
                result = -baseVal;
                label = `±(${baseVal})`;
                break;
            case 'abs':
                result = Math.abs(baseVal);
                label = `|${baseVal}|`;
                break;
            case 'exp':
                result = Math.exp(baseVal);
                label = `e^(${baseVal})`;
                break;
            case 'sin':
                result = Math.sin(toRadians(baseVal));
                label = `sin(${baseVal}${angleMode === 'DEG' ? '°' : ''})`;
                break;
            case 'cos':
                result = Math.cos(toRadians(baseVal));
                label = `cos(${baseVal}${angleMode === 'DEG' ? '°' : ''})`;
                break;
            case 'tan': {
                const rad = toRadians(baseVal);
                if (angleMode === 'DEG' && Math.abs(Math.cos(rad)) < 1e-12) {
                    throw new Error('Undefined tan');
                }
                result = Math.tan(rad);
                label = `tan(${baseVal}${angleMode === 'DEG' ? '°' : ''})`;
                break;
            }
            case 'asin':
                if (baseVal < -1 || baseVal > 1) throw new Error('Out of range');
                result = fromRadians(Math.asin(baseVal));
                label = `sin⁻¹(${baseVal})`;
                break;
            case 'acos':
                if (baseVal < -1 || baseVal > 1) throw new Error('Out of range');
                result = fromRadians(Math.acos(baseVal));
                label = `cos⁻¹(${baseVal})`;
                break;
            case 'atan':
                result = fromRadians(Math.atan(baseVal));
                label = `tan⁻¹(${baseVal})`;
                break;
            case 'sinh':
                result = Math.sinh(baseVal);
                label = `sinh(${baseVal})`;
                break;
            case 'cosh':
                result = Math.cosh(baseVal);
                label = `cosh(${baseVal})`;
                break;
            case 'tanh':
                result = Math.tanh(baseVal);
                label = `tanh(${baseVal})`;
                break;
            case 'log':
                if (baseVal <= 0) throw new Error('Invalid log');
                result = Math.log10(baseVal);
                label = `log₁₀(${baseVal})`;
                break;
            case 'log2':
                if (baseVal <= 0) throw new Error('Invalid log2');
                result = Math.log2(baseVal);
                label = `log₂(${baseVal})`;
                break;
            case 'ln':
                if (baseVal <= 0) throw new Error('Invalid ln');
                result = Math.log(baseVal);
                label = `ln(${baseVal})`;
                break;
            case 'fact':
                result = factorial(baseVal);
                label = `${baseVal}!`;
                break;
            default:
                throw new Error('Unknown function');
        }

        const formatted = formatNumber(result);
        expressionText = `${label} =`;
        currentValue = formatted;
        shouldReset = true;
        addHistory(label, formatted);
    } catch {
        expressionText = '';
        currentValue = 'Error';
        shouldReset = true;
    }
    updateDisplay();
}

function handleMemory(action) {
    const val = currentValue === 'Error' ? 0 : Number(evaluateExpression(currentValue)) || 0;
    if (action === 'MC') memoryValue = 0;
    else if (action === 'MR') {
        currentValue = formatNumber(memoryValue);
        shouldReset = true;
        updateDisplay();
    } else if (action === 'M+') memoryValue += val;
    else if (action === 'M-') memoryValue -= val;
    updateMemoryBadge();
    saveState();
}

function evaluateExpression(rawExpr) {
    const processed = rawExpr
        .replace(/(\d+(?:\.\d+)?)yroot\(([^)]+)\)/g, '($2)**(1/($1))')
        .replace(/yroot\(([^,)]+),([^)]+)\)/g, '($1)**(1/($2))')
        .replace(/×/g, '*')
        .replace(/÷/g, '/')
        .replace(/−/g, '-')
        .replace(/\^/g, '**');

    if (!/^[0-9+\-*/.()%\s*]+$/.test(processed)) {
        throw new Error('Invalid characters');
    }

    const withPercent = processed.replace(/(\d+(?:\.\d+)?)%/g, '($1/100)');
    const result = Function(`"use strict"; return (${withPercent})`)();
    if (typeof result !== 'number' || !isFinite(result)) {
        throw new Error('Math error');
    }
    return result;
}

function clearAll() {
    currentValue = '0';
    expressionText = '';
    shouldReset = false;
    updateDisplay();
}

function backspace() {
    if (shouldReset || currentValue === 'Error') {
        clearAll();
        return;
    }
    currentValue = currentValue.length > 1 ? currentValue.slice(0, -1) : '0';
    updateDisplay();
}

function calculate() {
    try {
        const result = evaluateExpression(currentValue);
        const formatted = formatNumber(result);
        const exprDone = currentValue;
        expressionText = `${exprDone} =`;
        currentValue = formatted;
        shouldReset = true;
        addHistory(exprDone, formatted);
    } catch {
        expressionText = '';
        currentValue = 'Error';
        shouldReset = true;
    }
    updateDisplay();
}

// Tabs
document.querySelectorAll('.tab-btn').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
        tab.classList.add('active');
        const panel = document.getElementById(`tab-${tab.dataset.tab}`);
        if (panel) panel.classList.add('active');
    });
});

// Scientific buttons
document.querySelectorAll('.btn').forEach(btn => {
    btn.addEventListener('click', () => {
        if (btn.dataset.value) appendValue(btn.dataset.value);
        else if (btn.dataset.const) insertConstant(btn.dataset.const);
        else if (btn.dataset.fn) applyUnaryFunction(btn.dataset.fn);
        else if (btn.dataset.mem) handleMemory(btn.dataset.mem);
        else if (btn.dataset.action === 'clear') clearAll();
        else if (btn.dataset.action === 'backspace') backspace();
        else if (btn.dataset.action === 'equals') calculate();
    });
});

angleModeBtn.addEventListener('click', () => {
    angleMode = angleMode === 'DEG' ? 'RAD' : 'DEG';
    angleModeBtn.textContent = angleMode;
    saveState();
});

themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('light-theme');
    themeToggle.textContent = document.body.classList.contains('light-theme') ? '☀️' : '🌙';
    saveState();
});

historyToggle.addEventListener('click', () => {
    historyPanel.hidden = !historyPanel.hidden;
});

clearHistoryBtn.addEventListener('click', () => {
    historyItems = [];
    renderHistory();
    saveState();
});

exportBtn.addEventListener('click', () => {
    const content = historyItems.length
        ? historyItems.map(i => `${i.expr} = ${i.result}`).join('\n')
        : 'No calculations in history.';
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'procalc-history.txt';
    a.click();
    URL.revokeObjectURL(url);
});

copyBtn.addEventListener('click', () => {
    if (navigator.clipboard) {
        navigator.clipboard.writeText(currentValue).catch(() => {});
    }
    const prev = copyBtn.textContent;
    copyBtn.textContent = '✓';
    setTimeout(() => { copyBtn.textContent = prev; }, 900);
});

document.addEventListener('keydown', (e) => {
    const sciTab = document.getElementById('tab-sci');
    if (!sciTab || !sciTab.classList.contains('active')) return;
    if ((e.key >= '0' && e.key <= '9') || ['+', '-', '*', '/', '%', '^', '(', ')', '.'].includes(e.key)) {
        appendValue(e.key);
    } else if (e.key === 'Enter' || e.key === '=') {
        e.preventDefault();
        calculate();
    } else if (e.key === 'Backspace') {
        backspace();
    } else if (e.key === 'Escape') {
        clearAll();
    }
});

// Currency Converter
const currAmount = document.getElementById('currAmount');
const currFrom = document.getElementById('currFrom');
const currTo = document.getElementById('currTo');
const currRate = document.getElementById('currRate');
const currResult = document.getElementById('currResult');

// Base reference rates relative to 1 USD
const baseRates = {
    USD: 1,
    EUR: 0.92,
    GBP: 0.79
};

function updateCurrency() {
    if (!currAmount || !currFrom || !currTo || !currRate || !currResult) return;
    const amt = parseFloat(currAmount.value) || 0;
    const from = currFrom.value;
    const to = currTo.value;
    const rateVal = parseFloat(currRate.value) || 120;

    if (from === to) {
        currResult.textContent = `${amt} ${from} = ${Number(amt.toFixed(4)).toLocaleString()} ${to}`;
        return;
    }

    let converted = 0;

    if (from === 'ETB') {
        // ETB -> USD, EUR, or GBP
        const inUsd = amt / rateVal;
        converted = to === 'USD' ? inUsd : inUsd * baseRates[to];
    } else if (to === 'ETB') {
        // USD, EUR, or GBP -> ETB
        const inUsd = amt / baseRates[from];
        converted = inUsd * rateVal;
    } else if ((from === 'EUR' && to === 'GBP') || (from === 'GBP' && to === 'EUR')) {
        // EUR <-> GBP scales with rateVal changes
        const inUsd = amt / baseRates[from];
        const baseConverted = inUsd * baseRates[to];
        converted = baseConverted * (rateVal / 120);
    } else {
        // Other non-ETB pairs (e.g., USD <-> EUR, USD <-> GBP)
        const inUsd = amt / baseRates[from];
        converted = inUsd * baseRates[to];
    }

    currResult.textContent = `${amt} ${from} = ${Number(converted.toFixed(4)).toLocaleString()} ${to}`;
}

[currAmount, currFrom, currTo, currRate].forEach(el => {
    if (el) {
        el.addEventListener('input', updateCurrency);
        el.addEventListener('change', updateCurrency);
    }
});

// Unit Converter (includes Ethiopia Quintal & Hectare)
const unitCategory = document.getElementById('unitCategory');
const unitValue = document.getElementById('unitValue');
const unitFrom = document.getElementById('unitFrom');
const unitTo = document.getElementById('unitTo');
const unitResult = document.getElementById('unitResult');

const unitOptions = {
    length: [
        { id: 'm', label: 'Meter (m)', factor: 1 },
        { id: 'km', label: 'Kilometer (km)', factor: 1000 },
        { id: 'cm', label: 'Centimeter (cm)', factor: 0.01 },
        { id: 'mi', label: 'Mile (mi)', factor: 1609.344 }
    ],
    weight: [
        { id: 'kg', label: 'Kilogram (kg)', factor: 1 },
        { id: 'qtl', label: 'Quintal / ኩንታል (qtl = 100 kg)', factor: 100 },
        { id: 'g', label: 'Gram (g)', factor: 0.001 },
        { id: 'lb', label: 'Pound (lb)', factor: 0.45359237 }
    ],
    area: [
        { id: 'ha', label: 'Hectare / ሄክታር (ha = 10,000 m²)', factor: 10000 },
        { id: 'm2', label: 'Square Meter (m²)', factor: 1 }
    ],
    temp: [
        { id: 'C', label: 'Celsius (°C)' },
        { id: 'F', label: 'Fahrenheit (°F)' },
        { id: 'K', label: 'Kelvin (K)' }
    ]
};

function populateUnits() {
    if (!unitCategory || !unitFrom || !unitTo) return;
    const list = unitOptions[unitCategory.value] || unitOptions.length;
    unitFrom.innerHTML = '';
    unitTo.innerHTML = '';
    list.forEach((u, idx) => {
        const opt1 = new Option(u.label, u.id);
        const opt2 = new Option(u.label, u.id);
        unitFrom.add(opt1);
        unitTo.add(opt2);
        if (idx === 1) opt2.selected = true;
    });
    updateUnits();
}
function updateUnits() {
    if (!unitCategory || !unitValue || !unitFrom || !unitTo || !unitResult) return;
    const val = parseFloat(unitValue.value) || 0;
    const cat = unitCategory.value;
    const from = unitFrom.value;
    const to = unitTo.value;
    let out = val;

    if (cat === 'temp') {
        let celsius = val;
        if (from === 'F') celsius = (val - 32) * (5 / 9);
        else if (from === 'K') celsius = val - 273.15;

        if (to === 'C') out = celsius;
        else if (to === 'F') out = celsius * (9 / 5) + 32;
        else if (to === 'K') out = celsius + 273.15;
    } else {
        const list = unitOptions[cat];
        const fObj = list.find(u => u.id === from);
        const tObj = list.find(u => u.id === to);
        const base = val * fObj.factor;
        out = base / tObj.factor;
    }

    unitResult.textContent = `${val} ${from} = ${Number(out.toFixed(6))} ${to}`;
}

if (unitCategory) {
    unitCategory.addEventListener('change', populateUnits);
}
[unitValue, unitFrom, unitTo].forEach(el => {
    if (el) {
        el.addEventListener('input', updateUnits);
        el.addEventListener('change', updateUnits);
    }
});

// Programmer Mode (16 base-to-base combinations across DEC, HEX, BIN, OCT)
const progFrom = document.getElementById('progFrom');
const progTo = document.getElementById('progTo');
const progInput = document.getElementById('progInput');
const progConvertedResult = document.getElementById('progConvertedResult');
const progDec = document.getElementById('progDec');
const progHex = document.getElementById('progHex');
const progBin = document.getElementById('progBin');
const progOct = document.getElementById('progOct');

const baseLabels = {
    10: 'DEC',
    16: 'HEX',
    2: 'BIN',
    8: 'OCT'
};

function isValidForBase(str, base) {
    if (!str) return false;
    const patterns = {
        2: /^[01]+$/,
        8: /^[0-7]+$/,
        10: /^-?\d+$/,
        16: /^[0-9A-Fa-f]+$/
    };
    return patterns[base].test(str);
}

function updateProgrammer() {
    if (!progInput || !progFrom || !progTo) return;

    const fromBase = parseInt(progFrom.value, 10);
    const toBase = parseInt(progTo.value, 10);
    const raw = progInput.value.trim();

    if (!raw) {
        progDec.textContent = '0';
        progHex.textContent = '0';
        progBin.textContent = '0';
        progOct.textContent = '0';
        progConvertedResult.textContent = `0 (${baseLabels[fromBase]}) = 0 (${baseLabels[toBase]})`;
        return;
    }

    if (!isValidForBase(raw, fromBase)) {
        progConvertedResult.textContent = `Invalid ${baseLabels[fromBase]} input`;
        return;
    }

    const parsedValue = parseInt(raw, fromBase);
    if (Number.isNaN(parsedValue)) {
        progConvertedResult.textContent = 'Invalid number';
        return;
    }

    const decVal = parsedValue.toString(10);
    const hexVal = parsedValue.toString(16).toUpperCase();
    const binVal = parsedValue.toString(2);
    const octVal = parsedValue.toString(8);

    progDec.textContent = decVal;
    progHex.textContent = hexVal;
    progBin.textContent = binVal;
    progOct.textContent = octVal;

    const targetConverted = parsedValue.toString(toBase).toUpperCase();
    progConvertedResult.textContent = `${raw.toUpperCase()} (${baseLabels[fromBase]}) = ${targetConverted} (${baseLabels[toBase]})`;
}

[progFrom, progTo, progInput].forEach(el => {
    if (el) {
        el.addEventListener('input', updateProgrammer);
        el.addEventListener('change', updateProgrammer);
    }
});

// Ethiopia Practical Units Helper (Quintal = 100 kg, Hectare = 10,000 m2)
function convertEthioPracticalUnits(value, fromUnit, toUnit) {
    const val = parseFloat(value) || 0;

    // Weight: quintal (qtl) <-> kg
    if (fromUnit === 'qtl' && toUnit === 'kg') return val * 100;
    if (fromUnit === 'kg' && toUnit === 'qtl') return val / 100;

    // Area: hectare (ha) <-> square meter (m2)
    if (fromUnit === 'ha' && toUnit === 'm2') return val * 10000;
    if (fromUnit === 'm2' && toUnit === 'ha') return val / 10000;

    return null;
}

// Ethiopia Employment Income Tax & Pension Calculator (Monthly ETB)
function calculateEthiopiaSalary(grossMonthly) {
    const gross = Math.max(0, parseFloat(grossMonthly) || 0);
    const employeePension = gross * 0.07;
    const employerPension = gross * 0.11;

    // Progressive employment income tax brackets (ETB/month)
    let tax = 0;
    if (gross <= 600) {
        tax = 0;
    } else if (gross <= 1650) {
        tax = gross * 0.10 - 60;
    } else if (gross <= 3200) {
        tax = gross * 0.15 - 142.50;
    } else if (gross <= 5250) {
        tax = gross * 0.20 - 302.50;
    } else if (gross <= 7800) {
        tax = gross * 0.25 - 565.00;
    } else if (gross <= 10900) {
        tax = gross * 0.30 - 955.00;
    } else {
        tax = gross * 0.35 - 1500.00;
    }

    tax = Math.max(0, tax);
    const netSalary = Math.max(0, gross - tax - employeePension);

    return {
        tax,
        employeePension,
        employerPension,
        netSalary
    };
}

const grossSalaryInput = document.getElementById('grossSalary');
const ethioIncomeTaxEl = document.getElementById('ethioIncomeTax');
const ethioPensionEl = document.getElementById('ethioPension');
const ethioNetSalaryEl = document.getElementById('ethioNetSalary');
const ethioEmployerPensionEl = document.getElementById('ethioEmployerPension');

function updateEthioSalaryUI() {
    if (!grossSalaryInput) return;
    const res = calculateEthiopiaSalary(grossSalaryInput.value);
    const fmt = (n) => `${Number(res[n].toFixed(2)).toLocaleString()} ETB`;

    if (ethioIncomeTaxEl) ethioIncomeTaxEl.textContent = fmt('tax');
    if (ethioPensionEl) ethioPensionEl.textContent = fmt('employeePension');
    if (ethioNetSalaryEl) ethioNetSalaryEl.textContent = fmt('netSalary');
    if (ethioEmployerPensionEl) ethioEmployerPensionEl.textContent = fmt('employerPension');
}

// 15% VAT & Profit Margin Calculator
const tradeAmountInput = document.getElementById('tradeAmount');
const vatModeSelect = document.getElementById('vatMode');
const profitMarginInput = document.getElementById('profitMarginPct');
const vatResultBox = document.getElementById('vatResultBox');
const profitResultBox = document.getElementById('profitResultBox');

function updateEthioTradeUI() {
    if (!tradeAmountInput || !vatModeSelect || !profitMarginInput) return;

    const amount = Math.max(0, parseFloat(tradeAmountInput.value) || 0);
    const mode = vatModeSelect.value;
    const marginPct = Math.max(0, parseFloat(profitMarginInput.value) || 0);

    let vatAmount = 0;
    let totalWithVat = 0;
    let basePrice = amount;

    if (mode === 'add15') {
        vatAmount = amount * 0.15;
        totalWithVat = amount + vatAmount;
        if (vatResultBox) {
            vatResultBox.textContent = `VAT (15%): ${Number(vatAmount.toFixed(2)).toLocaleString()} ETB | Total: ${Number(totalWithVat.toFixed(2)).toLocaleString()} ETB`;
        }
    } else {
        basePrice = amount / 1.15;
        vatAmount = amount - basePrice;
        if (vatResultBox) {
            vatResultBox.textContent = `Base Price: ${Number(basePrice.toFixed(2)).toLocaleString()} ETB | VAT (15%): ${Number(vatAmount.toFixed(2)).toLocaleString()} ETB`;
        }
    }

    const profitAmount = basePrice * (marginPct / 100);
    const sellingPrice = basePrice + profitAmount;

    if (profitResultBox) {
        profitResultBox.textContent = `Selling Price (${marginPct}%): ${Number(sellingPrice.toFixed(2)).toLocaleString()} ETB | Profit: ${Number(profitAmount.toFixed(2)).toLocaleString()} ETB`;
    }
}

if (grossSalaryInput) {
    grossSalaryInput.addEventListener('input', updateEthioSalaryUI);
    grossSalaryInput.addEventListener('change', updateEthioSalaryUI);
}

[tradeAmountInput, vatModeSelect, profitMarginInput].forEach(el => {
    if (el) {
        el.addEventListener('input', updateEthioTradeUI);
        el.addEventListener('change', updateEthioTradeUI);
    }
});

// Initial setup
loadState();
renderHistory();
updateMemoryBadge();
updateDisplay();
populateUnits();
updateCurrency();
updateProgrammer();
updateEthioSalaryUI();
updateEthioTradeUI();