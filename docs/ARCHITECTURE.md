# Foundation architecture

```text
React browser UI → local Node coordinator → SQLite
```

One private package contains apps/server, apps/web and the shared health contract. The coordinator binds to IPv4 loopback, owns one database connection/data-directory lock, and exposes only GET /api/health. The production coordinator serves the built web files; development uses a loopback Vite server and a narrow /api proxy. SSE and all execution adapters are absent.

SQLite uses foreign keys, WAL, a five-second busy timeout and transactional schema_migrations metadata. Version 1 contains no product tables. SIGINT/SIGTERM closes HTTP connections and SQLite before releasing the ownership lock. After an unclean crash, a retained lock deliberately blocks startup; confirm its owner is no longer running before manually removing that lock. The app never deletes an uncertain owner's lock automatically.

Host/Origin validation, restricted static paths and Vite filesystem restrictions establish local defaults. There is no mutation endpoint, filesystem endpoint, shell endpoint, provider configuration or authentication secret. Future mutating slices need their own explicit authorization design; these guards do not supply it.

Node24's built-in SQLite remains release-candidate API. It avoids another native database dependency here; version/backup changes require regression verification. Source modules own configuration, database/migrations, HTTP/lifecycle, shared contract and UI independently.
