/**
 * @fileOverview Configuración compartida de autenticación.
 *
 * Los usuarios inician sesión con un "username" (ej: ch_arquimax) que NO es un
 * email. Firebase Authentication requiere email/contraseña, así que mapeamos
 * cada username a un email interno determinístico con este dominio.
 * El email es un detalle de implementación: el usuario nunca lo ve ni lo escribe.
 */

export const AUTH_EMAIL_DOMAIN = 'arquimax.app';

export type UserRole = 'usuario' | 'administrador';

/** Normaliza un username escrito por el usuario (sin espacios, minúsculas). */
export function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

/** Convierte un username a su email interno de Firebase Auth. */
export function usernameToEmail(username: string): string {
  return `${normalizeUsername(username)}@${AUTH_EMAIL_DOMAIN}`;
}

/** Extrae el username a partir de un email interno de Firebase Auth. */
export function emailToUsername(email: string): string {
  return email.replace(`@${AUTH_EMAIL_DOMAIN}`, '');
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** ¿El texto ingresado parece un email real? */
export function isEmail(input: string): boolean {
  return EMAIL_RE.test(input.trim());
}

/**
 * Resuelve el email de Firebase Auth a partir de lo que el usuario escribe en el
 * login: si es un email real, se usa tal cual; si es un username legacy, se mapea
 * al dominio interno (@arquimax.app).
 */
export function resolveLoginEmail(input: string): string {
  const value = input.trim();
  return isEmail(value) ? value.toLowerCase() : usernameToEmail(value);
}

/** Validación básica de teléfono (permite +, espacios, guiones y paréntesis). */
export function isValidPhone(phone: string): boolean {
  const digits = phone.replace(/[^\d]/g, '');
  return digits.length >= 7 && digits.length <= 15 && /^[+\d\s()-]+$/.test(phone.trim());
}
