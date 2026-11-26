import { Component, OnInit, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { KeyValuePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  CleanupPolicy,
  ConsumerGroupResponse,
  KafkaAdminService,
  LagResponse,
  TopicoResponse,
  mensajeErrorKafka
} from '../services/kafka-admin.service';

/** Mismas reglas que valida kafka-admin-service (ReglasKafka.java). */
const PATRON_TOPICO = /^[a-zA-Z0-9._-]{1,249}$/;

interface Registro {
  ok: boolean;
  texto: string;
  hora: string;
}

/**
 * Administracion de Kafka (solo rol Admin): topicos, configuraciones y consumer groups con su lag.
 * Consume kafka-admin-service.
 */
@Component({
  selector: 'app-kafka-admin',
  standalone: true,
  imports: [ReactiveFormsModule, KeyValuePipe],
  templateUrl: './kafka-admin.html',
  styleUrl: './kafka-admin.css'
})
export class KafkaAdmin implements OnInit {
  private api = inject(KafkaAdminService);
  private fb = inject(FormBuilder);

  readonly topicos = signal<TopicoResponse[]>([]);
  readonly grupos = signal<ConsumerGroupResponse[]>([]);
  readonly detalle = signal<TopicoResponse | null>(null);
  readonly lag = signal<LagResponse | null>(null);
  readonly registros = signal<Registro[]>([]);
  readonly cargando = signal(false);
  readonly politicas: CleanupPolicy[] = ['delete', 'compact'];

  crearForm = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.pattern(PATRON_TOPICO)]],
    particiones: [3, [Validators.required, Validators.min(1), Validators.max(12)]],
    replicas: [3, [Validators.required, Validators.min(1), Validators.max(3)]],
    retencionHoras: this.fb.control<number | null>(168, [Validators.min(1)]),
    cleanupPolicy: this.fb.nonNullable.control<CleanupPolicy>('delete'),
    minInsyncReplicas: [2, [Validators.min(1), Validators.max(3)]]
  });

  configForm = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.pattern(PATRON_TOPICO)]],
    retencionHoras: this.fb.control<number | null>(null, [Validators.min(1)]),
    cleanupPolicy: this.fb.control<CleanupPolicy | null>(null)
  });

  ngOnInit(): void {
    this.refrescar();
  }

  refrescar(): void {
    this.api.listarTopicos().subscribe({
      next: (t) => this.topicos.set(t),
      error: (e: HttpErrorResponse) => this.registrar(false, mensajeErrorKafka(e))
    });
    this.api.listarConsumerGroups().subscribe({
      next: (g) => this.grupos.set(g),
      error: (e: HttpErrorResponse) => this.registrar(false, mensajeErrorKafka(e))
    });
  }

  verTopico(nombre: string): void {
    this.api.obtenerTopico(nombre).subscribe({
      next: (t) => this.detalle.set(t),
      error: (e: HttpErrorResponse) => this.registrar(false, mensajeErrorKafka(e))
    });
  }

  verLag(grupo: string): void {
    this.api.lag(grupo).subscribe({
      next: (l) => this.lag.set(l),
      error: (e: HttpErrorResponse) => this.registrar(false, mensajeErrorKafka(e))
    });
  }

  crearTopico(): void {
    if (this.crearForm.invalid) {
      this.crearForm.markAllAsTouched();
      return;
    }
    const v = this.crearForm.getRawValue();
    this.ejecutar(
      this.api.crearTopico({
        nombre: v.nombre.trim(),
        particiones: v.particiones,
        replicas: v.replicas,
        retencionMs: v.retencionHoras ? v.retencionHoras * 3_600_000 : null,
        cleanupPolicy: v.cleanupPolicy,
        minInsyncReplicas: v.minInsyncReplicas
      }),
      `Tópico "${v.nombre}" creado (${v.particiones} particiones, ${v.replicas} réplicas)`,
      () => this.crearForm.controls.nombre.reset('')
    );
  }

  actualizarConfiguracion(): void {
    const v = this.configForm.getRawValue();
    if (this.configForm.invalid || (!v.retencionHoras && !v.cleanupPolicy)) {
      this.configForm.markAllAsTouched();
      this.registrar(false, 'Indica el tópico y al menos un cambio (retención o cleanup policy)');
      return;
    }
    this.ejecutar(
      this.api.actualizarConfiguracion(v.nombre.trim(), {
        retencionMs: v.retencionHoras ? v.retencionHoras * 3_600_000 : null,
        cleanupPolicy: v.cleanupPolicy
      }),
      `Configuración de "${v.nombre}" actualizada`
    );
  }

  eliminar(t: TopicoResponse): void {
    if (t.protegido || !confirm(`¿Eliminar el tópico "${t.nombre}" y todos sus mensajes?`)) return;
    this.ejecutar(this.api.eliminarTopico(t.nombre), `Tópico "${t.nombre}" eliminado`);
  }

  retencion(t: TopicoResponse): string {
    const ms = Number(t.configuracion?.['retention.ms']);
    if (!ms) return '—';
    if (ms < 0) return 'infinita';
    return `${Math.round(ms / 3_600_000)} h`;
  }

  error(nombre: string, form: 'crear' | 'config' = 'crear'): string {
    const grupo: AbstractControl = form === 'crear' ? this.crearForm : this.configForm;
    const c = grupo.get(nombre);
    if (!c || !c.touched || !c.errors) return '';
    if (c.errors['required']) return 'Obligatorio';
    if (c.errors['pattern']) return 'Solo letras, números, punto, guion y guion bajo';
    if (c.errors['min']) return `Mínimo ${c.errors['min'].min}`;
    if (c.errors['max']) return `Máximo ${c.errors['max'].max}`;
    return 'Valor inválido';
  }

  private ejecutar<T>(op: Observable<T>, ok: string, despues?: () => void): void {
    this.cargando.set(true);
    op.subscribe({
      next: () => {
        this.cargando.set(false);
        this.registrar(true, ok);
        despues?.();
        this.refrescar();
      },
      error: (e: HttpErrorResponse) => {
        this.cargando.set(false);
        this.registrar(false, mensajeErrorKafka(e));
      }
    });
  }

  private registrar(ok: boolean, texto: string): void {
    const hora = new Date().toLocaleTimeString();
    this.registros.update((r) => [{ ok, texto, hora }, ...r].slice(0, 8));
  }
}
