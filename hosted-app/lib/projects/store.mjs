import { currentUser, readJson } from "../auth/service.mjs";
import { validateProject } from "./engine.mjs";
import { createHash } from "node:crypto";

const KIND = "project-workspace";
const LIMIT = 20;
const MAX_DOCUMENT_BYTES = 60000;
const headers = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
};
const reply = (value, status = 200) =>
  Response.json(value, { status, headers });
const statement = (db, sql, ...values) => db.prepare(sql).bind(...values);
const activeSession =
  "EXISTS (SELECT 1 FROM sessions s JOIN users u ON u.id=s.user_id AND u.version=s.version WHERE s.hash=? AND s.user_id=? AND s.expires>?)";
const sessionValues = (user) => [
  user.session_hash,
  user.id,
  Math.floor(Date.now() / 1000),
];
const conflict = () =>
  reply(
    {
      error:
        "This project changed on another device. Reload your saved projects before saving or deleting again.",
      code: "PROJECT_CONFLICT",
    },
    409,
  );

async function reserveMutation(db, user) {
  const now = Math.floor(Date.now() / 1000),
    bucket = Math.floor(now / 900);
  const key = createHash("sha256")
    .update(`project-write:${user.id}:${bucket}`)
    .digest("hex");
  // Cleanup is bounded so a backlog cannot turn a small save into unbounded maintenance.
  // Expired counters have no active reservations and can safely be discarded.
  const results = await db.batch([
    statement(
      db,
      "DELETE FROM auth_limits WHERE key IN (SELECT key FROM auth_limits WHERE expires<=? ORDER BY expires LIMIT 100)",
      now,
    ),
    statement(
      db,
      "INSERT INTO auth_limits (key,count,expires) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1 RETURNING count",
      key,
      (bucket + 1) * 900,
    ),
  ]);
  return results[1].results[0].count <= 100;
}

function document(content) {
  const value = JSON.parse(content);
  if (
    value.kind !== KIND ||
    !Number.isSafeInteger(value.revision) ||
    value.revision < 1
  )
    throw Error("Invalid stored project.");
  return {
    project: validateProject(value.project),
    baseline: value.baseline === null ? null : validateProject(value.baseline),
    revision: value.revision,
  };
}

/** Private, versioned project documents. Every mutation uses a single SQL compare-and-swap. */
export async function projectStore(request, db) {
  try {
    if (!db)
      return reply(
        { error: "Project storage is temporarily unavailable." },
        503,
      );
    const user = await currentUser(request, db);
    if (!user)
      return reply({ error: "Sign in to save projects across devices." }, 401);
    if (request.method === "GET") {
      const rows = await statement(
        db,
        "SELECT content FROM reports WHERE user_id=? AND json_extract(content,'$.kind')=? ORDER BY created DESC,rowid DESC",
        user.id,
        KIND,
      ).all();
      return reply({
        projects: rows.results.map((row) => document(row.content)),
      });
    }
    if (!["POST", "DELETE"].includes(request.method))
      return reply({ error: "Method not allowed." }, 405);
    const data = await readJson(request, 120000);
    if (!(await reserveMutation(db, user)))
      return reply(
        {
          error: "Too many project changes. Try again in 15 minutes.",
          code: "PROJECT_RATE_LIMIT",
        },
        429,
      );
    if (!Number.isSafeInteger(data.baseRevision) || data.baseRevision < 0)
      return reply({ error: "A nonnegative baseRevision is required." }, 400);
    if (request.method === "DELETE") {
      if (typeof data.id !== "string" || !data.id || data.id.length > 100)
        return reply({ error: "Choose a saved project." }, 400);
      const previous = await statement(
        db,
        "SELECT content FROM reports WHERE id=? AND user_id=? AND json_extract(content,'$.kind')=?",
        data.id,
        user.id,
        KIND,
      ).first();
      if (
        !previous ||
        document(previous.content).revision !== data.baseRevision
      )
        return conflict();
      const deleted = await statement(
        db,
        `DELETE FROM reports WHERE id=? AND user_id=? AND content=? AND ${activeSession}`,
        data.id,
        user.id,
        previous.content,
        ...sessionValues(user),
      ).run();
      return deleted.meta.changes ? reply({ deleted: true }) : conflict();
    }
    let project, baseline;
    try {
      project = validateProject(data.project);
      baseline = data.baseline == null ? null : validateProject(data.baseline);
      if (
        baseline &&
        (baseline.id !== project.id || baseline.audience !== project.audience)
      )
        throw Error(
          "The scope baseline must belong to this project and audience.",
        );
    } catch (error) {
      return reply({ error: error.message || "Invalid project." }, 400);
    }
    const revision = data.baseRevision + 1;
    if (!Number.isSafeInteger(revision))
      return reply({ error: "Invalid project revision." }, 400);
    const envelope = { project, baseline, revision };
    const content = JSON.stringify({ kind: KIND, ...envelope });
    if (new TextEncoder().encode(content).byteLength > MAX_DOCUMENT_BYTES)
      return reply(
        {
          error:
            "This project and its baseline exceed the 60 KB account storage limit. Shorten the brief or evidence notes.",
        },
        413,
      );
    const previous = await statement(
      db,
      "SELECT content FROM reports WHERE id=? AND user_id=? AND json_extract(content,'$.kind')=?",
      project.id,
      user.id,
      KIND,
    ).first();
    if (previous) {
      if (document(previous.content).revision !== data.baseRevision)
        return conflict();
      const updated = await statement(
        db,
        `UPDATE reports SET content=?,created=? WHERE id=? AND user_id=? AND content=? AND ${activeSession}`,
        content,
        Date.now(),
        project.id,
        user.id,
        previous.content,
        ...sessionValues(user),
      ).run();
      return updated.meta.changes ? reply(envelope) : conflict();
    }
    if (data.baseRevision !== 0) return conflict();
    // INSERT OR IGNORE handles concurrent creates and global-id collisions without exposing owners.
    // The quota predicate runs inside the same write statement, including for concurrent new projects.
    const inserted = await statement(
      db,
      `INSERT OR IGNORE INTO reports (id,user_id,content,created) SELECT ?,?,?,? WHERE (SELECT count(*) FROM reports WHERE user_id=? AND json_extract(content,'$.kind')=?)<? AND ${activeSession}`,
      project.id,
      user.id,
      content,
      Date.now(),
      user.id,
      KIND,
      LIMIT,
      ...sessionValues(user),
    ).run();
    if (!inserted.meta.changes) {
      const count = await statement(
        db,
        "SELECT count(*) AS total FROM reports WHERE user_id=? AND json_extract(content,'$.kind')=?",
        user.id,
        KIND,
      ).first();
      if (count.total >= LIMIT)
        return reply(
          {
            error:
              "Your account holds 20 projects. Export and delete a project before adding another.",
            code: "PROJECT_LIMIT",
          },
          409,
        );
      return conflict();
    }
    return reply(envelope, 201);
  } catch (error) {
    if (error?.status) return reply({ error: error.message }, error.status);
    console.error("project_storage_failed");
    return reply(
      {
        error: "Project storage is temporarily unavailable. Please try again.",
      },
      503,
    );
  }
}
