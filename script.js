document.addEventListener('DOMContentLoaded', () => {
    const refreshIcons = () => lucide.createIcons();
    refreshIcons();

    const productList = document.getElementById('product-list');
    const addProductBtn = document.getElementById('add-product-btn');
    const rowTemplate = document.getElementById('product-row-template');
    const comboList = document.getElementById('combo-list');
    const addComboBtn = document.getElementById('add-combo-btn');
    const comboCardTemplate = document.getElementById('combo-card-template');
    const comboItemTemplate = document.getElementById('combo-item-template');
    const templateSelect = document.getElementById('fee-template-select');
    const exchangeIcon = document.querySelector('.exchange-rate-badge i');
    
    let currentPlatform = 'shopee';

    const configInputs = [
        'exchange-rate', 'cn-shipping', 'weight', 'dim-l', 'dim-w', 'dim-h', 
        'destination', 'check-goods', 'wood-pack',
        'target-profit', 'shopee-fixed-fee', 'shopee-pay-fee', 
        'shopee-vxtra-fee', 'shopee-fxtra-fee', 'shopee-tax-fee', 'shopee-mkt-fee',
        'shopee-piship', 'shopee-infra', 'shopee-pack-rate', 'shopee-staff-rate', 'shopee-svoucher-rate'
    ];

    // --- REAL-TIME EXCHANGE RATE ---
    const fetchExchangeRate = async () => {
        exchangeIcon.classList.add('loading');
        try {
            // Using a reliable public source for CNY/VND or USD conversion
            const res = await fetch('https://api.exchangerate-api.com/v4/latest/CNY');
            const data = await res.json();
            if (data.rates && data.rates.VND) {
                const rate = data.rates.VND;
                document.getElementById('exchange-rate').value = Math.round(rate);
                console.log("Auto-fetched CNY rate:", rate);
                calculate();
                saveState();
            }
        } catch (e) {
            console.warn("Could not fetch real-time rate, using default.");
        } finally {
            exchangeIcon.classList.remove('loading');
        }
    };
    fetchExchangeRate();

    // --- CATEGORY TEMPLATES ---
    const templates = {
        'shopee-mall': { 'shopee-fixed-fee': 14, 'shopee-pay-fee': 4.91, 'shopee-vxtra-fee': 0, 'shopee-fxtra-fee': 0, 'shopee-tax-fee': 0 },
        'shopee-fav': { 'shopee-fixed-fee': 10, 'shopee-pay-fee': 4.91, 'shopee-vxtra-fee': 4, 'shopee-fxtra-fee': 7, 'shopee-tax-fee': 1.5 },
        'tiktok-standard': { 'shopee-fixed-fee': 4, 'shopee-pay-fee': 2.5, 'shopee-vxtra-fee': 0, 'shopee-fxtra-fee': 2, 'shopee-tax-fee': 1.5, 'shopee-mkt-fee': 5 }
    };

    templateSelect.onchange = () => {
        const t = templates[templateSelect.value];
        if (t) {
            Object.keys(t).forEach(id => {
                const el = document.getElementById(id);
                if (el) el.value = t[id];
            });
            calculate();
            saveState();
        }
    };

    // --- TAB SWITCH LOGIC ---
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(btn.dataset.tab).classList.add('active');
            saveState();
        };
    });

    const getRate = () => parseFloat(document.getElementById('exchange-rate').value) || 0;

    // --- PLATFORM SWITCH ---
    document.querySelectorAll('.switch-option').forEach(opt => {
        opt.onclick = () => {
            document.querySelectorAll('.switch-option').forEach(o => o.classList.remove('active'));
            opt.classList.add('active');
            currentPlatform = opt.dataset.platform;
            
            const title = document.getElementById('platform-title');
            const icon = document.getElementById('platform-icon');
            if (currentPlatform === 'tiktok') {
                title.textContent = 'Cấu hình TikTok Shop';
                icon.dataset.lucide = 'music-2';
                icon.style.color = '#00f2ea';
                templateSelect.value = 'tiktok-standard';
            } else {
                title.textContent = 'Cấu hình Shopee';
                icon.dataset.lucide = 'shopping-bag';
                icon.style.color = '#ee4d2d';
                templateSelect.value = 'shopee-fav';
            }
            templateSelect.dispatchEvent(new Event('change'));
            refreshIcons();
        };
    });

    const addProductRow = (data = null) => {
        const clone = rowTemplate.content.cloneNode(true);
        const row = clone.querySelector('.product-row');
        if (data) {
            row.querySelector('.p-name').value = data.name || '';
            row.querySelector('.p-price').value = data.price || '';
            row.querySelector('.p-qty').value = data.qty || 1;
            row.querySelector('.p-img-url').value = data.img || '';
            row.querySelector('.p-actual-price').value = data.actualPrice || '';
            row.querySelector('.p-comp-price').value = data.compPrice || '';
            row.querySelector('.p-fs-rate').value = data.fsRate || 0;
        }
        productList.appendChild(clone);
        refreshIcons();
        attachRowListeners(productList.lastElementChild);
        updateAllComboSelects();
        calculate();
    };

    const attachRowListeners = (row) => {
        row.querySelectorAll('input').forEach(input => {
            input.addEventListener('input', () => {
                if (input.classList.contains('p-name')) updateAllComboSelects();
                calculate();
                saveState();
            });
        });
        row.querySelector('.remove-btn').onclick = () => {
            row.remove();
            updateAllComboSelects();
            calculate();
            saveState();
        };
    };

    const addCombo = (data = null) => {
        const clone = comboCardTemplate.content.cloneNode(true);
        const card = clone.querySelector('.combo-card');
        comboList.appendChild(card);
        const currentCard = comboList.lastElementChild;
        if (data) {
            currentCard.querySelector('.combo-name').value = data.name || '';
            data.items.forEach(item => addComboItem(currentCard, item));
        } else { addComboItem(currentCard); }
        currentCard.querySelector('.add-item-to-combo-btn').onclick = () => addComboItem(currentCard);
        currentCard.querySelector('.remove-combo-btn').onclick = () => { currentCard.remove(); calculate(); saveState(); };
        currentCard.querySelector('.combo-name').addEventListener('input', saveState);
        refreshIcons();
        calculate();
    };

    const addComboItem = (card, data = null) => {
        const itemsList = card.querySelector('.combo-items-list');
        const clone = comboItemTemplate.content.cloneNode(true);
        const item = clone.querySelector('.combo-item');
        itemsList.appendChild(item);
        const currentItem = itemsList.lastElementChild;
        const select = currentItem.querySelector('.combo-product-select');
        populateSelect(select);
        if (data) { select.value = data.productId; currentItem.querySelector('.combo-qty').value = data.qty; }
        select.onchange = () => { calculate(); saveState(); };
        currentItem.querySelector('.combo-qty').oninput = () => { calculate(); saveState(); };
        currentItem.querySelector('.remove-item-btn').onclick = () => { currentItem.remove(); calculate(); saveState(); };
        refreshIcons();
    };

    const populateSelect = (select) => {
        const currentVal = select.value;
        select.innerHTML = '<option value="">Chọn sản phẩm...</option>';
        document.querySelectorAll('.product-row').forEach((row, index) => {
            const name = row.querySelector('.p-name').value || `SP #${index + 1}`;
            const opt = document.createElement('option');
            opt.value = index; opt.textContent = name;
            select.appendChild(opt);
        });
        select.value = currentVal;
    };

    const updateAllComboSelects = () => document.querySelectorAll('.combo-product-select').forEach(s => populateSelect(s));

    const calculate = () => {
        const getVal = (id) => { const el = document.getElementById(id); return el ? (parseFloat(el.value) || 0) : 0; };
        const rate = getVal('exchange-rate');
        const cnShipY = getVal('cn-shipping');
        const weight = getVal('weight');
        const L = getVal('dim-l'); const W = getVal('dim-w'); const H = getVal('dim-h');
        const dest = document.getElementById('destination').value;
        const isCheck = document.getElementById('check-goods').checked;
        const isWood = document.getElementById('wood-pack').checked;

        const tProfit = getVal('target-profit') / 100;
        const mktFee = getVal('shopee-mkt-fee') / 100;
        const sFixed = getVal('shopee-fixed-fee') / 100;
        const sPay = getVal('shopee-pay-fee') / 100;
        const sVxtra = getVal('shopee-vxtra-fee') / 100;
        const sFxtra = getVal('shopee-fxtra-fee') / 100;
        const sTax = getVal('shopee-tax-fee') / 100;
        const sPack = getVal('shopee-pack-rate') / 100;
        const piShip = getVal('shopee-piship');
        const infra = getVal('shopee-infra');
        const flatFeesUnit = (piShip + infra);

        const rows = document.querySelectorAll('.product-row');
        let totalMerchCNY = 0; let totalQty = 0;

        const productData = Array.from(rows).map(row => {
            const price = parseFloat(row.querySelector('.p-price').value) || 0;
            const qty = parseInt(row.querySelector('.p-qty').value) || 0;
            const actualSell = parseFloat(row.querySelector('.p-actual-price').value) || 0;
            const compPrice = parseFloat(row.querySelector('.p-comp-price').value) || 0;
            const fsRate = (parseFloat(row.querySelector('.p-fs-rate').value) || 0) / 100;
            const imgInput = row.querySelector('.p-img-url');
            const imgContainer = row.querySelector('.img-preview');
            
            if (imgInput.value) {
                let img = imgContainer.querySelector('img');
                if (!img) { img = document.createElement('img'); imgContainer.appendChild(img); }
                img.src = imgInput.value;
            } else { const img = imgContainer.querySelector('img'); if (img) img.remove(); }

            totalMerchCNY += (price * qty); totalQty += qty;
            return { price, qty, actualSell, compPrice, fsRate, 
                landedEl: row.querySelector('.p-landed-cost'), 
                shopeeEl: row.querySelector('.p-shopee-price'), 
                realProfitEl: row.querySelector('.p-real-profit'),
                barEl: row.querySelector('.profit-bar')
            };
        });

        const totalProductVND = totalMerchCNY * rate;
        let serviceRate = (totalProductVND > 3000000) ? 0.025 : 0.03;
        let serviceFee = totalProductVND > 0 ? Math.max(5000, totalProductVND * serviceRate) : 0;
        const chargeW = Math.max(weight, (L*W*H)/6000, rows.length > 0 ? 0.3 : 0);
        let sRate = (dest === 'hanoi') ? (chargeW >= 50 ? 23000 : 24000) : (chargeW >= 50 ? 29000 : 30000);
        const shippingFee = chargeW * sRate;
        let checkFee = isCheck ? (totalQty <= 2 ? 5000 : totalQty <= 10 ? 3000 : 2000) : 0;
        let woodFee = isWood ? (20 + Math.max(0, chargeW - 1)) * rate : 0;
        const totalFees = serviceFee + shippingFee + checkFee + woodFee + (cnShipY * rate);
        const feeMult = totalProductVND > 0 ? (totalFees / totalProductVND) : 0;

        const fmt = (v) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Math.round(v));
        let totalNetProfit = 0; let totalRevenue = 0;

        productData.forEach(p => {
            const unitLanded = (p.price * rate) * (1 + feeMult);
            p.landedEl.textContent = p.price > 0 ? fmt(unitLanded) : '0đ';
            let spSuggested = unitLanded / 0.5;
            const variableRates = sFixed + sPay + sTax + sPack + mktFee;
            for (let i = 0; i < 5; i++) {
                const vx = Math.min(spSuggested * sVxtra, 50000);
                const fx = Math.min(spSuggested * sFxtra, 40000);
                const flat = totalQty > 0 ? (flatFeesUnit / totalQty) : 0;
                const div = 1 - (variableRates + tProfit);
                if (div > 0) spSuggested = (unitLanded + flat + vx + fx) / div;
            }
            if (p.price > 0) {
                p.shopeeEl.textContent = fmt(spSuggested);
                let sellPrice = p.actualSell || spSuggested;
                const effectiveSell = sellPrice * (1 - p.fsRate);
                const fees = (totalQty > 0 ? flatFeesUnit/totalQty : 0) + Math.min(effectiveSell*sVxtra, 50000) + Math.min(effectiveSell*sFxtra, 40000) + (effectiveSell * variableRates);
                const netProfit = effectiveSell - (unitLanded + fees);
                
                // Visualization logic
                const breakEven = (unitLanded + fees) / (1 - p.fsRate);
                let percent = 0;
                if (sellPrice > 0) {
                    percent = (netProfit / (sellPrice * tProfit)) * 50 + 50; // 50% is target profit
                    percent = Math.max(5, Math.min(100, percent));
                }
                p.barEl.style.width = `${percent}%`;
                p.barEl.className = 'profit-bar ' + (netProfit > (sellPrice * tProfit * 0.8) ? 'safe' : (netProfit > 0 ? 'warning' : ''));

                p.realProfitEl.textContent = fmt(netProfit);
                p.realProfitEl.className = 'p-real-profit ' + (netProfit > 0 ? 'pos' : 'neg');
                totalNetProfit += (netProfit * p.qty); totalRevenue += (effectiveSell * p.qty);
            } else { p.shopeeEl.textContent = '---'; p.barEl.style.width = '0%'; }
        });

        // Combos
        document.querySelectorAll('.combo-card').forEach(card => {
            let comboLanded = 0;
            card.querySelectorAll('.combo-item').forEach(item => {
                const pIdx = item.querySelector('.combo-product-select').value;
                if (pIdx !== "" && productData[pIdx]) comboLanded += (productData[pIdx].price * rate * (1 + feeMult)) * (parseInt(item.querySelector('.combo-qty').value) || 0);
            });
            card.querySelector('.c-total-landed').textContent = fmt(comboLanded);
            let sp = comboLanded / 0.7;
            for (let i = 0; i < 5; i++) {
                sp = (comboLanded + (totalQty>0?flatFeesUnit/totalQty:0) + Math.min(sp*sVxtra, 50000) + Math.min(sp*sFxtra, 40000)) / (1 - (sFixed + sPay + sTax + sPack + mktFee + tProfit));
            }
            card.querySelector('.c-shopee-price').textContent = comboLanded > 0 ? fmt(sp) : '0đ';
        });

        document.getElementById('res-product-price').textContent = fmt(totalProductVND);
        document.getElementById('res-service-fee').textContent = fmt(serviceFee);
        document.getElementById('res-intl-shipping').textContent = fmt(shippingFee);
        document.getElementById('res-check-fee').textContent = fmt(checkFee);
        document.getElementById('res-wood-fee').textContent = fmt(woodFee);
        document.getElementById('stat-total-capital').textContent = fmt(totalProductVND + totalFees);
        document.getElementById('deposit-amount').textContent = fmt((totalProductVND + totalFees) * 0.7);
        document.getElementById('stat-total-revenue').textContent = fmt(totalRevenue);
        document.getElementById('stat-total-profit').textContent = fmt(totalNetProfit);
        document.getElementById('stat-total-profit').className = 'val highlight ' + (totalNetProfit > 0 ? 'success' : 'danger');
        document.getElementById('stat-roi').textContent = Math.round((totalProductVND+totalFees) > 0 ? (totalNetProfit/(totalProductVND+totalFees)*100) : 0) + '%';
        document.getElementById('item-check-goods').classList.toggle('hidden', !isCheck);
        document.getElementById('item-wood-pack').classList.toggle('hidden', !isWood);
    };

    addProductBtn.onclick = () => addProductRow();
    addComboBtn.onclick = () => addCombo();
    configInputs.forEach(id => { const el = document.getElementById(id); if (el) el.addEventListener('input', () => { calculate(); saveState(); }); });

    document.getElementById('export-excel-btn').onclick = () => {
        const data = [['STT', 'Sản phẩm', 'Giá tệ', 'SL', 'Vốn về tay', 'Giá Sàn', 'Giá Bán', 'Lãi/SP']];
        document.querySelectorAll('.product-row').forEach((r, i) => data.push([i+1, r.querySelector('.p-name').value, r.querySelector('.p-price').value, r.querySelector('.p-qty').value, r.querySelector('.p-landed-cost').textContent, r.querySelector('.p-shopee-price').textContent, r.querySelector('.p-actual-price').value, r.querySelector('.p-real-profit').textContent]));
        XLSX.writeFile(XLSX.utils.book_append_sheet(XLSX.utils.book_new(), XLSX.utils.aoa_to_sheet(data), "Order"), `OrderPlus_Export.xlsx`);
    };

    const importInput = document.getElementById('import-excel-input');
    document.getElementById('import-excel-btn').onclick = () => importInput.click();
    importInput.onchange = (e) => {
        const reader = new FileReader();
        reader.onload = (evt) => {
            const data = new Uint8Array(evt.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const json = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
            productList.innerHTML = '';
            json.forEach(row => {
                const name = row['TÊN SẢN PHẨM'] || row['Sản phẩm'] || row['Tên sản phẩm'] || '';
                const price = parseFloat(row['GIÁ TỆ'] || row['Giá tệ'] || 0);
                const qty = parseInt(row['SỐ LƯỢNG'] || row['SL'] || 0);
                if (name || price > 0) addProductRow({ name, price, qty: qty || 1 });
            });
            if (json[0]?.['TỈ GIÁ']) document.getElementById('exchange-rate').value = json[0]['TỈ GIÁ'];
            calculate(); saveState();
        };
        reader.readAsArrayBuffer(e.target.files[0]);
    };

    const saveState = () => {
        const state = { platform: currentPlatform, tab: document.querySelector('.tab-btn.active').dataset.tab, config: {}, items: [], combos: [] };
        configInputs.forEach(id => { const el = document.getElementById(id); if (el) state.config[id] = el.type === 'checkbox' ? el.checked : el.value; });
        document.querySelectorAll('.product-row').forEach(r => state.items.push({ name: r.querySelector('.p-name').value, price: r.querySelector('.p-price').value, qty: r.querySelector('.p-qty').value, img: r.querySelector('.p-img-url').value, actualPrice: r.querySelector('.p-actual-price').value, compPrice: r.querySelector('.p-comp-price').value, fsRate: r.querySelector('.p-fs-rate').value }));
        document.querySelectorAll('.combo-card').forEach(card => {
            const cb = { name: card.querySelector('.combo-name').value, items: [] };
            card.querySelectorAll('.combo-item').forEach(i => cb.items.push({ productId: i.querySelector('.combo-product-select').value, qty: i.querySelector('.combo-qty').value }));
            state.combos.push(cb);
        });
        localStorage.setItem('shope_calc_v8', JSON.stringify(state));
    };

    const loadState = () => {
        const saved = localStorage.getItem('shope_calc_v8'); if (!saved) { addProductRow(); return; }
        const state = JSON.parse(saved);
        if (state.platform) {
            currentPlatform = state.platform;
            document.querySelectorAll('.switch-option').forEach(o => o.classList.toggle('active', o.dataset.platform === currentPlatform));
        }
        if (state.tab) { document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === state.tab)); document.querySelectorAll('.tab-pane').forEach(p => p.classList.toggle('active', p.id === state.tab)); }
        configInputs.forEach(id => { const el = document.getElementById(id); if (el && state.config[id] !== undefined) { if (el.type === 'checkbox') el.checked = state.config[id]; else el.value = state.config[id]; } });
        state.items.forEach(item => addProductRow(item));
        if (state.combos) state.combos.forEach(c => addCombo(c));
        calculate();
    };

    loadState();
});
