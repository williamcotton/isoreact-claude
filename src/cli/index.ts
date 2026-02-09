import { render } from 'ink';
import { createSchema } from '@shared/graphql/schema';
import { createDataStore } from '@server/graphql/data-store';
import { createServerExecutor } from '@server/graphql/executor';
import { registerRoutes } from '@shared/universal-app';
import { createCliApp } from './cli-app';
import { htmlToInk } from './html-to-ink';

function printUsage() {
  console.log(`Usage: cli [options] <path>

Options:
  -X, --method <METHOD>  HTTP method (default: GET)
  -d, --data <BODY>      URL-encoded body (implies POST if method not set)
  -h, --help             Show this help message

Examples:
  cli /songs             List all songs
  cli /songs/1           Show song detail
  cli /songs -d "title=Test&artist=Me"  Create a song`);
}

function parseArgs(argv: string[]): { path: string; method: string; body?: string } | null {
  const args = argv.slice(2);
  let method: string | null = null;
  let body: string | undefined;
  let path: string | null = null;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;
    if (arg === '-h' || arg === '--help') {
      printUsage();
      return null;
    }
    if (arg === '-X' || arg === '--method') {
      method = args[++i]?.toUpperCase() ?? 'GET';
    } else if (arg === '-d' || arg === '--data') {
      body = args[++i];
    } else if (!arg.startsWith('-')) {
      path = arg;
    }
  }

  if (!path) {
    printUsage();
    return null;
  }

  if (!method) {
    method = body ? 'POST' : 'GET';
  }

  return { path, method, body };
}

async function main() {
  const parsed = parseArgs(process.argv);
  if (!parsed) {
    process.exitCode = 1;
    return;
  }

  const dataStore = createDataStore();
  const schema = createSchema(dataStore);
  const executor = createServerExecutor(schema);
  const app = createCliApp(executor);
  registerRoutes(app);

  const result = await app.exec(parsed.path, parsed.method, parsed.body);

  const inkElement = htmlToInk(result.html);
  const { unmount } = render(inkElement);
  unmount();

  if (result.statusCode >= 400) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
