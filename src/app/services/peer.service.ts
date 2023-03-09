import { Injectable } from '@angular/core';
import { Peer, DataConnection } from 'peerjs';
import { environment } from '../../environments/environment';
import { UtilitiesService } from './utilities.service';
import { BehaviorSubject, Subject, Observable } from 'rxjs';
import { Operation } from 'fast-json-patch';

export { Operation } from 'fast-json-patch';

@Injectable({
  providedIn: 'root'
})
export class PeerService {

  private peer = new Peer(this.util.generateId(), {
    host: environment.brokerHost,
    port: environment.brokerPort,
    path: environment.brokerPath,
    secure: environment.production
  });
  private conn?: DataConnection;
  private peerConnectionId?: string;
  private reconnectionTimer?: NodeJS.Timer;
  private connectionState$ = new BehaviorSubject<ConnectionStatus>(ConnectionStatus.NotConnected);
  private messages$ = new Subject<Operation[]>();

  public readonly id = this.peer.id;
  public readonly connectionState = new Observable<ConnectionStatus>(observer => {

    const sub = this.connectionState$.subscribe(value => observer.next(value));

    return () => sub.unsubscribe();

  });
  public readonly messages = new Observable<Operation[]>(observer => {

    const sub = this.messages$.subscribe(value => observer.next(value));

    return () => sub.unsubscribe();

  });
  public get peerId(): string | undefined {

    return this.peerConnectionId;

  }
  public get lastConnectionState() {

    return this.connectionState$.value;

  }

  constructor(
    private util: UtilitiesService
  ) {

    console.debug('Initializing app on', environment.production ? 'production' : 'development');

    this.peer.on('connection', conn => {

      this.conn = conn;

      console.debug(`Connected to peer with ID ${conn.peer}`);

      if ( this.reconnectionTimer ) {

        clearInterval(this.reconnectionTimer);
        this.reconnectionTimer = undefined;

      }

      this.connectionState$.next(ConnectionStatus.Connected);

      conn.on('data', data => this.messages$.next(data as Operation[]));

      conn.on('close', () => {

        console.warn('Connection to peer closed!');
        this.connectionState$.next(ConnectionStatus.Disconnected);

      });

      conn.on('error', error => console.error('Peer connection error:', error));

    });

    this.peer.on('disconnected', () => {

      console.warn('Disconnected from server!');

      this.connectionState$.next(ConnectionStatus.Disconnected);

      this.reconnectionTimer = setInterval(() => {

        if ( this.peer.disconnected ) {
          
          console.debug('Reconnecting to server...');
          this.connectionState$.next(ConnectionStatus.Reconnecting);
          this.peer.reconnect();

        }
        else if ( this.peerConnectionId ) {

          console.debug('Reconnecting to peer...');
          this.connectionState$.next(ConnectionStatus.Reconnecting);
          this.connect(this.peerConnectionId);

        }

      }, 3000);

    });

    this.peer.on('close', () => {

      this.connectionState$.next(ConnectionStatus.Disconnected);
      console.warn('Connection to server closed!');

    });

    this.peer.on('error', error => console.error('Server connection error:', error));

  }

  public send(data: Operation[]): void {

    if ( ! this.conn || ! [ConnectionStatus.Connected, ConnectionStatus.Joined].includes(this.connectionState$.value) )
      return console.warn('No peer connection!');
    
    this.conn.send(data);

  }

  public connect(id: string): void {

    console.debug(`Connecting to peer with ID ${id}...`);

    this.conn = this.peer.connect(id);

    this.conn.on('data', data => this.messages$.next(data as Operation[]));

    this.conn.on('open', () => {

      this.connectionState$.next(ConnectionStatus.Joined);
      this.peerConnectionId = id;

      if ( this.reconnectionTimer ) {

        clearInterval(this.reconnectionTimer);
        this.reconnectionTimer = undefined;

      }

      console.debug(`Connection to peer with ID ${id} established`);

    });

    this.conn.on('close', () => {

      console.warn(`Connection to peer with ID ${id} was closed!`);

      this.connectionState$.next(ConnectionStatus.Disconnected);
      this.conn = undefined;

    });

    this.conn.on('error', error => console.error(`Connection to peer error:`, error));

  }

}

export enum ConnectionStatus {
  NotConnected = 'Not Connected',
  Connected = 'Connected',
  Joined = 'Joined',
  Disconnected = 'Disconnected',
  Reconnecting = 'Reconnecting'
}