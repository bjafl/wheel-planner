import { describe, it, expect } from 'vitest';
import { applyInverseMatrix } from './pointerMath';

describe('applyInverseMatrix', () => {
  it('maps a screen point back through a pure translation', () => {
    const matrix = { a: 1, b: 0, c: 0, d: 1, e: 100, f: 50 }; // translate(100, 50)
    const result = applyInverseMatrix(matrix, 150, 80);
    expect(result.x).toBeCloseTo(50, 5);
    expect(result.y).toBeCloseTo(30, 5);
  });

  it('maps a screen point back through translation + uniform scale', () => {
    const matrix = { a: 2, b: 0, c: 0, d: 2, e: 100, f: 50 }; // translate(100,50) scale(2)
    const result = applyInverseMatrix(matrix, 200, 150);
    expect(result.x).toBeCloseTo(50, 5);
    expect(result.y).toBeCloseTo(50, 5);
  });
});
