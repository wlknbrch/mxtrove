import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildInventory, generatedFiles, sqlStatements } from "./mobile-contract-inventory.mjs";
import { wireFiles } from "./mobile-contract-wire.mjs";
import { assertFixtureSchema, normalizeFixtureError } from "./mobile-contract-support.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const json = (file) => JSON.parse(read(file));
const inventory = buildInventory(root);
const parity = json("docs/mobile/contracts/parity.json");
const schemas = json("docs/mobile/contracts/wire-schemas.json");
const api = JSON.parse(read("docs/mobile/contracts/api.openapi.yaml"));
const roles = json("docs/mobile/contracts/authorization.json");

test("generated inventories and wire contracts have no source drift", () => {
  for (const [file, expected] of [...generatedFiles(root), ...wireFiles(root)]) assert.equal(read(file), expected, `${file}: regenerate and review contract changes`);
});

test("every source route and API is mapped exactly once with its real gate", () => {
  assert.equal(new Set(parity.routes.map((row) => row.path)).size, inventory.routes.length);
  assert.deepEqual(parity.routes.map((row) => [row.path, row.gate]), inventory.routes.map((row) => [row.path, row.guard]));
  assert.equal(parity.routes.find((row) => row.path === "/post/:postId").gate, "public");
  assert.equal(parity.routes.find((row) => row.path === "/post/:postId/edit").gate, "session-and-terms");
  assert.deepEqual(parity.apis.map((row) => `${row.file}:${row.name}`), inventory.featureApis.filter((row) => row.apiFile).map((row) => `${row.file}:${row.name}`));
  assert.ok(inventory.uiActions.some((row) => row.file.includes("global-player")));
  assert.ok(inventory.uiActions.some((row) => row.event === "onKeyDown"));
  assert.ok(inventory.uiActions.some((row) => row.event === "href"));
});

test("every actual worker operation has OpenAPI; no future endpoint is asserted", () => {
  const explicit = inventory.endpoints.map((row) => `${row.method.toLowerCase()} ${row.path.replace(/:([A-Za-z0-9_]+)/g, "{$1}")}`).sort();
  const documented = Object.entries(api.paths).flatMap(([p, methods]) => Object.entries(methods).filter(([, operation]) => !operation["x-fastify-implicit-head"]).map(([method]) => `${method} ${p}`)).sort();
  assert.deepEqual(documented, explicit);
  assert.equal(api.openapi, "3.1.0");
  assert.equal(api.paths["/v1/mobile/devices"], undefined);
  assert.equal(api.paths["/v1/media/jobs/{jobId}/preview"].get.responses["200"].content["audio/mpeg"].schema.format, "binary");
  assert.equal(api.paths["/v1/media/jobs/{jobId}/preview"].head["x-fastify-implicit-head"], true);
  for (const item of Object.values(api.paths)) if (item.head) for (const result of Object.values(item.head.responses)) assert.equal(result.content, undefined);
  assert.equal(api.paths["/v1/protected-media/{assetId}/read-url"].post.security.length, 2);
  assert.ok(!api.paths["/v1/media/jobs/{jobId}/acknowledge"].post.responses["204"].content);
});

test("every statically named Supabase call has an inventoried table/view/function", () => {
  const functions = new Set(inventory.functions.map((row) => row.name));
  const tables = new Set([...inventory.tables, ...inventory.views].map((row) => row.name));
  for (const call of inventory.calls) {
    if (call.kind === "rpc") {
      assert.ok(call.targets.length, `Unreviewed dynamic RPC ${call.file}:${call.line}`);
      call.targets.forEach((target) => assert.ok(functions.has(target), `Unknown RPC ${target}`));
    }
    if (call.kind === "from" && call.targets.length) call.targets.forEach((target) => assert.ok(tables.has(target), `Unknown relation ${target} in ${call.file}`));
  }
  const dynamic = inventory.calls.find((row) => row.kind === "rpc" && row.targets.includes("resolve_feedback_thread"));
  assert.deepEqual(dynamic.targets, ["resolve_feedback_thread", "reopen_feedback_thread"]);
  for (const row of inventory.functions) assert.ok(read(row.file).split("\n")[row.line - 1].startsWith("create"), `Wrong function source line ${row.identity}`);
});

test("SQL statement scanner preserves dollar bodies, quoted semicolons, comments and overloads", () => {
  const input = "-- comment ;\ncreate function public.x(a text default 'a;b') returns text as $f$ begin perform ';'; return a; end $f$ language plpgsql; /* nested /* ; */ ; */ select 1;";
  const statements = sqlStatements(input);
  assert.equal(statements.length, 2);
  assert.match(statements[0].sql, /return a;/);
  assert.match(statements[1].sql, /select 1;/);
  assert.equal(inventory.functions.find((row) => row.name === "can_view_post").file, "supabase/migrations/20260723125000_mxshare_v2_release_pages_moderation.sql");
  assert.equal(inventory.functions.find((row) => row.name === "request_account_deletion").returns, "timestamptz");
  assert.equal(inventory.functions.find((row) => row.name === "request_data_export").returns, "uuid");
});

test("all schema references resolve; exact domain literal enums match source", () => {
  function walk(node) {
    if (!node || typeof node !== "object") return;
    if (node.$ref) assert.ok(node.$ref.split("/").slice(1).reduce((part, key) => part?.[key], api), node.$ref);
    Object.values(node).forEach(walk);
  }
  walk(api);
  for (const row of inventory.models.filter((row) => (row.file === "src/types/domain.ts" || row.file.startsWith("src/features/")) && row.enumValues)) assert.deepEqual(schemas.components.schemas[row.name].enum, row.enumValues);
  assert.ok(!schemas.components.schemas.CollaborationProjectInvite.properties.role.enum.includes("owner"));
  assert.deepEqual(schemas.components.schemas.CollaborationRole.enum, roles.roles);
});

const fixtureDocument = json("docs/mobile/contracts/fixtures/payloads.json");
for (const fixture of fixtureDocument.payloads) test(`portable payload decodes: ${fixture.id}`, () => {
  assertFixtureSchema(schemas.components.schemas[fixture.schema], fixture.payload, schemas);
});

test("fixtures include all visibilities/accents, private sharing, large integers and sparse cards", () => {
  const payloads = fixtureDocument.payloads;
  assert.deepEqual(payloads.filter((row) => row.id.startsWith("cards-") && row.payload[0]?.card?.post.post_type === "single").map((row) => row.payload[0].card.post.visibility).sort(), ["followers", "private", "public", "unlisted"]);
  assert.deepEqual([...new Set(payloads.filter((row) => row.schema === "ProfileAppearanceSettings").map((row) => row.payload.accent))].sort(), ["amber", "cyan", "emerald", "rose", "violet"]);
  assert.ok(payloads.find((row) => row.id === "quota-over-int32").payload.used_bytes > 2 ** 32);
  assert.equal(payloads.find((row) => row.id === "version-restricted-project").payload.sharing_mode, "project_members");
  assert.equal(payloads.find((row) => row.id === "cards-public").payload[0].card.artwork.waveform_peaks, undefined);
  for (const row of payloads.filter((row) => row.schema === "WaveformDataV1")) {
    assert.equal(row.payload.bucketCount, row.payload.peaks.length);
    row.payload.peaks.forEach(([min, max]) => assert.ok(min >= -1 && max <= 1 && min <= max));
  }
  assert.doesNotMatch(JSON.stringify(fixtureDocument), /supabase\.co|wlknbrch|access_token|refresh_token|eyJ[A-Za-z0-9_-]{15}/);
});

test("malformed payloads fail and unknown fields remain forward compatible", () => {
  const appearance = structuredClone(fixtureDocument.payloads.find((row) => row.schema === "ProfileAppearanceSettings").payload);
  delete appearance.accent;
  assert.throws(() => assertFixtureSchema(schemas.components.schemas.ProfileAppearanceSettings, appearance, schemas), /missing accent/);
  assert.throws(() => assertFixtureSchema(schemas.components.schemas.Visibility, "project_members", schemas), /unknown enum/);
  assert.throws(() => assertFixtureSchema(schemas.components.schemas.WaveformDataV1, { ...fixtureDocument.payloads.find((row) => row.schema === "WaveformDataV1").payload, analysisSampleRate: 44100 }, schemas), /constant/);
  assert.throws(() => assertFixtureSchema(schemas.components.schemas.JobSummary, { id: "bad", status: "ready", stage: "ready", progress: 100 }, schemas), /UUID/);
  assert.throws(() => assertFixtureSchema(schemas.components.schemas.JobSummary, { id: "11111111-1111-4111-8111-111111111111", status: "ready", stage: "ready", progress: 101 }, schemas), /bounds/);
  const profile = structuredClone(fixtureDocument.payloads.find((row) => row.schema === "Profile").payload);
  profile.new_ignorable_field = { a: true };
  assert.doesNotThrow(() => assertFixtureSchema(schemas.components.schemas.Profile, profile, schemas));
});

test("accepted-role projections agree with actual SQL rank thresholds and review allowlist", () => {
  const sql = (name) => inventory.functions.find((row) => row.name === name).sql;
  const ranks = Object.fromEntries([...sql("collaboration_role_rank").matchAll(/when '([^']+)' then (\d+)/g)].map((match) => [match[1], Number(match[2])]));
  for (const [name, expected] of Object.entries(roles.helperCapabilities)) {
    let actual;
    const threshold = sql(name).match(/>= public\.collaboration_role_rank\('([^']+)'\)/);
    if (threshold) actual = roles.roles.map((role) => ranks[role] >= ranks[threshold[1]]);
    else if (name === "can_review_project") { const permitted = [...sql(name).matchAll(/'(owner|admin|editor|contributor|reviewer|viewer)'/g)].map((match) => match[1]); actual = roles.roles.map((role) => permitted.includes(role)); }
    else { assert.match(sql(name), /membership_status = 'accepted'/); actual = roles.roles.map(() => true); }
    assert.deepEqual(actual, expected, name);
  }
  assert.match(sql("change_project_member_role"), /actor_role = 'admin'[\s\S]+next_role = 'admin'/);
  assert.match(sql("can_view_post"), /post\.hidden_at is null/);
  assert.doesNotMatch(sql("can_view_post"), /post\.is_published/);
  // Explicitly keep gaps visible; these are source observations, not new permission rules.
  assert.doesNotMatch(sql("create_shared_feedback_thread"), /max_uses/);
  assert.match(sql("can_access_protected_media"), /use_count <= share_link\.max_uses/);
});

for (const scenario of json("docs/mobile/contracts/fixtures/client-errors.json").cases) test(`portable error behavior: ${scenario.id}`, () => {
  assert.deepEqual(normalizeFixtureError(scenario.input), scenario.expected);
  assertFixtureSchema(schemas.components.schemas.ClientError, scenario.expected, schemas);
});

test("documentation local links and all source evidence files resolve", () => {
  for (const record of [...inventory.sourceFiles, ...inventory.migrations, ...inventory.configurationFiles]) assert.ok(fs.existsSync(path.join(root, record.file)), record.file);
  function walk(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) walk(file);
      else if (file.endsWith(".md")) {
        for (const match of fs.readFileSync(file, "utf8").matchAll(/\]\(([^)]+)\)/g)) {
          const target = match[1].split("#")[0];
          if (!target || /^(https?:|mailto:)/.test(target)) continue;
          assert.ok(fs.existsSync(path.resolve(path.dirname(file), target)), `${file}: missing ${target}`);
        }
      }
    }
  }
  walk(path.join(root, "docs/mobile"));
});
