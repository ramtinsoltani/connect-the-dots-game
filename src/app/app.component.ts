import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { GameService, GameProgress, GameSize, GameState, PlayerTurn, SoundEffect } from './services/game.service';
import { PeerService, ConnectionStatus } from './services/peer.service';
import { DialogType, DialogData, ConnectDialogData, NewGameDialogData, JoinGameDialogData } from './components/dialog/dialog.component';
import { BoardLineEvent } from './components/board/board.component';
import confetti from 'canvas-confetti';
import { UtilitiesService } from './services/utilities.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {

  private confettiTimer?: NodeJS.Timer;

  public DialogType = DialogType;
  public ConnectionStatus = ConnectionStatus;
  public GameProgress = GameProgress;
  public PlayerTurn = PlayerTurn;

  public working = false;
  public id = this.peer.id;
  public connectionStatus!: ConnectionStatus;
  public gameProgress!: GameProgress;
  public awaitingInput!: boolean;
  public gameState?: GameState;

  constructor(
    private detector: ChangeDetectorRef,
    private game: GameService,
    private peer: PeerService,
    private utilities: UtilitiesService
  ) { }
  
  public ngOnInit(): void {

    this.peer.connectionState.subscribe(state => {

      this.connectionStatus = state;
      this.working = false;

      this.detector.detectChanges();

    });

    this.game.progress.subscribe(state => {

      this.gameProgress = state;

      if ( state === GameProgress.AwaitingPlayers )
        this.awaitingInput = true;

      // Play confetti animation if player won (and sfx)
      if ( state === GameProgress.Finished ) {

        const winner = this.getWinner();

        if ( (this.isPlayerHost() && winner === PlayerTurn.Host) || (! this.isPlayerHost() && winner === PlayerTurn.Joined) ) {

          this.playConfetti();
          this.game.playSoundEffect(SoundEffect.Win);

        }
        else {

          this.game.playSoundEffect(SoundEffect.Lose);

        }

      }

      // Stop confetti if playing and state has changed
      if ( state !== GameProgress.Finished && this.confettiTimer )
        clearInterval(this.confettiTimer);

      this.detector.detectChanges();

    });

    this.game.onStateChanged.subscribe(state => {

      this.gameState = state;

      this.detector.detectChanges();

    });
    
  }

  public onDialogSubmit(event: DialogData) {

    if ( event.type === DialogType.Connect ) {

      this.working = true;
      this.peer.connect((event as ConnectDialogData).data.peerId);

    }
    else if ( event.type === DialogType.NewGame ) {

      const { data } = event as NewGameDialogData;

      this.game.setGameData(data.displayName, data.gameSize as GameSize);
      this.awaitingInput = false;

    }
    else if ( event.type === DialogType.JoinGame ) {

      const { data } = event as JoinGameDialogData;

      this.game.setGameData(data.displayName);
      this.awaitingInput = false;

    }
    
  }

  public isPlayerHost(): boolean {

    return this.game.isPlayerHost();

  }

  public onNewGameClicked(): void {

    this.game.startNewGame();

  }

  public drawLine(event: BoardLineEvent): void {

    this.game.updateLineData(event.type, event.position, true);

  }

  public disabledLineDraw(event: BoardLineEvent): void {

    this.game.playSoundEffect(SoundEffect.Disabled);

  }

  public getWinner(): PlayerTurn | undefined {

    if ( this.gameProgress !== GameProgress.Finished || ! this.gameState || ! this.gameState.players.host || ! this.gameState.players.joined )
      return undefined;
    
    return this.gameState.players.host.score > this.gameState.players.joined.score ? PlayerTurn.Host : PlayerTurn.Joined;

  }

  public playConfetti(): void {

    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };
    const duration = 15 * 1000;
    const animationEnd = Date.now() + duration;

    this.confettiTimer = setInterval(() => {

      const timeLeft = animationEnd - Date.now();
    
      if ( timeLeft <= 0 && this.confettiTimer )
        return clearInterval(this.confettiTimer);
    
      const particleCount = 50 * (timeLeft / duration);

      confetti(Object.assign({}, defaults, { particleCount, origin: { x: this.utilities.randomInRange(0.1, 0.3), y: Math.random() - 0.2 } }));
      confetti(Object.assign({}, defaults, { particleCount, origin: { x: this.utilities.randomInRange(0.7, 0.9), y: Math.random() - 0.2 } }));

    }, 250);

  }

}
