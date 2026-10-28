import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MsalBroadcastService, MsalService } from '@azure/msal-angular';
import { InteractionStatus } from '@azure/msal-browser';
import { of } from 'rxjs';
import { describe, it, expect, beforeEach } from 'vitest';
import { App } from './app';

// MSAL se reemplaza por un stub: el test no necesita contactar a Azure AD
const msalStub = {
  instance: {
    getActiveAccount: () => null,
    getAllAccounts: () => [],
    setActiveAccount: () => {}
  },
  handleRedirectObservable: () => of(null),
  loginRedirect: () => of(null),
  logoutRedirect: () => of(null)
};

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([]),
        { provide: MsalService, useValue: msalStub },
        { provide: MsalBroadcastService, useValue: { inProgress$: of(InteractionStatus.None) } }
      ]
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('muestra el titulo y el boton de login si no hay sesion', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('h1')?.textContent).toContain('Pedidos');
    expect(el.querySelector('button')?.textContent).toContain('Iniciar sesión');
  });
});