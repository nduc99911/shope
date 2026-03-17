import { calculateEngine } from './calculator.js';
import { refreshIcons, updateRowUI, updateComboUI, updateSidebarUI } from './ui.js';
import { exportToExcel, parseExcel } from './excel.js';

document.addEventListener('DOMContentLoaded', () => {
    const productList = document.getElementById('product-list');
    const comboList = document.getElementById('combo-list');
    const extraCostsList = document.getElementById('extra-costs-list');
    const templateSelect = document.getElementById('fee-template-select');
    
    let currentPlatform = 'shopee';
    const configInputs = [
        'exchange-rate', 'cn-shipping', 'weight', 'dim-l', 'dim-w', 'dim-h', 
        'destination', 'check-goods', 'wood-pack',
        'target-profit', 'shopee-fixed-fee', 'shopee-pay-fee', 
        'shopee-vxtra-fee', 'shopee-fxtra-fee', 'shopee-tax-fee', 'shopee-mkt-fee',
        'shopee-piship', 'shopee-infra', 'shopee-pack-rate'
    ];

    const getFullConfigs = () => {
        const conf = {};
        configInputs.forEach(id => {
            const el = document.getElementById(id);
            if (el) conf[id.replace(/-/g, '_')] = el.type === 'checkbox' ? el.checked : parseFloat(el.value) || 0;
        });
        // Remap to match engine expected keys
        return {
            rate: getVal('exchange-rate'),
            cnShipY: getVal('cn-shipping'),
            weight: getVal('weight'),
            L: getVal('dim-l'), W: getVal('dim-w'), H: getVal('dim-h'),
            dest: document.getElementById('destination').value,
            isCheck: document.getElementById('check-goods').checked,
            isWood: document.getElementById('wood-pack').checked,
            tProfit: getVal('target-profit') / 100,
            mktFee: getVal('shopee-mkt-fee') / 100,
            sFixed: getVal('shopee-fixed-fee') / 100,
            sPay: getVal('shopee-pay-fee') / 100,
            sVxtra: getVal('shopee-vxtra-fee') / 100,
            sFxtra: getVal('shopee-fxtra-fee') / 100,
            sTax: getVal('shopee-tax-fee') / 100,
            sPack: getVal('shopee-pack-rate') / 100,
            piShip: getVal('shopee-piship'),
            infra: getVal('shopee-infra'),
            extraTotal: Array.from(document.querySelectorAll('.extra-cost-item')).reduce((s, i) => s + (parseFloat(i.querySelector('.e-amount').value) || 0), 0)
        };
    };

    const getVal = (id) => { const el = document.getElementById(id); return el ? (parseFloat(el.value) || 0) : 0; };

    const calculate = () => {
        const state = {
            items: Array.from(document.querySelectorAll('.product-row')).map(r => ({
                name: r.querySelector('.p-name').value,
                price: r.querySelector('.p-price').value,
                qty: r.querySelector('.p-qty').value,
                sold: r.querySelector('.p-sold').value,
                actualPrice: r.querySelector('.p-actual-price').value,
                img: r.querySelector('.p-img-url').value
            })),
            combos: Array.from(document.querySelectorAll('.combo-card')).map(card => ({
                name: card.querySelector('.combo-name').value,
                items: Array.from(card.querySelectorAll('.combo-item')).map(i => ({
                    productId: i.querySelector('.combo-product-select').value,
                    qty: i.querySelector('.combo-qty').value
                }))
            }))
        };

        const result = calculateEngine(state, getFullConfigs());

        // Sync UI
        document.querySelectorAll('.product-row').forEach((row, i) => updateRowUI(row, result.products[i]));
        document.querySelectorAll('.combo-card').forEach((card, i) => updateComboUI(card, result.combos[i]));
        updateSidebarUI(result.summary);
    };

    // --- Row Management ---
    const addProductRow = (data = null) => {
        const rowTemplate = document.getElementById('product-row-template');
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
        current.querySelectorAll('input').forEach(i => i.oninput = () => { if (i.classList.contains('p-name')) updateAllComboSelects(); calculate(); saveState(); });
        current.querySelector('.remove-btn').onclick = () => { current.remove(); updateAllComboSelects(); calculate(); saveState(); };
        updateAllComboSelects();
        calculate(); refreshIcons();
    };

    const addExtraCost = (data = null) => {
        const extraCostTemplate = document.getElementById('extra-cost-template');
        const clone = extraCostTemplate.content.cloneNode(true);
        const item = clone.querySelector('.extra-cost-item');
        if (data) { item.querySelector('.e-name').value = data.name; item.querySelector('.e-amount').value = data.amount; }
        extraCostsList.appendChild(item);
        const current = extraCostsList.lastElementChild;
        current.querySelectorAll('input').forEach(i => i.oninput = () => { calculate(); saveState(); });
        current.querySelector('.remove-extra-btn').onclick = () => { current.remove(); calculate(); saveState(); };
        calculate(); refreshIcons();
    };

    const addCombo = (data = null) => {
        const comboCardTemplate = document.getElementById('combo-card-template');
        const comboItemTemplate = document.getElementById('combo-item-template');
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
        calculate(); refreshIcons();
    };

    const addComboItem = (card, data = null) => {
        const comboItemTemplate = document.getElementById('combo-item-template');
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

    // --- Persistence ---
    const saveState = () => {
        const state = {
            platform: currentPlatform,
            config: {},
            items: Array.from(document.querySelectorAll('.product-row')).map(r => ({
                name: r.querySelector('.p-name').value,
                price: r.querySelector('.p-price').value,
                qty: r.querySelector('.p-qty').value,
                img: r.querySelector('.p-img-url').value,
                actualPrice: r.querySelector('.p-actual-price').value,
                sold: r.querySelector('.p-sold').value
            })),
            combos: Array.from(document.querySelectorAll('.combo-card')).map(card => ({
                name: card.querySelector('.combo-name').value,
                items: Array.from(card.querySelectorAll('.combo-item')).map(i => ({
                    productId: i.querySelector('.combo-product-select').value,
                    qty: i.querySelector('.combo-qty').value
                }))
            })),
            extras: Array.from(document.querySelectorAll('.extra-cost-item')).map(i => ({
                name: i.querySelector('.e-name').value,
                amount: i.querySelector('.e-amount').value
            }))
        };
        configInputs.forEach(id => { const el = document.getElementById(id); if (el) state.config[id] = el.type === 'checkbox' ? el.checked : el.value; });
        localStorage.setItem('shope_calc_vFinal_Mod', JSON.stringify(state));
    };

    const loadState = (customData = null) => {
        const state = customData || JSON.parse(localStorage.getItem('shope_calc_vFinal_Mod') || localStorage.getItem('shope_calc_vFinal'));
        if (!state) { addProductRow(); return; }
        productList.innerHTML = ''; comboList.innerHTML = ''; extraCostsList.innerHTML = '';
        if (state.platform) currentPlatform = state.platform;
        configInputs.forEach(id => { const el = document.getElementById(id); if (el && state.config[id] !== undefined) { if (el.type === 'checkbox') el.checked = state.config[id]; else el.value = state.config[id]; } });
        state.items.forEach(item => addProductRow(item));
        if (state.combos) state.combos.forEach(c => addCombo(c));
        if (state.extras) state.extras.forEach(e => addExtraCost(e));
        calculate();
    };

    // --- Tab Switching ---
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
            btn.classList.add('active');
            const target = document.getElementById(btn.dataset.tab);
            if (target) target.classList.add('active');
            saveState();
        };
    });

    // --- Platform Switching ---
    document.querySelectorAll('.switch-option').forEach(opt => {
        opt.onclick = () => {
            document.querySelectorAll('.switch-option').forEach(o => o.classList.remove('active'));
            opt.classList.add('active');
            currentPlatform = opt.dataset.platform;
            const title = document.getElementById('platform-title');
            if (currentPlatform === 'tiktok') { 
                title.textContent = 'Cấu hình TikTok Shop'; 
                templateSelect.value = 'tiktok-standard'; 
            } else { 
                title.textContent = 'Cấu hình Shopee'; 
                templateSelect.value = 'shopee-fav'; 
            }
            templateSelect.dispatchEvent(new Event('change'));
            calculate();
            saveState();
        };
    });

    // --- Event Listeners ---
    document.getElementById('add-product-btn').onclick = () => addProductRow();
    document.getElementById('add-combo-btn').onclick = () => addCombo();
    document.getElementById('add-extra-cost-btn').onclick = () => addExtraCost();
    
    document.getElementById('suggest-combo-btn').onclick = () => {
        const rows = document.querySelectorAll('.product-row');
        if (rows.length === 0) return alert("Cần có ít nhất 1 sản phẩm để gợi ý!");
        const first = rows[0].querySelector('.p-name').value || "Sản phẩm 1";
        addCombo({ name: `Combo 2x ${first}`, items: [{ productId: "0", qty: "2" }] });
        alert("Đã tạo mẫu Combo gợi ý!");
    };

    templateSelect.onchange = () => {
        const templates = {
            'shopee-mall': { 'shopee-fixed-fee': 14, 'shopee-pay-fee': 4.91, 'shopee-vxtra-fee': 0, 'shopee-fxtra-fee': 0, 'shopee-tax-fee': 0, 'shopee-mkt-fee': 10 },
            'shopee-fav': { 'shopee-fixed-fee': 10, 'shopee-pay-fee': 4.91, 'shopee-vxtra-fee': 4, 'shopee-fxtra-fee': 7, 'shopee-tax-fee': 1.5, 'shopee-mkt-fee': 10 },
            'tiktok-standard': { 'shopee-fixed-fee': 4, 'shopee-pay-fee': 2.5, 'shopee-vxtra-fee': 0, 'shopee-fxtra-fee': 2, 'shopee-tax-fee': 1.5, 'shopee-mkt-fee': 5 }
        };
        const t = templates[templateSelect.value];
        if (t) { Object.keys(t).forEach(id => { const el = document.getElementById(id); if (el) el.value = t[id]; }); calculate(); saveState(); }
    };

    configInputs.forEach(id => { const el = document.getElementById(id); if (el) el.addEventListener('input', () => { calculate(); saveState(); }); });

    document.getElementById('export-excel-btn').onclick = () => {
        const rows = Array.from(document.querySelectorAll('.product-row')).map(r => ({
            name: r.querySelector('.p-name').value,
            price: r.querySelector('.p-price').value,
            qty: r.querySelector('.p-qty').value,
            landed: r.querySelector('.p-landed-cost').textContent,
            shopee: r.querySelector('.p-shopee-price').textContent,
            actual: r.querySelector('.p-actual-price').value,
            sold: r.querySelector('.p-sold').value,
            stock: r.querySelector('.p-stock').textContent,
            profit: r.querySelector('.p-real-profit').textContent
        }));
        exportToExcel(rows);
    };

    const importInput = document.getElementById('import-excel-input');
    document.getElementById('import-excel-btn').onclick = () => importInput.click();
    importInput.onchange = async (e) => {
        const json = await parseExcel(e.target.files[0]);
        if (json) {
            productList.innerHTML = '';
            json.forEach(row => {
                const name = row['TÊN SẢN PHẨM'] || row['Sản phẩm'] || row['Tên sản phẩm'] || '';
                const price = parseFloat(row['GIÁ TỆ'] || row['Giá tệ'] || row['Giá tệ/SP'] || 0);
                const qty = parseInt(row['SỐ LƯỢNG'] || row['SL'] || row['Số lượng'] || 0);
                const sold = parseInt(row['ĐÃ BÁN'] || row['Đã bán'] || 0);
                if (name || price > 0) addProductRow({ name, price, qty: qty || 1, sold });
            });
            calculate(); saveState();
        }
    };

    document.getElementById('save-project-btn').onclick = () => {
        const name = prompt("Tên dự án:", "Dự án mới " + new Date().toLocaleDateString());
        if (!name) return;
        const projects = JSON.parse(localStorage.getItem('shope_projects_v2') || '{}');
        // Simple snapshot
        projects[name] = JSON.parse(localStorage.getItem('shope_calc_vFinal_Mod'));
        localStorage.setItem('shope_projects_v2', JSON.stringify(projects));
        alert("Đã lưu dự án!");
    };

    document.getElementById('load-project-btn').onclick = () => {
        const projects = JSON.parse(localStorage.getItem('shope_projects_v2') || '{}');
        const names = Object.keys(projects);
        if (names.length === 0) return alert("Chưa có dự án nào!");
        const chosen = prompt("Chọn dự án:\n" + names.join("\n"));
        if (chosen && projects[chosen]) loadState(projects[chosen]);
    };

    const fetchExchangeRate = async () => {
        const exchangeIcon = document.querySelector('.exchange-rate-badge i');
        exchangeIcon.classList.add('loading');
        try {
            const res = await fetch('https://api.exchangerate-api.com/v4/latest/CNY');
            const data = await res.json();
            if (data.rates?.VND) { document.getElementById('exchange-rate').value = Math.round(data.rates.VND); calculate(); saveState(); }
        } catch (e) {} finally { exchangeIcon.classList.remove('loading'); }
    };

    fetchExchangeRate();
    loadState();
});
