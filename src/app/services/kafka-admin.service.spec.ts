import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { KafkaAdminService, mensajeErrorKafka } from './kafka-admin.service';
import { KAFKA_ADMIN_API_URL } from '../config';

describe('KafkaAdminService', () => {
  let service: KafkaAdminService;
  let http: HttpTestingController;
  const base = `${KAFKA_ADMIN_API_URL}/api/kafka`;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(KafkaAdminService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('crea un topico sin enviar campos vacios', () => {
    service.crearTopico({ nombre: 'reportes', particiones: 3, replicas: 3, retencionMs: null, cleanupPolicy: 'delete' }).subscribe();
    const req = http.expectOne(`${base}/topicos`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ nombre: 'reportes', particiones: 3, replicas: 3, cleanupPolicy: 'delete' });
    req.flush({});
  });

  it('modifica la configuracion con PUT', () => {
    service.actualizarConfiguracion('pedidos-creados', { retencionMs: 172800000 }).subscribe();
    const req = http.expectOne(`${base}/topicos/pedidos-creados/configuracion`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ retencionMs: 172800000 });
    req.flush({});
  });

  it('elimina un topico y consulta el lag de un grupo', () => {
    service.eliminarTopico('temporal').subscribe();
    expect(http.expectOne(`${base}/topicos/temporal`).request.method).toBe('DELETE');
    service.lag('analitica').subscribe();
    http.expectOne(`${base}/consumer-groups/analitica/lag`).flush({ grupo: 'analitica', lagTotal: 0, particiones: [] });
  });

  it('traduce los errores del backend', () => {
    expect(mensajeErrorKafka(new HttpErrorResponse({ status: 403 }))).toContain('Admin');
    expect(mensajeErrorKafka(new HttpErrorResponse({ status: 503 }))).toContain('Kafka');
    expect(
      mensajeErrorKafka(new HttpErrorResponse({ status: 400, error: { campos: { nombre: 'nombre de topico invalido' } } }))
    ).toContain('nombre de topico invalido');
    expect(mensajeErrorKafka(new HttpErrorResponse({ status: 409, error: { mensaje: 'protegido' } }))).toBe('protegido');
  });
});
