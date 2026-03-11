require("dotenv").config();

const fetch = require("node-fetch");

function boolFromEnv(v) {
  if (v == null) return undefined;
  return ["1", "true", "yes", "on"].includes(String(v).toLowerCase());
}

function buildTargets() {
  const password = process.env.LAVALINK_PASSWORD || "rcif123";
  const overrideHost = process.env.LAVALINK_HOST;
  const overridePort = process.env.LAVALINK_PORT ? Number(process.env.LAVALINK_PORT) : undefined;
  const overrideSecure = boolFromEnv(process.env.LAVALINK_SECURE);

  if (overrideHost) {
    return [
      {
        id: process.env.LAVALINK_NODE_ID || "main",
        host: String(overrideHost).trim(),
        port: Number.isFinite(overridePort) ? overridePort : 2333,
        secure: typeof overrideSecure === "boolean" ? overrideSecure : false,
        password,
      },
    ];
  }

  // Same defaults as index.js: try internal first on Render, then public.
  if (process.env.RENDER) {
    return [
      {
        id: "render-internal",
        host: String(process.env.LAVALINK_INTERNAL_HOST || "rcif-lavalink").trim(),
        port: 2333,
        secure: false,
        password,
      },
      {
        id: "render-public",
        host: String(process.env.LAVALINK_PUBLIC_HOST || "rcif-lavalink.onrender.com").trim(),
        port: 443,
        secure: true,
        password,
      },
    ];
  }

  return [
    {
      id: "public",
      host: String(process.env.LAVALINK_PUBLIC_HOST || "rcif-lavalink.onrender.com").trim(),
      port: 443,
      secure: true,
      password,
    },
  ];
}

async function probe(target) {
  const scheme = target.secure ? "https" : "http";
  const url = `${scheme}://${target.host}:${target.port}/v4/info`;

  const controller = new AbortController();
  const timeoutMs = process.env.LAVALINK_TEST_TIMEOUT_MS
    ? Number(process.env.LAVALINK_TEST_TIMEOUT_MS)
    : 12_000;
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  const res = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: target.password,
      "User-Agent": "discord-bot-lavalink-probe",
    },
    signal: controller.signal,
  });
  clearTimeout(timeout);

  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    // ignore
  }

  return { url, status: res.status, ok: res.ok, json, text };
}

async function main() {
  const targets = buildTargets();
  console.log(`Probing Lavalink (${targets.length} target(s))...`);

  for (const t of targets) {
    const scheme = t.secure ? "https" : "http";
    console.log(`- ${t.id}: ${scheme}://${t.host}:${t.port}/v4/info`);
  }

  for (const t of targets) {
    try {
      const result = await probe(t);
      if (result.ok) {
        const version = result.json?.version?.semver || result.json?.version || "unknown";
        console.log(`OK ${t.id} (${result.status}) -> ${result.url} (version=${version})`);
        process.exit(0);
      } else {
        console.log(`FAIL ${t.id} (${result.status}) -> ${result.url}`);
        if (result.text) console.log(result.text.slice(0, 500));
      }
    } catch (e) {
      console.log(`ERROR ${t.id} -> ${t.secure ? "https" : "http"}://${t.host}:${t.port}/v4/info`);
      console.log(e?.message || e);
    }
  }

  process.exit(1);
}

main();

