import { fmt } from './calculator.js';

export const refreshIcons = () => lucide.createIcons();

export const updateRowUI = (row, data) => {
    row.querySelector('.p-landed-cost').textContent = data.price > 0 ? fmt(data.unitLanded) : '0đ';
    row.querySelector('.p-shopee-price').textContent = data.price > 0 ? fmt(data.spSuggested) : '---';
    row.querySelector('.p-stock').textContent = data.stock;
    
    const profitEl = row.querySelector('.p-real-profit');
    profitEl.textContent = fmt(data.netProfit);
    profitEl.className = 'p-real-profit ' + (data.netProfit > 0 ? 'pos' : 'neg');
    
    const barEl = row.querySelector('.profit-bar');
    if (data.price > 0) {
        barEl.style.width = `${Math.max(5, Math.min(100, data.profitPercent))}%`;
        barEl.className = 'profit-bar ' + (data.netProfit > (data.actualSell * 0.2 * 0.8) ? 'safe' : (data.netProfit > 0 ? 'warning' : ''));
    } else {
        barEl.style.width = '0%';
    }

    // Image preview
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
};

export const updateComboUI = (card, data) => {
    card.querySelector('.c-total-landed').textContent = fmt(data.landed);
    card.querySelector('.c-shopee-price').textContent = data.landed > 0 ? fmt(data.suggested) : '0đ';
};

export const updateSidebarUI = (summary) => {
    document.getElementById('stat-total-profit').textContent = fmt(summary.totalExpectedProfit);
    document.getElementById('stat-realized-profit').textContent = fmt(summary.totalRealizedProfit);
    document.getElementById('stat-stock-value').textContent = fmt(summary.totalStockValue);
    document.getElementById('stat-total-capital').textContent = fmt(summary.totalCapital);
    document.getElementById('stat-roi').textContent = Math.round(summary.roi) + '%';
    
    document.getElementById('res-product-price').textContent = fmt(summary.feesDetail.product);
    document.getElementById('res-service-fee').textContent = fmt(summary.feesDetail.service);
    document.getElementById('res-intl-shipping').textContent = fmt(summary.feesDetail.shipping);
    document.getElementById('res-extra-total').textContent = fmt(summary.feesDetail.extra);
    
    document.getElementById('total-stock-value').textContent = fmt(summary.totalStockValue);
    document.getElementById('total-realized-profit').textContent = fmt(summary.totalRealizedProfit);

    // Global classes
    const profitBox = document.getElementById('stat-total-profit');
    profitBox.className = 'val highlight ' + (summary.totalExpectedProfit >= 0 ? 'success' : 'danger');
};
