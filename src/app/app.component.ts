import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { GameService, GameProgress, GameSize } from './services/game.service';
import { PeerService, ConnectionStatus } from './services/peer.service';
import { DialogType, DialogData, ConnectDialogData, NewGameDialogData, JoinGameDialogData } from './components/dialog/dialog.component';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {

  public DialogType = DialogType;
  public ConnectionStatus = ConnectionStatus;
  public GameProgress = GameProgress;

  public working = false;
  public id = this.peer.id;
  public connectionStatus!: ConnectionStatus;
  public gameProgress!: GameProgress;
  public awaitingInput!: boolean;

  constructor(
    private detector: ChangeDetectorRef,
    private game: GameService,
    private peer: PeerService
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

}
