import { Injectable } from '@angular/core';
import { PeerService } from './peer.service';
import { cloneDeep } from 'lodash-es';
import { Observable, BehaviorSubject } from 'rxjs';
import { GameService } from './game.service';

@Injectable({
  providedIn: 'root'
})
export class ChatService {

  private chatData$ = new BehaviorSubject<ChatMessage[]>([]);

  public chatData = new Observable<ChatMessage[]>(observer => {

    const sub = this.chatData$.subscribe(value => cloneDeep(observer.next(value)));

    return () => sub.unsubscribe();

  });

  constructor(
    private peer: PeerService,
    private game: GameService
  ) {

    this.peer.chatMessages.subscribe(message => {

      this.addChatMessage(message);

    });

  }

  private addChatMessage(data: ChatMessage): void {

    // Append the new message to chat data array and keep the last 100 messages
    this.chatData$.next([...this.chatData$.value, data]
      .slice(-100)
      .sort((a, b) => a.timestamp - b.timestamp));

  }

  public sendMessage(message: string): void {

    const data: ChatMessage = {
      message,
      sender: this.game.isPlayerHost() ? MessageSender.Host : MessageSender.Joined,
      timestamp: Date.now()
    };

    this.peer.send<ChatMessage>(data);

    this.addChatMessage(data);

  }

}

export interface ChatMessage {
  sender: MessageSender,
  message: string,
  timestamp: number
}

export enum MessageSender {
  Host = 'host',
  Joined = 'joined'
}