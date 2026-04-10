"""
Shared tool definitions and execution logic.
Used by both the agentic chat endpoint and the MCP server.

Read tools  — executed automatically inside the agentic loop.
Write tools — paused for adviser confirmation before executing.
"""
import json
import database as db

# ── Tool definitions — Anthropic API format (input_schema, not inputSchema) ──

TOOL_DEFINITIONS = [
    {
        "name": "search_clients",
        "description": (
            "Search for clients by name. Returns matching client IDs and names. "
            "Use when you need to find a client or verify who exists in the system."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "Name fragment to search for"},
            },
            "required": ["query"],
        },
    },
    {
        "name": "get_client_profile",
        "description": (
            "Get the full profile for a client: fact find data (DOB, tax position, pension details, "
            "employment, etc.), soft knowledge (session history notes), and open items. "
            "Use this to look up detailed information about any client."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "client_id": {"type": "string", "description": "The client ID"},
            },
            "required": ["client_id"],
        },
    },
    {
        "name": "get_client_artifacts",
        "description": (
            "Get all confirmed artifacts for a client — scheme assessments, suitability letters, "
            "client presentations, etc. Only returns confirmed (approved) artifacts."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "client_id": {"type": "string", "description": "The client ID"},
            },
            "required": ["client_id"],
        },
    },
    {
        "name": "get_client_recommendations",
        "description": "Get all confirmed recommendations for a client.",
        "input_schema": {
            "type": "object",
            "properties": {
                "client_id": {"type": "string", "description": "The client ID"},
            },
            "required": ["client_id"],
        },
    },
    {
        "name": "update_client_profile",
        "description": (
            "Update one or more fact find fields for a client. Fields are merged with existing "
            "data — fields not mentioned are preserved unchanged. "
            "Valid fields: Date of Birth, National Insurance, Tax Position, Employment, "
            "Marital Status, Dependents, Property, Cash Holdings, Pensions, ISAs, "
            "Other Investments, Protection, Liabilities, Income & Expenditure, "
            "Risk Profile, ESG Preferences. "
            "Requires adviser confirmation before executing."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "client_id": {"type": "string", "description": "The client ID"},
                "updates": {
                    "type": "object",
                    "description": (
                        "Dictionary mapping fact find field names to new values. "
                        "Example: {\"Tax Position\": \"Basic rate taxpayer\", \"Risk Profile\": \"Balanced\"}"
                    ),
                },
            },
            "required": ["client_id", "updates"],
        },
    },
    {
        "name": "send_client_message",
        "description": (
            "Draft a message to send to the client. The message will be logged for adviser "
            "review before sending — it does not go out automatically. "
            "Requires adviser confirmation before executing."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "client_id": {"type": "string", "description": "The client ID"},
                "subject": {"type": "string", "description": "Message subject line"},
                "body": {"type": "string", "description": "Full message body"},
            },
            "required": ["client_id", "subject", "body"],
        },
    },
]

READ_TOOLS: set[str] = {
    "search_clients",
    "get_client_profile",
    "get_client_artifacts",
    "get_client_recommendations",
}

WRITE_TOOLS: set[str] = {
    "update_client_profile",
    "send_client_message",
}


# ── Read tool execution ───────────────────────────────────────────────────────

async def execute_read_tool(name: str, args: dict) -> str:
    """Execute a read-only tool and return a plain-text result."""

    if name == "search_clients":
        query = args.get("query", "").strip()
        if not query:
            return "Error: query must not be empty."
        clients = await db.search_clients(query)
        if not clients:
            return f"No clients found matching '{query}'."
        lines = [f"Found {len(clients)} client(s) matching '{query}':"]
        for c in clients:
            lines.append(f"  • {c['name']}  (id: {c['id']})")
        return "\n".join(lines)

    if name == "get_client_profile":
        client_id = args.get("client_id", "").strip()
        client = await db.get_client(client_id)
        if not client:
            return f"Client '{client_id}' not found."
        return json.dumps({
            "id": client["id"],
            "name": client["name"],
            "factFind": client.get("fact_find") or {},
            "softKnowledge": client.get("soft_knowledge") or "",
            "openItems": client.get("open_items") or [],
        }, indent=2)

    if name == "get_client_artifacts":
        client_id = args.get("client_id", "").strip()
        client = await db.get_client(client_id)
        if not client:
            return f"Client '{client_id}' not found."
        confirmed = [a for a in (client.get("saved_artifacts") or []) if a.get("confirmed")]
        if not confirmed:
            return f"No confirmed artifacts for client '{client_id}'."
        return json.dumps([
            {
                "id": a.get("id"),
                "type": a.get("type"),
                "content": a.get("content"),
                "confirmedAt": a.get("confirmedAt"),
            }
            for a in confirmed
        ], indent=2)

    if name == "get_client_recommendations":
        client_id = args.get("client_id", "").strip()
        client = await db.get_client(client_id)
        if not client:
            return f"Client '{client_id}' not found."
        recs = client.get("confirmed_recommendations") or []
        if not recs:
            return f"No confirmed recommendations for client '{client_id}'."
        return json.dumps(recs, indent=2)

    return f"Unknown read tool: '{name}'"


# ── Write tool helpers ────────────────────────────────────────────────────────

def describe_write_tool(name: str, args: dict) -> str:
    """Return a short human-readable description of a pending write action."""
    if name == "update_client_profile":
        updates = args.get("updates", {})
        items = list(updates.items())
        fields = ", ".join(f"{k} → {v}" for k, v in items[:3])
        if len(items) > 3:
            fields += f" (+{len(items) - 3} more)"
        return f"Update profile — {fields}"
    if name == "send_client_message":
        subject = args.get("subject", "No subject")
        return f'Send message — "{subject}"'
    return f"Execute: {name}"


async def execute_write_tool(name: str, args: dict) -> str:
    """
    Execute a write tool after adviser confirmation.
    All mutations merge with existing data — never wholesale replace.
    """
    if name == "update_client_profile":
        client_id = args.get("client_id", "").strip()
        updates = args.get("updates", {})
        if not client_id or not updates:
            return "Error: client_id and updates are required."
        client = await db.get_client(client_id)
        if not client:
            return f"Client '{client_id}' not found."
        # Merge into existing fact find — existing fields not in updates are preserved
        merged = {**(client.get("fact_find") or {}), **updates}
        await db.update_client(client_id, {"fact_find": merged})
        return f"Profile updated: {', '.join(updates.keys())}."

    if name == "send_client_message":
        client_id = args.get("client_id", "").strip()
        subject = args.get("subject", "")
        body = args.get("body", "")
        if not client_id:
            return "Error: client_id is required."
        client = await db.get_client(client_id)
        if not client:
            return f"Client '{client_id}' not found."
        # Log as an open item for adviser action — no email sent automatically
        existing_items = list(client.get("open_items") or [])
        preview = body[:120] + ("…" if len(body) > 120 else "")
        new_item = f"[Pending message] {subject}: {preview}"
        await db.update_client(client_id, {"open_items": existing_items + [new_item]})
        return "Message logged as open item for adviser review."

    return f"Unknown write tool: '{name}'"
