/**
 * Validacion del formulario de pedidos en el frontend.
 * Es la primera barrera (mejor experiencia de usuario); el backend vuelve a validar
 * todo con Bean Validation, porque la validacion del cliente se puede saltar.
 */
export interface DatosPedido {
  nombre: string;
  email: string;
  descripcion: string;
  total: string;
}

export const LIMITES = { nombre: 100, email: 150, descripcion: 255, totalMaximo: 99_999_999.99 } as const;

/** Estados en los que el pedido ya no puede cambiar (regla de negocio, igual que el backend). */
export const ESTADOS_FINALES = ['ENTREGADO', 'CANCELADO'];

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Devuelve la lista de errores; vacia si los datos son validos. */
export function validarPedido(d: DatosPedido): string[] {
  const errores: string[] = [];
  const nombre = d.nombre.trim();
  const email = d.email.trim();
  const descripcion = d.descripcion.trim();
  const total = Number(d.total);

  if (!nombre) errores.push('El nombre es obligatorio');
  else if (nombre.length > LIMITES.nombre) errores.push(`El nombre no puede superar ${LIMITES.nombre} caracteres`);

  if (!email) errores.push('El email es obligatorio');
  else if (!EMAIL.test(email) || email.length > LIMITES.email) errores.push('El email no tiene un formato válido');

  if (!descripcion) errores.push('La descripción es obligatoria');
  else if (descripcion.length > LIMITES.descripcion) {
    errores.push(`La descripción no puede superar ${LIMITES.descripcion} caracteres`);
  }

  if (d.total.trim() === '' || !Number.isFinite(total) || total <= 0) errores.push('El total debe ser mayor que 0');
  else if (total > LIMITES.totalMaximo) errores.push('El total supera el máximo permitido');
  else if (!/^\d+(\.\d{1,2})?$/.test(d.total.trim())) errores.push('El total admite hasta 2 decimales');

  return errores;
}

export function esEstadoFinal(estado?: string): boolean {
  return !!estado && ESTADOS_FINALES.includes(estado);
}

/** Traduce la respuesta de error del backend a un mensaje legible (sin exponer detalles tecnicos). */
export function mensajeDeError(err: { status?: number; error?: unknown }, accion: string): string {
  const cuerpo = (err?.error ?? {}) as { mensaje?: string; campos?: Record<string, string> };
  switch (err?.status) {
    case 400:
      return cuerpo.campos
        ? `Datos inválidos: ${Object.values(cuerpo.campos).join('; ')}`
        : `Datos inválidos al ${accion}`;
    case 401:
      return 'Tu sesión expiró. Vuelve a iniciar sesión.';
    case 403:
      return 'No tienes permiso para esta acción';
    case 409:
      return cuerpo.mensaje ?? `No se pudo ${accion}: conflicto con el estado actual`;
    case 0:
      return 'No hay conexión con el servidor';
    default:
      return `Error ${err?.status ?? ''} al ${accion}`.replace('  ', ' ');
  }
}
