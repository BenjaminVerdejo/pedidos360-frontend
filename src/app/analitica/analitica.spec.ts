import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Analitica, INTERVALO_MS } from './analitica';
import { ANALITICA_API_URL } from '../config';

const URL = `${ANALITICA_API_URL}/api/analitica/resumen`;

const resumen = (creados: number) => ({
  pedidosCreados: creados,
  pedidosEntregados: 1,
  cambiosDeEstado: 2,
  ventasTotales: 30000,
  ventasEntregadas: 10000,
  ticketPromedio: 10000,
  pedidosPorEstado: { PENDIENTE: creados - 1, ENVIADO: 0, ENTREGADO: 1, CANCELADO: 0 },
  eventosDuplicadosDescartados: 0,
  ultimosEventos: [
    { tipo: 'PedidoCreado', pedidoId: 3, detalle: 'Nuevo pedido', topico: 'pedidos-creados', particion: 2, offset: 7, timestamp: '' }
  ],
  actualizadoEn: '2026-11-25T10:00:00Z'
});

describe('Analitica en vivo', () => {
  let http: HttpTestingController;

  beforeEach(async () => {
    vi.useFakeTimers();
    await TestBed.configureTestingModule({
      imports: [Analitica],
      providers: [provideHttpClient(), provideHttpClientTesting()]
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    vi.useRealTimers();
    http.verify();
  });

  it('muestra las metricas y se actualiza sola cuando llegan eventos nuevos', () => {
    const fixture = TestBed.createComponent(Analitica);
    fixture.detectChanges();
    vi.advanceTimersByTime(0);
    http.expectOne(URL).flush(resumen(3));
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('pedidos-creados');
    expect(fixture.componentInstance.resumen()?.pedidosCreados).toBe(3);

    // pasa un intervalo: vuelve a consultar y refleja el nuevo pedido
    vi.advanceTimersByTime(INTERVALO_MS);
    http.expectOne(URL).flush(resumen(4));
    expect(fixture.componentInstance.resumen()?.pedidosCreados).toBe(4);
    fixture.destroy();
  });

  it('calcula el porcentaje por estado', () => {
    const fixture = TestBed.createComponent(Analitica);
    fixture.detectChanges();
    vi.advanceTimersByTime(0);
    http.expectOne(URL).flush(resumen(4));
    expect(fixture.componentInstance.porcentaje('ENTREGADO')).toBe(25);
    fixture.destroy();
  });

  it('muestra un error si analitica-service no responde', () => {
    const fixture = TestBed.createComponent(Analitica);
    fixture.detectChanges();
    vi.advanceTimersByTime(0);
    http.expectOne(URL).error(new ProgressEvent('error'), { status: 0 });
    expect(fixture.componentInstance.error()).toContain('8083');
    fixture.destroy();
  });
});
