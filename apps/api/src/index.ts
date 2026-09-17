import { buildApp } from './app';

const app = buildApp();
const PORT = 3001;
app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});
