import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { GameService, GameProgress, GameSize, GameState, PlayerTurn, SoundEffect, MatchResult } from './services/game.service';
import { PeerService, ConnectionStatus } from './services/peer.service';
import { DialogType, DialogData, ConnectDialogData, NewGameDialogData, JoinGameDialogData } from './components/dialog/dialog.component';
import { BoardLineEvent } from './components/board/board.component';
import confetti from 'canvas-confetti';
import { UtilitiesService } from './services/utilities.service';
import { ChatService } from './services/chat.service';
import { environment } from '../environments/environment';

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
  public Math = Math;
  public appVersion = environment.version;

  public working = false;
  public id = this.peer.id;
  public connectionStatus!: ConnectionStatus;
  public gameProgress!: GameProgress;
  public awaitingInput!: boolean;
  public gameState?: GameState;
  public highlightHLine?: [number, number];
  public highlightVLine?: [number, number];
  public chatOpened: boolean = false;
  public unreadChat: number = 0;
  public notificationShake: boolean = false;

  constructor(
    private detector: ChangeDetectorRef,
    private game: GameService,
    private peer: PeerService,
    private chat: ChatService,
    private utilities: UtilitiesService
  ) { }
  
  public ngOnInit(): void {

    this.peer.connectionState.subscribe(state => {

      this.connectionStatus = state;
      this.working = false;

      this.detector.detectChanges();

    });

    this.peer.onError.subscribe(error => {

      if ( error.message.includes('Could not connect to peer') && this.gameProgress === GameProgress.NotStarted )
        this.working = false;

    });

    this.game.progress.subscribe(state => {

      this.gameProgress = state;

      if ( state === GameProgress.AwaitingPlayers )
        this.awaitingInput = true;

      // Play confetti animation if player won (and sfx)
      if ( state === GameProgress.Finished ) {

        const result = this.getMatchResult();

        // If player won
        if ( (this.isPlayerHost() && result === MatchResult.HostWon) || (! this.isPlayerHost() && result === MatchResult.JoinedWon) ) {

          this.playConfetti();
          this.game.playSoundEffect(SoundEffect.Win);

        }
        // If draw
        else if ( result === MatchResult.Draw ) {

          this.game.playSoundEffect(SoundEffect.Draw);

        }
        // If player lost
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

    this.game.onHighlightLine.subscribe(line => {

      if ( line.type === 'h' ) {

        this.highlightHLine = line.position;
        this.highlightVLine = undefined;

      }

      if ( line.type === 'v' ) {
        
        this.highlightVLine = line.position;
        this.highlightHLine = undefined;

      }

      this.detector.detectChanges();

    });

    this.chat.chatData.subscribe(data => {

      if ( this.chatOpened ) return;

      if ( ! data.length ) {

        this.unreadChat = 0;
        return;

      }

      this.unreadChat++;

      // Play SFX
      this.game.playSoundEffect(SoundEffect.Notification);

      // If animation already playing
      if ( this.notificationShake ) {

        this.notificationShake = false;
        this.detector.detectChanges();

      }

      this.notificationShake = true;

      const unreadWhenShakeStarted = this.unreadChat;

      setTimeout(() => {

        if ( this.unreadChat > unreadWhenShakeStarted )
          return;

        this.notificationShake = false;
        this.detector.detectChanges();

      }, 500);

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

  public getMatchResult(): MatchResult | undefined {

    // If cannot determine winner
    if ( this.gameProgress !== GameProgress.Finished || ! this.gameState || ! this.gameState.players.host || ! this.gameState.players.joined )
      return undefined;

    // If game is a draw
    if ( this.gameState.players.host.score === this.gameState.players.joined.score )
      return MatchResult.Draw;

    return this.gameState.players.host.score > this.gameState.players.joined.score ? MatchResult.HostWon : MatchResult.JoinedWon;

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

  public isChatEnabled(): boolean {

    return [ConnectionStatus.Connected, ConnectionStatus.Joined].includes(this.connectionStatus);

  }

  public toggleChat(): void {

    if ( ! this.isChatEnabled() )
      return;

    this.chatOpened = ! this.chatOpened;

    if ( this.chatOpened ) {
      
      this.unreadChat = 0;
      this.notificationShake = false;

    }
    
    this.detector.detectChanges();

  }

}
