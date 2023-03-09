import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class UtilitiesService {

  constructor() { }

  public generateId(): string {

    const charset = 'QWERTYUIOPASDFGHJKLZXCVBNM0123456789';
    let id = '';

    for ( let i = 0; i < 6; i++ )
      id += charset[Math.floor(Math.random() * charset.length)];
    
    return id;

  }

  public randomInRange(min: number, max: number) {

    return Math.random() * (max - min) + min;

  }

}
