document.addEventListener('DOMContentLoaded', () => {
    // Icons
    const refreshIcons = () => lucide.createIcons();
    refreshIcons();

    // Elements
    const productList = document.getElementById('product-list');
    const addProductBtn = document.getElementById('add-product-btn');
    const rowTemplate = document.getElementById('product-row-template');
    
    const comboList = document.getElementById('combo-list');
    const addComboBtn = document.getElementById('add-combo-btn');
    const comboCardTemplate = document.getElementById('combo-card-template');
    const comboItemTemplate = document.getElementById('combo-item-template');
    const suggestComboBtn = document.getElementById('suggest-combo-btn');

    const extraCostsList = document.getElementById('extra-costs-list');
    const addExtraCostBtn = document.getElementById('add-extra-cost-btn');
    const extraCostTemplate = document.getElementById('extra-cost-template');

    const templateSelect = document.getElementById('fee-template-select');
    const exchangeIcon = document.querySelector('.exchange-rate-badge i');

    const saveProjBtn = document.getElementById('save-project-btn');
    const loadProjBtn = document.getElementById('load-project-btn');
    
    let currentPlatform = 'shopee';

    const configInputs = [
        'exchange-rate', 'cn-shipping', 'weight', 'dim-l', 'dim-w', 'dim-h', 
        'destination', 'check-goods', 'wood-pack',
        'target-profit', 'shopee-fixed-fee', 'shopee-pay-fee', 
        'shopee-vxtra-fee', 'shopee-fxtra-fee', 'shopee-tax-fee', 'shopee-mkt-fee',
        'shopee-piship', 'shopee-infra', 'shopee-pack-rate'
    ];

    // --- UTILS ---
    const fmt = (v) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Math.round(v));
    const getVal = (id) => { const el = document.getElementById(id); return el ? (parseFloat(el.value) || 0) : 0; };

    // --- REAL-TIME EXCHANGE RATE ---
    const fetchExchangeRate = async () => {
        exchangeIcon.classList.add('loading');
        try {
            const res = await fetch('https://api.exchangerate-api.com/v4/latest/CNY');
            const data = await res.json();
            if (data.rates && data.rates.VND) {
                document.getElementById('exchange-rate').value = Math.round(data.rates.VND);
                calculate(); saveState();
            }
        } catch (e) { console.warn("Rate fetch failed"); }
        finally { exchangeIcon.classList.remove('loading'); }
    };
    fetchExchangeRate();

    // --- CATEGORY TEMPLATES ---
    const templates = {
        'shopee-mall': { 'shopee-fixed-fee': 14, 'shopee-pay-fee': 4.91, 'shopee-vxtra-fee': 0, 'shopee-fxtra-fee': 0, 'shopee-tax-fee': 0, 'shopee-mkt-fee': 10 },
        'shopee-fav': { 'shopee-fixed-fee': 10, 'shopee-pay-fee': 4.91, 'shopee-vxtra-fee': 4, 'shopee-fxtra-fee': 7, 'shopee-tax-fee': 1.5, 'shopee-mkt-fee': 10 },
        'tiktok-standard': { 'shopee-fixed-fee': 4, 'shopee-pay-fee': 2.5, 'shopee-vxtra-fee': 0, 'shopee-fxtra-fee': 2, 'shopee-tax-fee': 1.5, 'shopee-mkt-fee': 5 }
    };

    templateSelect.onchange = () => {
        const t = templates[templateSelect.value];
        if (t) { Object.keys(t).forEach(id => { const el = document.getElementById(id); if (el) el.value = t[id]; }); calculate(); saveState(); }
    };

    // --- TAB SWITCH ---
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(btn.dataset.tab).classList.add('active');
            saveState();
        };
    });

    // --- PLATFORM SWITCH ---
    document.querySelectorAll('.switch-option').forEach(opt => {
        opt.onclick = () => {
            document.querySelectorAll('.switch-option').forEach(o => o.classList.remove('active'));
            opt.classList.add('active');
            currentPlatform = opt.dataset.platform;
            const title = document.getElementById('platform-title');
            if (currentPlatform === 'tiktok') { title.textContent = 'Cấu hình TikTok Shop'; templateSelect.value = 'tiktok-standard'; }
            else { title.textContent = 'Cấu hình Shopee'; templateSelect.value = 'shopee-fav'; }
            templateSelect.dispatchEvent(new Event('change'));
        };
    });

    // --- EXTRA COSTS ---
    const addExtraCost = (data = null) => {
        const clone = extraCostTemplate.content.cloneNode(true);
        const item = clone.querySelector('.extra-cost-item');
        if (data) { item.querySelector('.e-name').value = data.name; item.querySelector('.e-amount').value = data.amount; }
        extraCostsList.appendChild(item);
        const current = extraCostsList.lastElementChild;
        current.querySelectorAll('input').forEach(i => i.oninput = () => { calculate(); saveState(); });
        current.querySelector('.remove-extra-btn').onclick = () => { current.remove(); calculate(); saveState(); };
        refreshIcons();
        calculate();
    };
    addExtraCostBtn.onclick = () => addExtraCost();

    // --- PRODUCTS ---
    const addProductRow = (data = null) => {
        const clone = rowTemplate.content.cloneNode(true);
        const row = clone.querySelector('.product-row');
        if (data) {
            row.querySelector('.p-name').value = data.name || '';
            row.querySelector('.p-price').value = data.price || '';
            row.querySelector('.p-qty').value = data.qty || 1;
            row.querySelector('.p-img-url').value = data.img || '';
            row.querySelector('.p-actual-price').value = data.actualPrice || '';
            row.querySelector('.p-sold').value = data.sold || 0;
        }
        productList.appendChild(row);
        const current = productList.lastElementChild;
        attachRowListeners(current);
        updateAllComboSelects();
        calculate();
        refreshIcons();
    };

    const attachRowListeners = (row) => {
        row.querySelectorAll('input').forEach(input => {
            input.addEventListener('input', () => {
                if (input.classList.contains('p-name')) updateAllComboSelects();
                calculate(); saveState();
            });
        });
        row.querySelector('.remove-btn').onclick = () => { row.remove(); updateAllComboSelects(); calculate(); saveState(); };
    };

    // --- COMBOS ---
    const addCombo = (data = null) => {
        const clone = comboCardTemplate.content.cloneNode(true);
        comboList.appendChild(clone);
        const currentCard = comboList.lastElementChild;
        if (data) {
            currentCard.querySelector('.combo-name').value = data.name || '';
            data.items.forEach(item => addComboItem(currentCard, item));
        } else { addComboItem(currentCard); }
        currentCard.querySelector('.add-item-to-combo-btn').onclick = () => addComboItem(currentCard);
        currentCard.querySelector('.remove-combo-btn').onclick = () => { currentCard.remove(); calculate(); saveState(); };
        currentCard.querySelector('.combo-name').addEventListener('input', saveState);
        refreshIcons(); calculate();
    };

    const addComboItem = (card, data = null) => {
        const itemsList = card.querySelector('.combo-items-list');
        const clone = comboItemTemplate.content.cloneNode(true);
        itemsList.appendChild(clone);
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
        select.innerHTML = '<option value="">Chọn SP...</option>';
        document.querySelectorAll('.product-row').forEach((row, index) => {
            const name = row.querySelector('.p-name').value || `SP #${index + 1}`;
            const opt = document.createElement('option'); opt.value = index; opt.textContent = name;
            select.appendChild(opt);
        });
        select.value = currentVal;
    };
    const updateAllComboSelects = () => document.querySelectorAll('.combo-product-select').forEach(s => populateSelect(s));

    suggestComboBtn.onclick = () => {
        const rows = document.querySelectorAll('.product-row');
        if (rows.length === 0) return alert("Cần có ít nhất 1 sản phẩm để gợi ý!");
        const first = rows[0].querySelector('.p-name').value || "Sản phẩm 1";
        addCombo({ name: `Combo 2x ${first}`, items: [{ productId: 0, qty: 2 }] });
        if (rows.length >= 2) {
            const second = rows[1].querySelector('.p-name').value || "Sản phẩm 2";
            addCombo({ name: `Gói Bundle ${first} + ${second}`, items: [{ productId: 0, qty: 1 }, { productId: 1, qty: 1 }] });
        }
        alert("Đã tạo 2 mẫu Combo gợi ý dựa trên sản phẩm của bạn!");
    };

    // --- CALCULATE ---
    const calculate = () => {
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

        // Extra costs
        let extraTotal = 0;
        document.querySelectorAll('.extra-cost-item').forEach(item => { extraTotal += (parseFloat(item.querySelector('.e-amount').value) || 0); });

        const rows = document.querySelectorAll('.product-row');
        let totalMerchCNY = 0; let totalTotalQty = 0;

        const productData = Array.from(rows).map(row => {
            const price = parseFloat(row.querySelector('.p-price').value) || 0;
            const qty = parseInt(row.querySelector('.p-qty').value) || 0;
            const sold = parseInt(row.querySelector('.p-sold').value) || 0;
            const actualSell = parseFloat(row.querySelector('.p-actual-price').value) || 0;
            const imgInput = row.querySelector('.p-img-url');
            const imgContainer = row.querySelector('.img-preview');
            
            if (imgInput.value) {
                let img = imgContainer.querySelector('img');
                if (!img) { img = document.createElement('img'); imgContainer.appendChild(img); }
                img.src = imgInput.value;
            } else { const img = imgContainer.querySelector('img'); if (img) img.remove(); }

            totalMerchCNY += (price * qty); totalTotalQty += qty;
            return { price, qty, sold, actualSell, 
                landedEl: row.querySelector('.p-landed-cost'), 
                shopeeEl: row.querySelector('.p-shopee-price'), 
                stockEl: row.querySelector('.p-stock'),
                realProfitEl: row.querySelector('.p-real-profit'),
                barEl: row.querySelector('.profit-bar')
            };
        });

        const totalProductVND = totalMerchCNY * rate;
        let serviceFee = totalProductVND > 0 ? Math.max(5000, totalProductVND * (totalProductVND > 3000000 ? 0.025 : 0.03)) : 0;
        const chargeW = Math.max(weight, (L*W*H)/6000, rows.length > 0 ? 0.3 : 0);
        const shippingFee = chargeW * (dest === 'hanoi' ? (chargeW >= 50 ? 23000 : 24000) : (chargeW >= 50 ? 29000 : 30000));
        let checkFee = isCheck ? (totalTotalQty <= 2 ? 5000 : totalTotalQty <= 10 ? 3000 : 2000) : 0;
        let woodFee = isWood ? (20 + Math.max(0, chargeW - 1)) * rate : 0;
        const totalFees = serviceFee + shippingFee + checkFee + woodFee + (cnShipY * rate);
        const feeMult = totalProductVND > 0 ? (totalFees / totalProductVND) : 0;

        let totalExpectedProfit = 0; let totalRealizedProfit = 0; let totalStockValue = 0; let totalRevenue = 0;

        productData.forEach(p => {
            const unitLanded = (p.price * rate) * (1 + feeMult);
            p.landedEl.textContent = p.price > 0 ? fmt(unitLanded) : '0đ';
            p.stockEl.textContent = Math.max(0, p.qty - p.sold);
            totalStockValue += (unitLanded * Math.max(0, p.qty - p.sold));

            let spSuggested = unitLanded / 0.5;
            const variableRates = sFixed + sPay + sTax + sPack + mktFee;
            for (let i = 0; i < 5; i++) {
                const vx = Math.min(spSuggested * sVxtra, 50000);
                const fx = Math.min(spSuggested * sFxtra, 40000);
                const div = 1 - (variableRates + tProfit);
                spSuggested = (unitLanded + (totalTotalQty > 0 ? flatFeesUnit/totalTotalQty : 0) + vx + fx) / (div > 0 ? div : 1);
            }
            if (p.price > 0) {
                p.shopeeEl.textContent = fmt(spSuggested);
                let sellPrice = p.actualSell || spSuggested;
                const fees = (totalTotalQty > 0 ? flatFeesUnit/totalTotalQty : 0) + Math.min(sellPrice*sVxtra, 50000) + Math.min(sellPrice*sFxtra, 40000) + (sellPrice * variableRates);
                const netProfit = sellPrice - (unitLanded + fees);
                
                let percent = (netProfit / (sellPrice * tProfit)) * 50 + 50; 
                p.barEl.style.width = `${Math.max(5, Math.min(100, percent))}%`;
                p.barEl.className = 'profit-bar ' + (netProfit > (sellPrice * tProfit * 0.8) ? 'safe' : (netProfit > 0 ? 'warning' : ''));

                p.realProfitEl.textContent = fmt(netProfit);
                p.realProfitEl.className = 'p-real-profit ' + (netProfit > 0 ? 'pos' : 'neg');
                
                totalExpectedProfit += (netProfit * p.qty);
                totalRealizedProfit += (netProfit * p.sold);
                totalRevenue += (sellPrice * p.sold);
            }
        });

        document.querySelectorAll('.combo-card').forEach(card => {
            let comboLanded = 0;
            card.querySelectorAll('.combo-item').forEach(item => {
                const pIdx = item.querySelector('.combo-product-select').value;
                if (pIdx !== "" && productData[pIdx]) comboLanded += (productData[pIdx].price * rate * (1 + feeMult)) * (parseInt(item.querySelector('.combo-qty').value) || 0);
            });
            card.querySelector('.c-total-landed').textContent = fmt(comboLanded);
            let sp = comboLanded / 0.7;
            for (let i = 0; i < 5; i++) {
                sp = (comboLanded + (totalTotalQty>0?flatFeesUnit/totalTotalQty:0) + Math.min(sp*sVxtra, 50000) + Math.min(sp*sFxtra, 40000)) / (1 - (sFixed + sPay + sTax + sPack + mktFee + tProfit));
            }
            card.querySelector('.c-shopee-price').textContent = comboLanded > 0 ? fmt(sp) : '0đ';
        });

        // Sidebar Update
        document.getElementById('stat-total-profit').textContent = fmt(totalExpectedProfit - extraTotal);
        document.getElementById('stat-realized-profit').textContent = fmt(totalRealizedProfit - extraTotal);
        document.getElementById('stat-stock-value').textContent = fmt(totalStockValue);
        document.getElementById('stat-total-capital').textContent = fmt(totalProductVND + totalFees + extraTotal);
        document.getElementById('stat-roi').textContent = Math.round((totalProductVND+totalFees) > 0 ? ((totalExpectedProfit-extraTotal)/(totalProductVND+totalFees)*100) : 0) + '%';
        
        document.getElementById('res-product-price').textContent = fmt(totalProductVND);
        document.getElementById('res-service-fee').textContent = fmt(serviceFee);
        document.getElementById('res-intl-shipping').textContent = fmt(shippingFee);
        document.getElementById('res-extra-total').textContent = fmt(extraTotal);
        
        document.getElementById('total-stock-value').textContent = fmt(totalStockValue);
        document.getElementById('total-realized-profit').textContent = fmt(totalRealizedProfit - extraTotal);
    };

    // --- SAVE/LOAD ---
    const saveState = () => {
        const state = { platform: currentPlatform, config: {}, items: [], combos: [], extras: [] };
        configInputs.forEach(id => { const el = document.getElementById(id); if (el) state.config[id] = el.type === 'checkbox' ? el.checked : el.value; });
        document.querySelectorAll('.product-row').forEach(r => state.items.push({ name: r.querySelector('.p-name').value, price: r.querySelector('.p-price').value, qty: r.querySelector('.p-qty').value, img: r.querySelector('.p-img-url').value, actualPrice: r.querySelector('.p-actual-price').value, sold: r.querySelector('.p-sold').value }));
        document.querySelectorAll('.combo-card').forEach(card => {
            const cb = { name: card.querySelector('.combo-name').value, items: [] };
            card.querySelectorAll('.combo-item').forEach(i => cb.items.push({ productId: i.querySelector('.combo-product-select').value, qty: i.querySelector('.combo-qty').value }));
            state.combos.push(cb);
        });
        document.querySelectorAll('.extra-cost-item').forEach(i => state.extras.push({ name: i.querySelector('.e-name').value, amount: i.querySelector('.e-amount').value }));
        localStorage.setItem('shope_calc_vFinal', JSON.stringify(state));
    };

    const loadState = (customData = null) => {
        const state = customData || JSON.parse(localStorage.getItem('shope_calc_vFinal'));
        if (!state) { addProductRow(); return; }
        productList.innerHTML = ''; comboList.innerHTML = ''; extraCostsList.innerHTML = '';
        if (state.platform) currentPlatform = state.platform;
        configInputs.forEach(id => { const el = document.getElementById(id); if (el && state.config[id] !== undefined) { if (el.type === 'checkbox') el.checked = state.config[id]; else el.value = state.config[id]; } });
        state.items.forEach(item => addProductRow(item));
        if (state.combos) state.combos.forEach(c => addCombo(c));
        if (state.extras) state.extras.forEach(e => addExtraCost(e));
        calculate();
    };

    saveProjBtn.onclick = () => {
        const name = prompt("Tên dự án muốn lưu:", "Dự án mới " + new Date().toLocaleDateString());
        if (!name) return;
        const projects = JSON.parse(localStorage.getItem('shope_projects') || '{}');
        const state = { platform: currentPlatform, config: {}, items: [], combos: [], extras: [] };
        // ... build state as in saveState ...
        configInputs.forEach(id => { const el = document.getElementById(id); if (el) state.config[id] = el.value; });
        document.querySelectorAll('.product-row').forEach(r => state.items.push({ name: r.querySelector('.p-name').value, price: r.querySelector('.p-price').value, qty: r.querySelector('.p-qty').value, actualPrice: r.querySelector('.p-actual-price').value, sold: r.querySelector('.p-sold').value }));
        projects[name] = state;
        localStorage.setItem('shope_projects', JSON.stringify(projects));
        alert("Đã lưu dự án!");
    };

    loadProjBtn.onclick = () => {
        const projects = JSON.parse(localStorage.getItem('shope_projects') || '{}');
        const names = Object.keys(projects);
        if (names.length === 0) return alert("Chưa có dự án nào được lưu!");
        const chosen = prompt("Chọn tên dự án:\n" + names.join("\n"));
        if (chosen && projects[chosen]) loadState(projects[chosen]);
    };

    addProductBtn.onclick = () => addProductRow();
    addComboBtn.onclick = () => addCombo();
    configInputs.forEach(id => { const el = document.getElementById(id); if (el) el.addEventListener('input', () => { calculate(); saveState(); }); });

    // --- EXCEL HANDLERS ---
    const importInput = document.getElementById('import-excel-input');
    const importBtn = document.getElementById('import-excel-btn');
    const exportBtn = document.getElementById('export-excel-btn');

    if (exportBtn) {
        exportBtn.onclick = () => {
            console.log("Exporting...");
            const data = [['STT', 'Sản phẩm', 'Giá tệ', 'SL', 'Vốn về tay', 'Gợi ý Sàn', 'Bán Ra (đ)', 'Đã Bán', 'Tồn', 'Lợi Nhuận/SP']];
            document.querySelectorAll('.product-row').forEach((r, i) => {
                data.push([
                    i + 1,
                    r.querySelector('.p-name').value,
                    r.querySelector('.p-price').value,
                    r.querySelector('.p-qty').value,
                    r.querySelector('.p-landed-cost').textContent,
                    r.querySelector('.p-shopee-price').textContent,
                    r.querySelector('.p-actual-price').value,
                    r.querySelector('.p-sold').value,
                    r.querySelector('.p-stock').textContent,
                    r.querySelector('.p-real-profit').textContent
                ]);
            });
            const ws = XLSX.utils.aoa_to_sheet(data);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Inventory");
            XLSX.writeFile(wb, `OrderPlus_Pro_Export_${new Date().getTime()}.xlsx`);
        };
    }

    if (importBtn && importInput) {
        importBtn.onclick = () => importInput.click();
        importInput.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (evt) => {
                try {
                    const data = new Uint8Array(evt.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const json = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
                    if (json.length > 0) {
                        productList.innerHTML = '';
                        json.forEach(row => {
                            const name = row['TÊN SẢN PHẨM'] || row['Sản phẩm'] || row['Tên sản phẩm'] || '';
                            const price = parseFloat(row['GIÁ TỆ'] || row['Giá tệ'] || row['Giá tệ/SP'] || 0);
                            const qty = parseInt(row['SỐ LƯỢNG'] || row['SL'] || row['Số lượng'] || 0);
                            const sold = parseInt(row['ĐÃ BÁN'] || row['Đã bán'] || 0);
                            if (name || price > 0) addProductRow({ name, price, qty: qty || 1, sold: sold });
                        });
                        calculate(); saveState();
                        alert(`Nhập thành công ${productList.children.length} sản phẩm!`);
                    }
                } catch (err) { alert("Lỗi khi đọc file Excel!"); }
            };
            reader.readAsArrayBuffer(file);
            importInput.value = '';
        };
    }

    loadState();
});
