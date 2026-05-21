// Lege stub-module voor RN-only packages tijdens unit tests.
// Default export is een Proxy zodat willekeurige property-reads geen crash geven.
const handler = {
  get(_t, prop) {
    if (prop === 'default') return new Proxy({}, handler);
    if (prop === '__esModule') return true;
    return new Proxy(() => undefined, handler);
  },
};
const proxy = new Proxy(() => undefined, handler);
export default proxy;
export const __esModule = true;
// Re-export het proxy onder een aantal courante namen.
export const AsyncStorage = proxy;
export const SQLiteProvider = proxy;
export const useSQLiteContext = () => null;
export const NetInfo = proxy;
export const Toast = proxy;
