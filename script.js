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
    
    let currentPlatform = 'shopee';

    const configInputs = [
        'exchange-rate', 'cn-shipping', 'weight', 'dim-l', 'dim-w', 'dim-h', 
        'destination', 'check-goods', 'wood-pack',
        'target-profit', 'shopee-fixed-fee', 'shopee-pay-fee', 'shopee-ads-fee', 
        'shopee-vxtra-fee', 'shopee-fxtra-fee', 'shopee-tax-fee', 'shopee-mkt-fee',
        'shopee-piship', 'shopee-infra', 'shopee-pack-rate', 'shopee-staff-rate', 'shopee-svoucher-rate'
    ];

    const results = {
        productPrice: document.getElementById('res-product-price'),
        serviceFee: document.getElementById('res-service-fee'),
        intlShipping: document.getElementById('res-intl-shipping'),
        checkFee: document.getElementById('res-check-fee'),
        woodFee: document.getElementById('res-wood-fee'),
        totalCost: document.getElementById('total-cost'),
        deposit: document.getElementById('deposit-amount'),
        itemCheck: document.getElementById('item-check-goods'),
        itemWood: document.getElementById('item-wood-pack')
    };

    let cachedFeeMult = 0;

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
                // Adjust default fees for TikTok if needed
                document.getElementById('shopee-pay-fee').value = 2.5; // TikTok Transaction Fee
                document.getElementById('shopee-fixed-fee').value = 4.0; // TikTok Commission
            } else {
                title.textContent = 'Cấu hình Shopee';
                icon.dataset.lucide = 'shopping-bag';
                icon.style.color = '#ee4d2d';
                document.getElementById('shopee-pay-fee').value = 4.91;
                document.getElementById('shopee-fixed-fee').value = 10;
            }
            refreshIcons();
            calculate();
            saveState();
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
        } else {
            addComboItem(currentCard);
        }
        currentCard.querySelector('.add-item-to-combo-btn').onclick = () => addComboItem(currentCard);
        currentCard.querySelector('.remove-combo-btn').onclick = () => {
            currentCard.remove();
            calculate();
            saveState();
        };
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
        if (data) {
            select.value = data.productId;
            currentItem.querySelector('.combo-qty').value = data.qty;
        }
        select.onchange = () => { calculate(); saveState(); };
        currentItem.querySelector('.combo-qty').oninput = () => { calculate(); saveState(); };
        currentItem.querySelector('.remove-item-btn').onclick = () => {
            currentItem.remove();
            calculate();
            saveState();
        };
        refreshIcons();
    };

    const populateSelect = (select) => {
        const currentVal = select.value;
        select.innerHTML = '<option value="">Chọn sản phẩm...</option>';
        document.querySelectorAll('.product-row').forEach((row, index) => {
            const name = row.querySelector('.p-name').value || `Sản phẩm #${index + 1}`;
            const opt = document.createElement('option');
            opt.value = index;
            opt.textContent = name;
            select.appendChild(opt);
        });
        select.value = currentVal;
    };

    const updateAllComboSelects = () => {
        document.querySelectorAll('.combo-product-select').forEach(select => populateSelect(select));
    };

    const calculate = () => {
        const rate = getRate();
        const cnShipY = parseFloat(document.getElementById('cn-shipping').value) || 0;
        const weight = parseFloat(document.getElementById('weight').value) || 0;
        const L = parseFloat(document.getElementById('dim-l').value) || 0;
        const W = parseFloat(document.getElementById('dim-w').value) || 0;
        const H = parseFloat(document.getElementById('dim-h').value) || 0;
        const dest = document.getElementById('destination').value;
        const isCheck = document.getElementById('check-goods').checked;
        const isWood = document.getElementById('wood-pack').checked;

        // Platform Configs
        const tProfit = (parseFloat(document.getElementById('target-profit').value) || 0) / 100;
        const mktFee = (parseFloat(document.getElementById('shopee-mkt-fee').value) || 0) / 100;
        const sFixed = (parseFloat(document.getElementById('shopee-fixed-fee').value) || 0) / 100;
        const sPay = (parseFloat(document.getElementById('shopee-pay-fee').value) || 0) / 100;
        const sAds = (parseFloat(document.getElementById('shopee-ads-fee').value) || 0) / 100;
        const sVxtra = (parseFloat(document.getElementById('shopee-vxtra-fee').value) || 0) / 100;
        const sFxtra = (parseFloat(document.getElementById('shopee-fxtra-fee').value) || 0) / 100;
        const sTax = (parseFloat(document.getElementById('shopee-tax-fee').value) || 0) / 100;
        const sStaff = (parseFloat(document.getElementById('shopee-staff-rate').value) || 0) / 100;
        const sVoucher = (parseFloat(document.getElementById('shopee-svoucher-rate').value) || 0) / 100;
        const sPack = (parseFloat(document.getElementById('shopee-pack-rate').value) || 0) / 100;
        const piShip = parseFloat(document.getElementById('shopee-piship').value) || 0;
        const infra = parseFloat(document.getElementById('shopee-infra').value) || 0;
        const flatFeesUnit = (piShip + infra);

        const rows = document.querySelectorAll('.product-row');
        let totalMerchCNY = 0;
        let totalQty = 0;

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
            } else {
                const img = imgContainer.querySelector('img');
                if (img) img.remove();
            }

            totalMerchCNY += (price * qty);
            totalQty += qty;
            return { 
                price, qty, actualSell, compPrice, fsRate,
                landedEl: row.querySelector('.p-landed-cost'), 
                shopeeEl: row.querySelector('.p-shopee-price'),
                realProfitEl: row.querySelector('.p-real-profit')
            };
        });

        const totalProductVND = totalMerchCNY * rate;
        let serviceRate = (totalProductVND > 100000000) ? 0.01 : (totalProductVND > 30000000) ? 0.02 : (totalProductVND > 3000000) ? 0.025 : 0.03;
        let serviceFee = totalProductVND > 0 ? Math.max(5000, totalProductVND * serviceRate) : 0;
        const volW = (L * W * H) / 6000;
        const chargeW = Math.max(weight, volW, rows.length > 0 ? 0.3 : 0);
        let sRate = (dest === 'hanoi') ? (chargeW >= 500 ? 22000 : chargeW >= 50 ? 23000 : 24000) : (chargeW >= 500 ? 28000 : chargeW >= 50 ? 29000 : 30000);
        const shippingFee = chargeW * sRate;
        let checkFee = isCheck ? (totalQty <= 2 ? 5000 : totalQty <= 10 ? 3000 : 2000) : 0;
        let woodFee = isWood ? (20 + Math.max(0, chargeW - 1)) * rate : 0;
        const totalFees = serviceFee + shippingFee + checkFee + woodFee + (cnShipY * rate);
        const totalOrderVND = totalProductVND + totalFees;
        cachedFeeMult = totalProductVND > 0 ? (totalFees / totalProductVND) : 0;

        const fmt = (v) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Math.round(v));
        let totalNetProfit = 0;
        let totalRevenue = 0;

        productData.forEach(p => {
            const unitLanded = (p.price * rate) * (1 + cachedFeeMult);
            p.landedEl.textContent = p.price > 0 ? fmt(unitLanded) : '0đ';

            // Suggested Price Iteration
            let spSuggested = unitLanded / 0.5;
            const variableRates = sFixed + sPay + sAds + sTax + sStaff + sVoucher + sPack + mktFee;
            for (let i = 0; i < 5; i++) {
                const vx = Math.min(spSuggested * sVxtra, 50000);
                const fx = Math.min(spSuggested * sFxtra, 40000);
                const flat = totalQty > 0 ? (flatFeesUnit / totalQty) : 0;
                const div = 1 - (variableRates + tProfit);
                if (div > 0) spSuggested = (unitLanded + flat + vx + fx) / div;
            }

            if (p.price > 0) {
                p.shopeeEl.textContent = fmt(spSuggested);
                
                // Real Profit Calculation (Handling Flash Sale & Mkt Ads)
                let sellPrice = p.actualSell || spSuggested;
                
                // If competitor price is set and higher than landed, you might want to match it
                // Logic: real profit based on actualSell, applying FS discount
                const effectiveSell = sellPrice * (1 - p.fsRate);
                const vx = Math.min(effectiveSell * sVxtra, 50000);
                const fx = Math.min(effectiveSell * sFxtra, 40000);
                const flat = totalQty > 0 ? (flatFeesUnit / totalQty) : 0;
                const costs = effectiveSell * variableRates;
                const netProfit = effectiveSell - (unitLanded + flat + vx + fx + costs);
                
                p.realProfitEl.textContent = fmt(netProfit);
                p.realProfitEl.className = 'p-real-profit ' + (netProfit > 0 ? 'pos' : 'neg');
                
                // Competitor Analysis Micro-feedback
                if (p.compPrice > 0) {
                    const diff = effectiveSell - p.compPrice;
                    p.realProfitEl.title = `Rẻ hơn đối thủ: ${fmt(Math.abs(diff))}`;
                }

                totalNetProfit += (netProfit * p.qty);
                totalRevenue += (effectiveSell * p.qty);
            } else p.shopeeEl.textContent = '---';
        });

        // --- COMBOS ---
        document.querySelectorAll('.combo-card').forEach(card => {
            let comboLanded = 0;
            card.querySelectorAll('.combo-item').forEach(item => {
                const pIdx = item.querySelector('.combo-product-select').value;
                const q = parseInt(item.querySelector('.combo-qty').value) || 0;
                if (pIdx !== "" && productData[pIdx]) {
                    comboLanded += (productData[pIdx].price * rate * (1 + cachedFeeMult)) * q;
                }
            });
            card.querySelector('.c-total-landed').textContent = fmt(comboLanded);
            const variableRates = sFixed + sPay + sAds + sTax + sStaff + sVoucher + sPack + mktFee;
            let sp = comboLanded / 0.7;
            for (let i = 0; i < 5; i++) {
                const vx = Math.min(sp * sVxtra, 50000);
                const fx = Math.min(sp * sFxtra, 40000);
                const flat = totalQty > 0 ? (flatFeesUnit / totalQty) : 0;
                const div = 1 - (variableRates + tProfit);
                if (div > 0) sp = (comboLanded + flat + vx + fx) / div;
            }
            card.querySelector('.c-shopee-price').textContent = comboLanded > 0 ? fmt(sp) : '0đ';
        });

        results.itemCheck.classList.toggle('hidden', !isCheck);
        results.itemWood.classList.toggle('hidden', !isWood);
        results.productPrice.textContent = fmt(totalProductVND);
        results.serviceFee.textContent = fmt(serviceFee);
        results.intlShipping.textContent = fmt(shippingFee);
        results.checkFee.textContent = fmt(checkFee);
        results.woodFee.textContent = fmt(woodFee);
        results.totalCost.textContent = fmt(totalOrderVND);
        results.deposit.textContent = fmt(totalOrderVND * 0.7);

        document.getElementById('stat-total-capital').textContent = fmt(totalOrderVND);
        document.getElementById('stat-total-revenue').textContent = fmt(totalRevenue);
        document.getElementById('stat-total-profit').textContent = fmt(totalNetProfit);
        document.getElementById('stat-roi').textContent = Math.round(totalOrderVND > 0 ? (totalNetProfit/totalOrderVND*100) : 0) + '%';
    };

    addProductBtn.onclick = () => addProductRow();
    addComboBtn.onclick = () => addCombo();
    configInputs.forEach(id => document.getElementById(id).addEventListener('input', () => { calculate(); saveState(); }));

    document.getElementById('export-excel-btn').onclick = () => {
        const data = [['STT', 'Sản phẩm', 'Giá tệ', 'SL', 'Vốn về tay', 'Giá Sàn', 'Giá Bạn Bán', 'Lợi Nhuận Thực']];
        document.querySelectorAll('.product-row').forEach((r, i) => {
            data.push([i+1, r.querySelector('.p-name').value, r.querySelector('.p-price').value, r.querySelector('.p-qty').value, r.querySelector('.p-landed-cost').textContent, r.querySelector('.p-shopee-price').textContent, r.querySelector('.p-actual-price').value, r.querySelector('.p-real-profit').textContent]);
        });
        const ws = XLSX.utils.aoa_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Order");
        XLSX.writeFile(wb, `OrderPlus_${new Date().getTime()}.xlsx`);
    };

    const importInput = document.getElementById('import-excel-input');
    document.getElementById('import-excel-btn').onclick = () => importInput.click();
    importInput.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
            const workbook = XLSX.read(evt.target.result, { type: 'binary' });
            const json = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
            if (json.length > 0) {
                productList.innerHTML = '';
                json.forEach(row => {
                    addProductRow({
                        name: `${row['TÊN SẢN PHẨM'] || ''} (${row['THUỘC TÍNH'] || ''})`.trim(),
                        price: parseFloat(row['GIÁ TỆ']) || 0,
                        qty: parseInt(row['SỐ LƯỢNG']) || 0
                    });
                    if (parseFloat(row['TỈ GIÁ'])) document.getElementById('exchange-rate').value = row['TỈ GIÁ'];
                });
                calculate(); saveState(); alert(`Đã nạp ${json.length} sản phẩm!`);
            }
        };
        reader.readAsBinaryString(file);
        importInput.value = '';
    };

    const saveState = () => {
        const state = { platform: currentPlatform, config: {}, items: [], combos: [] };
        configInputs.forEach(id => {
            const el = document.getElementById(id);
            state.config[id] = el.type === 'checkbox' ? el.checked : el.value;
        });
        document.querySelectorAll('.product-row').forEach(r => {
            state.items.push({ 
                name: r.querySelector('.p-name').value, 
                price: r.querySelector('.p-price').value, 
                qty: r.querySelector('.p-qty').value, 
                img: r.querySelector('.p-img-url').value,
                actualPrice: r.querySelector('.p-actual-price').value,
                compPrice: r.querySelector('.p-comp-price').value,
                fsRate: r.querySelector('.p-fs-rate').value
            });
        });
        document.querySelectorAll('.combo-card').forEach(card => {
            const combo = { name: card.querySelector('.combo-name').value, items: [] };
            card.querySelectorAll('.combo-item').forEach(item => {
                combo.items.push({ productId: item.querySelector('.combo-product-select').value, qty: item.querySelector('.combo-qty').value });
            });
            state.combos.push(combo);
        });
        localStorage.setItem('shope_calc_v6', JSON.stringify(state));
    };

    const loadState = () => {
        const saved = localStorage.getItem('shope_calc_v6');
        if (!saved) { addProductRow(); return; }
        const state = JSON.parse(saved);
        if (state.platform) {
            currentPlatform = state.platform;
            document.querySelectorAll('.switch-option').forEach(o => {
                o.classList.toggle('active', o.dataset.platform === currentPlatform);
            });
            const title = document.getElementById('platform-title');
            if (currentPlatform === 'tiktok') title.textContent = 'Cấu hình TikTok Shop';
        }
        configInputs.forEach(id => {
            const el = document.getElementById(id);
            if (el && state.config[id] !== undefined) {
                if (el.type === 'checkbox') el.checked = state.config[id];
                else el.value = state.config[id];
            }
        });
        state.items.forEach(item => addProductRow(item));
        if (state.combos) state.combos.forEach(c => addCombo(c));
        calculate();
    };

    loadState();
});
