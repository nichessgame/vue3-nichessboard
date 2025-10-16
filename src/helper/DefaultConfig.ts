import type { Key } from 'nichessground/types';
import type { BoardConfig } from '@/typings/BoardConfig';

export const possibleMovesWhite: Map<Key, Key[]> = new Map([
  ['b1', ['a3', 'c3']],
  ['g1', ['f3', 'h3']],
  ['a2', ['a3', 'a4']],
  ['b2', ['b3', 'b4']],
  ['c2', ['c3', 'c4']],
  ['d2', ['d3', 'd4']],
  ['e2', ['e3', 'e4']],
  ['f2', ['f3', 'f4']],
  ['g2', ['g3', 'g4']],
  ['h2', ['h3', 'h4']],
]);
//
// TODO: Move this elsewhere. If the game is updated, but this isn't, it can cause silent bugs atm.
export const initialPos =
  '0|0-warrior-60,0-knight-60,0-assassin-10,0-mage-10,0-king-10,0-assassin-10,0-knight-60,0-warrior-60,0-pawn-30,0-pawn-30,0-pawn-30,0-pawn-30,0-pawn-30,0-pawn-30,0-pawn-30,0-pawn-30,empty,empty,empty,empty,empty,empty,empty,empty,empty,empty,empty,empty,empty,empty,empty,empty,empty,empty,empty,empty,empty,empty,empty,empty,empty,empty,empty,empty,empty,empty,empty,empty,1-pawn-30,1-pawn-30,1-pawn-30,1-pawn-30,1-pawn-30,1-pawn-30,1-pawn-30,1-pawn-30,1-warrior-60,1-knight-60,1-assassin-10,1-mage-10,1-king-10,1-assassin-10,1-knight-60,1-warrior-60,';

// lichess default conf
export const defaultBoardConfig: BoardConfig = {
  fen: initialPos,
  orientation: 'white',
  turnColor: 'white',
  coordinates: false,
  autoCastle: true,
  viewOnly: false,
  disableContextMenu: false,
  addPieceZIndex: false,
  blockTouchScroll: false,
  highlight: {
    lastMove: true,
    check: true,
  },
  animation: {
    enabled: true,
    duration: 300,
  },
  lastMove: undefined,
  movable: {
    free: false,
    color: 'white',
    showDests: true,
    dests: possibleMovesWhite,
    // We need to specify movable.events.after as an empty function so that we always have something to patch
    // BoardApi.changeTurn onto. Other functions need to be specifed as undefined so that BoardApi.setConfig
    // can reset values back to undefined, eg. if the user calls BoardApi.setConfig({}, true).
    //
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    events: { after: () => {}, afterNewPiece: undefined },
    rookCastle: true,
  },
  premovable: {
    enabled: true,
    showDests: true,
    castle: true,
    events: { set: undefined, unset: undefined },
  },
  predroppable: {
    enabled: false,
    events: { set: undefined, unset: undefined },
  },
  draggable: {
    enabled: true,
    distance: 3,
    autoDistance: true,
    showGhost: true,
    deleteOnDropOff: false,
  },
  selectable: {
    enabled: true,
  },
  events: {
    change: undefined,
    move: undefined,
    dropNewPiece: undefined,
    select: undefined,
    insert: undefined,
  },
  drawable: {
    enabled: true,
    visible: true,
    defaultSnapToValidMove: true,
    eraseOnClick: true,
    shapes: [],
    autoShapes: [],
    brushes: {
      green: { key: 'g', color: '#15781B', opacity: 1, lineWidth: 10 },
      red: { key: 'r', color: '#882020', opacity: 1, lineWidth: 10 },
      blue: { key: 'b', color: '#003088', opacity: 1, lineWidth: 10 },
      yellow: { key: 'y', color: '#e68f00', opacity: 1, lineWidth: 10 },
      paleBlue: { key: 'pb', color: '#003088', opacity: 0.4, lineWidth: 15 },
      paleGreen: { key: 'pg', color: '#15781B', opacity: 0.4, lineWidth: 15 },
      paleRed: { key: 'pr', color: '#882020', opacity: 0.4, lineWidth: 15 },
      paleGrey: {
        key: 'pgr',
        color: '#4a4a4a',
        opacity: 0.35,
        lineWidth: 15,
      },
    },
  },
};
