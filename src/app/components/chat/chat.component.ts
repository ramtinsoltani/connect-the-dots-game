import { Component, OnInit, ChangeDetectorRef, Input, ViewChild, ElementRef } from '@angular/core';
import { ChatService, ChatMessage, MessageSender } from 'src/app/services/chat.service';
import { PeerService, ConnectionStatus } from 'src/app/services/peer.service';

@Component({
  selector: 'app-chat',
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.scss']
})
export class ChatComponent implements OnInit {

  public MessageSender = MessageSender;

  @ViewChild('message')
  public messageElement!: ElementRef<HTMLInputElement>;

  @Input()
  public open: boolean = false;

  @Input()
  public names?: PlayerNames;

  public messages: ChatMessage[] = [];
  public locked: boolean = false;

  constructor(
    private detector: ChangeDetectorRef,
    private peer: PeerService,
    private chat: ChatService
  ) { }

  public ngOnInit(): void {

    this.peer.connectionState.subscribe(state => {

      this.locked = ! [ConnectionStatus.Connected, ConnectionStatus.Joined].includes(state);
      this.detector.detectChanges();

    });
    
    this.chat.chatData.subscribe(data => {

      this.messages = data;
      this.detector.detectChanges();

    });
    
  }

  public sendMessage(message: string): void {

    if ( this.locked || ! message.trim().length ) return;
    
    this.chat.sendMessage(message.trim());

    this.messageElement.nativeElement.value = '';

  }

  public onMessageKeyUp(message: string, event: KeyboardEvent): void {

    if ( event.key === 'Enter' )
      this.sendMessage(message);

    this.detector.detectChanges();

  }

  public getSenderName(sender: MessageSender): string {

    return this.names && this.names[sender] ? this.names[sender] as string : sender as string;

  }

}

export interface PlayerNames {
  host?: string,
  joined?: string
}