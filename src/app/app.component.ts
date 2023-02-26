import { Component, OnInit } from '@angular/core';
import { Peer, DataConnection } from 'peerjs';
import { v4 as uuidv4 } from 'uuid';
import { environment } from '../environments/environment';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  
  private peer = new Peer(uuidv4(), {
    host: environment.brokerHost,
    port: environment.brokerPort,
    path: environment.brokerPath
  });
  private conn?: DataConnection;
  private connectionOpened = false;

  public userPeerId = this.peer.id;

  public ngOnInit(): void {

    console.log('Initializing app on', environment.production ? 'production' : 'development');

    this.peer.on('connection', conn => {

      conn.on('data', data => console.log(data));
      conn.on('close', () => console.warn('Connection to peer closed!'));
      conn.on('error', console.error);

    });

    this.peer.on('disconnected', () => console.warn('Disconnected!'));
    this.peer.on('close', () => console.warn('Connection closed!'));
    this.peer.on('error', console.error);

  }

  public connectToPeer(id: string): void {

    this.conn = this.peer.connect(id);
    this.conn.on('open', () => this.connectionOpened = true);
    this.conn.on('close', () => {

      console.warn(`Peer connection with ID ${this.conn?.connectionId} was closed!`);

      this.connectionOpened = false;
      this.conn = undefined;

    });

  }

  public sendData(data: any): void {

    if ( ! this.conn || ! this.connectionOpened )
      return console.warn('No peer connection!');
    
    this.conn.send(data);

  }

}
