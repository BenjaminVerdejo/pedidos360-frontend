import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AnaliticaService } from './analitica.service';
import { ANALITICA_API_URL } from '../config';

describe('AnaliticaService', () => {
  let service: AnaliticaService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(AnaliticaService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('consulta el resumen en analitica-service', () => {
    service.resumen().subscribe((r) => expect(r.pedidosCreados).toBe(4));
    const req = http.expectOne(`${ANALITICA_API_URL}/api/analitica/resumen`);
    expect(req.request.method).toBe('GET');
    req.flush({ pedidosCreados: 4 });
  });

  it('consulta la auditoria', () => {
    service.auditoria().subscribe();
    http.expectOne(`${ANALITICA_API_URL}/api/analitica/auditoria`).flush([]);
  });
});
