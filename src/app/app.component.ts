import { Component, OnInit } from '@angular/core';
import { Peer, DataConnection } from 'peerjs';
import { environment } from '../environments/environment';
import { UtilitiesService } from './services/utilities.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  
  private peer = new Peer(this.util.generateId(), {
    host: environment.brokerHost,
    port: environment.brokerPort,
    path: environment.brokerPath,
    secure: environment.production
  });
  private conn?: DataConnection;
  private connectionOpened = false;
  private peerConnectionId?: string;
  private reconnectionTimer?: NodeJS.Timer;

  public userPeerId = this.peer.id;

  constructor(
    private util: UtilitiesService
  ) { }

  public ngOnInit(): void {

    console.debug('Initializing app on', environment.production ? 'production' : 'development');

    this.peer.on('connection', conn => {

      console.debug(`Connected to peer with ID ${conn.peer}`);

      if ( this.reconnectionTimer ) {

        clearInterval(this.reconnectionTimer);
        this.reconnectionTimer = undefined;

      }

      conn.on('data', data => console.log(data));

      conn.on('close', () => {

        console.warn('Connection to peer closed!');
        this.connectionOpened = false;

      });

      conn.on('error', error => console.error('Peer connection error:', error));

    });

    this.peer.on('disconnected', () => {

      console.warn('Disconnected from server!');

      this.reconnectionTimer = setInterval(() => {

        if ( this.peer.disconnected ) {
          
          console.debug('Reconnecting to server...');
          this.peer.reconnect();
        }
        else if ( this.peerConnectionId ) {

          console.debug('Reconnecting to peer...');
          this.connectToPeer(this.peerConnectionId);

        }

      }, 3000);

    });

    this.peer.on('close', () => console.warn('Connection to server closed!'));
    this.peer.on('error', error => console.error('Server connection error:', error));

  }

  public connectToPeer(id: string): void {

    console.debug(`Connecting to peer with ID ${id}...`);

    this.conn = this.peer.connect(id);

    this.conn.on('open', () => {

      this.connectionOpened = true;
      this.peerConnectionId = id;

      if ( this.reconnectionTimer ) {

        clearInterval(this.reconnectionTimer);
        this.reconnectionTimer = undefined;

      }

      console.debug(`Connection to peer with ID ${id} established`);

    });

    this.conn.on('close', () => {

      console.warn(`Connection to peer with ID ${id} was closed!`);

      this.connectionOpened = false;
      this.conn = undefined;

    });

    this.conn.on('error', error => console.error(`Connection to peer error:`, error));

  }

  public sendData(data: any): void {

    if ( ! this.conn || ! this.connectionOpened )
      return console.warn('No peer connection!');
    
    this.conn.send(data);

  }

  public closeConnection(): void {

    this.conn?.close();

  }

}
