import { register } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
register(join(__dirname, 'stub-loader.mjs'), import.meta.url);
