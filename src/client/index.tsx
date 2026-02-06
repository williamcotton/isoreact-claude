import '@components/styles.css';
import { createBrowserApp } from './browser-express';
import { createClientExecutor } from './graphql';
import { registerRoutes } from '@shared/universal-app';

const graphql = createClientExecutor();
const app = createBrowserApp(graphql);

registerRoutes(app);
app.start();
