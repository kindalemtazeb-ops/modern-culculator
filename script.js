let d = document.getElementById('d'), v = '0', r = false;

function a(x) {
    v = (v === '0' || r) ? x : v + x;
    r = false;
    d.innerText = v;
}

function c() { v = '0'; d.innerText = v; }

function b() { v = v.length > 1 ? v.slice(0, -1) : '0'; d.innerText = v; }

function e() {
    try {
        let exp = v.replace(/×/g, '*').replace(/÷/g, '/');
        if (!/^[0-9+\-*/.()%\s]*$/.test(exp)) throw 0;

        let res = eval(exp);
        if (!isFinite(res)) throw 0;

        v = parseFloat(res.toFixed(10)).toString();
        r = true;
        d.innerText = v;
    } catch {
        v = 'Error';
        r = true;
        d.innerText = v;
    }
}

document.addEventListener('keydown', k => {
    if (k.key >= '0' && k.key <= '9') a(k.key);
    else if ('+-*/%.'.includes(k.key)) a(k.key);
    else if (k.key === 'Enter') e();
    else if (k.key === 'Escape') c();
    else if (k.key === 'Backspace') b();
});