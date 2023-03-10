import { Injectable, EventEmitter } from '@angular/core';
import { PeerService, ConnectionStatus, Operation } from './peer.service';
import { BehaviorSubject, Observable } from 'rxjs';
import { cloneDeep, flatten } from 'lodash-es';
import { applyPatch, compare } from 'fast-json-patch';

@Injectable({
  providedIn: 'root'
})
export class GameService {

  private readonly DEFAULT_STATE: GameState = {
    players: {},
    board: {
      cells: [],
      vLines: [],
      hLines: []
    }
  };

  private state: GameState = cloneDeep(this.DEFAULT_STATE);
  private progress$ = new BehaviorSubject<GameProgress>(GameProgress.NotStarted);
  private isHost: boolean = false;
  private sfx: { [name: string]: HTMLAudioElement } = {};

  public progress = new Observable<GameProgress>(observer => {

    const sub = this.progress$.subscribe(value => observer.next(value));

    return () => sub.unsubscribe();

  });

  /** Emits immutable game state data when state is changed. */
  public onStateChanged = new EventEmitter<GameState>();

  constructor(
    private peer: PeerService
  ) {

    // Create mapping of all SFX files and pre-load them
    for ( const audio of Object.values(SoundEffect) ) {

      this.sfx[audio] = new Audio();
      this.sfx[audio].src = `/assets/${audio}.mp3`;
      this.sfx[audio].load();

    }

    this.peer.connectionState.subscribe(state => {

      if ( state === ConnectionStatus.Connected )
        this.isHost = true;

      // If a connection got established
      if ( [ConnectionStatus.Connected, ConnectionStatus.Joined].includes(state) ) {

        // If game was not started, move onto next step
        if ( this.progress$.value === GameProgress.NotStarted )
          this.progress$.next(GameProgress.AwaitingPlayers);
        
        // If game is in progress, a state sync might be needed
        if ( this.progress$.value === GameProgress.InProgress )
          this.syncState();

      }
      // If disconnected while waiting for players
      else if ( state === ConnectionStatus.Disconnected && this.progress$.value === GameProgress.AwaitingPlayers ) {

        this.progress$.next(GameProgress.NotStarted);

      }

    });

    this.peer.messages.subscribe(data => {

      // If syncing states
      if ( this.messageIsStateSync(data) ) {

        console.debug('Sync message retrieved');

        // If state of other player has more moves...
        if ( (data.state.moves as number) > (this.state.moves as number) ) {

          // Get 
          const patch = compare(this.state, data.state);

          // Sync state
          applyPatch(this.state, patch, true, true);

          // Update game progress and emit changes
          this.updateGameProgress();
          this.onStateChanged.emit(cloneDeep(this.state));

          // Play sound effects
          this.playSoundEffectFromPatch(patch);

          console.debug('State synced');

        }
        else if ( (data.state.moves as number) < (this.state.moves as number) ) {

          console.debug('State of other player is behind');

          this.syncState();

        }
        else {

          console.debug('State is in-sync');

        }

        return;

      }

      // Otherwise, message is patch operations
      applyPatch(this.state, data, true, true);
      
      this.updateGameProgress();

      this.onStateChanged.emit(cloneDeep(this.state));

      this.playSoundEffectFromPatch(data);

    });

  }

  private populateBoardData(): void {

    const boardSize = GameBoardSize[this.state.size as GameSize];
      
    this.state.board.cells = Array<CellData[]>(boardSize)
    .fill(null as any).map(() => Array<CellData[]>(boardSize)
    .fill(null as any).map(() => ({ state: CellState.Free })));

    this.state.board.hLines = Array<LineData[]>(boardSize + 1)
    .fill(null as any).map(() => Array<LineData[]>(boardSize)
    .fill(null as any).map(() => ({ state: false })));

    this.state.board.vLines = Array<LineData[]>(boardSize)
    .fill(null as any).map(() => Array<LineData[]>(boardSize + 1)
    .fill(null as any).map(() => ({ state: false })));

  }

  private updateGameProgress(): void {

    let newState: GameProgress | null = null;

    // If currently awaiting players and both players are ready
    if ( this.progress$.value === GameProgress.AwaitingPlayers && this.state.players.host?.ready && this.state.players.joined?.ready ) {

      newState = GameProgress.InProgress;

      // Set current turn to host (default starting player)
      this.state.currentTurn = PlayerTurn.Host;

      // Set moves to 0
      this.state.moves = 0;

      // Populate board data
      this.populateBoardData();

    }

    // If game is in progress and all cells are marked
    if ( this.progress$.value === GameProgress.InProgress && ! flatten(this.state.board.cells).filter(cell => cell.state === CellState.Free).length )
      newState = GameProgress.Finished;
    
    // If game is finished but state is clean (new game)
    if ( this.progress$.value === GameProgress.Finished && this.state.size === undefined )
      newState = GameProgress.AwaitingPlayers;

    if ( newState !== null && this.progress$.value !== newState )
      this.progress$.next(newState);

  }

  private updateCell(y: number, x: number): boolean {

    if (
      this.state.board.hLines[y][x].state &&
      this.state.board.hLines[y + 1][x].state &&
      this.state.board.vLines[y][x].state &&
      this.state.board.vLines[y][x + 1].state
    ) {

      this.state.board.cells[y][x].state = (this.isHost ? CellState.HostPlayer : CellState.JoinedPlayer);

      return true;

    }

    return false;

  }

  private syncState(): void {

    console.debug('Sending state for sync check');

    this.peer.send<StateSyncData>({
      sync: true,
      state: cloneDeep(this.state)
    });

  }

  private messageIsStateSync(data: any): data is StateSyncData {

    return data.sync === true;

  }

  private playSoundEffectFromPatch(patch: Operation[]): void {

    // Play sfx
    if ( patch.filter(operation => operation.op === 'replace' && operation.path.match(/^\/board\/.Lines\/.+\/state/) && operation.value).length )
    this.playSoundEffect(SoundEffect.Draw);

    if ( patch.filter(operation => operation.op === 'replace' && operation.path.match(/^\/board\/cells\/.+\/state/) && operation.value !== CellState.Free).length )
    this.playSoundEffect(SoundEffect.Score);

  }

  public setGameData(name: string, size?: GameSize): void {

    // Copy state for comparison
    const stateBefore = cloneDeep(this.state);

    // Set player data
    const player = this.isHost ? 'host' : 'joined';

    this.state.players[player] = {
      name,
      ready: true,
      score: 0
    };

    // Set player name in local storage
    localStorage.setItem('name', name);

    // Set game size if player is host
    if ( this.isHost && size ) {

      this.state.size = size;

      // Set game size in local storage
      localStorage.setItem('gameSize', size);

    }

    // Send patch for changes to other player
    this.peer.send(compare(stateBefore, this.state));

    this.updateGameProgress();

    this.onStateChanged.emit(cloneDeep(this.state));

  }

  public startNewGame(): void {

    if ( this.progress$.value !== GameProgress.Finished || ! this.isHost ) return;

    // Copy state for comparison
    const stateBefore = cloneDeep(this.state);

    // Reset state
    this.state = cloneDeep(this.DEFAULT_STATE);

    // Send patch for changes to other player
    this.peer.send(compare(stateBefore, this.state));

    this.updateGameProgress();

    this.onStateChanged.emit(cloneDeep(this.state));

  }

  public isPlayerHost(): boolean {

    return this.isHost;

  }

  public updateLineData(type: 'h'|'v', position: [number, number], state: boolean): void {

    // If disconnected
    if ( ! [ConnectionStatus.Connected, ConnectionStatus.Joined].includes(this.peer.lastConnectionState) )
      return;

    // If not player's turn
    if ( (this.isHost && this.state.currentTurn !== PlayerTurn.Host) || (! this.isHost && this.state.currentTurn !== PlayerTurn.Joined) )
      return;
    
    // If game is not on-going
    if ( this.progress$.value !== GameProgress.InProgress )
      return;
    
    // If line has the same state (no actual change)
    if ( this.state.board[type === 'h' ? 'hLines' : 'vLines'][position[0]][position[1]].state === state )
      return;
    
    // Copy state for comparison
    const stateBefore = cloneDeep(this.state);

    // Update line data
    this.state.board[type === 'h' ? 'hLines' : 'vLines'][position[0]][position[1]].state = state;

    // Update moves
    (this.state.moves as number)++;

    // Check and update cells
    const cellsChecked: boolean[] = [];
    
    if ( type === 'h' ) {

      if ( position[0] > 0 )
        cellsChecked.push(this.updateCell(position[0] - 1, position[1]));

      if ( position[0] < this.state.board.cells.length )
        cellsChecked.push(this.updateCell(position[0], position[1]));

    }

    if ( type === 'v' ) {

      if ( position[1] > 0 )
        cellsChecked.push(this.updateCell(position[0], position[1] - 1));

      if ( position[1] < this.state.board.cells.length )
        cellsChecked.push(this.updateCell(position[0], position[1])); 

    }

    // Update score
    (this.state.players[this.isHost ? 'host' : 'joined'] as any).score += cellsChecked.filter(state => !! state).length;

    // Change player turn
    if ( cellsChecked.length && ! cellsChecked.reduce((a, b) => a || b) )
      this.state.currentTurn = (this.isHost ? PlayerTurn.Joined : PlayerTurn.Host)

    // Send patch for changes to other player
    this.peer.send(compare(stateBefore, this.state));

    this.updateGameProgress();

    this.onStateChanged.emit(cloneDeep(this.state));

    // Play sfx
    this.playSoundEffect(SoundEffect.Draw);

    if ( cellsChecked.length && cellsChecked.reduce((a, b) => a || b) )
      this.playSoundEffect(SoundEffect.Score);

  }

  public playSoundEffect(name: SoundEffect): void {

    const sfx = new Audio();

    sfx.src = this.sfx[name].src;
    sfx.load();
    sfx.play();

  }

}

export interface StateSyncData {
  sync: true,
  state: GameState
}

export interface GameState {
  size?: GameSize,
  players: {
    host?: PlayerState,
    joined?: PlayerState
  },
  currentTurn?: PlayerTurn,
  moves?: number,
  board: {
    cells: CellData[][],
    hLines: LineData[][],
    vLines: LineData[][]
  }
}

export enum GameSize {
  Small = 'small',
  Medium = 'medium',
  Large = 'large',
  Huge = 'huge'
}

export enum GameBoardSize {
  'small' = 6,
  'medium' = 8,
  'large' = 10,
  'huge' = 12
}

export interface PlayerState {
  name: string,
  score: number,
  ready: boolean
}

export enum GameProgress {
  NotStarted,
  AwaitingPlayers,
  InProgress,
  Finished
}

export enum PlayerTurn {
  Host,
  Joined
}

export interface CellData {
  state: CellState
}

export enum CellState {
  Free,
  HostPlayer,
  JoinedPlayer
}

export enum SoundEffect {
  Draw = 'draw',
  Disabled = 'disabled',
  Score = 'score',
  Win = 'win',
  Lose = 'lose'
}

export interface LineData {
  state: boolean
}