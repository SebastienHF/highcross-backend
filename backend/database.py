import json
import os
import asyncpg
from typing import Any


def _parse_json_field(value) -> dict | list:
    """asyncpg returns JSONB as dict/list, but sometimes as a string — handle both."""
    if value is None:
        return {}
    if isinstance(value, str):
        return json.loads(value)
    return value

_pool: asyncpg.Pool | None = None


async def init_pool() -> None:
    global _pool
    from urllib.parse import urlparse, unquote
    url = urlparse(os.environ["DATABASE_URL"])
    _pool = await asyncpg.create_pool(
        host=url.hostname,
        port=url.port or 6543,
        user=unquote(url.username),
        password=unquote(url.password),
        database=url.path.lstrip("/"),
        min_size=1,
        max_size=10,
        statement_cache_size=0,
    )


async def close_pool() -> None:
    global _pool
    if _pool:
        await _pool.close()
        _pool = None


def get_pool() -> asyncpg.Pool:
    if _pool is None:
        raise RuntimeError("Database pool not initialised")
    return _pool


# ── Users ────────────────────────────────────────────────────────────────────

async def get_user_by_email(email: str) -> dict | None:
    pool = get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT id, email, password_hash FROM users WHERE email = $1", email
        )
        return dict(row) if row else None


async def create_user(email: str, password_hash: str) -> dict:
    pool = get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email",
            email, password_hash,
        )
        return dict(row)


# ── Clients ──────────────────────────────────────────────────────────────────

async def search_clients(query: str) -> list[dict]:
    pool = get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            "SELECT id, name, initials FROM clients WHERE name ILIKE $1 ORDER BY name LIMIT 20",
            f"%{query}%",
        )
        return [dict(row) for row in rows]

async def get_all_clients() -> list[dict]:
    pool = get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            "SELECT id, name, initials, fact_find, soft_knowledge, open_items, created_at "
            "FROM clients ORDER BY created_at ASC"
        )
        clients = []
        for row in rows:
            client = dict(row)
            client["fact_find"] = dict(_parse_json_field(client["fact_find"]))
            client["open_items"] = list(_parse_json_field(client["open_items"]) or [])
            client["created_at"] = client["created_at"].isoformat() if client["created_at"] else None

            # Fetch recommendations
            recs = await conn.fetch(
                "SELECT type, summary, confirmed_at FROM recommendations "
                "WHERE client_id = $1 ORDER BY confirmed_at ASC",
                client["id"],
            )
            client["confirmed_recommendations"] = [
                {
                    "type": r["type"],
                    "summary": r["summary"],
                    "confirmedAt": r["confirmed_at"].isoformat(),
                }
                for r in recs
            ]

            # Fetch artifacts (exclude fact_find_update — never displayed)
            arts = await conn.fetch(
                "SELECT id, type, content, structured_data, confirmed, confirmed_at, "
                "saved_to_file, saved_to_file_at, version, supersedes, created_at "
                "FROM artifacts WHERE client_id = $1 AND type != 'fact_find_update' "
                "ORDER BY created_at ASC",
                client["id"],
            )
            client["saved_artifacts"] = [_format_artifact(a) for a in arts]

            # Fetch last 10 messages
            msgs = await conn.fetch(
                "SELECT id, role, content, artifacts, created_at FROM messages "
                "WHERE client_id = $1 ORDER BY created_at DESC LIMIT 10",
                client["id"],
            )
            client["saved_messages"] = [_format_message(m) for m in reversed(msgs)]

            clients.append(client)
        return clients


async def get_client(client_id: str) -> dict | None:
    pool = get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT id, name, initials, fact_find, soft_knowledge, open_items, created_at "
            "FROM clients WHERE id = $1",
            client_id,
        )
        if not row:
            return None
        client = dict(row)
        client["fact_find"] = dict(_parse_json_field(client["fact_find"]))
        client["open_items"] = list(_parse_json_field(client["open_items"]) or [])
        client["created_at"] = client["created_at"].isoformat() if client["created_at"] else None

        recs = await conn.fetch(
            "SELECT type, summary, confirmed_at FROM recommendations "
            "WHERE client_id = $1 ORDER BY confirmed_at ASC",
            client_id,
        )
        client["confirmed_recommendations"] = [
            {"type": r["type"], "summary": r["summary"], "confirmedAt": r["confirmed_at"].isoformat()}
            for r in recs
        ]

        arts = await conn.fetch(
            "SELECT id, type, content, structured_data, confirmed, confirmed_at, "
            "saved_to_file, saved_to_file_at, version, supersedes, created_at "
            "FROM artifacts WHERE client_id = $1 AND type != 'fact_find_update' "
            "ORDER BY created_at ASC",
            client_id,
        )
        client["saved_artifacts"] = [_format_artifact(a) for a in arts]

        msgs = await conn.fetch(
            "SELECT id, role, content, artifacts, created_at FROM messages "
            "WHERE client_id = $1 ORDER BY created_at DESC LIMIT 10",
            client_id,
        )
        client["saved_messages"] = [_format_message(m) for m in reversed(msgs)]

        return client


async def create_client(data: dict) -> dict:
    pool = get_pool()
    import json
    async with pool.acquire() as conn:
        await conn.execute(
            "INSERT INTO clients (id, name, initials, fact_find, soft_knowledge, open_items) "
            "VALUES ($1, $2, $3, $4, $5, $6)",
            data["id"],
            data["name"],
            data["initials"],
            json.dumps(data.get("fact_find", {})),
            data.get("soft_knowledge", ""),
            json.dumps(data.get("open_items", [])),
        )
    return await get_client(data["id"])


async def update_client(client_id: str, data: dict) -> dict | None:
    pool = get_pool()
    import json
    async with pool.acquire() as conn:
        fields, values, i = [], [], 1
        if "name" in data:
            fields.append(f"name = ${i}"); values.append(data["name"]); i += 1
        if "initials" in data:
            fields.append(f"initials = ${i}"); values.append(data["initials"]); i += 1
        if "fact_find" in data:
            fields.append(f"fact_find = ${i}"); values.append(json.dumps(data["fact_find"])); i += 1
        if "soft_knowledge" in data:
            fields.append(f"soft_knowledge = ${i}"); values.append(data["soft_knowledge"]); i += 1
        if "open_items" in data:
            fields.append(f"open_items = ${i}"); values.append(json.dumps(data["open_items"])); i += 1
        if not fields:
            return await get_client(client_id)
        fields.append(f"updated_at = NOW()")
        values.append(client_id)
        await conn.execute(
            f"UPDATE clients SET {', '.join(fields)} WHERE id = ${i}",
            *values,
        )
    return await get_client(client_id)


async def delete_client(client_id: str) -> None:
    pool = get_pool()
    async with pool.acquire() as conn:
        await conn.execute("DELETE FROM clients WHERE id = $1", client_id)


# ── Recommendations ──────────────────────────────────────────────────────────

async def add_recommendation(client_id: str, rec: dict) -> None:
    pool = get_pool()
    from datetime import datetime
    async with pool.acquire() as conn:
        confirmed_at = datetime.fromisoformat(rec["confirmedAt"].replace("Z", "+00:00"))
        await conn.execute(
            "INSERT INTO recommendations (client_id, type, summary, confirmed_at) VALUES ($1, $2, $3, $4)",
            client_id, rec["type"], rec.get("summary", ""), confirmed_at,
        )


async def delete_recommendations_for_client(client_id: str) -> None:
    pool = get_pool()
    async with pool.acquire() as conn:
        await conn.execute("DELETE FROM recommendations WHERE client_id = $1", client_id)


# ── Artifacts ─────────────────────────────────────────────────────────────────

async def upsert_artifact(client_id: str, artifact: dict) -> None:
    pool = get_pool()
    import json
    from datetime import datetime
    async with pool.acquire() as conn:
        created_at = datetime.fromisoformat(artifact["createdAt"].replace("Z", "+00:00"))
        await conn.execute(
            """
            INSERT INTO artifacts
              (id, client_id, type, content, structured_data, confirmed, confirmed_at,
               saved_to_file, version, supersedes, created_at)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
            ON CONFLICT (id) DO UPDATE SET
              content         = EXCLUDED.content,
              structured_data = EXCLUDED.structured_data,
              confirmed       = EXCLUDED.confirmed,
              confirmed_at    = EXCLUDED.confirmed_at,
              saved_to_file   = EXCLUDED.saved_to_file,
              version         = EXCLUDED.version,
              supersedes      = EXCLUDED.supersedes
            """,
            artifact["id"],
            client_id,
            artifact["type"],
            artifact.get("content", ""),
            json.dumps(artifact["structuredData"]) if artifact.get("structuredData") is not None else None,
            artifact.get("confirmed", False),
            datetime.fromisoformat(artifact["confirmedAt"].replace("Z", "+00:00")) if artifact.get("confirmedAt") else None,
            artifact.get("savedToFile", False),
            artifact.get("version", 1),
            artifact.get("supersedes"),
            created_at,
        )


async def update_artifact(artifact_id: str, data: dict) -> None:
    pool = get_pool()
    from datetime import datetime
    async with pool.acquire() as conn:
        fields, values, i = [], [], 1
        if "confirmed" in data:
            fields.append(f"confirmed = ${i}"); values.append(data["confirmed"]); i += 1
        if "confirmedAt" in data:
            ca = data["confirmedAt"]
            fields.append(f"confirmed_at = ${i}")
            values.append(datetime.fromisoformat(ca.replace("Z", "+00:00")) if ca else None)
            i += 1
        if "savedToFile" in data:
            fields.append(f"saved_to_file = ${i}"); values.append(data["savedToFile"]); i += 1
        if not fields:
            return
        values.append(artifact_id)
        await conn.execute(
            f"UPDATE artifacts SET {', '.join(fields)} WHERE id = ${i}",
            *values,
        )


async def delete_artifact(artifact_id: str) -> None:
    pool = get_pool()
    async with pool.acquire() as conn:
        await conn.execute("DELETE FROM artifacts WHERE id = $1", artifact_id)


# ── Messages ──────────────────────────────────────────────────────────────────

async def get_messages(client_id: str, limit: int = 20) -> list[dict]:
    pool = get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            "SELECT id, role, content, artifacts, created_at FROM messages "
            "WHERE client_id = $1 ORDER BY created_at DESC LIMIT $2",
            client_id, limit,
        )
        return [_format_message(r) for r in reversed(rows)]


async def save_message(client_id: str, role: str, content: str, artifacts: list | None = None) -> str:
    pool = get_pool()
    import json
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "INSERT INTO messages (client_id, role, content, artifacts) VALUES ($1,$2,$3,$4) RETURNING id",
            client_id,
            role,
            content,
            json.dumps(artifacts) if artifacts else None,
        )
        return str(row["id"])


async def delete_message(message_id: str) -> None:
    pool = get_pool()
    async with pool.acquire() as conn:
        await conn.execute("DELETE FROM messages WHERE id = $1::uuid", message_id)


async def clear_messages(client_id: str) -> None:
    pool = get_pool()
    async with pool.acquire() as conn:
        await conn.execute("DELETE FROM messages WHERE client_id = $1", client_id)


# ── Helpers ───────────────────────────────────────────────────────────────────

def _format_artifact(row: Any) -> dict:
    a = dict(row)
    return {
        "id": a["id"],
        "type": a["type"],
        "content": a["content"],
        "structuredData": _parse_json_field(a["structured_data"]) if a.get("structured_data") else None,
        "confirmed": a["confirmed"],
        "confirmedAt": a["confirmed_at"].isoformat() if a.get("confirmed_at") else None,
        "savedToFile": a["saved_to_file"],
        "savedToFileAt": a["saved_to_file_at"].isoformat() if a.get("saved_to_file_at") else None,
        "version": a["version"],
        "supersedes": a["supersedes"],
        "createdAt": a["created_at"].isoformat(),
    }


def _format_message(row: Any) -> dict:
    m = dict(row)
    return {
        "id": str(m["id"]),
        "role": m["role"],
        "content": m["content"],
        "artifacts": _parse_json_field(m["artifacts"]) if m.get("artifacts") else None,
        "timestamp": m["created_at"].isoformat(),
    }
