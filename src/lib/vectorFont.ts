/**
 * Simple retro-vector 4x8 stroke font for generating hardware-independent text paths
 * coordinates are defined in (0,0) as the bottom-left of the glyph bounding box with width 4, height 8.
 */

const GLYPHS: Record<string, number[][][]> = {
  '0': [
    [
      [0, 0],
      [4, 0],
      [4, 8],
      [0, 8],
      [0, 0],
    ],
    [
      [0, 8],
      [4, 0],
    ],
  ],
  '1': [
    [
      [2, 0],
      [2, 8],
    ],
    [
      [1, 6],
      [2, 8],
    ],
  ],
  '2': [
    [
      [0, 8],
      [4, 8],
      [4, 4],
      [0, 4],
      [0, 0],
      [4, 0],
    ],
  ],
  '3': [
    [
      [0, 8],
      [4, 8],
      [4, 0],
      [0, 0],
    ],
    [
      [0, 4],
      [4, 4],
    ],
  ],
  '4': [
    [
      [0, 8],
      [0, 4],
      [4, 4],
    ],
    [
      [4, 8],
      [4, 0],
    ],
  ],
  '5': [
    [
      [4, 8],
      [0, 8],
      [0, 4],
      [4, 4],
      [4, 0],
      [0, 0],
    ],
  ],
  '6': [
    [
      [4, 8],
      [0, 8],
      [0, 0],
      [4, 0],
      [4, 4],
      [0, 4],
    ],
  ],
  '7': [
    [
      [0, 8],
      [4, 8],
      [2, 0],
    ],
  ],
  '8': [
    [
      [0, 0],
      [4, 0],
      [4, 8],
      [0, 8],
      [0, 0],
    ],
    [
      [0, 4],
      [4, 4],
    ],
  ],
  '9': [
    [
      [4, 0],
      [4, 8],
      [0, 8],
      [0, 4],
      [4, 4],
    ],
  ],

  A: [
    [
      [0, 0],
      [0, 4],
      [2, 8],
      [4, 4],
      [4, 0],
    ],
    [
      [0, 4],
      [4, 4],
    ],
  ],
  B: [
    [
      [0, 0],
      [0, 8],
      [3, 8],
      [4, 6],
      [3, 4],
      [0, 4],
    ],
    [
      [3, 4],
      [4, 2],
      [3, 0],
      [0, 0],
    ],
  ],
  C: [
    [
      [4, 8],
      [0, 8],
      [0, 0],
      [4, 0],
    ],
  ],
  D: [
    [
      [0, 0],
      [0, 8],
      [3, 8],
      [4, 4],
      [3, 0],
      [0, 0],
    ],
  ],
  E: [
    [
      [4, 8],
      [0, 8],
      [0, 0],
      [4, 0],
    ],
    [
      [0, 4],
      [3, 4],
    ],
  ],
  F: [
    [
      [0, 0],
      [0, 8],
      [4, 8],
    ],
    [
      [0, 4],
      [3, 4],
    ],
  ],
  G: [
    [
      [4, 8],
      [0, 8],
      [0, 0],
      [4, 0],
      [4, 4],
      [2, 4],
    ],
  ],
  H: [
    [
      [0, 0],
      [0, 8],
    ],
    [
      [4, 0],
      [4, 8],
    ],
    [
      [0, 4],
      [4, 4],
    ],
  ],
  I: [
    [
      [2, 0],
      [2, 8],
    ],
    [
      [0, 8],
      [4, 8],
    ],
    [
      [0, 0],
      [4, 0],
    ],
  ],
  J: [
    [
      [0, 2],
      [2, 0],
      [4, 0],
      [4, 8],
    ],
  ],
  K: [
    [
      [0, 0],
      [0, 8],
    ],
    [
      [0, 4],
      [4, 8],
    ],
    [
      [0, 4],
      [4, 0],
    ],
  ],
  L: [
    [
      [0, 8],
      [0, 0],
      [4, 0],
    ],
  ],
  M: [
    [
      [0, 0],
      [0, 8],
      [2, 4],
      [4, 8],
      [4, 0],
    ],
  ],
  N: [
    [
      [0, 0],
      [0, 8],
      [4, 0],
      [4, 8],
    ],
  ],
  O: [
    [
      [0, 0],
      [0, 8],
      [4, 8],
      [4, 0],
      [0, 0],
    ],
  ],
  P: [
    [
      [0, 0],
      [0, 8],
      [4, 8],
      [4, 4],
      [0, 4],
    ],
  ],
  Q: [
    [
      [0, 0],
      [0, 8],
      [4, 8],
      [4, 0],
      [0, 0],
    ],
    [
      [2, 2],
      [4, 0],
    ],
  ],
  R: [
    [
      [0, 0],
      [0, 8],
      [4, 8],
      [4, 4],
      [0, 4],
    ],
    [
      [2, 4],
      [4, 0],
    ],
  ],
  S: [
    [
      [4, 8],
      [0, 8],
      [0, 4],
      [4, 4],
      [4, 0],
      [0, 0],
    ],
  ],
  T: [
    [
      [2, 0],
      [2, 8],
    ],
    [
      [0, 8],
      [4, 8],
    ],
  ],
  U: [
    [
      [0, 8],
      [0, 0],
      [4, 0],
      [4, 8],
    ],
  ],
  V: [
    [
      [0, 8],
      [2, 0],
      [4, 8],
    ],
  ],
  W: [
    [
      [0, 8],
      [0, 0],
      [2, 3],
      [4, 0],
      [4, 8],
    ],
  ],
  X: [
    [
      [0, 0],
      [4, 8],
    ],
    [
      [0, 8],
      [4, 0],
    ],
  ],
  Y: [
    [
      [2, 0],
      [2, 4],
    ],
    [
      [0, 8],
      [2, 4],
    ],
    [
      [4, 8],
      [2, 4],
    ],
  ],
  Z: [
    [
      [0, 8],
      [4, 8],
      [0, 0],
      [4, 0],
    ],
  ],

  '.': [
    [
      [2, 0],
      [2, 1],
    ],
  ],
  '-': [
    [
      [1, 4],
      [3, 4],
    ],
  ],
  '+': [
    [
      [2, 2],
      [2, 6],
    ],
    [
      [1, 4],
      [3, 4],
    ],
  ],
  ':': [
    [
      [2, 1],
      [2, 2],
    ],
    [
      [2, 5],
      [2, 6],
    ],
  ],
  '%': [
    [
      [0, 0],
      [4, 8],
    ],
    [
      [0, 6],
      [1, 7],
      [0, 8],
      [0, 6],
    ],
    [
      [3, 0],
      [4, 1],
      [3, 2],
      [3, 0],
    ],
  ],
  _: [
    [
      [0, 0],
      [4, 0],
    ],
  ],
  '/': [
    [
      [0, 0],
      [4, 8],
    ],
  ],
  ',': [
    [
      [2, 1],
      [1, -1],
    ],
  ],
  ' ': [],
};

/**
 * Returns an array of paths (strokes), where each path is an array of [x, y] coordinates.
 * Coordinates are computed such that the text starts at startX, startY.
 * Font glyph size (bounding box maximum height) is governed by size.
 */
export function renderTextPath(
  text: string,
  startX: number,
  startY: number,
  size: number = 4,
  letterSpacing: number = 1.5
): [number, number][][] {
  const allStrokes: [number, number][][] = [];
  const scale = size / 8; // standard glyph height is 8 units
  const charWidth = 4 * scale;
  const currentText = text.toUpperCase();

  let offsetX = 0;
  for (let i = 0; i < currentText.length; i++) {
    const char = currentText[i];
    const glyphStrokes = GLYPHS[char] || GLYPHS[' '];

    for (const stroke of glyphStrokes) {
      const transformedStroke: [number, number][] = stroke.map(([gx, gy]) => [
        startX + offsetX + gx * scale,
        startY + gy * scale,
      ]);
      allStrokes.push(transformedStroke);
    }
    offsetX += charWidth + letterSpacing;
  }

  return allStrokes;
}
