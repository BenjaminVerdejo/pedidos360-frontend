import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { KafkaAdmin } from './kafka-admin';
import { KAFKA_ADMIN_API_URL } from '../config';

const base = `${KAFKA_ADMIN_API_URL}/api/kafka`;

describe('Administracion de Kafka', () => {
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [KafkaAdmin],
      providers: [provideHttpClient(), provideHttpClientTesting()]
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  function iniciar() {
    const fixture = TestBed.createComponent(KafkaAdmin);
    fixture.detectChanges();
    http.expectOne(`${base}/topicos`).flush([
      { nombre: 'pedidos-creados', particiones: 3, replicas: 3, protegido: true, configuracion: { 'retention.ms': '604800000' }, detalleParticiones: [] }
    ]);
    http.expectOne(`${base}/consumer-groups`).flush([]);
    fixture.detectChanges();
    return fixture;
  }

  it('lista los topicos con particiones, replicas y retencion', () => {
    const fixture = iniciar();
    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('pedidos-creados');
    expect(fixture.componentInstance.retencion(fixture.componentInstance.topicos()[0])).toBe('168 h');
  });

  it('no envia el formulario si el nombre del topico es invalido', () => {
    const comp = iniciar().componentInstance;
    comp.crearForm.controls.nombre.setValue('nombre invalido!');
    comp.crearTopico();
    http.expectNone(`${base}/topicos`);
    expect(comp.error('nombre')).toContain('letras');
  });

  it('crea un topico convirtiendo la retencion de horas a ms', () => {
    const comp = iniciar().componentInstance;
    comp.crearForm.patchValue({ nombre: 'reportes', particiones: 3, replicas: 3, retencionHoras: 24 });
    comp.crearTopico();
    const req = http.expectOne((r) => r.method === 'POST' && r.url === `${base}/topicos`);
    expect(req.request.body.retencionMs).toBe(86_400_000);
    req.flush({});
    http.expectOne(`${base}/topicos`).flush([]);
    http.expectOne(`${base}/consumer-groups`).flush([]);
    expect(comp.registros()[0].ok).toBe(true);
  });
});
