import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CellData, GameSize, GameBoardSize, LineData, CellState } from 'src/app/services/game.service';

@Component({
  selector: 'app-board',
  templateUrl: './board.component.html',
  styleUrls: ['./board.component.scss']
})
export class BoardComponent implements OnChanges {

  public GameSize = GameSize;
  public CellState = CellState;

  @Input()
  public cells?: CellData[][];

  @Input()
  public hLines?: LineData[][];

  @Input()
  public vLines?: LineData[][];

  @Input()
  public canPlay: boolean = false;

  @Input()
  public hostName?: string;

  @Input()
  public joinedName?: string;

  @Output()
  public onLineClicked = new EventEmitter<BoardLineEvent>();

  @Output()
  public onDisabledClick = new EventEmitter<BoardLineEvent>();

  public dots: Array<Array<boolean>> = [];

  public ngOnChanges(changes: SimpleChanges): void {

    // Populate dots array for the first time when cells array is provided
    if ( changes['cells'] && changes['cells'].currentValue.length && ! this.dots.length ) {

      this.dots = Array(changes['cells'].currentValue.length + 1)
      .fill(null).map(() => Array(changes['cells'].currentValue.length + 1)
      .fill(null).map(() => false));

    }

    // Update dots array states based on lines
    if ( (changes['vLines'] || changes['hLines']) && this.vLines?.length && this.hLines?.length ) {

      for ( let y = 0; y < this.hLines.length; y++ ) {

        for ( let x = 0; x < this.hLines[y].length; x++ ) {

          if ( this.hLines[y][x].state ) {

            this.dots[y][x] = true;
            this.dots[y][x + 1] = true;

          }

        }

      }

      for ( let y = 0; y < this.vLines.length; y++ ) {

        for ( let x = 0; x < this.vLines[y].length; x++ ) {

          if ( this.vLines[y][x].state ) {

            this.dots[y][x] = true;
            this.dots[y + 1][x] = true;

          }

        }

      }

    }
    
  }

  public getPlayerInitial(cellState: CellState): string | undefined {

    return cellState === CellState.HostPlayer ? this.hostName?.substring(0, 1) : this.joinedName?.substring(0, 1);

  }

  public onLineClick(type: BoardLineEvent['type'], position: BoardLineEvent['position']): void {

    const lines = type === 'h' ? this.hLines : this.vLines;

    if ( ! lines ) return;

    if ( ! this.canPlay || lines[position[0]][position[1]].state )
      return this.onDisabledClick.emit({ type, position })

    this.onLineClicked.emit({ type, position });

  }

}

export interface BoardLineEvent {
  type: 'h' | 'v',
  position: [number, number]
}