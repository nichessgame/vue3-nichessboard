import {
  deepMergeConfig,
  possibleMoves,
  keyToSquareIndex,
  fullRerender,
} from '@/helper/Board';
import { defaultBoardConfig } from '@/helper/DefaultConfig';
import type { BrushColor, DrawShape } from '@/typings/BoardAPI';
import type BoardConfig from '@/typings/BoardConfig';
import type {
  BoardState,
  Emits,
  Move,
  MoveEvent,
  Promotion,
  Props,
} from '@/typings/Chessboard';
import type { Piece, PieceSymbol, Color as ShortColor, Square } from 'chess.js';
import type { Api } from 'nichessground/api';
import { Chessground } from 'nichessground/chessground';
import type { Color, Key, MoveMetadata } from 'nichessground/types';
import { nextTick } from 'vue';

import { Api as NichessApi, Player, PlayerAction, PieceType } from 'nichess';

/**
 * class for modifying and reading data from the board
 */
export class BoardApi {
  private game: NichessApi;
  private board: Api;
  private boardState: BoardState;
  private props: Props;
  private emit: Emits;
  constructor(
    boardElement: HTMLElement,
    boardState: BoardState,
    props: Props,
    emit: Emits
  ) {
    this.boardState = boardState;
    this.props = props;
    this.emit = emit;
    this.game = new NichessApi();
    this.board = Chessground(boardElement);
    this.resetBoard();
  }

  //
  //  PRIVATE INTERAL METHODS:
  //

  /**
   * syncs chess.js state with the board
   * @private
   */
  private updateGameState({ updateFen = true } = {}): void {
    if (!this.boardState.historyViewerState.isEnabled) {
      if (updateFen) {
        this.board.set({ fen: this.game.boardToString() });
      }

      this.board.state.turnColor = this.getTurnColor();

      if (this.board.state.movable.free) {
        this.board.state.movable.color = 'both';
        this.board.state.movable.dests = new Map();
      } else {
        this.board.state.movable.color =
          this.props.playerColor || this.board.state.turnColor;
        this.board.state.movable.dests = possibleMoves(this.game);
      }
    }

    this.emitEvents();
  }

  /**
   * emits neccessary events
   * @private
   */
  private emitEvents(): void {
    if (this.game.isGameOver()) {
      if (this.game.draw()) {
        this.emit('draw');
      } else {
        this.emit('checkmate', this.board.state.turnColor);
      }
    }
  }

  /**
   * Changes the turn of the game, triggered by config.movable.events.after
   * @private
   */
  private async changeTurn(
    orig: Key,
    dest: Key,
    _: MoveMetadata
  ): Promise<void> {
    const selectedPromotion: Promotion | undefined = undefined;
    this.move({
      from: orig,
      to: dest,
      promotion: selectedPromotion,
    });
  }

  //
  //  PUBLIC API METHODS:
  //

  /**
   * Resets the board to the initial starting configuration.
   */
  resetBoard(): void {
    this.game.reset();
    fullRerender(this.board, this.game);
    this.setConfig(this.props.boardConfig as BoardConfig, true);
  }

  // TODO: This just prevents GUI moves 
  public forbidMoves(): void {
    this.board.state.movable.color = undefined;
  }

  public allowMoves(): void {
    this.board.state.movable.color = this.board.state.turnColor;
  }

  public setCurrentPlayer(player: Player): void {
    this.game.setCurrentPlayer(player);
  }

  public isMoveLegal(move: any): boolean {
    let srcIdx: number = keyToSquareIndex(move.from);
    let dstIdx: number = keyToSquareIndex(move.to);

    let legalActions: PlayerAction[] = this.game.legalActionsBySquare(srcIdx)
    for(let i = 0; i < legalActions.length; i++) {
      if(legalActions[i].srcIdx === srcIdx && legalActions[i].dstIdx === dstIdx) {
        return true;
      }
    }
    return false;
  }

  /**
   * String representation of the current game state.
   */
  public dump(): string {
    return this.game.dump();
  }

  /**
   * undo last move, if possible
   */
  undoLastMove(): void {
    // TODO
    return;
    /*
    const undoMove = this.game.undo();
    if (undoMove == null) return;

    // if we were viewing the previous move, this is now the current move, so disable viewer
    if (
      this.boardState.historyViewerState.isEnabled &&
      this.boardState.historyViewerState.plyViewing ===
        this.getCurrentPlyNumber()
    ) {
      this.stopViewingHistory();
    }

    // if we're not viewing history, update the board
    if (!this.boardState.historyViewerState.isEnabled) {
      this.board.set({ fen: undoMove.before });
      this.updateGameState({ updateFen: false });
      const lastMove = this.getLastMove();
      this.board.state.lastMove = lastMove
        ? [lastMove?.from, lastMove?.to]
        : undefined;
    }
   */
  }

  /**
   * toggles the board orientation.
   */
  toggleOrientation(): void {
    this.board.toggleOrientation();
  }

  /**
   * draws arrows and circles on the board for possible moves/captures
   */
  /*
  drawMoves(): void {
    this.boardState.showThreats = true;
    this.board.setShapes(getThreats(this.game.moves({ verbose: true })));
  }
 */

  /**
   * removes arrows and circles from the board for possible moves/captures
   */
  hideMoves(): void {
    this.boardState.showThreats = false;
    this.board.setShapes([]);
  }

  /**
   * draws an arrow on the board
   */
  drawMove(orig: Square, dest: Square, brushColor: BrushColor): void {
    this.board.setShapes([
      {
        orig: orig,
        dest: dest,
        brush: brushColor,
      },
    ]);
  }

  /**
   * toggle drawing of arrows and circles on the board for possible moves/captures
   */
  /*
  toggleMoves(): void {
    if (this.boardState.showThreats) {
      this.hideMoves();
    } else {
      this.drawMoves();
    }
  }
 */

  /**
   * make a move programmatically on the board
   * @param move either a string in Standard Algebraic Notation (SAN), eg. 'e4', 'exd5', 'O-O', 'Nf3' or 'e8=Q'
   * or an object of shape { from: string; to: string; promotion?: string; }, eg. { from: 'g8', to: 'f6' } or
   * { from: 'e7', to: 'e8', promotion: 'q'}
   * @returns true if the move was made, false if the move was illegal
   */
  move(move: string | Move, emitEvent = true): boolean {
    if (typeof move === 'object') {
      const srcIdx: number = keyToSquareIndex(move.from);
      const dstIdx: number = keyToSquareIndex(move.to);
      this.game.makeAction(srcIdx, dstIdx);
      this.board.move(move.from, move.to);
      fullRerender(this.board, this.game);
      if (emitEvent) {
        this.emit('move', move as MoveEvent);
      }
      this.updateGameState({ updateFen: false });
      nextTick(this.board.playPremove);
      if (this.game.isGameOver()) {
        this.forbidMoves();
      }
      return true;
    } else {
      return false;
    }
  }

  /**
   * returns the current turn color
   * @returns 'white' or 'black'
   */
  getTurnColor(): Color {
    return this.game.currentPlayer() === Player.PLAYER_1 ? 'white' : 'black';
  }

  /**
   * returns all possible moves for the current position
   *
   */
  getPossibleMoves(): Map<Key, Key[]> | undefined {
    return possibleMoves(this.game);
  }

  /**
   *
   * @returns the current turn number
   * @example e4 e5 -> turn number is 2
   */
  getCurrentTurnNumber(): number {
    return this.game.moveNumber();
  }

  /**
   *
   * @returns the current ply number
   * @example e4 e5 Nf3 -> ply number is 3
   */
  getCurrentPlyNumber(): number {
    return (
      2 * this.getCurrentTurnNumber() -
      (this.getTurnColor() === 'black' ? 1 : 2)
    );
  }

  /**
   * returns the latest move made on the board
   */
  getLastMove(): MoveEvent | undefined {
    // TODO
    return undefined;
    //return this.game.history({ verbose: true }).at(-1);
  }

  /**
   * Retrieves the move history.
   *
   * @param verbose - passing true will add more info
   * @example Verbose: [{"color": "w", "from": "e2", "to": "e4", "flags": "b", "piece": "p", "san": "e4"}],  without verbose flag: [ "e7", "e5" ]
   */
  getHistory(): string[];
  getHistory(verbose: false): string[];
  getHistory(verbose: true): MoveEvent[];
  getHistory(verbose = false): MoveEvent[] | string[] {
    // TODO
    return [];
    //return this.game.history({ verbose: verbose });
  }

  /**
   * Returns the FEN string for the current position.
   */
  getFen(): string {
    return this.game.boardToString();
  }

  /**
   * Returns the board position as a 2D array.
   */
  getBoardPosition(): ({
    square: Square;
    type: PieceSymbol;
    color: ShortColor;
  } | null)[][] {
    // TODO
    return [];
    //return this.game.board();
  }

  /**
   * returns the PGN string for the current position.
   */
  getPgn(): string {
    // TODO: Nichess doesn't have pgn
    return this.game.boardToString();
  }

  /**
   * returns true of false depending on if the game is over
   */
  getIsGameOver(): boolean {
    return this.game.isGameOver();
  }

  /**
   * returns the color of a given square
   */
  /*
  getSquareColor(square: Square): SquareColor {
    return this.game.squareColor(square);
  }
 */

  /**
   * Returns the piece on the square or null if there is no piece
   */
  /*
  getSquare(square: Square): Piece | null {
    return this.game.get(square);
  }
 */

  /**
   * loads a fen into the board
   * Caution: this will erase the game history. To set position with history call loadPgn with a pgn instead
   */
  setPosition(fen: string): void {
    // TODO: Nichess doesn't use fen
    this.game.boardFromString(fen);
    this.boardState.historyViewerState = { isEnabled: false };
    this.updateGameState();
  }

  /**
   * puts a piece on a given square on the board
   * returns true on success, else false
   */
  putPiece(pieceType: PieceType, squareIndex: number, healthPoints: number): boolean {
    const success = this.game.addPiece(pieceType, squareIndex, healthPoints);
    if(success) {
      fullRerender(this.board, this.game);
      this.board.redrawAll();
      return true;
    }
    return false;
    /*
    // @TODO using putPiece with the same piece and square twice is buggy in movable: false in chess.js state
    if (this.board.state.movable.free) {
      const current = this.board.state.pieces;
      current.set(square, {
        color: piece.color === 'w' ? 'white' : 'black',
        role: chessJSPieceToLichessPiece[piece.type] as Role,
      });
      this.board.setPieces(current);
      return true;
    } else {
      const result = this.game.put(piece, square);
      if (result) {
        this.updateGameState();
      }
      return result;
    }
   */
  }

  /**
   * Removes a piece from the board.
   * @param square - The square where the piece is located.
   */
  removePiece(square: Square): void {
    // TODO
    return;
    /*
    const pieces = this.board.state.pieces;
    pieces.delete(square);
    this.game.remove(square);
   */
  }

  /**
   * removes all pieces from the board
   */
  clearBoard(): void {
    // TODO
    return;
    /*
    this.game.clear();
    this.boardState.historyViewerState = { isEnabled: false };
    this.updateGameState();
   */
  }

  /**
   * draw multiple arrows on the board
   */
  setShapes(shapes: DrawShape[]): void {
    this.board.setShapes(shapes);
  }

  /**
   * loads a pgn into the board
   *
   * @param pgn - the pgn to load
   */
  loadPgn(pgn: string): void {
    // TODO
    return;
    /*
    this.game.loadPgn(pgn);
    this.boardState.historyViewerState = { isEnabled: false };
    this.updateGameState();

    // show last move if there is one
    const lastMove = this.getLastMove();
    if (lastMove) {
      this.board.set({ lastMove: [lastMove.from, lastMove.to] });
    }
   */
  }

  /**
   * returns the header information of the current pgn, if no pgn is loaded, returns an empty object
   * @example {
   * "Event": "IBM Kasparov vs. Deep Blue Rematch",
   * "Site": "New York, NY USA",
   * "Date": "1997.05.11",
   * "Round": "6",
   * "White": "Deep Blue",
   * "Black": "Kasparov, Garry",
   * "Opening": "Caro-Kann: 4...Nd7",
   * "ECO": "B17",
   * "Result": "1-0"
   * }
   */
  getPgnInfo(): {
    [key: string]: string | undefined;
  } {
    // TODO
    return {};
    //return this.game.header();
  }

  /**
   * Sets a header in the PGN.
   *
   * @param changes a record of key value pairs to change in the PGN, eg. `{ White: 'Deep Blue', Black: 'Kasparov, Garry' }`
   */
  setPgnInfo(changes: { [key: string]: string }): {
    [key: string]: string | undefined;
  } {
    // TODO: Nichess doesn't have pgn
    return { White: 'Deep Blue', Black: 'Kasparov, Garry' };
    //return this.game.header(...Object.entries(changes).flat());
  }

  /**
   * Sets the config of the board.
   * Caution: providing a config with a fen will erase the game history and change the starting position
   * for resetBoard. To keep history and starting position: omit fen from the given config and call
   * loadPgn with a pgn instead.
   *
   * @param config - a subset of config options, eg. `{ viewOnly: true, animation: { enabled: false } }`
   * or `{ movable: { events: { after: afterFunc }, showDests: false }, drawable: { enabled: false } }`
   * @param fillDefaults - if true unprovided config options will be substituted with default values, if
   * false the unprovided options will remain unchanged.
   */
  setConfig(config: BoardConfig, fillDefaults = false): void {
    if (fillDefaults) {
      config = deepMergeConfig(defaultBoardConfig, config);
      this.board.state.selected = undefined;
    }

    // If user provided a movable.events.after function we patch changeTurn to run before it. We want
    // changeTurn to run before the user's function rather than after it so that during their function
    // call the API can provide correct data about the game, eg. getLastMove() for the san.
    if (config.movable?.events && 'after' in config.movable.events) {
      const userAfter = config.movable.events.after;
      config.movable.events.after = userAfter
        ? async (...args): Promise<void> => {
            await this.changeTurn(...args);
            userAfter(...args);
          }
        : this.changeTurn.bind(this); // in case user provided config with { movable: { events: { after: undefined } } }
    }

    const { fen, ...configWithoutFen } = config;
    this.board.set(configWithoutFen);
    if (fen) this.setPosition(fen);
    this.board.redrawAll();
  }

  /**
   * Views the position at the given ply number in the game's history.
   *
   * @param ply - the ply number of the position to be viewed, where 0 is the initial position, 1 is
   * after white's first move, 2 is after black's first move and so on.
   */
  viewHistory(ply: number): void {
    // TODO
    return;
    /*
    const history = this.getHistory(true);

    // if given ply is invalid, terminate function
    if (ply < 0 || ply > history.length) return;

    // if animation is enabled and ply is not within 1 of the currently viewed, disable animation
    const disableAnimation =
      this.board.state.animation.enabled &&
      ((this.boardState.historyViewerState.isEnabled &&
        Math.abs(this.boardState.historyViewerState.plyViewing - ply) !== 1) ||
        (!this.boardState.historyViewerState.isEnabled &&
          ply !== history.length - 1));
    if (disableAnimation) {
      this.board.set({ animation: { enabled: false } });
    }

    // if viewing a previous ply, view that position
    if (ply < history.length) {
      if (!this.boardState.historyViewerState.isEnabled) {
        this.boardState.historyViewerState = {
          isEnabled: true,
          plyViewing: ply,
          viewOnly: this.board.state.viewOnly,
        };
      } else {
        this.boardState.historyViewerState.plyViewing = ply;
      }

      this.board.set({
        fen: history[ply].before,
        viewOnly: true,
        lastMove:
          ply > 0 ? [history[ply - 1].from, history[ply - 1].to] : undefined,
        selected: undefined,
      });

      this.displayInCheck(
        ply > 0 ? '+#'.includes(history[ply - 1].san.at(-1) as string) : false,
        shortToLongColor(history[ply].color)
      );

      this.board.cancelPremove();
    } else {
      // else ply is current position, so stop viewing history
      if (this.boardState.historyViewerState.isEnabled) {
        const lastMove = history.at(-1) as MoveEvent;

        this.board.set({
          fen: lastMove.after,
          viewOnly: this.boardState.historyViewerState.viewOnly,
          lastMove: [lastMove.from, lastMove.to],
        });

        this.boardState.historyViewerState = { isEnabled: false };
        this.updateGameState({ updateFen: false });
      }
    }

    // if animation was disabled, reenable it
    if (disableAnimation) this.board.set({ animation: { enabled: true } });
   */
  }

  /**
   * Stops viewing history and returns the board to the present position, ie. after the latest move.
   */
  stopViewingHistory(): void {
    if (this.boardState.historyViewerState.isEnabled) {
      this.viewHistory(this.getCurrentPlyNumber());
    }
  }

  /**
   * Views the starting position of this game.
   */
  viewStart(): void {
    this.viewHistory(0);
  }

  /**
   * If viewing history, views the move after the one currently being viewed.
   * If that move is the latest move, stops viewing history.
   */
  viewNext(): void {
    if (this.boardState.historyViewerState.isEnabled) {
      this.viewHistory(this.boardState.historyViewerState.plyViewing + 1);
    }
  }

  /**
   * If viewing history, views the previous move to the one currently being viewed.
   * Else, starts viewing history and views the move previous to the latest move.
   */
  viewPrevious(): void {
    const ply = this.boardState.historyViewerState.isEnabled
      ? this.boardState.historyViewerState.plyViewing
      : this.getCurrentPlyNumber();
    this.viewHistory(ply - 1);
  }
}

export default BoardApi;
