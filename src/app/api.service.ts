import { Injectable } from '@angular/core';
import { App } from 'server';
import { edenClient } from '../libs/edenclient';

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private readonly apiBaseUrl =
    typeof window === 'undefined' ? 'http://localhost:4201' : '';

  client = edenClient<App>(this.apiBaseUrl).api;
}
