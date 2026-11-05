import { describe, expect, it } from 'vitest';
import {
  copySku,
  copySlug,
  csvCell,
  friendlyDbError,
  generateVariants,
  parseColorList,
  parseList,
  sellingFromDiscount,
  stockStatus,
  toCsv,
  validateImageFile,
  validatePricing,
  variantSku,
} from './adminCatalog';

describe('image validation', () => {
  it('accepts allowed types within 5 MB', () => {
    expect(validateImageFile({ type: 'image/webp', size: 1000 })).toBeNull();
  });
  it('rejects wrong type, oversize and empty files', () => {
    expect(validateImageFile({ type: 'application/pdf', size: 1000 })).toMatch(/JPG/);
    expect(validateImageFile({ type: 'image/svg+xml', size: 1000 })).toMatch(/JPG/);
    expect(validateImageFile({ type: 'image/png', size: 6 * 1024 * 1024 })).toMatch(/5 MB/);
    expect(validateImageFile({ type: 'image/png', size: 0 })).toMatch(/empty/);
  });
});

describe('pricing', () => {
  it('computes selling price from a discount percentage', () => {
    expect(sellingFromDiscount(1000, 20)).toBe(800);
    expect(sellingFromDiscount(799, 25)).toBe(599);
    expect(sellingFromDiscount(1000, 0)).toBe(1000);
    expect(sellingFromDiscount(1000, 150)).toBe(1000);
  });
  it('rejects a selling price above the regular price', () => {
    expect(validatePricing(1000, 800)).toBeNull();
    expect(validatePricing(1000, 1000)).toBeNull();
    expect(validatePricing(1000, 1200)).toMatch(/cannot be higher/);
    expect(validatePricing(-1, 0)).toMatch(/Regular/);
    expect(validatePricing(100, NaN)).toMatch(/Selling/);
  });
});

describe('variants', () => {
  it('builds readable SKUs', () => {
    expect(variantSku('vay-tee-001', 'XL', 'Black')).toBe('VAY-TEE-001-XL-BLAC');
    expect(variantSku('VAY-1', 'Free Size', null)).toBe('VAY-1-FREE');
  });

  it('generates size x colour combinations and skips existing ones', () => {
    const v = generateVariants('P1', ['M', 'L'], [{ name: 'Black', hex: '#171717' }, { name: 'White', hex: null }], [{ size: 'm', color: 'black' }]);
    expect(v.map((x) => `${x.size}/${x.color}`)).toEqual(['M/White', 'L/Black', 'L/White']);
    expect(v[1].colorHex).toBe('#171717');
  });

  it('handles size-only and colour-only products, and nothing at all', () => {
    expect(generateVariants('P1', ['S', 'M'], [], [])).toHaveLength(2);
    expect(generateVariants('P1', [], [{ name: 'Red', hex: null }], [])).toHaveLength(1);
    expect(generateVariants('P1', [], [], [])).toHaveLength(0);
  });

  it('parses size and colour lists', () => {
    expect(parseList('S, M,\nL, M,, ')).toEqual(['S', 'M', 'L']);
    expect(parseColorList('Black:#171717, white, Black:#000000, Red:nothex')).toEqual([
      { name: 'Black', hex: '#171717' },
      { name: 'white', hex: null },
      { name: 'Red', hex: null },
    ]);
  });
});

describe('duplicates', () => {
  it('finds a free slug and sku', () => {
    expect(copySlug('cotton-tee', new Set())).toBe('cotton-tee-copy');
    expect(copySlug('cotton-tee', new Set(['cotton-tee-copy']))).toBe('cotton-tee-copy-2');
    expect(copySku('VAY-1', new Set(['VAY-1-COPY', 'VAY-1-COPY2']))).toBe('VAY-1-COPY3');
  });
});

describe('csv export', () => {
  it('quotes commas, quotes and newlines', () => {
    expect(csvCell('a,b')).toBe('"a,b"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell('x\ny')).toBe('"x\ny"');
    expect(csvCell(null)).toBe('');
    expect(csvCell(1200)).toBe('1200');
  });
  it('neutralises spreadsheet formulas', () => {
    expect(csvCell('=HYPERLINK("http://evil")')).toBe(`"'=HYPERLINK(""http://evil"")"`);
    expect(csvCell('+1')).toBe("'+1");
    expect(csvCell('@SUM(A1)')).toBe("'@SUM(A1)");
  });
  it('joins rows with CRLF', () => {
    expect(toCsv(['a', 'b'], [[1, 'x,y']])).toBe('a,b\r\n1,"x,y"');
  });
});

describe('stock status', () => {
  it('classifies availability', () => {
    expect(stockStatus(10, 10, 5)).toBe('out');
    expect(stockStatus(10, 6, 5)).toBe('low');
    expect(stockStatus(50, 0, 5)).toBe('ok');
    expect(stockStatus(0, 0, 5)).toBe('out');
  });
});

describe('friendlyDbError', () => {
  it('explains common database errors in plain words', () => {
    expect(friendlyDbError({ code: '23505', message: 'duplicate key value violates unique constraint "products_slug_key"' })).toMatch(/slug/);
    expect(friendlyDbError({ code: '23505', message: 'duplicate key ... products_sku_key' })).toMatch(/SKU/);
    expect(friendlyDbError({ code: '23503', message: 'violates foreign key constraint' })).toMatch(/still in use/);
    expect(friendlyDbError({ code: '23514', message: 'violates check constraint "inventory_check"' })).toMatch(/not allowed/);
    expect(friendlyDbError({ code: '23514', message: 'violates check constraint "inventory_check" reserved' })).toMatch(/reserved/);
    expect(friendlyDbError({ code: '42501', message: 'new row violates row-level security policy' })).toMatch(/permission/);
    expect(friendlyDbError(null)).toBeTruthy();
  });
});
