import { describe, it, expect } from 'vitest';
import { calculateEngine } from './calculator.js';

describe('Calculator Engine', () => {
    const mockConfigs = {
        rate: 3950, cnShipY: 0, weight: 0.5, L: 10, W: 10, H: 10, dest: 'hanoi',
        isCheck: false, isWood: false, tProfit: 0.2, mktFee: 0.1, sFixed: 0.1,
        sPay: 0.0491, sVxtra: 0.04, sFxtra: 0.07, sTax: 0.015, sPack: 0.01,
        piShip: 1620, infra: 3000, extraTotal: 0
    };

    it('should correctly calculate landed cost for a simple product', () => {
        const state = { items: [{ name: 'Test Product', price: 10, qty: 1, sold: 0, actualPrice: 0 }], combos: [] };
        const result = calculateEngine(state, mockConfigs);
        
        // Landed cost = (10 CNY * 3950) + International Shipping + Service Fee...
        // Hanoi shipping for 0.5kg (chargeW < 50) is 24000
        // Service fee min is 5000
        // (10 * 3950) = 39500 VND
        // Landing = 39500 + 12000 + 5000 = 56500
        expect(result.products[0].unitLanded).toBe(56500);
    });

    it('should correctly calculate realized profit for sold items', () => {
        const state = { items: [{ name: 'Sold Product', price: 10, qty: 10, sold: 5, actualPrice: 150000 }], combos: [] };
        const result = calculateEngine(state, mockConfigs);
        
        expect(result.summary.totalRealizedProfit).toBeGreaterThan(0);
        expect(result.summary.totalExpectedProfit).toBeGreaterThan(result.summary.totalRealizedProfit);
    });
});
