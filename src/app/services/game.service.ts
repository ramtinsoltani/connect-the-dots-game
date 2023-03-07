import { Injectable } from '@angular/core';
import { PeerService, ConnectionStatus, Operation } from './peer.service';
import { BehaviorSubject, Observable } from 'rxjs';
import { cloneDeep } from 'lodash-es';
import { applyPatch, observe, generate } from 'fast-json-patch';

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

  public progress = new Observable<GameProgress>(observer => {

    const sub = this.progress$.subscribe(value => observer.next(value));

    return () => sub.unsubscribe();

  });

  constructor(
    private peer: PeerService
  ) {

    this.peer.connectionState.subscribe(state => {

      if ( state === ConnectionStatus.Connected )
        this.isHost = true;

      // If a connection got established
      if ( [ConnectionStatus.Connected, ConnectionStatus.Joined].includes(state) ) {

        // If game was not started, move onto next step
        if ( this.progress$.value === GameProgress.NotStarted )
          this.progress$.next(GameProgress.AwaitingPlayers);

      }
      // If disconnected while waiting for players
      else if ( state === ConnectionStatus.Disconnected && this.progress$.value === GameProgress.AwaitingPlayers ) {

        this.progress$.next(GameProgress.NotStarted);

      }

    });

    this.peer.messages.subscribe(data => {

      applyPatch(this.state, data, true, true);
      
      this.startGameIfStateIsReady();

    });

  }

  private startGameIfStateIsReady(): void {

    if ( ! [GameProgress.AwaitingPlayers, GameProgress.Finished].includes(this.progress$.value) ) return;

    if ( this.state.players.host?.ready && this.state.players.joined?.ready ) {
      
      this.progress$.next(GameProgress.InProgress);

    }

  }

  public setGameData(name: string, size?: GameSize): void {

    // Get changes observer for game state object
    const observer = observe<GameState>(this.state);

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
    this.peer.send(generate(observer));

    this.startGameIfStateIsReady();

  }

}

export interface GameState {
  size?: GameSize,
  players: {
    host?: PlayerState,
    joined?: PlayerState
  },
  currentTurn?: PlayerTurn,
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

export interface LineData {
  state: boolean
}