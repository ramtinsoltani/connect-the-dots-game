import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class LocalStorageService {

  constructor() { }

  public get(key: string): string | null {

    return localStorage.getItem(key);

  }

  public set(key)

}