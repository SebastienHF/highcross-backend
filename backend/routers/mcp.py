"""
Read-only MCP (Model Context Protocol) server — Streamable HTTP transport.
Authentication: X-MCP-Api-Key header must match MCP_API_KEY env var.
All tools exposed here are read-only; write tools are not accessible via MCP.
"""
import os
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse
from tools import execute_read_tool, READ_TOOLS, TOOL_DEFINITIONS as _ALL_TOOLS

router = APIRouter(tags=["mcp"])

MCP_PROTOCOL_VERSION = "2024-11-05"
SERVER_INFO = {"name": "adviser-workspace", "version": "1.0.0"}

# Expose only read tools via MCP (write tools require JWT auth + human confirmation)
TOOLS = [
    {
        "name": t["name"],
        "description": t["description"],
        # MCP uses "inputSchema" (camelCase); Anthropic API uses "input_schema"
        "inputSchema": t["input_schema"],
    }
    for t in _ALL_TOOLS
    if t["name"] in READ_TOOLS
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
    if name not in READ_TOOLS:
        raise ValueError(f"Tool '{name}' is not available via MCP.")
    return await execute_read_tool(name, args)


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
