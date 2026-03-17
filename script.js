document.addEventListener('DOMContentLoaded', () => {
    // Initialize Lucide icons
    lucide.createIcons();

    // Elements
    const inputs = [
        'exchange-rate', 'product-price', 'cn-shipping', 'weight', 'quantity',
        'dim-l', 'dim-w', 'dim-h', 'destination', 'check-goods', 'wood-pack'
    ];
    
    const elements = {};
    inputs.forEach(id => {
        elements[id] = document.getElementById(id);
    });

    const results = {
        productPrice: document.getElementById('res-product-price'),
        serviceFee: document.getElementById('res-service-fee'),
        intlShipping: document.getElementById('res-intl-shipping'),
        checkFee: document.getElementById('res-check-fee'),
        woodFee: document.getElementById('res-wood-fee'),
        totalCost: document.getElementById('total-cost'),
        deposit: document.getElementById('deposit-amount'),
        remaining: document.getElementById('remaining-amount'),
        itemCheck: document.getElementById('item-check-goods'),
        itemWood: document.getElementById('item-wood-pack')
    };

    // Calculation Logic
    const calculate = () => {
        const rate = parseFloat(elements['exchange-rate'].value) || 0;
        const priceY = parseFloat(elements['product-price'].value) || 0;
        const cnShipY = parseFloat(elements['cn-shipping'].value) || 0;
        const weight = parseFloat(elements['weight'].value) || 0;
        const qty = parseInt(elements['quantity'].value) || 1;
        const L = parseFloat(elements['dim-l'].value) || 0;
        const W = parseFloat(elements['dim-w'].value) || 0;
        const H = parseFloat(elements['dim-h'].value) || 0;
        const dest = elements['destination'].value;
        const isCheck = elements['check-goods'].checked;
        const isWood = elements['wood-pack'].checked;

        // 1. Product price in VND (excluding shipping for fee base)
        const productVND = priceY * rate;
        const totalGoodsVND = (priceY + cnShipY) * rate;
        
        // 2. Service Fee (Based on Product Price only)
        let serviceRate = 0.03;
        if (productVND > 100000000) serviceRate = 0.01;
        else if (productVND > 30000000) serviceRate = 0.02;
        else if (productVND > 3000000) serviceRate = 0.025;
        
        let serviceFee = productVND * serviceRate;
        if (productVND > 0 && serviceFee < 5000) serviceFee = 5000;

        // 3. International Shipping
        // Calc volumetric weight
        const volWeight = (L * W * H) / 6000;
        const chargeWeight = Math.max(weight, volWeight, 0.3); // Min 0.3kg
        
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

        // 4. Checking Fee (Optional)
        // 1-2: 5000, 3-10: 3000, 11-100: 2000
        let checkFee = 0;
        if (isCheck) {
            if (qty <= 2) checkFee = 5000;
            else if (qty <= 10) checkFee = 3000;
            else checkFee = 2000;
        }
        results.itemCheck.classList.toggle('hidden', !isCheck);

        // 5. Wood Packing Fee (Optional)
        // 20Y for 1st kg, 1Y for next kg
        let woodFee = 0;
        if (isWood) {
            const woodY = 20 + Math.max(0, (chargeWeight - 1) * 1);
            woodFee = woodY * rate;
        }
        results.itemWood.classList.toggle('hidden', !isWood);

        // Totals
        const total = totalGoodsVND + serviceFee + shippingFee + checkFee + woodFee;
        const deposit = total * 0.7;
        const remaining = total * 0.3;

        // Format Currency
        const fmt = (num) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Math.round(num));

        results.productPrice.textContent = fmt(totalGoodsVND);
        results.serviceFee.textContent = fmt(serviceFee);
        results.intlShipping.textContent = fmt(shippingFee);
        results.checkFee.textContent = fmt(checkFee);
        results.woodFee.textContent = fmt(woodFee);
        results.totalCost.textContent = fmt(total);
        results.deposit.textContent = fmt(deposit);
        results.remaining.textContent = fmt(remaining);
    };

    // Attach listeners
    inputs.forEach(id => {
        elements[id].addEventListener('input', calculate);
    });

    // Initial calculation
    calculate();
});
