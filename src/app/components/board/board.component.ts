import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, ChangeDetectorRef } from '@angular/core';
import { CellData, GameSize, LineData, CellState } from 'src/app/services/game.service';

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

  @Input()
  public highlightHLine?: [number, number];

  @Input()
  public highlightVLine?: [number, number];

  @Output()
  public onLineClicked = new EventEmitter<BoardLineEvent>();

  @Output()
  public onDisabledClick = new EventEmitter<BoardLineEvent>();

  public dots: Array<Array<DotData>> = [];
  public highlightAllowed: boolean = false;

  constructor(
    private detector: ChangeDetectorRef
  ) { }

  public ngOnChanges(changes: SimpleChanges): void {

    // Populate dots array for the first time when cells array is provided
    if ( changes['cells'] && changes['cells'].currentValue.length && ! this.dots.length ) {

      this.dots = Array(changes['cells'].currentValue.length + 1)
      .fill(null).map(() => Array(changes['cells'].currentValue.length + 1)
      .fill(null).map(() => ({ state: false, hover: false, highlight: false })));

    }

    // Update dots array states based on lines
    if ( (changes['vLines'] || changes['hLines']) && this.vLines?.length && this.hLines?.length ) {

      for ( let y = 0; y < this.hLines.length; y++ ) {

        for ( let x = 0; x < this.hLines[y].length; x++ ) {

          if ( this.hLines[y][x].state ) {

            this.dots[y][x].state = true;
            this.dots[y][x + 1].state = true;

          }

        }

      }

      for ( let y = 0; y < this.vLines.length; y++ ) {

        for ( let x = 0; x < this.vLines[y].length; x++ ) {

          if ( this.vLines[y][x].state ) {

            this.dots[y][x].state = true;
            this.dots[y + 1][x].state = true;

          }

        }

      }

    }

    // Highlight dots if necessary
    if ( changes['highlightHLine'] && ! changes['highlightHLine'].firstChange ) {

      const state = changes['highlightHLine']?.currentValue?.length;
      const position = state ? changes['highlightHLine'].currentValue : changes['highlightHLine'].previousValue;

      // If highlighting a new set of dots, unhighlight all previous ones
      if ( state ) {

        for ( const row of this.dots ) {

          for ( const dot of row ) {

            dot.highlight = false;

          }

        }

      }

      this.dots[position[0]][position[1]].highlight = state;
      this.dots[position[0]][position[1] + 1].highlight = state;

      setTimeout(() => this.highlightAllowed = false, 1000);

      this.highlightAllowed = true;

    }

    if ( changes['highlightVLine'] && ! changes['highlightVLine'].firstChange ) {

      const state = changes['highlightVLine']?.currentValue?.length;
      const position = state ? changes['highlightVLine'].currentValue : changes['highlightVLine'].previousValue;

      // If highlighting a new set of dots, unhighlight all previous ones
      if ( state ) {

        for ( const row of this.dots ) {

          for ( const dot of row ) {

            dot.highlight = false;

          }

        }

      }

      this.dots[position[0]][position[1]].highlight = state;
      this.dots[position[0] + 1][position[1]].highlight = state;

      setTimeout(() => this.highlightAllowed = false, 1000);

      this.highlightAllowed = true;

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

  public onLineMouseEnter(type: BoardLineEvent['type'], position: BoardLineEvent['position']): void {

    const dots: [DotData, DotData] = [
      this.dots[position[0]][position[1]],
      this.dots[position[0] + (type === 'h' ? 0 : 1)][position[1] + (type === 'h' ? 1 : 0)]
    ];

    if ( dots[0].hover && dots[1].hover )
      return;

    dots[0].hover = true;
    dots[1].hover = true;

    this.detector.detectChanges();

  }

  public onLineMouseLeave(type: BoardLineEvent['type'], position: BoardLineEvent['position']): void {

    const dots: [DotData, DotData] = [
      this.dots[position[0]][position[1]],
      this.dots[position[0] + (type === 'h' ? 0 : 1)][position[1] + (type === 'h' ? 1 : 0)]
    ];

    if ( ! dots[0].hover && ! dots[1].hover )
      return;

    dots[0].hover = false;
    dots[1].hover = false;

    this.detector.detectChanges();
    
  }

}

export interface BoardLineEvent {
  type: 'h' | 'v',
  position: [number, number]
}

export interface DotData {
  state: boolean,
  hover: boolean,
  highlight: boolean
}