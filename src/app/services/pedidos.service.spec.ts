import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { PedidosService } from './pedidos.service';
import { API_URL } from '../config';

describe('PedidosService', () => {
  let service: PedidosService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(PedidosService);
    http = TestBed.inject(HttpTestingController);
  });

  it('lista los pedidos con GET', () => {
    service.listar().subscribe((res) => expect(res.length).toBe(0));
    const req = http.expectOne(`${API_URL}/api/pedidos`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('cambia el estado con PATCH', () => {
    service.cambiarEstado(1, 'ENVIADO').subscribe();
    const req = http.expectOne(`${API_URL}/api/pedidos/1/estado`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ estado: 'ENVIADO' });
    req.flush({});
  });
});
