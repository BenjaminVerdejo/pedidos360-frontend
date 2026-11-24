import { describe, it, expect } from 'vitest';
import { esEstadoFinal, mensajeDeError, validarPedido } from './validacion';

const valido = { nombre: 'Ana', email: 'ana@test.cl', descripcion: 'Pedido', total: '1990.50' };

describe('validarPedido (validacion de entrada en el cliente)', () => {
  it('acepta datos validos', () => {
    expect(validarPedido(valido)).toEqual([]);
  });

  it('exige todos los campos', () => {
    const errores = validarPedido({ nombre: ' ', email: '', descripcion: '', total: '' });
    expect(errores.length).toBe(4);
  });

  it('rechaza emails con formato invalido', () => {
    expect(validarPedido({ ...valido, email: 'no-es-email' })).toContain('El email no tiene un formato válido');
    expect(validarPedido({ ...valido, email: 'a@b' })).toContain('El email no tiene un formato válido');
  });

  it('rechaza total cero, negativo o con mas de 2 decimales', () => {
    expect(validarPedido({ ...valido, total: '0' })).toContain('El total debe ser mayor que 0');
    expect(validarPedido({ ...valido, total: '-10' })).toContain('El total debe ser mayor que 0');
    expect(validarPedido({ ...valido, total: '10.999' })).toContain('El total admite hasta 2 decimales');
  });

  it('rechaza textos que superan el largo maximo (mismo limite que el backend)', () => {
    expect(validarPedido({ ...valido, descripcion: 'x'.repeat(256) }).length).toBe(1);
    expect(validarPedido({ ...valido, nombre: 'x'.repeat(101) }).length).toBe(1);
  });
});

describe('reglas de estado y mensajes de error', () => {
  it('ENTREGADO y CANCELADO son estados finales', () => {
    expect(esEstadoFinal('ENTREGADO')).toBe(true);
    expect(esEstadoFinal('CANCELADO')).toBe(true);
    expect(esEstadoFinal('PENDIENTE')).toBe(false);
    expect(esEstadoFinal(undefined)).toBe(false);
  });

  it('muestra los campos invalidos que informa el backend (400)', () => {
    const msg = mensajeDeError({ status: 400, error: { campos: { 'cliente.email': 'email invalido' } } }, 'crear');
    expect(msg).toContain('email invalido');
  });

  it('muestra el mensaje de conflicto del backend (409)', () => {
    expect(mensajeDeError({ status: 409, error: { mensaje: 'ya fue entregado' } }, 'cambiar')).toBe('ya fue entregado');
  });

  it('no expone detalles tecnicos en errores 500', () => {
    const msg = mensajeDeError({ status: 500, error: 'java.lang.NullPointerException at com.example' }, 'crear');
    expect(msg).not.toContain('Exception');
  });
});
