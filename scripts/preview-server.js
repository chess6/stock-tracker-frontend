#!/usr/bin/env node
const path = require('path');
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const serveHandler = require('serve-handler');

const PORT = Number(process.env.PORT || process.env.BUILD_PORT || process.env.SERVE_PORT || 3001);
const HOST = process.env.PREVIEW_HOST || '0.0.0.0';
const API_TARGET = process.env.API_PROXY_TARGET || 'http://127.0.0.1:5000';
const BUILD_DIR = path.join(__dirname, '..', 'build');

const app = express();

app.use(
  '/api',
  createProxyMiddleware({
    target: API_TARGET,
    changeOrigin: true,
    logLevel: 'warn',
  }),
);

app.use((req, res) =>
  serveHandler(req, res, {
    public: BUILD_DIR,
    rewrites: [{ source: '**', destination: '/index.html' }],
  }),
);

app.listen(PORT, HOST, () => {
  process.stdout.write(
    `Production preview listening on http://${HOST}:${PORT} (API proxied to ${API_TARGET})\n`,
  );
});
