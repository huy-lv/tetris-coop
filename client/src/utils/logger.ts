/**
 * Logger utility that conditionally disables console logging in production
 */

const isDevelopment = import.meta.env.DEV;

// In production, disable all console logging
if (!isDevelopment) {
  console.log = () => null;
  console.info = () => null;
  console.debug = () => null;
  console.warn = () => null;
  // Keep console.error for critical errors even in production
  // console.error = () => null;
}
