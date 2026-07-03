#!/usr/bin/env node
import "dotenv/config";

import { App } from "@octokit/app";
import { createBot } from "./bot.js";
import { loadAppCredentials, loadConfig } from "./config.js";
import { ensureManagedRepositorySetup } from "./managed-sync.js";
import { createWebhookServer } from "./server.js";

export async function runCli(args = process.argv.slice(2)): Promise<void> {
  const [command = "help"] = args;

  if (command === "help" || command === "--help" || command === "-h") {
    printHelp();
    return;
  }

  if (command === "serve") {
    serve();
    return;
  }

  if (command === "install-url") {
    await printInstallationUrl();
    return;
  }

  if (command === "sync-managed") {
    await syncManagedRepositories();
    return;
  }

  throw new Error(`unknown command: ${command}`);
}

function serve(): void {
  const config = loadConfig();
  const app = createBot({
    appId: config.appId,
    privateKey: config.privateKey,
    webhookSecret: config.webhookSecret
  });
  const server = createWebhookServer(app.webhooks);

  server.listen(config.port, () => {
    console.log(`DarkFactory listening on http://localhost:${config.port}/webhook`);
  });
}

async function printInstallationUrl(): Promise<void> {
  const credentials = loadAppCredentials();
  const app = new App({
    appId: credentials.appId,
    privateKey: credentials.privateKey
  });

  console.log(await app.getInstallationUrl());
}

async function syncManagedRepositories(): Promise<void> {
  const credentials = loadAppCredentials();
  const app = new App({
    appId: credentials.appId,
    privateKey: credentials.privateKey
  });
  let count = 0;

  for await (const { octokit, repository } of app.eachRepository.iterator()) {
    const result = await ensureManagedRepositorySetup(octokit, {
      owner: repository.owner.login,
      repo: repository.name,
      defaultBranch: repository.default_branch,
      archived: repository.archived
    });

    count += 1;
    console.log(
      `${result.owner}/${result.repo}: ${result.status}${
        result.pullRequestUrl ? ` ${result.pullRequestUrl}` : ""
      }`
    );
  }

  console.log(`Processed ${count} installed repositories.`);
}

function printHelp(): void {
  console.log(`darkfactory - DarkFactory GitHub agent

Usage:
  darkfactory serve
  darkfactory install-url
  darkfactory sync-managed

Secrets are read from environment variables first, then AGENTS_SECRETS/*.secret.`);
}

runCli().catch((error) => {
  console.error(`darkfactory: ${error.message}`);
  process.exitCode = 1;
});
