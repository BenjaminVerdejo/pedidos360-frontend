import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { MsalService } from '@azure/msal-angular';
import { of } from 'rxjs';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Pedidos } from './pedidos';
import { API_URL } from '../config';

// MSAL simulado: el test no contacta a Azure AD
const msalStub = {
  instance: {
    getActiveAccount: () => null,
    getAllAccounts: () => []
  },
  acquireTokenSilent: () => of({ scopes: [] })
};

const URL = `${API_URL}/api/pedidos`;

describe('Pedidos (pantalla)', () => {
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Pedidos],
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: MsalService, useValue: msalStub }]
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  function crearComponente() {
    const fixture = TestBed.createComponent(Pedidos);
    fixture.detectChanges();
    return fixture;
  }

  it('carga el listado al iniciar', () => {
    crearComponente();
    http.expectOne(URL).flush([]);
  });

  it('no envia el pedido al backend si el formulario es invalido', () => {
    const comp = crearComponente().componentInstance;
    http.expectOne(URL).flush([]);
    comp.crear('', 'correo-malo', '', '-5');
    http.expectNone((r) => r.method === 'POST');
    expect(comp.error()).toContain('obligatorio');
  });

  it('envia el pedido con los datos normalizados si es valido', () => {
    const comp = crearComponente().componentInstance;
    http.expectOne(URL).flush([]);
    comp.crear('  Ana ', 'ana@test.cl', ' Pedido ', '1000');
    const req = http.expectOne((r) => r.method === 'POST' && r.url === URL);
    expect(req.request.body).toEqual({ cliente: { nombre: 'Ana', email: 'ana@test.cl' }, descripcion: 'Pedido', total: 1000 });
    req.flush({ id: 7 });
    http.expectOne((r) => r.method === 'GET').flush([]);
    expect(comp.aviso()).toContain('#7');
  });

  it('oculta los botones de cambio de estado en un pedido ENTREGADO', () => {
    const fixture = crearComponente();
    http.expectOne(URL).flush([
      { id: 1, cliente: { nombre: 'Ana', email: 'a@a.cl' }, descripcion: 'x', total: 10, estado: 'ENTREGADO' }
    ]);
    fixture.detectChanges();
    const botones = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('td.acciones button'));
    expect(botones.map((b) => b.textContent?.trim())).not.toContain('Entregado');
  });

  it('muestra el mensaje del backend cuando la transicion de estado es invalida (409)', () => {
    const comp = crearComponente().componentInstance;
    http.expectOne(URL).flush([]);
    comp.cambiarEstado({ id: 3, cliente: { nombre: 'A', email: 'a@a.cl' }, descripcion: 'x', total: 1, estado: 'ENVIADO' }, 'ENTREGADO');
    http.expectOne(`${URL}/3/estado`).flush(
      { mensaje: 'El pedido #3 esta ENTREGADO y ya no puede cambiar de estado' },
      { status: 409, statusText: 'Conflict' }
    );
    expect(comp.error()).toContain('ya no puede cambiar');
  });
});
