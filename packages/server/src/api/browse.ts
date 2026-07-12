import express, { type Router } from "express";
import { BundleError, type KnowledgeBase } from "@okf-agent/core";
import { availableProviders, loadProviderConfig } from "@okf-agent/core";

/** Deterministic browse API — no LLM involved, browsing never costs tokens. */
export function browseRouter(kb: KnowledgeBase): Router {
  const router = express.Router();

  router.get("/tree", async (_req, res) => {
    res.json(await kb.listTree());
  });

  router.get("/concept", async (req, res) => {
    const path = String(req.query.path ?? "");
    try {
      res.json(await kb.readConcept(path));
    } catch (err) {
      if (err instanceof BundleError) {
        res.status(err.code === "NOT_FOUND" ? 404 : 400).json({ error: err.message });
        return;
      }
      throw err;
    }
  });

  router.get("/search", async (req, res) => {
    const q = String(req.query.q ?? "");
    const type = req.query.type ? String(req.query.type) : undefined;
    const tag = req.query.tag ? String(req.query.tag) : undefined;
    res.json(await kb.search(q, { type, tags: tag ? [tag] : undefined }));
  });

  router.get("/log", async (_req, res) => {
    res.json(await kb.readLog());
  });

  router.get("/validate", async (_req, res) => {
    res.json(await kb.validate());
  });

  router.get("/graph", async (_req, res) => {
    res.json(await kb.graph());
  });

  router.get("/types", async (_req, res) => {
    res.json(await kb.listTypes());
  });

  router.get("/config", (_req, res) => {
    const config = loadProviderConfig();
    res.json({
      providers: availableProviders(),
      defaultProvider: config.provider,
      defaultModel: config.model,
    });
  });

  return router;
}
