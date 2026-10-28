import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { RabbitAdmin } from './rabbit-admin';
import { ADMIN_API_URL } from '../config';

describe('RabbitAdmin (pantalla)', () => {
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RabbitAdmin],
      providers: [provideHttpClient(), provideHttpClientTesting()]
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
  });

  it('no llama al backend si el nombre de la cola es invalido', () => {
    const comp = TestBed.createComponent(RabbitAdmin).componentInstance;
    comp.colaForm.controls.nombre.setValue('mi cola');
    comp.crearCola();
    http.expectNone(`${ADMIN_API_URL}/api/admin/queues`);
    expect(comp.registros()[0].ok).toBe(false);
  });

  it('rechaza el prefijo reservado amq.', () => {
    const comp = TestBed.createComponent(RabbitAdmin).componentInstance;
    comp.colaForm.controls.nombre.setValue('amq.cola');
    expect(comp.colaForm.controls.nombre.hasError('reservado')).toBe(true);
  });

  it('crea la cola y muestra el resultado', () => {
    const comp = TestBed.createComponent(RabbitAdmin).componentInstance;
    comp.colaForm.controls.nombre.setValue('facturas.queue');
    comp.crearCola();
    http.expectOne(`${ADMIN_API_URL}/api/admin/queues`).flush({ nombre: 'facturas.queue', mensajes: 0, consumidores: 0 });
    expect(comp.registros()[0]).toMatchObject({ ok: true });
  });

  it('muestra el error que devuelve el backend', () => {
    const comp = TestBed.createComponent(RabbitAdmin).componentInstance;
    comp.eliminarExchangeForm.controls.nombre.setValue('pedidos.exchange');
    comp.eliminarExchange();
    http.expectOne(`${ADMIN_API_URL}/api/admin/exchanges/pedidos.exchange`).flush(
      { status: 409, error: 'conflicto', mensaje: "El exchange 'pedidos.exchange' es parte del sistema" },
      { status: 409, statusText: 'Conflict' }
    );
    expect(comp.registros()[0].ok).toBe(false);
    expect(comp.registros()[0].texto).toContain('parte del sistema');
  });
});
