import { Component, Input, Output, EventEmitter, ViewChild, ElementRef, ChangeDetectorRef, AfterViewInit } from '@angular/core';
import { GameSize } from 'src/app/services/game.service';

@Component({
  selector: 'app-dialog',
  templateUrl: './dialog.component.html',
  styleUrls: ['./dialog.component.scss']
})
export class DialogComponent implements AfterViewInit {

  public GameSize = GameSize;

  @ViewChild('peerId')
  public peerIdElement?: ElementRef<HTMLInputElement>;

  @ViewChild('displayName')
  public displayNameElement?: ElementRef<HTMLInputElement>;

  @ViewChild('gameSize')
  public gameSizeElement?: ElementRef<HTMLSelectElement>;

  @Input()
  public title: string = 'Untitled';

  @Input()
  public submitLabel: string = 'Submit';

  @Input()
  public type!: DialogType;

  @Input()
  public id: string = '';

  @Input()
  public disabled: boolean = false;

  public DialogType = DialogType;

  public submitDisabled = true;
  public defaultName = localStorage.getItem('name');
  public defaultGameSize = localStorage.getItem('gameSize');

  @Output()
  public onSubmit = new EventEmitter<DialogData>();

  constructor(
    private detector: ChangeDetectorRef,
  ) { }

  public ngAfterViewInit(): void {
    
    if ( this.type !== DialogType.Connect ) {

      this.checkSubmitState(this.displayNameElement?.nativeElement.value as string);

    }
    
  }

  public checkSubmitState(value: string): void {

    if ( this.type === DialogType.Connect ) {

      const peerId = value?.trim().toUpperCase();

      this.submitDisabled = ! peerId || peerId === this.id || peerId.length !== 6;

    }
    else {

      const displayName = value?.trim();

      this.submitDisabled = ! displayName || ! displayName.length;

    }

    this.detector.detectChanges();

  }

  public submit(): void {

    if ( this.type === DialogType.Connect && this.peerIdElement ) {

      this.onSubmit.emit({
        type: DialogType.Connect,
        data: {
          peerId: this.peerIdElement.nativeElement.value?.toUpperCase()
        }
      });

    }
    else if ( this.type === DialogType.JoinGame && this.displayNameElement ) {

      this.onSubmit.emit({
        type: DialogType.JoinGame,
        data: {
          displayName: this.displayNameElement.nativeElement.value?.trim()
        }
      });

    }
    else if ( this.type === DialogType.NewGame && this.displayNameElement && this.gameSizeElement ) {

      this.onSubmit.emit({
        type: DialogType.NewGame,
        data: {
          displayName: this.displayNameElement.nativeElement.value?.trim(),
          gameSize: this.gameSizeElement.nativeElement.value
        }
      });

    }

  }

}

export enum DialogType {
  Connect,
  NewGame,
  JoinGame
}

export interface DialogData {
  type: DialogType,
  data: any;
}

export interface ConnectDialogData {
  type: DialogType.Connect,
  data: {
    peerId: string
  }
}

export interface JoinGameDialogData {
  type: DialogType.JoinGame,
  data: {
    displayName: string
  }
}

export interface NewGameDialogData {
  type: DialogType.NewGame,
  data: {
    displayName: string,
    gameSize: string
  }
}