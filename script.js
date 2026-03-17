document.addEventListener('DOMContentLoaded', () => {
    // Initialize Lucide icons
    const refreshIcons = () => lucide.createIcons();
    refreshIcons();

    // Elements
    const productList = document.getElementById('product-list');
    const addProductBtn = document.getElementById('add-product-btn');
    const rowTemplate = document.getElementById('product-row-template');
    
    // Config IDs
    const configInputs = [
        'exchange-rate', 'cn-shipping', 'weight', 'dim-l', 'dim-w', 'dim-h', 
        'destination', 'check-goods', 'wood-pack',
        'target-profit', 'shopee-fixed-fee', 'shopee-pay-fee', 'shopee-ads-fee', 
        'shopee-vxtra-fee', 'shopee-fxtra-fee', 'shopee-tax-fee',
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

    const getRate = () => parseFloat(document.getElementById('exchange-rate').value) || 0;

    const addProductRow = (data = null) => {
        const clone = rowTemplate.content.cloneNode(true);
        const row = clone.querySelector('.product-row');
        
        if (data) {
            row.querySelector('.p-name').value = data.name || '';
            row.querySelector('.p-price').value = data.price || '';
            row.querySelector('.p-qty').value = data.qty || 1;
            row.querySelector('.p-img-url').value = data.img || '';
        }

        productList.appendChild(clone);
        refreshIcons();
        attachRowListeners(productList.lastElementChild);
        calculate();
    };

    const attachRowListeners = (row) => {
        const inputs = row.querySelectorAll('input');
        inputs.forEach(input => {
            input.addEventListener('input', () => {
                calculate();
                saveState();
            });
        });
        const removeBtn = row.querySelector('.remove-btn');
        removeBtn.onclick = () => {
            row.remove();
            calculate();
            saveState();
        };
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

        // Shopee Configs
        const tProfit = (parseFloat(document.getElementById('target-profit').value) || 0) / 100;
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

        const V_CAP = 50000;
        const F_CAP = 40000;

        const rows = document.querySelectorAll('.product-row');
        let totalMerchCNY = 0;
        let totalQty = 0;

        const productData = Array.from(rows).map(row => {
            const price = parseFloat(row.querySelector('.p-price').value) || 0;
            const qty = parseInt(row.querySelector('.p-qty').value) || 0;
            const imgInput = row.querySelector('.p-img-url');
            const imgContainer = row.querySelector('.img-preview');
            
            // Sync Preview
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
            return { price, qty, landedEl: row.querySelector('.p-landed-cost'), shopeeEl: row.querySelector('.p-shopee-price') };
        });

        const totalProductVND = totalMerchCNY * rate;
        
        // Fee Calculation
        let serviceRate = 0.03;
        if (totalProductVND > 100000000) serviceRate = 0.01;
        else if (totalProductVND > 30000000) serviceRate = 0.02;
        else if (totalProductVND > 3000000) serviceRate = 0.025;
        let serviceFee = totalProductVND > 0 ? Math.max(5000, totalProductVND * serviceRate) : 0;

        const volW = (L * W * H) / 6000;
        const chargeW = Math.max(weight, volW, rows.length > 0 ? 0.3 : 0);
        let sRate = (dest === 'hanoi') ? (chargeW >= 500 ? 22000 : chargeW >= 50 ? 23000 : 24000) : (chargeW >= 500 ? 28000 : chargeW >= 50 ? 29000 : 30000);
        const shippingFee = chargeW * sRate;

        let checkFee = 0;
        if (isCheck) checkFee = totalQty <= 2 ? 5000 : totalQty <= 10 ? 3000 : 2000;
        results.itemCheck.classList.toggle('hidden', !isCheck);

        let woodFee = 0;
        if (isWood) woodFee = (20 + Math.max(0, chargeW - 1)) * rate;
        results.itemWood.classList.toggle('hidden', !isWood);

        const totalFees = serviceFee + shippingFee + checkFee + woodFee + (cnShipY * rate);
        const totalOrderVND = totalProductVND + totalFees;
        const feeMult = totalProductVND > 0 ? (totalFees / totalProductVND) : 0;

        const fmt = (v) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Math.round(v));
        let totalRevenue = 0;

        productData.forEach(p => {
            const unitLanded = (p.price * rate) * (1 + feeMult);
            p.landedEl.textContent = p.price > 0 ? fmt(unitLanded) : '0đ';

            // Shopee price (Iterative for caps)
            let sp = unitLanded / 0.7;
            for (let i = 0; i < 5; i++) {
                const vx = Math.min(sp * sVxtra, V_CAP);
                const fx = Math.min(sp * sFxtra, F_CAP);
                const flat = totalQty > 0 ? (flatFeesUnit / totalQty) : 0;
                const varRate = sFixed + sPay + sAds + sTax + sStaff + sVoucher + sPack;
                const div = 1 - (varRate + tProfit);
                if (div > 0) sp = (unitLanded + flat + vx + fx) / div;
            }

            if (p.price > 0) {
                p.shopeeEl.textContent = fmt(sp);
                totalRevenue += (sp * p.qty);
            } else p.shopeeEl.textContent = '---';
        });

        results.productPrice.textContent = fmt(totalProductVND);
        results.serviceFee.textContent = fmt(serviceFee);
        results.intlShipping.textContent = fmt(shippingFee);
        results.checkFee.textContent = fmt(checkFee);
        results.woodFee.textContent = fmt(woodFee);
        results.totalCost.textContent = fmt(totalOrderVND);
        results.deposit.textContent = fmt(totalOrderVND * 0.7);

        const profit = totalRevenue * tProfit;
        document.getElementById('stat-total-capital').textContent = fmt(totalOrderVND);
        document.getElementById('stat-total-revenue').textContent = fmt(totalRevenue);
        document.getElementById('stat-total-profit').textContent = fmt(profit);
        document.getElementById('stat-roi').textContent = Math.round(totalOrderVND > 0 ? (profit/totalOrderVND*100) : 0) + '%';
    };

    // Global Listeners
    addProductBtn.onclick = () => addProductRow();
    configInputs.forEach(id => {
        const el = document.getElementById(id);
        el.addEventListener('input', () => { calculate(); saveState(); });
    });

    // Excel
    document.getElementById('export-excel-btn').onclick = () => {
        const data = [['STT', 'Sản phẩm', 'Giá tệ', 'SL', 'Vốn về tay', 'Giá Shopee']];
        document.querySelectorAll('.product-row').forEach((r, i) => {
            data.push([i+1, r.querySelector('.p-name').value, r.querySelector('.p-price').value, r.querySelector('.p-qty').value, r.querySelector('.p-landed-cost').textContent, r.querySelector('.p-shopee-price').textContent]);
        });
        const ws = XLSX.utils.aoa_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Order");
        XLSX.writeFile(wb, `OrderPlus_${new Date().getTime()}.xlsx`);
    };

    const saveState = () => {
        const state = { config: {}, items: [] };
        configInputs.forEach(id => {
            const el = document.getElementById(id);
            state.config[id] = el.type === 'checkbox' ? el.checked : el.value;
        });
        document.querySelectorAll('.product-row').forEach(r => {
            state.items.push({
                name: r.querySelector('.p-name').value,
                price: r.querySelector('.p-price').value,
                qty: r.querySelector('.p-qty').value,
                img: r.querySelector('.p-img-url').value
            });
        });
        localStorage.setItem('shope_calc_v3', JSON.stringify(state));
    };

    const loadState = () => {
        const saved = localStorage.getItem('shope_calc_v3');
        if (!saved) { addProductRow(); return; }
        const state = JSON.parse(saved);
        configInputs.forEach(id => {
            const el = document.getElementById(id);
            if (el && state.config[id] !== undefined) {
                if (el.type === 'checkbox') el.checked = state.config[id];
                else el.value = state.config[id];
            }
        });
        state.items.forEach(item => addProductRow(item));
        calculate();
    };

    loadState();
});
