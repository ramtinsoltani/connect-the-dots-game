import { Component, Input, Output, EventEmitter } from '@angular/core';
import { PlayerTurn, MatchResult } from 'src/app/services/game.service';

@Component({
  selector: 'app-scoreboard',
  templateUrl: './scoreboard.component.html',
  styleUrls: ['./scoreboard.component.scss']
})
export class ScoreboardComponent {

  public PlayerTurn = PlayerTurn;
  public MatchResult = MatchResult;

  @Input()
  public hostName?: string;

  @Input()
  public joinedName?: string;

  @Input()
  public hostScore?: number;

  @Input()
  public joinedScore?: number;

  @Input()
  public currentTurn?: PlayerTurn;

  @Input()
  public displayNewGame: boolean = false;

  @Input()
  public matchResult?: MatchResult;

  @Output()
  public onNewGame = new EventEmitter<void>();

}
