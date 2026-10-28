import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { MsalService, MsalBroadcastService } from '@azure/msal-angular';
import { InteractionStatus } from '@azure/msal-browser';
import { Subject, filter, takeUntil } from 'rxjs';
import { API_SCOPE } from './config';
import { esAdmin } from './auth/roles';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit, OnDestroy {
  private authService = inject(MsalService);
  private msalBroadcastService = inject(MsalBroadcastService);
  private readonly destroying$ = new Subject<void>();

  title = 'Pedidos360';
  // signals: la vista se actualiza sola al cambiar (Angular sin zone.js)
  readonly loginDisplay = signal(false);
  readonly usuario = signal('');
  readonly admin = signal(false);

  ngOnInit(): void {
    // 1. Procesa el token al volver de Microsoft y GUARDA la cuenta como activa
    this.authService.handleRedirectObservable().subscribe({
      next: (result) => {
        if (result && result.account) {
          this.authService.instance.setActiveAccount(result.account);
        }
        this.verificarCuentaActiva();
      },
      error: (error) => console.error('Error procesando la redirección:', error)
    });

    // 2. Actualiza la pantalla una vez que MSAL termine sus procesos
    this.msalBroadcastService.inProgress$
      .pipe(
        filter((status: InteractionStatus) => status === InteractionStatus.None),
        takeUntil(this.destroying$)
      )
      .subscribe(() => this.verificarCuentaActiva());
  }

  verificarCuentaActiva() {
    const instance = this.authService.instance;
    if (!instance.getActiveAccount() && instance.getAllAccounts().length > 0) {
      instance.setActiveAccount(instance.getAllAccounts()[0]);
    }
    const cuenta = instance.getActiveAccount();
    this.loginDisplay.set(!!cuenta);
    this.usuario.set(cuenta?.name ?? '');
    this.admin.set(!!cuenta && esAdmin(this.authService));
  }

  login() {
    this.authService.loginRedirect({ scopes: [API_SCOPE] });
  }

  logout() {
    this.authService.logoutRedirect();
  }

  ngOnDestroy(): void {
    this.destroying$.next();
    this.destroying$.complete();
  }
}