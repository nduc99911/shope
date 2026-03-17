export const fmt = (v) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Math.round(v));

export const calculateEngine = (state, configs) => {
    const { rate, cnShipY, weight, L, W, H, dest, isCheck, isWood, tProfit, mktFee, sFixed, sPay, sVxtra, sFxtra, sTax, sPack, piShip, infra, extraTotal } = configs;
    const flatFeesUnit = (piShip + infra);

    const products = state.items.map(p => {
        const price = parseFloat(p.price) || 0;
        const qty = parseInt(p.qty) || 0;
        const sold = parseInt(p.sold) || 0;
        const actualSell = parseFloat(p.actualPrice) || 0;
        
        return { ...p, price, qty, sold, actualSell };
    });

    const totalMerchCNY = products.reduce((sum, p) => sum + (p.price * p.qty), 0);
    const totalQty = products.reduce((sum, p) => sum + p.qty, 0);
    const totalProductVND = totalMerchCNY * rate;

    // Fees calculation
    let serviceFee = totalProductVND > 0 ? Math.max(5000, totalProductVND * (totalProductVND > 3000000 ? 0.025 : 0.03)) : 0;
    const chargeW = Math.max(weight, (L * W * H) / 6000, products.length > 0 ? 0.3 : 0);
    const shippingFee = chargeW * (dest === 'hanoi' ? (chargeW >= 50 ? 23000 : 24000) : (chargeW >= 50 ? 29000 : 30000));
    let checkFee = isCheck ? (totalQty <= 2 ? 5000 : totalQty <= 10 ? 3000 : 2000) : 0;
    let woodFee = isWood ? (20 + Math.max(0, chargeW - 1)) * rate : 0;
    const totalFees = serviceFee + shippingFee + checkFee + woodFee + (cnShipY * rate);
    const feeMult = totalProductVND > 0 ? (totalFees / totalProductVND) : 0;

    const variableRates = sFixed + sPay + sTax + sPack + mktFee;
    
    let totalExpectedProfit = 0;
    let totalRealizedProfit = 0;
    let totalStockValue = 0;
    let totalRevenue = 0;

    const calculatedProducts = products.map(p => {
        const unitLanded = (p.price * rate) * (1 + feeMult);
        const stock = Math.max(0, p.qty - p.sold);
        totalStockValue += (unitLanded * stock);

        // Suggested Price Iteration
        let spSuggested = unitLanded / 0.5;
        for (let i = 0; i < 5; i++) {
            const vx = Math.min(spSuggested * sVxtra, 50000);
            const fx = Math.min(spSuggested * sFxtra, 40000);
            const div = 1 - (variableRates + tProfit);
            spSuggested = (unitLanded + (totalQty > 0 ? flatFeesUnit / totalQty : 0) + vx + fx) / (div > 0 ? div : 1);
        }

        let sellPrice = p.actualSell || spSuggested;
        const fees = (totalQty > 0 ? flatFeesUnit / totalQty : 0) + Math.min(sellPrice * sVxtra, 50000) + Math.min(sellPrice * sFxtra, 40000) + (sellPrice * variableRates);
        const netProfit = sellPrice - (unitLanded + fees);

        totalExpectedProfit += (netProfit * p.qty);
        totalRealizedProfit += (netProfit * p.sold);
        totalRevenue += (sellPrice * p.sold);

        return {
            ...p,
            unitLanded,
            spSuggested,
            netProfit,
            stock,
            profitPercent: (netProfit / (sellPrice * tProfit)) * 50 + 50
        };
    });

    const calculatedCombos = state.combos.map(cb => {
        let comboLanded = 0;
        cb.items.forEach(item => {
            const p = calculatedProducts[item.productId];
            if (p) comboLanded += p.unitLanded * (parseInt(item.qty) || 0);
        });
        
        let sp = comboLanded / 0.7;
        for (let i = 0; i < 5; i++) {
            sp = (comboLanded + (totalQty > 0 ? flatFeesUnit / totalQty : 0) + Math.min(sp * sVxtra, 50000) + Math.min(sp * sFxtra, 40000)) / (1 - (variableRates + tProfit));
        }
        return { ...cb, landed: comboLanded, suggested: sp };
    });

    return {
        products: calculatedProducts,
        combos: calculatedCombos,
        summary: {
            totalExpectedProfit: totalExpectedProfit - extraTotal,
            totalRealizedProfit: totalRealizedProfit - extraTotal,
            totalStockValue,
            totalCapital: totalProductVND + totalFees + extraTotal,
            totalRevenue,
            roi: (totalProductVND + totalFees) > 0 ? ((totalExpectedProfit - extraTotal) / (totalProductVND + totalFees) * 100) : 0,
            feesDetail: {
                product: totalProductVND,
                service: serviceFee,
                shipping: shippingFee,
                extra: extraTotal
            }
        }
    };
};
