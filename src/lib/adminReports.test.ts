import { describe, expect, it } from 'vitest';
import { avgOrderValue, dailyCsv, dhakaToday, presetRange, productsCsv, validRange, type Report } from './adminReports';

describe('report ranges', () => {
  it('uses Bangladesh time for "today"', () => {
    // 20:00 UTC on 6 Nov is already 7 Nov in Dhaka
    expect(presetRange('7d', new Date('2026-11-06T20:00:00Z'))).toEqual({ from: '2026-11-01', to: '2026-11-07' });
    expect(dhakaToday(new Date('2026-11-06T17:59:00Z')).toISOString().slice(0, 10)).toBe('2026-11-06');
  });
  it('builds month presets', () => {
    const now = new Date('2026-03-15T06:00:00Z');
    expect(presetRange('this_month', now)).toEqual({ from: '2026-03-01', to: '2026-03-15' });
    expect(presetRange('last_month', now)).toEqual({ from: '2026-02-01', to: '2026-02-28' });
    expect(presetRange('last_month', new Date('2026-01-10T06:00:00Z'))).toEqual({ from: '2025-12-01', to: '2025-12-31' });
    expect(presetRange('30d', now)).toEqual({ from: '2026-02-14', to: '2026-03-15' });
  });
  it('validates custom ranges', () => {
    expect(validRange('2026-11-01', '2026-11-07')).toBeNull();
    expect(validRange('2026-11-07', '2026-11-01')).toMatch(/on or after/);
    expect(validRange('', '2026-11-01')).toMatch(/both/);
    expect(validRange('2024-01-01', '2026-01-01')).toMatch(/one year/);
  });
});

const r = { summary: { sales: 1000, sales_orders: 3 }, daily: [{ date: '2026-11-01', orders: 2, sales: 700 }], products: [{ name: '=cmd()', units: 1, sales: 5 }] } as unknown as Report;
describe('report helpers', () => {
  it('average order value rounds and handles zero', () => {
    expect(avgOrderValue(r)).toBe(333);
    expect(avgOrderValue({ summary: { sales: 0, sales_orders: 0 } } as Report)).toBe(0);
  });
  it('CSV exports are formula-safe', () => {
    expect(dailyCsv(r)).toContain('2026-11-01,2,700');
    expect(productsCsv(r)).toContain("'=cmd()");
  });
});
