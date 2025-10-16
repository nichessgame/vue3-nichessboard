import type { Move, Piece } from 'chess.js';
import type { Color, Key } from 'nichessground/types';
import type { Threat } from '@/typings/Chessboard';
import type { Api } from 'nichessground/api';
import { Api as NichessApi, NUM_SQUARES, NUM_ROWS, PieceType } from 'nichess';

export function getThreats(moves: Move[]): Threat[] {
  const threats: Threat[] = [];

  for (const move of moves) {
    threats.push({ orig: move.to, brush: 'yellow' });
    if (move['captured']) {
      threats.push({ orig: move.from, dest: move.to, brush: 'red' });
    }
    if (move['san'].includes('+')) {
      threats.push({ orig: move.from, dest: move.to, brush: 'blue' });
    }
  }

  return threats;
}

export function shortToLongColor(color: 'w' | 'b'): Color {
  return color === 'w' ? 'white' : 'black';
}

function squareIndexToCoordinates(squareIndex: number): [number, number] {
  const x = squareIndex - Math.floor(squareIndex / NUM_ROWS) * NUM_ROWS;
  const y = Math.floor(squareIndex / NUM_ROWS);
  return [x + 1, y + 1]; // +1 because coordinates shouldn't be 0 indexed here
}

export function squareIndexToKey(squareIndex: number): Key {
  const xy = squareIndexToCoordinates(squareIndex);
  const x = xy[0];
  const y = xy[1];
  let file = '';
  switch (x) {
    case 1:
      file = 'a';
      break;
    case 2:
      file = 'b';
      break;
    case 3:
      file = 'c';
      break;
    case 4:
      file = 'd';
      break;
    case 5:
      file = 'e';
      break;
    case 6:
      file = 'f';
      break;
    case 7:
      file = 'g';
      break;
    case 8:
      file = 'h';
      break;
  }
  return (file + y.toString()) as Key;
}

export function keyToSquareIndex(key: Key): number {
  const firstChar = key[0];
  let x = 0;
  switch (firstChar) {
    case 'a':
      x = 0;
      break;
    case 'b':
      x = 1;
      break;
    case 'c':
      x = 2;
      break;
    case 'd':
      x = 3;
      break;
    case 'e':
      x = 4;
      break;
    case 'f':
      x = 5;
      break;
    case 'g':
      x = 6;
      break;
    case 'h':
      x = 7;
      break;
  }
  const y = parseInt(key[1]) - 1;
  return y * NUM_ROWS + x;
}

function nichessTypeToRole(pt: PieceType): string {
  switch (pt) {
    case PieceType.P1_KING:
      return 'king';
    case PieceType.P1_MAGE:
      return 'queen';
    case PieceType.P1_WARRIOR:
      return 'rook';
    case PieceType.P1_ASSASSIN:
      return 'bishop';
    case PieceType.P1_KNIGHT:
      return 'knight';
    case PieceType.P1_PAWN:
      return 'pawn';
    case PieceType.P2_KING:
      return 'king';
    case PieceType.P2_MAGE:
      return 'queen';
    case PieceType.P2_WARRIOR:
      return 'rook';
    case PieceType.P2_ASSASSIN:
      return 'bishop';
    case PieceType.P2_KNIGHT:
      return 'knight';
    case PieceType.P2_PAWN:
      return 'pawn';
    default:
      return 'error';
  }
}

function nichessTypeToColor(pt: PieceType): string {
  switch (pt) {
    case PieceType.P1_KING:
      return 'white';
    case PieceType.P1_MAGE:
      return 'white';
    case PieceType.P1_WARRIOR:
      return 'white';
    case PieceType.P1_ASSASSIN:
      return 'white';
    case PieceType.P1_KNIGHT:
      return 'white';
    case PieceType.P1_PAWN:
      return 'white';
    case PieceType.P2_KING:
      return 'black';
    case PieceType.P2_MAGE:
      return 'black';
    case PieceType.P2_WARRIOR:
      return 'black';
    case PieceType.P2_ASSASSIN:
      return 'black';
    case PieceType.P2_KNIGHT:
      return 'black';
    case PieceType.P2_PAWN:
      return 'black';
    default:
      return 'error';
  }
}

export function fullRerender(cg: Api, nichess: NichessApi): void {
  const pieceDiff = new Map();
  for (let i = 0; i < NUM_SQUARES; i++) {
    const key = squareIndexToKey(i);
    pieceDiff.set(key, undefined);
  }

  const currentPlayerPieces = nichess.allPiecesByPlayer(
    nichess.currentPlayer()
  );
  for (let i = 0; i < currentPlayerPieces.length; i++) {
    const cp = currentPlayerPieces[i];
    const key = squareIndexToKey(cp.squareIndex);
    if (cp.healthPoints <= 0) {
      continue;
    } else {
      const p = {
        role: nichessTypeToRole(cp.type),
        color: nichessTypeToColor(cp.type),
        healthPoints: cp.healthPoints,
      };
      pieceDiff.set(key, p);
    }
  }
  const otherPlayerPieces = nichess.allPiecesByPlayer(
    1 - nichess.currentPlayer()
  );
  for (let i = 0; i < otherPlayerPieces.length; i++) {
    const cp = otherPlayerPieces[i];
    const key = squareIndexToKey(cp.squareIndex);
    if (cp.healthPoints <= 0) {
      continue;
    } else {
      const p = {
        role: nichessTypeToRole(cp.type),
        color: nichessTypeToColor(cp.type),
        healthPoints: cp.healthPoints,
      };
      pieceDiff.set(key, p);
    }
  }
  cg.setPieces(pieceDiff);
}

export function possibleMoves(game: NichessApi): Map<Key, Key[]> {
  const dests = new Map();
  for (let i = 0; i < NUM_SQUARES; i++) {
    const legalMoves = game.legalActionsBySquare(i);
    if (legalMoves.length) {
      const srcKey = squareIndexToKey(i);
      dests.set(
        srcKey,
        legalMoves.map((m) => squareIndexToKey(m.dstIdx))
      );
    }
  }
  return dests;
}

export function isPromotion(dest: Key, piece: Piece | null): boolean {
  if (piece?.type !== 'p') {
    return false;
  }

  const promotionRow = piece?.color === 'w' ? '8' : '1'; // for white promotion row is 8, for black its 1

  return dest[1] === promotionRow;
}

export function getPossiblePromotions(legalMoves: Move[]): Move[] {
  return legalMoves.filter((move) => move.promotion);
}

export function isObject(value: unknown): boolean {
  return (
    Boolean(value) &&
    value instanceof Object &&
    !(value instanceof Array) &&
    !(value instanceof Function)
  );
}

export function deepCopy<T>(value: T): T {
  return isObject(value)
    ? (Object.fromEntries(
        Object.entries(value as object).map(([key, val]) => [
          key,
          deepCopy(val),
        ])
      ) as T)
    : value;
}

export function deepMergeConfig<T>(target: T, source: T): T {
  const result = { ...target, ...source };
  for (const key in result) {
    result[key] =
      isObject(target?.[key]) && isObject(source?.[key])
        ? deepMergeConfig(target[key], source[key])
        : deepCopy(result[key]);
  }
  return result;
}

type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};

export function deepDiffConfig<T>(oldConfig: T, newConfig: T): DeepPartial<T> {
  const diff = {} as DeepPartial<T>;
  for (const key in newConfig) {
    if (isObject(oldConfig?.[key]) && isObject(newConfig?.[key])) {
      const subDiff = deepDiffConfig(
        oldConfig[key],
        newConfig[key]
      ) as T[keyof T] extends object ? DeepPartial<T[keyof T]> : never; // sometimes I like typescript, others I dont...
      if (Object.keys(subDiff).length > 0) diff[key as keyof T] = subDiff;
    } else if (oldConfig?.[key] !== newConfig[key]) {
      diff[key] = newConfig[key];
    }
  }
  return diff;
}

export const chessJSPieceToLichessPiece = {
  p: 'pawn',
  n: 'knight',
  b: 'bishop',
  r: 'rook',
  q: 'queen',
  k: 'king',
};
