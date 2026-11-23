import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { MsalService } from '@azure/msal-angular';
import { describe, it, expect, beforeEach } from 'vitest';
import { Inicio } from './inicio';
import { API_URL } from '../config';

function configurar(cuentas: unknown[]) {
  TestBed.configureTestingModule({
    imports: [Inicio],
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: MsalService, useValue: { instance: { getAllAccounts: () => cuentas } } }
    ]
  });
}

describe('Inicio (prueba de conexion segura)', () => {
  describe('con sesion', () => {
    beforeEach(() => configurar([{ name: 'Ana' }]));

    it('muestra la respuesta del backend cuando el token es valido', () => {
      const comp = TestBed.createComponent(Inicio).componentInstance;
      expect(comp.logueado).toBe(true);
      comp.probarBackend();
      TestBed.inject(HttpTestingController).expectOne(`${API_URL}/api/test`).flush({ mensaje: 'OK', usuario: 'ana@x.cl' });
      expect(comp.respuesta()).toBe('OK (ana@x.cl)');
    });

    it('muestra un error controlado si el backend responde 401', () => {
      const comp = TestBed.createComponent(Inicio).componentInstance;
      comp.probarBackend();
      TestBed.inject(HttpTestingController)
        .expectOne(`${API_URL}/api/test`)
        .flush({}, { status: 401, statusText: 'Unauthorized' });
      expect(comp.respuesta()).toContain('401');
    });
  });

  it('sin sesion no esta logueado', () => {
    configurar([]);
    expect(TestBed.createComponent(Inicio).componentInstance.logueado).toBe(false);
  });
});
