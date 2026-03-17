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
        'destination', 'check-goods', 'wood-pack'
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

        // 1. Calculate Merchandise Total
        const rows = document.querySelectorAll('.product-row');
        let totalMerchCNY = 0;
        let totalQty = 0;

        const products = Array.from(rows).map(row => {
            const price = parseFloat(row.querySelector('.p-price').value) || 0;
            const qty = parseInt(row.querySelector('.p-qty').value) || 1;
            totalMerchCNY += (price * qty);
            totalQty += qty;
            return { price, qty, landedCell: row.querySelector('.p-landed-cost') };
        });

        const totalProductVND = totalMerchCNY * rate;
        const totalShipCNVND = cnShipY * rate;
        const totalBaseVND = totalProductVND + totalShipCNVND;

        // 2. Service Fee (Based on Product Price only per OrderPlus rule)
        let serviceRate = 0.03;
        if (totalProductVND > 100000000) serviceRate = 0.01;
        else if (totalProductVND > 30000000) serviceRate = 0.02;
        else if (totalProductVND > 3000000) serviceRate = 0.025;
        
        let serviceFee = totalProductVND * serviceRate;
        if (totalProductVND > 0 && serviceFee < 5000) serviceFee = 5000;

        // 3. International Shipping
        const volWeight = (L * W * H) / 6000;
        const chargeWeight = Math.max(weight, volWeight, rows.length > 0 ? 0.3 : 0);
        
        let shippingUnitRate = 0;
        if (dest === 'hanoi') {
            if (chargeWeight >= 500) shippingUnitRate = 22000;
            else if (chargeWeight >= 50) shippingUnitRate = 23000;
            else shippingUnitRate = 24000;
        } else {
            if (chargeWeight >= 500) shippingUnitRate = 28000;
            else if (chargeWeight >= 50) shippingUnitRate = 29000;
            else shippingUnitRate = 30000;
        }
        const shippingFee = chargeWeight * shippingUnitRate;

        // 4. Optional Fees
        let checkFee = 0;
        if (isCheck) {
            if (totalQty <= 2) checkFee = 5000;
            else if (totalQty <= 10) checkFee = 3000;
            else checkFee = 2000;
        }
        results.itemCheck.classList.toggle('hidden', !isCheck);

        let woodFee = 0;
        if (isWood) {
            const woodY = 20 + Math.max(0, (chargeWeight - 1) * 1);
            woodFee = woodY * rate;
        }
        results.itemWood.classList.toggle('hidden', !isWood);

        // 5. Total and Landed Cost Per Product
        const totalAllFeesVND = serviceFee + shippingFee + checkFee + woodFee + totalShipCNVND;
        const totalOrderVND = totalProductVND + totalAllFeesVND;

        // Proportional factor for fees relative to product value
        // Landed Unit Cost = (PriceY * Rate) + (PriceY * Qty / totalMerchCNY * totalAllFeesVND) / Qty
        // Simplified: Unit Cost = (PriceY * Rate) * (1 + totalAllFeesVND / totalProductVND)
        const feeMultiplier = totalProductVND > 0 ? (totalAllFeesVND / totalProductVND) : 0;

        const fmt = (num) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Math.round(num));

        products.forEach(p => {
            const unitProductVND = p.price * rate;
            const unitLandedVND = unitProductVND * (1 + feeMultiplier);
            p.landedCell.textContent = p.price > 0 ? fmt(unitLandedVND) : '0đ';
        });

        // Update Summary
        results.productPrice.textContent = fmt(totalProductVND);
        results.serviceFee.textContent = fmt(serviceFee);
        results.intlShipping.textContent = fmt(shippingFee);
        results.checkFee.textContent = fmt(checkFee);
        results.woodFee.textContent = fmt(woodFee);
        results.totalCost.textContent = fmt(totalOrderVND);
        results.deposit.textContent = fmt(totalOrderVND * 0.7);
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
