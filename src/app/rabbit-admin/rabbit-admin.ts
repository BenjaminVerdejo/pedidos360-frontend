import { Component, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  ColaResponse,
  RabbitAdminService,
  TipoExchange,
  mensajeDeError
} from '../services/rabbit-admin.service';

/** Mismas reglas que valida el backend (ReglasNombre.java). */
const PATRON_NOMBRE = /^[A-Za-z0-9._-]+$/;
const PATRON_ROUTING_KEY = /^[A-Za-z0-9._*#-]*$/;

function noReservado(control: AbstractControl): ValidationErrors | null {
  const v = (control.value ?? '') as string;
  return v.toLowerCase().startsWith('amq.') ? { reservado: true } : null;
}

const nombreValidators = [Validators.required, Validators.maxLength(255), Validators.pattern(PATRON_NOMBRE), noReservado];
const opcionalValidators = [Validators.maxLength(255), Validators.pattern(PATRON_NOMBRE)];

interface Registro {
  ok: boolean;
  texto: string;
  hora: string;
}

/**
 * Pantalla de administracion de RabbitMQ (solo rol Admin).
 * Consume rabbit-admin-service: crea y elimina colas, exchanges y bindings.
 */
@Component({
  selector: 'app-rabbit-admin',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './rabbit-admin.html',
  styleUrl: './rabbit-admin.css'
})
export class RabbitAdmin {
  private api = inject(RabbitAdminService);
  private fb = inject(FormBuilder);

  readonly tipos: TipoExchange[] = ['DIRECT', 'TOPIC', 'FANOUT', 'HEADERS'];
  readonly registros = signal<Registro[]>([]);
  readonly colaConsultada = signal<ColaResponse | null>(null);
  readonly cargando = signal(false);

  colaForm = this.fb.nonNullable.group({
    nombre: ['', nombreValidators],
    durable: [true],
    ttlMs: this.fb.control<number | null>(null, [Validators.min(1), Validators.max(604_800_000)]),
    maxLength: this.fb.control<number | null>(null, [Validators.min(1), Validators.max(1_000_000)]),
    deadLetterExchange: ['', opcionalValidators],
    deadLetterRoutingKey: ['', opcionalValidators]
  });

  gestionColaForm = this.fb.nonNullable.group({
    nombre: ['', nombreValidators],
    soloSiVacia: [true]
  });

  exchangeForm = this.fb.nonNullable.group({
    nombre: ['', nombreValidators],
    tipo: this.fb.nonNullable.control<TipoExchange>('TOPIC', Validators.required),
    durable: [true]
  });

  eliminarExchangeForm = this.fb.nonNullable.group({
    nombre: ['', nombreValidators]
  });

  bindingForm = this.fb.nonNullable.group({
    exchange: ['', nombreValidators],
    cola: ['', nombreValidators],
    routingKey: ['', [Validators.maxLength(255), Validators.pattern(PATRON_ROUTING_KEY)]]
  });

  // ---------------- Colas ----------------
  crearCola() {
    if (this.invalido(this.colaForm)) return;
    const v = this.colaForm.getRawValue();
    if (v.deadLetterRoutingKey && !v.deadLetterExchange) {
      this.registrar(false, 'deadLetterRoutingKey requiere indicar deadLetterExchange');
      return;
    }
    this.ejecutar(this.api.crearCola(v), `Cola '${v.nombre}' creada`, () => this.colaForm.reset());
  }

  consultarCola() {
    if (this.invalido(this.gestionColaForm)) return;
    const { nombre } = this.gestionColaForm.getRawValue();
    this.ejecutar(this.api.obtenerCola(nombre), null, (c) => {
      this.colaConsultada.set(c as ColaResponse);
      this.registrar(true, `Cola '${nombre}' consultada`);
    });
  }

  eliminarCola() {
    if (this.invalido(this.gestionColaForm)) return;
    const { nombre, soloSiVacia } = this.gestionColaForm.getRawValue();
    this.ejecutar(this.api.eliminarCola(nombre, soloSiVacia), `Cola '${nombre}' eliminada`, () =>
      this.colaConsultada.set(null)
    );
  }

  // ---------------- Exchanges ----------------
  crearExchange() {
    if (this.invalido(this.exchangeForm)) return;
    const v = this.exchangeForm.getRawValue();
    this.ejecutar(this.api.crearExchange(v), `Exchange '${v.nombre}' (${v.tipo}) creado`, () =>
      this.exchangeForm.reset()
    );
  }

  eliminarExchange() {
    if (this.invalido(this.eliminarExchangeForm)) return;
    const { nombre } = this.eliminarExchangeForm.getRawValue();
    this.ejecutar(this.api.eliminarExchange(nombre), `Exchange '${nombre}' eliminado`, () =>
      this.eliminarExchangeForm.reset()
    );
  }

  // ---------------- Bindings ----------------
  crearBinding() {
    if (this.invalido(this.bindingForm)) return;
    const v = this.bindingForm.getRawValue();
    this.ejecutar(this.api.crearBinding(v), `Binding ${v.exchange} --[${v.routingKey}]--> ${v.cola} creado`);
  }

  eliminarBinding() {
    if (this.invalido(this.bindingForm)) return;
    const v = this.bindingForm.getRawValue();
    this.ejecutar(this.api.eliminarBinding(v), `Binding ${v.exchange} --[${v.routingKey}]--> ${v.cola} eliminado`);
  }

  // ---------------- Apoyo ----------------
  /** Mensaje de validacion para mostrar bajo cada campo. */
  error(control: AbstractControl | null): string {
    if (!control || !control.touched || !control.errors) return '';
    const e = control.errors;
    if (e['required']) return 'Obligatorio';
    if (e['pattern']) return "Solo letras, numeros, '.', '-' y '_' (sin espacios)";
    if (e['reservado']) return "No puede empezar con 'amq.' (reservado)";
    if (e['maxlength']) return 'Maximo 255 caracteres';
    if (e['min']) return 'Debe ser mayor que 0';
    if (e['max']) return `Maximo ${e['max'].max}`;
    return 'Valor invalido';
  }

  private invalido(form: { invalid: boolean; markAllAsTouched(): void }): boolean {
    if (form.invalid) {
      form.markAllAsTouched();
      this.registrar(false, 'Revisa los campos marcados en rojo');
      return true;
    }
    return false;
  }

  private ejecutar<T>(op: Observable<T>, exito: string | null, despues?: (r: T) => void) {
    this.cargando.set(true);
    op.subscribe({
      next: (r) => {
        this.cargando.set(false);
        if (exito) this.registrar(true, exito);
        despues?.(r);
      },
      error: (err: HttpErrorResponse) => {
        this.cargando.set(false);
        this.registrar(false, mensajeDeError(err));
      }
    });
  }

  private registrar(ok: boolean, texto: string) {
    const hora = new Date().toLocaleTimeString();
    this.registros.update((r) => [{ ok, texto, hora }, ...r].slice(0, 10));
  }
}
