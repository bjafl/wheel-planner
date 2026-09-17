export interface Matrix2D {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
}

export function applyInverseMatrix(m: Matrix2D, screenX: number, screenY: number): { x: number; y: number } {
  const det = m.a * m.d - m.b * m.c;
  const invA = m.d / det;
  const invB = -m.b / det;
  const invC = -m.c / det;
  const invD = m.a / det;
  const invE = (m.c * m.f - m.d * m.e) / det;
  const invF = (m.b * m.e - m.a * m.f) / det;

  return {
    x: invA * screenX + invC * screenY + invE,
    y: invB * screenX + invD * screenY + invF,
  };
}

export function screenToLocalPoint(el: SVGGraphicsElement, clientX: number, clientY: number): { x: number; y: number } {
  const ctm = el.getScreenCTM();
  if (!ctm) return { x: 0, y: 0 };
  return applyInverseMatrix(ctm, clientX, clientY);
}
