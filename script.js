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
        document.getElementById(`tab-${tab.dataset.tab}`).classList.add('active');
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
    if (!document.getElementById('tab-sci').classList.contains('active')) return;
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

// Currency Converter (rates relative to 1 USD)
const currAmount = document.getElementById('currAmount');
const currFrom = document.getElementById('currFrom');
const currTo = document.getElementById('currTo');
const currRate = document.getElementById('currRate');
const currResult = document.getElementById('currResult');

function updateCurrency() {
    const amt = parseFloat(currAmount.value) || 0;
    const usdToEtb = parseFloat(currRate.value) || 120;
    const ratesPerUsd = {
        USD: 1,
        ETB: usdToEtb,
        EUR: 0.92,
        GBP: 0.79
    };
    const from = currFrom.value;
    const to = currTo.value;
    const inUsd = amt / ratesPerUsd[from];
    const converted = inUsd * ratesPerUsd[to];
    currResult.textContent = `${amt} ${from} = ${Number(converted.toFixed(4)).toLocaleString()} ${to}`;
}

[currAmount, currFrom, currTo, currRate].forEach(el => {
    el.addEventListener('input', updateCurrency);
    el.addEventListener('change', updateCurrency);
});

// Unit Converter
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
        { id: 'g', label: 'Gram (g)', factor: 0.001 },
        { id: 'lb', label: 'Pound (lb)', factor: 0.45359237 }
    ],
    temp: [
        { id: 'C', label: 'Celsius (°C)' },
        { id: 'F', label: 'Fahrenheit (°F)' },
        { id: 'K', label: 'Kelvin (K)' }
    ]
};

function populateUnits() {
    const list = unitOptions[unitCategory.value];
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

unitCategory.addEventListener('change', populateUnits);
[unitValue, unitFrom, unitTo].forEach(el => {
    el.addEventListener('input', updateUnits);
    el.addEventListener('change', updateUnits);
});

// Programmer Mode
const progDec = document.getElementById('progDec');
const progHex = document.getElementById('progHex');
const progBin = document.getElementById('progBin');
const progOct = document.getElementById('progOct');

function updateProgrammer() {
    const num = parseInt(progDec.value, 10);
    if (isNaN(num)) {
        progHex.textContent = '0';
        progBin.textContent = '0';
        progOct.textContent = '0';
        return;
    }
    const sign = num < 0 ? '-' : '';
    const absNum = Math.abs(num);
    progHex.textContent = sign + absNum.toString(16).toUpperCase();
    progBin.textContent = sign + absNum.toString(2);
    progOct.textContent = sign + absNum.toString(8);
}

progDec.addEventListener('input', updateProgrammer);

// Initialize
loadState();
renderHistory();
updateMemoryBadge();
updateDisplay();
updateCurrency();
populateUnits();
updateProgrammer();