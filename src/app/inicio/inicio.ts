import { Component, inject, signal } from '@angular/core';
import { MsalService } from '@azure/msal-angular';
import { HttpClient } from '@angular/common/http';
import { API_URL } from '../config';

@Component({
  selector: 'app-inicio',
  standalone: true,
  templateUrl: './inicio.html'
})
export class Inicio {
  private http = inject(HttpClient);
  private auth = inject(MsalService);

  readonly respuesta = signal('');

  get logueado(): boolean {
    return this.auth.instance.getAllAccounts().length > 0;
  }

  probarBackend() {
    // no se pone el token a mano: lo agrega el MsalInterceptor
    this.http.get<{ mensaje: string; usuario: string }>(`${API_URL}/api/test`).subscribe({
      next: (res) => this.respuesta.set(`${res.mensaje} (${res.usuario})`),
      error: (err) => this.respuesta.set(`Error ${err.status}: no se pudo consultar el backend`)
    });
  }
}
