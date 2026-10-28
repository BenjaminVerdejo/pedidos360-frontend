import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { RabbitAdminService, mensajeDeError } from './rabbit-admin.service';
import { ADMIN_API_URL } from '../config';

describe('RabbitAdminService', () => {
  let service: RabbitAdminService;
  let http: HttpTestingController;
  const base = `${ADMIN_API_URL}/api/admin`;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(RabbitAdminService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('crea una cola con POST /queues sin enviar campos vacios', () => {
    service.crearCola({ nombre: 'facturas.queue', durable: true, ttlMs: null, deadLetterExchange: '' }).subscribe();
    const req = http.expectOne(`${base}/queues`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ nombre: 'facturas.queue', durable: true });
    req.flush({ nombre: 'facturas.queue', mensajes: 0, consumidores: 0 });
  });

  it('elimina una cola con DELETE /queues/{nombre}', () => {
    service.eliminarCola('facturas.queue', true).subscribe();
    const req = http.expectOne(`${base}/queues/facturas.queue?soloSiVacia=true`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  it('crea un exchange con POST /exchanges', () => {
    service.crearExchange({ nombre: 'facturas.exchange', tipo: 'TOPIC', durable: true }).subscribe();
    const req = http.expectOne(`${base}/exchanges`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body.tipo).toBe('TOPIC');
    req.flush({});
  });

  it('elimina un binding con DELETE /bindings y parametros', () => {
    service.eliminarBinding({ exchange: 'ex', cola: 'q', routingKey: 'factura.#' }).subscribe();
    const req = http.expectOne((r) => r.url === `${base}/bindings`);
    expect(req.request.method).toBe('DELETE');
    expect(req.request.params.get('routingKey')).toBe('factura.#');
    req.flush(null);
  });

  it('traduce los errores de validacion del backend', () => {
    const err = new HttpErrorResponse({
      status: 400,
      error: { status: 400, error: 'validacion', mensaje: 'x', campos: { nombre: 'el nombre es obligatorio' } }
    });
    expect(mensajeDeError(err)).toBe('nombre: el nombre es obligatorio');
    expect(mensajeDeError(new HttpErrorResponse({ status: 403 }))).toContain('Admin');
  });
});
