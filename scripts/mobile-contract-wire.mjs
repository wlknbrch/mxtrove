import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { buildInventory } from "./mobile-contract-inventory.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ref = (name) => ({ $ref: `#/components/schemas/${name}` });
const string = { type: "string" }, number = { type: "number" }, uuid = { type: "string", format: "uuid" };
const nullable = (schema) => ({ anyOf: [schema, { type: "null" }] });
const object = (properties, required = Object.keys(properties)) => ({ type: "object", properties, required, additionalProperties: true });

export function domainSchemas(inventory) {
  const schemas = {};
  function convert(type) {
    if (!type) return {};
    if (type.kind === ts.SyntaxKind.StringKeyword) return string;
    if (type.kind === ts.SyntaxKind.NumberKeyword) return number;
    if (type.kind === ts.SyntaxKind.BooleanKeyword) return { type: "boolean" };
    if (ts.isLiteralTypeNode(type)) {
      if (type.literal.kind === ts.SyntaxKind.NullKeyword) return { type: "null" };
      if (ts.isNumericLiteral(type.literal)) return { type: "number", const: Number(type.literal.text) };
      if (ts.isStringLiteral(type.literal)) return { type: "string", const: type.literal.text };
    }
    if (ts.isUnionTypeNode(type)) {
      if (type.types.every((part) => ts.isLiteralTypeNode(part) && ts.isStringLiteral(part.literal))) return { type: "string", enum: type.types.map((part) => part.literal.text) };
      return { anyOf: type.types.map(convert) };
    }
    if (ts.isArrayTypeNode(type)) return { type: "array", items: convert(type.elementType) };
    if (ts.isTupleTypeNode(type)) return { type: "array", prefixItems: type.elements.map(convert), minItems: type.elements.length, maxItems: type.elements.length, items: false };
    if (ts.isTypeReferenceNode(type)) {
      const name = type.typeName.getText();
      if (name === "Array") return { type: "array", items: convert(type.typeArguments[0]) };
      if (name === "Record") return { type: "object", additionalProperties: convert(type.typeArguments[1]) };
      if (name === "Exclude") {
        const base = convert(type.typeArguments[0]);
        const values = base.$ref ? schemas[base.$ref.split("/").at(-1)]?.enum : base.enum;
        const excluded = convert(type.typeArguments[1]);
        if (!values) throw new Error("Unsupported Exclude base");
        return { type: "string", enum: values.filter((value) => !(excluded.enum ?? [excluded.const]).includes(value)) };
      }
      return ref(name);
    }
    return { "x-typescript-type": type.getText() };
  }
  for (const model of inventory.models.filter((item) => item.file === "src/types/domain.ts")) {
    const source = ts.createSourceFile("domain.ts", model.declaration, ts.ScriptTarget.Latest, true);
    const declaration = source.statements[0];
    schemas[model.name] = ts.isInterfaceDeclaration(declaration)
      ? object(Object.fromEntries(declaration.members.filter(ts.isPropertySignature).map((property) => [property.name.getText(source), convert(property.type)])), declaration.members.filter(ts.isPropertySignature).filter((property) => !property.questionToken).map((property) => property.name.getText(source)))
      : convert(declaration.type);
  }
  for (const model of inventory.models.filter((item) => item.file.startsWith("src/features/") && item.enumValues)) schemas[model.name] = { type: "string", enum: model.enumValues };
  schemas.WorkerError = object({ error: string });
  schemas.JobSummary = object({ id: uuid, status: ref("MediaProcessingJobStatus"), stage: string, progress: number });
  schemas.ReadUrl = object({ url: { type: "string", format: "uri" }, expiresInSeconds: { type: "integer", minimum: 1 } });
  schemas.SongAnalysis = object({ tempoBpm: nullable(number), tempoConfidence: nullable(number), musicalKey: nullable(string), keyConfidence: nullable(number) });
  schemas.CreateJob = object({ sourceAssetId: uuid, songVersionId: nullable(uuid), songId: nullable(uuid), outputMode: { type: "string", enum: ["public_cloud", "protected"] }, protectedPurpose: { anyOf: [{ type: "string", enum: ["post_preview", "collaboration_preview", "message_audio"] }, { type: "null" }] }, projectId: nullable(uuid), postId: nullable(uuid) }, ["sourceAssetId"]);
  schemas.JobSummary.properties.progress = { type: "number", minimum: 0, maximum: 100 };
  // Cards intentionally omit some full-row fields and contain mixed casing.
  schemas.CardAsset = structuredClone(schemas.Asset);
  schemas.CardAsset.required = schemas.CardAsset.required.filter((key) => key !== "waveform_peaks");
  schemas.CardSingle = object({ song: ref("Song"), showLyrics: { type: "boolean" }, featuredVersion: ref("SongVersion"), previousVersion: nullable(ref("SongVersion")), previewAsset: nullable(ref("Asset")), protectedPreviewAsset: nullable(ref("ProtectedMediaAsset")), versionHeartCount: number, viewerHasHeartedVersion: { type: "boolean" } });
  schemas.CardReleaseTrack = object({ track: ref("ReleaseTrack"), song: ref("Song"), version: nullable(ref("SongVersion")), versionLabel: nullable(string), previewAsset: nullable(ref("Asset")), protectedPreviewAsset: nullable(ref("ProtectedMediaAsset")), versionHeartCount: number, viewerHasHeartedVersion: { type: "boolean" } });
  schemas.PostCard = object({ post: ref("Post"), owner: nullable(ref("Profile")), artwork: nullable(ref("CardAsset")), single: nullable(ref("CardSingle")), releaseTracks: { type: "array", items: ref("CardReleaseTrack") }, heartCount: number, viewerHasHearted: { type: "boolean" }, versionHeartCount: number, viewerHasHeartedVersion: { type: "boolean" }, commentCount: number, comments: { type: "array", maxItems: 0 }, credits: { type: "array", maxItems: 0 }, externalLinks: { type: "array", maxItems: 0 }, feedEvent: nullable(ref("FeedEvent")) });
  schemas.PostCardRows = { type: "array", items: object({ post_id: uuid, card: nullable(ref("PostCard")) }), maxItems: 50 };
  schemas.SharedProjectDetail = object({ targetType: { type: "string", enum: ["collaboration_project", "song_version"] }, targetId: uuid, permission: { type: "string", enum: ["view", "review"] }, project: ref("CollaborationProject"), owner: ref("Profile"), tracks: { type: "array", items: object({ track: ref("CollaborationProjectTrack"), song: ref("Song"), version: nullable(ref("SongVersion")), protectedAsset: nullable(ref("ProtectedMediaAsset")) }) }, feedbackThreads: { type: "array", items: ref("FeedbackThread") } });
  schemas.LegacyWaveform = { type: "array", items: number };
  schemas.ClientError = object({ kind: { type: "string", enum: ["auth_required", "reauth_required", "forbidden", "unavailable", "share_unavailable", "quota_exceeded", "payload_too_large", "unsupported_media", "validation", "conflict", "rate_limited", "transient", "cancelled", "unknown"] }, retryable: { type: "boolean" }, outcomeUnknown: { type: "boolean" } });
  return schemas;
}

export function phaseForRoute(route) {
  const p = route.path;
  if (/^\/(login|forgot-password|reset-password|onboarding)$/.test(p)) return "0.2";
  if (/^\/oauth\//.test(p)) return "0.5";
  if (/^\/(share|embed|invites\/:token)/.test(p)) return "1.0";
  if (/^\/(about|privacy|terms|admin|settings)/.test(p)) return "0.9";
  if (p.startsWith("/messages") || p === "/notifications") return "0.8";
  if (p.startsWith("/library")) return "0.5";
  if (p.startsWith("/projects") || p === "/invites") return "0.7";
  if (p.startsWith("/create") || p === "/post/:postId/edit") return "0.6";
  if (p.endsWith("/followers") || p.endsWith("/following")) return "0.4";
  if (["/", "/explore", "/search", "/post/:postId", "/:username"].includes(p)) return "0.3";
  throw new Error(`Unmapped route ${p}`);
}

const apiPhases = { admin: "0.9", appearance: "0.9", attachments: "0.8", auth: "0.2", drive: "0.5", feed: "0.3", follows: "0.4", legal: "0.2", library: "0.5", "media-processing": "0.5", messages: "0.8", notifications: "0.8", posts: "0.6", privacy: "0.9", profile: "0.4", projects: "0.7", search: "0.3" };
export function buildParity(inventory) {
  return {
    contractVersion: "0.1.1",
    routes: inventory.routes.map((route) => ({ path: route.path, source: `${route.file}:${route.line}`, gate: route.guard, release: phaseForRoute(route), status: "audited-native-not-implemented" })),
    apis: inventory.featureApis.filter((api) => api.apiFile).map((api) => {
      const feature = api.file.split("/")[2];
      if (!apiPhases[feature]) throw new Error(`Unmapped API feature ${feature}`);
      const local = ["getDemoAvatarForProfile", "getUploadableAttachmentKind", "getMessageReferenceTarget", "getSearchResultPath", "validateAppFeedback"].includes(api.name);
      const gaps = ({ upsertPostDraft: ["B4"], sendMessage: ["B5"], createMediaProcessingJob: ["B5"], uploadMediaProcessingInput: ["B6"], uploadMessageAttachment: ["B5", "B6"], updatePostVisibility: ["B2", "B7"], createProtectedMediaReadUrl: ["B2"], createSharedProjectFeedback: ["B2"] })[api.name] ?? [];
      const release = api.name === "submitAppFeedback" ? "0.9" : /^(getShared|resolveShared)/.test(api.name) ? "1.0" : /^(getResolved|listResolved|listHome|listExplore|searchExplore|getProfileByUsername|getCurrentProfile|getProfilesByIds|getProfilePosts|createProtectedMediaReadUrl|getProtectedAssetPlaybackUrl)/.test(api.name) ? "0.3" : apiPhases[feature];
      const rpcNames = [...new Set(api.calls.filter((call) => call.kind === "rpc").flatMap((call) => call.targets))];
      const tableNames = [...new Set(api.calls.filter((call) => call.kind === "from").flatMap((call) => call.targets))];
      return { name: api.name, file: api.file, line: api.line, release, transport: local ? "local-reference" : "reuse-existing-service-with-native-orchestration", gaps, status: "audited-native-not-implemented", rpcNames, tableNames, authorizationEvidence: { functions: inventory.functions.filter((rpc) => rpcNames.includes(rpc.name)).map((rpc) => ({ identity: rpc.identity, source: `${rpc.file}:${rpc.line}`, securityDefiner: rpc.securityDefiner })), tablePolicies: inventory.policies.filter((policy) => tableNames.includes(policy.table)).map((policy) => ({ table: policy.table, name: policy.name, source: `${policy.file}:${policy.line}` })) } };
    }),
  };
}

const bearer = [{ userJWT: [] }];
const shareOrBearer = [{ userJWT: [] }, { shareToken: [] }];
const binary = { type: "string", format: "binary" };
const param = (name, where, schema = string, required = false) => ({ name, in: where, required, schema });
const response = (description, schema, mime = "application/json") => ({ description, ...(schema ? { content: { [mime]: { schema } } } : {}) });

export function openapi(inventory, schemas) {
  const doc = { openapi: "3.1.0", info: { title: "MxTrove existing media worker", version: "0.1.1", description: "Phase-0 contracts plus backward-compatible security maintenance. Worker package 0.1.0 is not protocol capability discovery. JSON syntax is valid YAML 1.2. No planned mobile endpoint is asserted as implemented." }, servers: [{ url: "{workerBase}", variables: { workerBase: { default: "http://127.0.0.1:8080", description: "Explicit staging base or deployed /worker URL; never auto-select production." } } }], paths: {}, components: { securitySchemes: { userJWT: { type: "http", scheme: "bearer", bearerFormat: "JWT", description: "Supabase user JWT; not service-role or provider access token." }, shareToken: { type: "apiKey", in: "header", name: "X-MxShare-Share-Token" }, mediaSignature: { type: "apiKey", in: "query", name: "signature", description: "HMAC plus required expires query; temporary bearer capability." } }, schemas } };
  for (const endpoint of inventory.endpoints) {
    const p = endpoint.path, method = endpoint.method.toLowerCase();
    const pathname = p.replace(/:([A-Za-z0-9_]+)/g, "{$1}");
    const operation = { operationId: `${method}_${p.replace(/[^A-Za-z0-9]+/g, "_")}`, summary: `${endpoint.method} ${p}`, "x-source": `${endpoint.file}:${endpoint.line}`, "x-contract-status": "existing-source-not-live-verified", security: bearer, parameters: [...p.matchAll(/:([A-Za-z0-9_]+)/g)].map((match) => param(match[1], "path", match[1] === "username" ? string : uuid, true)), responses: { "500": response("Current worker exception handler; status classification is message-based and incomplete.", ref("WorkerError")) } };
    const json = (schema, code = "200", description = "Successful response") => { operation.responses[code] = response(description, schema); };
    if (p === "/healthz") { operation.security = []; json(object({ ok: { const: true }, worker: string })); }
    else if (p === "/readyz") { operation.security = []; json(object({ ok: { const: true }, tempDir: string, protectedMedia: { const: true } })); operation.description = "Checks temporary/protected directories. Does not prove all migrations, auth, FFmpeg or providers are ready."; }
    else if (p === "/source") { operation.security = []; operation.responses["302"] = { description: "Redirect to configured corresponding source URL", headers: { Location: { schema: string } } }; }
    else if (p === "/v1/public-media") {
      operation.security = [];
      operation.parameters.push(param("fileId", "query", { type: "string", pattern: "^[A-Za-z0-9_-]{20,}$" }), param("kind", "query", { type: "string", enum: ["audio", "image"], default: "image" }), param("provider", "query", string), param("url", "query", { type: "string", format: "uri" }), param("size", "query", { type: "string", default: "w1200" }), param("Range", "header"));
      operation.description = "No JWT. Drive fileId OR provider=dropbox + HTTPS URL on dropbox.com/www.dropbox.com/dl.dropboxusercontent.com, no credentials/nonstandard port. At most five redirects, each validated against trusted public provider hosts; unsupported destination/loop returns502. Invalid/non-audio kind defaults to image. Upstream status/type/ETag/Last-Modified/Content-Range forwarded. Public images max-age=86400/SWR604800; audio max-age=86400/SWR86400. Does not revoke external public links.";
      operation.responses["200"] = response("Upstream bytes; HEAD has no body", binary, "application/octet-stream"); operation.responses["206"] = response("Upstream partial response", binary, "application/octet-stream"); operation.responses["400"] = response("Unsupported public source", ref("WorkerError")); operation.responses.default = { description: "Upstream status/body (including non-JSON provider errors) passes through." };
    }
    else if (p === "/v1/protected-media/:assetId/read-url") {
      operation.security = shareOrBearer; operation.parameters.push(param("X-MxShare-Share-Token", "header")); json(ref("ReadUrl"));
      operation.description = "Authorizes caller/share through RPC. No body. 404 for denied; 410 for missing storage. Token issuance is not immediate revocation of an existing signed URL.";
    }
    else if (p === "/v1/protected-media/:assetId") {
      operation.security = [{ mediaSignature: [] }, { userJWT: [] }]; operation.parameters.push(param("expires", "query", { type: "integer" }), param("signature", "query"), param("X-MxShare-Share-Token", "header"), param("Range", "header"));
      operation.description = "Valid asset+expiry HMAC bypasses live membership/share checks. Otherwise JWT required, optionally share header. Asset must remain ready/nondeleted and file present. Private no-store; Accept-Ranges bytes; invalid/satisfiability Range ->416. Signature expiry is epoch seconds.";
      operation.responses["200"] = response("Full file; HEAD no body", binary, "application/octet-stream"); operation.responses["206"] = response("Single byte range; HEAD no body", binary, "application/octet-stream"); operation.responses["416"] = { description: "Unsatisfiable/invalid single range; Content-Range bytes */size, no body" };
    }
    else if (p === "/v1/media/jobs" && method === "post") { operation.requestBody = { required: true, content: { "application/json": { schema: ref("CreateJob") } } }; json(ref("JobSummary")); operation.description = "sourceAssetId required (only truthiness at HTTP boundary); owner/mode/context checked in media-jobs. May reuse active job. No persistent Idempotency-Key."; }
    else if (p.endsWith("/input")) { operation.requestBody = { required: true, content: { "application/octet-stream": { schema: binary } } }; json(ref("JobSummary"), "202"); operation.description = "Full raw stream only, MIME may be audio/*; no multipart/Content-Range session protocol. Defaults max 524288000 bytes. Re-upload in active job not guaranteed safe."; }
    else if (p.endsWith("/preview")) { operation.responses["200"] = response("Temporary owner MP3 download; reading ready changes job to uploading_to_drive", binary, "audio/mpeg"); operation.responses["409"] = response("Not in ready/uploading_to_drive/completed", ref("WorkerError")); }
    else if (p.endsWith("/acknowledge") || method === "delete") { operation.responses["204"] = response(p.endsWith("/acknowledge") ? "Removes temporary job directory, does not finalize DB metadata" : "Cancels job or soft-deletes own attachment and releases storage"); }
    else if (p === "/v1/media/jobs/:jobId") json(ref("MediaProcessingJob"));
    else if (p === "/v1/media/analyze-song") { operation.parameters.push(param("X-MxShare-Song-Id", "header", uuid, true), param("X-MxShare-Source-Asset-Id", "header", uuid, true)); operation.requestBody = { required: true, content: { "application/octet-stream": { schema: binary } } }; json(ref("SongAnalysis")); operation.description = "Raw audio, ownership checked, updates stored song analysis; not a read-only GET."; }
    else if (p === "/v1/push/test") { json(object({ ok: { const: true } })); operation.description = "Tests existing browser Web Push for authenticated user. Not APNs."; }
    else if (p === "/v1/messages/:messageId/attachments") { operation.parameters.push(param("X-MxShare-Filename", "header"), param("X-MxShare-Attachment-Type", "header", { type: "string", enum: ["audio", "image", "document"] }, true), param("Content-Length", "header", { type: "integer" })); operation.requestBody = { required: true, content: { "application/octet-stream": { schema: binary } } }; json(ref("MessageAttachment"), "201"); operation.description = "Own sender message + current can-send permission. Raw bytes, signature sniffing, sanitization; audio/image processing. Default max audio50MiB/image15MiB/document20MiB. No multipart/resume/idempotency."; operation.responses["415"] = response("Unsupported/mismatched signature", ref("WorkerError")); operation.responses["422"] = response("Audio duration invalid/above limit", ref("WorkerError")); }
    else if (p.startsWith("/og/")) { operation.security = []; operation.responses["200"] = response("Public-only generated OpenGraph image, cached", binary, "image/png"); }
    else if (p.startsWith("/social/")) { operation.security = []; operation.responses["200"] = response("Public-only HTML with OG metadata and browser meta-refresh; not JSON or HTTP redirect", string, "text/html"); }
    else throw new Error(`Missing HTTP contract ${endpoint.method} ${p}`);
    if (operation.security.length) operation.responses["401"] = response("Current message-based JWT error classification; some verification errors can surface as 500", ref("WorkerError"));
    if (p.includes(":")) operation.responses["404"] = response("Missing or authorization-hidden resource", ref("WorkerError"));
    if (p.includes("protected-media")) operation.responses["410"] = response("Backing media file missing", ref("WorkerError"));
    for (const status of [...endpoint.handler.matchAll(/\.code\((\d{3})\)/g)].map((match) => match[1]).filter((status) => Number(status) >= 400)) operation.responses[status] ??= response("Explicit handler validation/unavailable error; see source", ref("WorkerError"));
    if (method === "post" || method === "put") operation.responses["413"] = response("Global size/quota exception classification where matched; not a stable quota code", ref("WorkerError"));
    if (p !== "/healthz") operation.responses["429"] = { ...response("Rate limit, per worker instance and IP", ref("WorkerError")), headers: { "Retry-After": { schema: { type: "integer", minimum: 1 } } } };
    doc.paths[pathname] ??= {}; doc.paths[pathname][method] = operation;
  }
  for (const item of Object.values(doc.paths)) {
    if (item.get && !item.head) item.head = { ...structuredClone(item.get), operationId: item.get.operationId.replace(/^get_/, "head_"), summary: item.get.summary.replace(/^GET/, "HEAD"), "x-fastify-implicit-head": true, description: `Fastify automatic HEAD using GET handler; may retain GET side effects. ${item.get.description ?? ""}` };
    if (item.head) for (const response of Object.values(item.head.responses)) delete response.content;
  }
  return doc;
}

export function wireFiles(baseRoot = root) {
  const inventory = buildInventory(baseRoot), schemas = domainSchemas(inventory);
  return new Map([
    ["docs/mobile/contracts/parity.json", JSON.stringify(buildParity(inventory), null, 2) + "\n"],
    ["docs/mobile/contracts/wire-schemas.json", JSON.stringify({ $schema: "https://json-schema.org/draft/2020-12/schema", components: { schemas } }, null, 2) + "\n"],
    ["docs/mobile/contracts/api.openapi.yaml", JSON.stringify(openapi(inventory, schemas), null, 2) + "\n"],
  ]);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  for (const [file, text] of wireFiles()) {
    const full = path.join(root, file);
    if (process.argv.includes("--check")) {
      if (!fs.existsSync(full) || fs.readFileSync(full, "utf8") !== text) { console.error(`Stale mobile contract: ${file}`); process.exitCode = 1; }
    } else { fs.mkdirSync(path.dirname(full), { recursive: true }); fs.writeFileSync(full, text); }
  }
}
