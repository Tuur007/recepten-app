// Lichtgewicht logger. `log`/`warn` zijn no-ops in productie zodat we de
// console niet vervuilen; `error` blijft altijd actief — Sentry pikt het op.
declare const __DEV__: boolean;

const isDev = typeof __DEV__ !== 'undefined' && __DEV__;

export const log = isDev ? console.log.bind(console) : () => {};
export const warn = isDev ? console.warn.bind(console) : () => {};
export const error = console.error.bind(console);
