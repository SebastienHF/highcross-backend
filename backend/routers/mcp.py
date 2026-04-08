"""
Read-only MCP (Model Context Protocol) server — Streamable HTTP transport.
Authentication: X-MCP-Api-Key header must match MCP_API_KEY env var.
All tools are read-only; no write access to the database.
"""
import json
import os
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse
import database as db

router = APIRouter(tags=["mcp"])

MCP_PROTOCOL_VERSION = "2024-11-05"
SERVER_INFO = {"name": "adviser-workspace", "version": "1.0.0"}

TOOLS = [
    {
        "name": "search_clients",
        "description": "Search clients by name. Returns matching client IDs and names.",
        "inputSchema": {
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
            "Get the full profile for a client: fact find (DOB, tax position, objectives, etc.), "
            "soft knowledge (session notes), and open items."
        ),
        "inputSchema": {
            "type": "object",
            "properties": {
                "client_id": {"type": "string", "description": "Client ID"},
            },
            "required": ["client_id"],
        },
    },
    {
        "name": "get_client_artifacts",
        "description": "Get all confirmed artifacts for a client (scheme assessments, suitability letters, etc.).",
        "inputSchema": {
            "type": "object",
            "properties": {
                "client_id": {"type": "string", "description": "Client ID"},
            },
            "required": ["client_id"],
        },
    },
    {
        "name": "get_client_recommendations",
        "description": "Get all confirmed recommendations for a client.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "client_id": {"type": "string", "description": "Client ID"},
            },
            "required": ["client_id"],
        },
    },
]


def _check_auth(request: Request) -> None:
    expected = os.environ.get("MCP_API_KEY", "")
    if not expected:
        raise HTTPException(503, "MCP not configured — MCP_API_KEY not set")
    provided = request.headers.get("x-mcp-api-key", "")
    if provided != expected:
        raise HTTPException(403, "Invalid or missing MCP API key")


def _ok(id, result: dict) -> dict:
    return {"jsonrpc": "2.0", "id": id, "result": result}


def _err(id, code: int, message: str) -> dict:
    return {"jsonrpc": "2.0", "id": id, "error": {"code": code, "message": message}}


async def _dispatch(method: str, params: dict, id) -> dict | None:
    """Handle one JSON-RPC message. Returns None for notifications (no id)."""

    if method == "initialize":
        return _ok(id, {
            "protocolVersion": MCP_PROTOCOL_VERSION,
            "capabilities": {"tools": {}},
            "serverInfo": SERVER_INFO,
        })

    if method == "notifications/initialized":
        return None  # notification — no response

    if method == "ping":
        return _ok(id, {})

    if method == "tools/list":
        return _ok(id, {"tools": TOOLS})

    if method == "tools/call":
        name = params.get("name", "")
        args = params.get("arguments", {})
        try:
            text = await _run_tool(name, args)
            return _ok(id, {"content": [{"type": "text", "text": text}]})
        except ValueError as exc:
            return _ok(id, {
                "content": [{"type": "text", "text": str(exc)}],
                "isError": True,
            })

    return _err(id, -32601, f"Method not found: {method}")


async def _run_tool(name: str, args: dict) -> str:
    if name == "search_clients":
        query = args.get("query", "").strip()
        if not query:
            raise ValueError("query must not be empty")
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
            raise ValueError(f"Client '{client_id}' not found.")
        profile = {
            "id": client["id"],
            "name": client["name"],
            "initials": client["initials"],
            "factFind": client.get("fact_find") or {},
            "softKnowledge": client.get("soft_knowledge") or "",
            "openItems": client.get("open_items") or [],
        }
        return json.dumps(profile, indent=2)

    if name == "get_client_artifacts":
        client_id = args.get("client_id", "").strip()
        client = await db.get_client(client_id)
        if not client:
            raise ValueError(f"Client '{client_id}' not found.")
        all_artifacts = client.get("saved_artifacts") or []
        confirmed = [a for a in all_artifacts if a.get("confirmed")]
        if not confirmed:
            return f"No confirmed artifacts for client '{client_id}'."
        output = []
        for a in confirmed:
            output.append({
                "id": a.get("id"),
                "type": a.get("type"),
                "content": a.get("content"),
                "confirmedAt": a.get("confirmedAt"),
                "version": a.get("version"),
            })
        return json.dumps(output, indent=2)

    if name == "get_client_recommendations":
        client_id = args.get("client_id", "").strip()
        client = await db.get_client(client_id)
        if not client:
            raise ValueError(f"Client '{client_id}' not found.")
        recs = client.get("confirmed_recommendations") or []
        if not recs:
            return f"No confirmed recommendations for client '{client_id}'."
        return json.dumps(recs, indent=2)

    raise ValueError(f"Unknown tool: '{name}'")


@router.post("/mcp")
async def mcp_endpoint(request: Request) -> JSONResponse:
    _check_auth(request)

    try:
        body = await request.json()
    except Exception:
        return JSONResponse(_err(None, -32700, "Parse error"), status_code=400)

    # Batch request
    if isinstance(body, list):
        responses = []
        for msg in body:
            resp = await _dispatch(msg.get("method", ""), msg.get("params", {}), msg.get("id"))
            if resp is not None:
                responses.append(resp)
        return JSONResponse(responses)

    # Single request
    resp = await _dispatch(body.get("method", ""), body.get("params", {}), body.get("id"))
    if resp is None:
        return JSONResponse({}, status_code=202)
    return JSONResponse(resp)
