document.addEventListener('DOMContentLoaded', () => {
    // Initialize Lucide icons
    const refreshIcons = () => lucide.createIcons();
    refreshIcons();

    // Elements
    const productList = document.getElementById('product-list');
    const addProductBtn = document.getElementById('add-product-btn');
    const rowTemplate = document.getElementById('product-row-template');
    
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

    // State
    const getRate = () => parseFloat(document.getElementById('exchange-rate').value) || 0;

    const addProductRow = () => {
        const clone = rowTemplate.content.cloneNode(true);
        productList.appendChild(clone);
        refreshIcons();
        attachRowListeners();
        calculate();
    };

    const attachRowListeners = () => {
        const rows = document.querySelectorAll('.product-row');
        rows.forEach(row => {
            const inputs = row.querySelectorAll('input');
            inputs.forEach(input => {
                input.removeEventListener('input', calculate);
                input.addEventListener('input', calculate);
            });
            const removeBtn = row.querySelector('.remove-btn');
            removeBtn.removeEventListener('click', () => {});
            removeBtn.onclick = () => {
                row.remove();
                calculate();
            };
        });
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
        const targetProfitRate = (parseFloat(document.getElementById('target-profit').value) || 0) / 100;
        const shopeeFixedRate = (parseFloat(document.getElementById('shopee-fixed-fee').value) || 0) / 100;
        const shopeePayRate = (parseFloat(document.getElementById('shopee-pay-fee').value) || 0) / 100;
        const shopeeAdsRate = (parseFloat(document.getElementById('shopee-ads-fee').value) || 0) / 100;
        const shopeeVxtraRate = (parseFloat(document.getElementById('shopee-vxtra-fee').value) || 0) / 100;
        const shopeeFxtraRate = (parseFloat(document.getElementById('shopee-fxtra-fee').value) || 0) / 100;
        const shopeeTaxRate = (parseFloat(document.getElementById('shopee-tax-fee').value) || 0) / 100;
        
        // Operational percentages (Now adjustable from UI)
        const staffBonusRate = (parseFloat(document.getElementById('shopee-staff-rate').value) || 0) / 100;
        const shopVoucherRate = (parseFloat(document.getElementById('shopee-svoucher-rate').value) || 0) / 100;
        const packRate = (parseFloat(document.getElementById('shopee-pack-rate').value) || 0) / 100;
        
        const piShipFee = parseFloat(document.getElementById('shopee-piship').value) || 0;
        const infraFee = parseFloat(document.getElementById('shopee-infra').value) || 0;
        const flatFeesPerOrder = piShipFee + infraFee;

        // Capped Rates (Shopee Policy)
        const VEXTRA_CAP = 50000;
        const FXTRA_CAP = 40000;

        // ... intermediate logic ...
        
        products.forEach(p => {
            const unitProductVND = p.price * rate;
            const unitLandedVND = unitProductVND * (1 + feeMultiplier);
            p.landedCell.textContent = p.price > 0 ? fmt(unitLandedVND) : '0đ';

            // Shopee Price Formula with CAPS implementation
            // Since suggested price depends on capped fees, we use a simple iterative refinement (3 passes is enough)
            let suggestedPrice = unitLandedVND / 0.5; // Initial guess
            for (let i = 0; i < 5; i++) {
                const vxtraFee = Math.min(suggestedPrice * shopeeVxtraRate, VEXTRA_CAP);
                const fxtraFee = Math.min(suggestedPrice * shopeeFxtraRate, FXTRA_CAP);
                const unitFlatFee = totalQty > 0 ? (flatFeesPerOrder / totalQty) : 0;
                
                // Effective rates for variable fees (excluding capped items)
                const otherFeesRate = shopeeFixedRate + shopeePayRate + shopeeAdsRate + shopeeTaxRate + staffBonusRate + shopVoucherRate + packRate;
                
                // TargetPrice = (Landed + FlatFees + CappedFees) / (1 - OtherFees% - TargetProfit%)
                const divisor = 1 - (otherFeesRate + targetProfitRate);
                if (divisor > 0) {
                    suggestedPrice = (unitLandedVND + unitFlatFee + vxtraFee + fxtraFee) / (1 - otherFeesRate - targetProfitRate);
                }
            }

            if (p.price > 0) {
                p.shopeeCell.textContent = fmt(suggestedPrice);
                totalExpectedRevenue += (suggestedPrice * p.qty);
            } else {
                p.shopeeCell.textContent = '---';
            }
        });

        // Update Summary
        results.productPrice.textContent = fmt(totalProductVND);
        results.serviceFee.textContent = fmt(serviceFee);
        results.intlShipping.textContent = fmt(shippingFee);
        results.checkFee.textContent = fmt(checkFee);
        results.woodFee.textContent = fmt(woodFee);
        results.totalCost.textContent = fmt(totalOrderVND);
        results.deposit.textContent = fmt(totalOrderVND * 0.7);

        // Update Analytics
        const totalProfit = totalExpectedRevenue * targetProfitRate;
        const roi = totalOrderVND > 0 ? (totalProfit / totalOrderVND * 100) : 0;

        document.getElementById('stat-total-capital').textContent = fmt(totalOrderVND);
        document.getElementById('stat-total-revenue').textContent = fmt(totalExpectedRevenue);
        document.getElementById('stat-total-profit').textContent = fmt(totalProfit);
        document.getElementById('stat-roi').textContent = Math.round(roi) + '%';
    };

    // Listeners
    addProductBtn.addEventListener('click', addProductRow);
    configInputs.forEach(id => {
        document.getElementById(id).addEventListener('input', () => {
            calculate();
            saveState();
        });
    });

    // Export to Excel
    document.getElementById('export-excel-btn').addEventListener('click', () => {
        const rows = document.querySelectorAll('.product-row');
        if (rows.length === 0) return alert('Không có dữ liệu để xuất!');

        const data = [
            ['STT', 'Giá Sản Phẩm (¥)', 'Số Lượng', 'Vốn Về Tay/SP (VNĐ)']
        ];

        rows.forEach((row, index) => {
            const price = row.querySelector('.p-price').value;
            const qty = row.querySelector('.p-qty').value;
            const landed = row.querySelector('.p-landed-cost').textContent;
            data.push([index + 1, price, qty, landed]);
        });

        // Add Summary Info
        data.push([]);
        data.push(['TỔNG ĐƠN HÀNG', document.getElementById('total-cost').textContent]);
        data.push(['TIỀN CỌC (70%)', document.getElementById('deposit-amount').textContent]);
        data.push(['TỶ GIÁ', document.getElementById('exchange-rate').value]);

        const ws = XLSX.utils.aoa_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "DonHang");
        
        const fileName = `DonHang_1688_${new Date().toLocaleDateString('vi-VN').replace(/\//g, '-')}.xlsx`;
        XLSX.writeFile(wb, fileName);
    });

    // Persistent Storage
    const saveState = () => {
        const state = {
            config: {},
            products: []
        };
        configInputs.forEach(id => {
            state.config[id] = document.getElementById(id).value;
            if (document.getElementById(id).type === 'checkbox') {
                state.config[id] = document.getElementById(id).checked;
            }
        });
        document.querySelectorAll('.product-row').forEach(row => {
            state.products.push({
                price: row.querySelector('.p-price').value,
                qty: row.querySelector('.p-qty').value
            });
        });
        localStorage.setItem('orderplus_state', JSON.stringify(state));
    };

    const loadState = () => {
        const saved = localStorage.getItem('orderplus_state');
        if (!saved) {
            addProductRow();
            return;
        }
        const state = JSON.parse(saved);
        configInputs.forEach(id => {
            const el = document.getElementById(id);
            if (el.type === 'checkbox') el.checked = state.config[id];
            else el.value = state.config[id];
        });
        state.products.forEach(p => {
            const clone = rowTemplate.content.cloneNode(true);
            clone.querySelector('.p-price').value = p.price;
            clone.querySelector('.p-qty').value = p.qty;
            productList.appendChild(clone);
        });
        refreshIcons();
        attachRowListeners();
        calculate();
    };

    // Init
    loadState();
});
