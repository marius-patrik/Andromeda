import { createServer } from "node:http";
import { App } from "@octokit/app";
import "dotenv/config";

const appId = process.env.GITHUB_APP_ID;
const privateKey = process.env.GITHUB_PRIVATE_KEY?.replace(/\\n/g, "\n");
const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET;
const port = Number(process.env.PORT ?? 3000);

if (!appId || !privateKey || !webhookSecret) {
  throw new Error("Missing GITHUB_APP_ID, GITHUB_PRIVATE_KEY, or GITHUB_WEBHOOK_SECRET");
}

const app = new App({
  appId,
  privateKey,
  webhooks: {
    secret: webhookSecret
  }
});

app.webhooks.on("ping", ({ payload }) => {
  console.log(`Received ping for ${payload.repository?.full_name ?? "unknown repository"}`);
});

app.webhooks.on("issues.opened", async ({ octokit, payload }) => {
  await octokit.request("POST /repos/{owner}/{repo}/issues/{issue_number}/comments", {
    owner: payload.repository.owner.login,
    repo: payload.repository.name,
    issue_number: payload.issue.number,
    body: "Thanks for opening this issue. I am online and ready to help."
  });
});

app.webhooks.on("pull_request.opened", async ({ octokit, payload }) => {
  await octokit.request("POST /repos/{owner}/{repo}/issues/{issue_number}/comments", {
    owner: payload.repository.owner.login,
    repo: payload.repository.name,
    issue_number: payload.pull_request.number,
    body: "Thanks for opening this pull request. I will take a look."
  });
});

const server = createServer(async (request, response) => {
  if (request.method !== "POST" || request.url !== "/webhook") {
    response.writeHead(404);
    response.end("Not found");
    return;
  }

  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  const payload = Buffer.concat(chunks).toString("utf8");
  const id = request.headers["x-github-delivery"];
  const name = request.headers["x-github-event"];
  const signature = request.headers["x-hub-signature-256"];

  if (typeof id !== "string" || typeof name !== "string" || typeof signature !== "string") {
    response.writeHead(400);
    response.end("Missing GitHub webhook headers");
    return;
  }

  try {
    await app.webhooks.verifyAndReceive({ id, name, signature, payload });
    response.writeHead(202);
    response.end("Accepted");
  } catch (error) {
    console.error(error);
    response.writeHead(400);
    response.end("Webhook rejected");
  }
});

server.listen(port, () => {
  console.log(`GitHub bot listening on http://localhost:${port}/webhook`);
});
