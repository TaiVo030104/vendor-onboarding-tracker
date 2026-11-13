import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from './app.js';
import { createStore } from './store.js';

const dataFile = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../data/db.json');
const port = Number(process.env.PORT ?? 4000);

const app = createApp(createStore({ file: dataFile }));

app.listen(port, () => {
  console.log(`API listening on http://localhost:${port} (data: ${dataFile})`);
});
