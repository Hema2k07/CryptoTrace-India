import json
import os
import hashlib
import urllib.request
import urllib.error
import random
import re

from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse
from datetime import datetime


# ============================================================
# PATHS
# ============================================================

ROOT = os.path.dirname(
    os.path.dirname(
        os.path.abspath(__file__)
    )
)

FRONT = os.path.join(
    ROOT,
    "frontend"
)

REPORTS = os.path.join(
    ROOT,
    "reports"
)


# ============================================================
# DEMO INVESTIGATION DATA
# ============================================================

DEMO = {

    "case": {
        "id": "LEA-2025-00124",
        "status": "Active",
        "created": "12 Nov 2025, 10:24 AM",
        "officer": "Inspector Arjun Rao",
        "agency": "State Cyber Cell"
    },

    "wallet": {
        "address": "0x3aF2...9cD1",
        "chain": "Ethereum",
        "transactions": 483,
        "volume": "$2.4M",
        "inr": "≈ ₹19.8 Cr"
    },

    "vasp": {
        "name": "Binance",
        "score": 94,

        "factors": [
            ["Known deposit address match", 95],
            ["Transaction pattern similarity", 90],
            ["Entity clustering", 88],
            ["Timing & behavior analysis", 82],
            ["Cross-chain linkage", 76]
        ],

        "details": {
            "type": "Centralized Exchange",
            "jurisdiction": "Demo jurisdiction",
            "entity": "Demo entity",
            "category": "Global VASP"
        }
    },

    "risk": {
        "level": "High",

        "indicators": [
            ["Interaction with mixer", "HIGH"],
            ["Rapid fund movement (3 hops in 2 hours)", "HIGH"],
            ["Cross-chain bridge usage", "MEDIUM"],
            ["Split transactions (structuring)", "MEDIUM"],
            ["Transfer to known VASP", "MEDIUM"]
        ]
    },

    "ml": {
        "score": 0.87,
        "model": "Isolation Forest",
        "category": "High",

        "features": [
            "Unusual transaction frequency",
            "Interaction with high-risk entities",
            "Structuring pattern detected"
        ]
    },

    "patterns": {

        "peel_chain": {
            "detected": True,
            "levels": 3,
            "description":
                "Repeated smaller transfers through continuation wallets"
        },

        "structuring": {
            "detected": True,
            "description":
                "Multiple smaller transactions in short intervals"
        }
    },

    "crosschain": {
        "source": "Ethereum",
        "amount": "12.5 ETH",
        "bridge": "Stargate",
        "destination": "BNB Chain",
        "destination_amount": "1,250 BNB"
    },

    "transactions": [

        [
            "12 Jan, 10:22",
            "0x3aF2...9cD1",
            "0x7d4e...a8C2",
            "12.5",
            "ETH",
            "Transfer"
        ],

        [
            "13 Jan, 08:11",
            "0x3aF2...9cD1",
            "0x91bf...d3E7",
            "5.3",
            "ETH",
            "Transfer"
        ],

        [
            "13 Jan, 09:15",
            "0x3aF2...9cD1",
            "0x4c6a...b9F1",
            "7.2",
            "ETH",
            "Transfer"
        ],

        [
            "14 Jan, 11:02",
            "0x4c6a...b9F1",
            "Tornado Cash",
            "3.1",
            "ETH",
            "Mixer"
        ],

        [
            "15 Jan, 16:40",
            "0x4c6a...b9F1",
            "Stargate Bridge",
            "1.8",
            "ETH",
            "Bridge"
        ],

        [
            "16 Jan, 14:21",
            "0xa7e2...c1D9",
            "0x5f8d...9A1E",
            "4.5",
            "ETH",
            "Transfer"
        ],

        [
            "16 Jan, 14:35",
            "0x5f8d...9A1E",
            "Binance Deposit",
            "6.2",
            "ETH",
            "VASP Deposit"
        ]
    ],

    "graph": {

        "nodes": [

            {
                "id": "s",
                "label": "0x3aF2...9cD1",
                "type": "suspect"
            },

            {
                "id": "a",
                "label": "0x7d4e...a8C2",
                "type": "intermediary"
            },

            {
                "id": "b",
                "label": "0x91bf...d3E7",
                "type": "intermediary"
            },

            {
                "id": "c",
                "label": "0x4c6a...b9F1",
                "type": "intermediary"
            },

            {
                "id": "u",
                "label": "Uniswap",
                "type": "defi"
            },

            {
                "id": "t",
                "label": "Tornado Cash",
                "type": "mixer"
            },

            {
                "id": "g",
                "label": "Stargate Bridge",
                "type": "bridge"
            },

            {
                "id": "d",
                "label": "0xa7e2...c1D9",
                "type": "intermediary"
            },

            {
                "id": "e",
                "label": "0x5f8d...9A1E",
                "type": "intermediary"
            },

            {
                "id": "v",
                "label": "Binance Deposit",
                "type": "vasp"
            },

            {
                "id": "x",
                "label": "Binance",
                "type": "vasp"
            }
        ],

        "edges": [

            ["s", "a", "12.5 ETH"],
            ["s", "b", "5.3 ETH"],
            ["s", "c", "7.2 ETH"],
            ["c", "u", ""],
            ["u", "t", "3.1 ETH"],
            ["t", "g", ""],
            ["g", "d", "1.8 ETH"],
            ["d", "e", "4.5 ETH"],
            ["e", "v", "6.2 ETH"],
            ["v", "x", ""]
        ]
    }
}


# ============================================================
# BASIC HELPERS
# ============================================================

def json_bytes(obj):
    return json.dumps(
        obj,
        ensure_ascii=False
    ).encode("utf-8")


def sha256_demo():

    payload = json.dumps(
        {
            "case": DEMO["case"],
            "wallet": DEMO["wallet"],
            "transactions": DEMO["transactions"]
        },
        sort_keys=True
    ).encode("utf-8")

    return hashlib.sha256(
        payload
    ).hexdigest()


def html():

    path = os.path.join(
        FRONT,
        "index.html"
    )

    with open(
        path,
        "r",
        encoding="utf-8"
    ) as f:

        return f.read()


# ============================================================
# LOAD .ENV
# ============================================================

def load_env_file():

    env_path = os.path.join(
        ROOT,
        ".env"
    )

    env = {}

    if not os.path.isfile(env_path):
        return env

    try:

        with open(
            env_path,
            "r",
            encoding="utf-8"
        ) as f:

            for line in f:

                line = line.strip()

                if not line:
                    continue

                if line.startswith("#"):
                    continue

                if "=" not in line:
                    continue

                key, value = line.split(
                    "=",
                    1
                )

                key = key.strip()
                value = value.strip()

                value = value.strip('"')
                value = value.strip("'")

                env[key] = value

    except Exception as e:

        print(
            "Could not read .env:",
            e
        )

    return env


# ============================================================
# OPENROUTER AI
# ============================================================

def ask_openrouter(question):

    env = load_env_file()

    api_key = (
        env.get("OPENROUTER_API_KEY")
        or
        os.environ.get("OPENROUTER_API_KEY")
    )

    model = env.get(
        "OPENROUTER_MODEL",
        "openrouter/free"
    )

    base_url = env.get(
        "OPENROUTER_BASE_URL",
        "https://openrouter.ai/api/v1"
    )

    if not api_key:

        return {
            "ok": False,
            "error":
                "OpenRouter API key is missing. "
                "Please add OPENROUTER_API_KEY to .env"
        }

    if api_key == "YOUR_NEW_OPENROUTER_KEY":

        return {
            "ok": False,
            "error":
                "The .env file still contains the "
                "placeholder API key. Replace it with "
                "your actual OpenRouter API key."
        }

    investigation_data = json.dumps(
        DEMO,
        ensure_ascii=False,
        indent=2
    )

    system_prompt = """
You are CryptoTrace AI.

You are an investigation assistant inside the
CryptoTrace India Blockchain Intelligence &
VASP Attribution Platform.

You help investigators understand the supplied
blockchain investigation data.

IMPORTANT RULES:

1. Use ONLY the supplied investigation data.

2. Never invent:
   - wallets
   - transactions
   - VASPs
   - amounts
   - dates
   - hashes
   - evidence
   - blockchain events

3. If information is unavailable, say that it is
   not available in the supplied investigation data.

4. VASP attribution is an investigative lead,
   NOT proof of criminal activity.

5. Keep answers concise and clear.

6. If the user asks for a percentage, give the
   exact percentage available in the data.

7. If asked why a VASP is relevant, explain the
   evidence factors.

8. If asked about risk, explain the supplied
   risk indicators.

9. If asked about cross-chain activity, explain:
   source chain -> bridge -> destination chain.

10. If asked about peel-chain detection, explain
    the detected levels and supplied description.

11. If asked about structuring, explain the supplied
    structuring indicator.

12. If asked about ML analysis, provide the model,
    score and supplied features.

13. If asked about transactions, use only the
    supplied transaction records.

14. If asked for a case summary, summarize only
    the supplied data.

15. This is synthetic/demo investigation data.
    Do not present it as a real criminal case.

16. Do not make legal conclusions.

SUPPLIED INVESTIGATION DATA:

""" + investigation_data

    payload = {

        "model": model,

        "messages": [

            {
                "role": "system",
                "content": system_prompt
            },

            {
                "role": "user",
                "content": question
            }
        ],

        "temperature": 0.2,

        "max_tokens": 500
    }

    request_url = (
        base_url.rstrip("/")
        +
        "/chat/completions"
    )

    request_body = json.dumps(
        payload
    ).encode("utf-8")

    request = urllib.request.Request(

        request_url,

        data=request_body,

        headers={
            "Content-Type":
                "application/json",

            "Authorization":
                "Bearer " + api_key,

            "HTTP-Referer":
                "http://127.0.0.1:8000",

            "X-Title":
                "CryptoTrace India"
        },

        method="POST"
    )

    try:

        print(
            "AI request:",
            question
        )

        with urllib.request.urlopen(
            request,
            timeout=60
        ) as response:

            raw = response.read().decode(
                "utf-8"
            )

        result = json.loads(raw)

        choices = result.get(
            "choices",
            []
        )

        if not choices:

            return {
                "ok": False,
                "error":
                    "OpenRouter returned no choices.",
                "details":
                    str(result)[:2000]
            }

        message = choices[0].get(
            "message",
            {}
        )

        answer = message.get(
            "content",
            ""
        )

        if isinstance(
            answer,
            list
        ):

            parts = []

            for item in answer:

                if isinstance(
                    item,
                    dict
                ):

                    if "text" in item:

                        parts.append(
                            str(item["text"])
                        )

                    elif "content" in item:

                        parts.append(
                            str(item["content"])
                        )

                else:

                    parts.append(
                        str(item)
                    )

            answer = "".join(parts)

        answer = str(
            answer
        ).strip()

        # Remove common thinking tags
        answer = re.sub(
            r"<think>.*?</think>",
            "",
            answer,
            flags=re.DOTALL
        ).strip()

        if not answer:

            return {
                "ok": False,
                "error":
                    "AI returned an empty response."
            }

        print(
            "AI response received."
        )

        return {
            "ok": True,
            "answer": answer,
            "model":
                result.get(
                    "model",
                    model
                )
        }

    except urllib.error.HTTPError as e:

        try:

            error_body = (
                e.read()
                .decode("utf-8")
            )

        except Exception:

            error_body = str(e)

        print(
            "OpenRouter HTTP error:",
            e.code,
            error_body
        )

        return {
            "ok": False,
            "error":
                "OpenRouter API error",
            "status":
                e.code,
            "details":
                error_body[:3000]
        }

    except urllib.error.URLError as e:

        print(
            "OpenRouter connection error:",
            e
        )

        return {
            "ok": False,
            "error":
                "Could not connect to OpenRouter.",
            "details":
                str(e)
        }

    except TimeoutError:

        print(
            "OpenRouter request timed out."
        )

        return {
            "ok": False,
            "error":
                "OpenRouter request timed out."
        }

    except json.JSONDecodeError as e:

        print(
            "Invalid JSON from OpenRouter:",
            e
        )

        return {
            "ok": False,
            "error":
                "OpenRouter returned invalid JSON.",
            "details":
                str(e)
        }

    except Exception as e:

        print(
            "AI error:",
            repr(e)
        )

        return {
            "ok": False,
            "error":
                "AI connection failed.",
            "details":
                str(e)
        }


# ============================================================
# HTTP SERVER
# ============================================================

class H(BaseHTTPRequestHandler):

    # ========================================================
    # SEND RESPONSE
    # ========================================================

    def send(
        self,
        status,
        body,
        ctype="application/json"
    ):

        if isinstance(
            body,
            (dict, list)
        ):

            body = json.dumps(
                body,
                ensure_ascii=False
            ).encode("utf-8")

        elif isinstance(
            body,
            str
        ):

            body = body.encode(
                "utf-8"
            )

        elif not isinstance(
            body,
            bytes
        ):

            body = str(
                body
            ).encode(
                "utf-8"
            )

        self.send_response(
            status
        )

        self.send_header(
            "Content-Type",
            ctype
        )

        self.send_header(
            "Content-Length",
            str(len(body))
        )

        self.send_header(
            "Cache-Control",
            "no-store"
        )

        self.end_headers()

        self.wfile.write(
            body
        )

    # ========================================================
    # GET REQUEST
    # ========================================================

    def do_GET(self):

        p = urlparse(
            self.path
        ).path

        routes = {

            "/api/case":
                DEMO["case"],

            "/api/wallet":
                DEMO["wallet"],

            "/api/vasp":
                DEMO["vasp"],

            "/api/risk":
                DEMO["risk"],

            "/api/patterns":
                DEMO["patterns"],

            "/api/cross-chain":
                DEMO["crosschain"],

            "/api/transactions":
                DEMO["transactions"],

            "/api/graph":
                DEMO["graph"],

            "/api/evidence": {

                "hash":
                    sha256_demo(),

                "algorithm":
                    "SHA-256",

                "verified":
                    True
            },

            "/api/summary": {

                "active_cases":
                    128,

                "under_analysis":
                    24,

                "vasp_identified":
                    17,

                "cross_chain_traces":
                    6
            }
        }

        # ----------------------------------------------------
        # API ROUTES
        # ----------------------------------------------------

        if p in routes:

            return self.send(
                200,
                routes[p]
            )

        # ----------------------------------------------------
        # DASHBOARD
        # ----------------------------------------------------

        if p == "/":

            return self.send(
                200,
                html(),
                "text/html; charset=utf-8"
            )

        # ----------------------------------------------------
        # FRONTEND FILES
        # ----------------------------------------------------

        if p.startswith(
            "/frontend/"
        ):

            fp = os.path.join(
                ROOT,
                p.lstrip(
                    "/"
                ).replace(
                    "/",
                    os.sep
                )
            )

            if os.path.isfile(fp):

                if fp.endswith(
                    ".css"
                ):

                    content_type = "text/css"

                elif fp.endswith(
                    ".js"
                ):

                    content_type = "application/javascript"

                elif fp.endswith(
                    ".html"
                ):

                    content_type = "text/html"

                else:

                    content_type = (
                        "application/octet-stream"
                    )

                with open(
                    fp,
                    "rb"
                ) as f:

                    file_data = f.read()

                return self.send(
                    200,
                    file_data,
                    content_type
                    + "; charset=utf-8"
                )

        return self.send(
            404,
            {
                "error":
                    "Not found"
            }
        )

    # ========================================================
    # POST REQUEST
    # ========================================================

    def do_POST(self):

        p = urlparse(
            self.path
        ).path

        # ----------------------------------------------------
        # READ REQUEST BODY
        # ----------------------------------------------------

        content_length = int(
            self.headers.get(
                "Content-Length",
                "0"
            ) or 0
        )

        try:

            raw_body = self.rfile.read(
                content_length
            )

            data = json.loads(
                raw_body or b"{}"
            )

        except Exception as e:

            print(
                "Request JSON error:",
                e
            )

            return self.send(
                400,
                {
                    "error":
                        "Invalid JSON request."
                }
            )

        # ====================================================
        # NEW INVESTIGATION
        # ====================================================

        if p == "/api/investigate":

            try:

                wallet = str(
                    data.get(
                        "wallet",
                        ""
                    )
                ).strip()

                blockchain = str(
                    data.get(
                        "blockchain",
                        "Ethereum"
                    )
                ).strip()

                case_type = str(
                    data.get(
                        "case_type",
                        "Fraud"
                    )
                ).strip()

                priority = str(
                    data.get(
                        "priority",
                        "High"
                    )
                ).strip()

                notes = str(
                    data.get(
                        "notes",
                        ""
                    )
                ).strip()

                # ------------------------------------------------
                # REQUIRED WALLET
                # ------------------------------------------------

                if not wallet:

                    return self.send(
                        400,
                        {
                            "error":
                                "Wallet address is required."
                        }
                    )

                # ------------------------------------------------
                # EVM WALLET VALIDATION
                # ------------------------------------------------

                if blockchain in [
                    "Ethereum",
                    "BNB Chain",
                    "Polygon"
                ]:

                    if not re.fullmatch(
                        r"0x[a-fA-F0-9]{40}",
                        wallet
                    ):

                        return self.send(
                            400,
                            {
                                "error":
                                    "Invalid wallet address. "
                                    "Expected 0x followed by "
                                    "40 hexadecimal characters."
                            }
                        )

                # ------------------------------------------------
                # BITCOIN BASIC VALIDATION
                # ------------------------------------------------

                elif blockchain == "Bitcoin":

                    if (
                        len(wallet) < 26
                        or
                        len(wallet) > 90
                    ):

                        return self.send(
                            400,
                            {
                                "error":
                                    "Invalid Bitcoin wallet address."
                            }
                        )

                # ------------------------------------------------
                # CREATE CASE
                # ------------------------------------------------

                case_id = (
                    "LEA-2026-"
                    +
                    str(
                        random.randint(
                            10000,
                            99999
                        )
                    )
                )

                created = datetime.now().strftime(
                    "%d %b %Y, %I:%M %p"
                )

                response = {

                    "success":
                        True,

                    "case_id":
                        case_id,

                    "wallet":
                        wallet,

                    "blockchain":
                        blockchain,

                    "case_type":
                        case_type,

                    "priority":
                        priority,

                    "notes":
                        notes,

                    "status":
                        "Active",

                    "created":
                        created,

                    "message":
                        "Investigation initialized successfully. "
                        "Transaction tracing and VASP attribution "
                        "can now be performed.",

                    "analysis": {

                        "transaction_tracing":
                            "Ready",

                        "graph_analysis":
                            "Ready",

                        "vasp_attribution":
                            "Ready",

                        "risk_analysis":
                            "Ready",

                        "cross_chain_analysis":
                            "Ready"
                    }
                }
                # ============================================================
                # UPDATE CURRENT DEMO INVESTIGATION
                # ============================================================

                DEMO["case"]["id"] = case_id
                DEMO["case"]["status"] = "Active"
                DEMO["case"]["created"] = datetime.now().strftime(
                 "%d %b %Y, %I:%M %p"
                )

                DEMO["wallet"]["address"] = wallet
                DEMO["wallet"]["chain"] = blockchain

                # Store investigation details
                DEMO["case"]["case_type"] = case_type
                DEMO["case"]["priority"] = priority
                DEMO["case"]["notes"] = notes

                print(
                    f"New investigation created: "
                    f"{case_id} | "
                    f"{wallet} | "
                    f"{blockchain}"
                )

                return self.send(
                    200,
                    response
                )

            except Exception as e:

                print(
                    "Investigation creation error:",
                    repr(e)
                )

                return self.send(
                    500,
                    {
                        "error":
                            "Investigation creation failed.",
                        "details":
                            str(e)
                    }
                )

        # ====================================================
        # AI ASSISTANT
        # ====================================================

        if p == "/api/ai":

            question = str(
                data.get(
                    "question",
                    ""
                )
            ).strip()

            if not question:

                return self.send(
                    400,
                    {
                        "error":
                            "Question is required."
                    }
                )

            ai_result = ask_openrouter(
                question
            )

            if not ai_result.get(
                "ok"
            ):

                return self.send(
                    502,
                    {

                        "error":
                            ai_result.get(
                                "error",
                                "AI request failed."
                            ),

                        "details":
                            ai_result.get(
                                "details",
                                ""
                            ),

                        "status":
                            ai_result.get(
                                "status",
                                None
                            )
                    }
                )

            return self.send(
                200,
                {

                    "answer":
                        ai_result["answer"],

                    "model":
                        ai_result.get(
                            "model",
                            "openrouter/free"
                        ),

                    "sources": [
                        "CryptoTrace Investigation Data"
                    ]
                }
            )

        # ====================================================
        # SAHYOG
        # ====================================================

        if p == "/api/sahyog":

            submission_id = (
                "SAHYOG-MOCK-"
                +
                datetime.now().strftime(
                    "%Y%m%d%H%M%S"
                )
            )

            return self.send(
                200,
                {

                    "status":
                        "Submitted (Mock)",

                    "submission_id":
                        submission_id,

                    "timestamp":
                        datetime.now().isoformat()
                }
            )

        # ====================================================
        # EVIDENCE VERIFICATION
        # ====================================================

        if p == "/api/evidence/verify":

            supplied_hash = data.get(
                "hash"
            )

            expected_hash = (
                sha256_demo()
            )

            return self.send(
                200,
                {

                    "verified":
                        supplied_hash
                        ==
                        expected_hash,

                    "expected_hash":
                        expected_hash
                }
            )

        # ====================================================
        # REPORT GENERATION
        # ====================================================

        if p == "/api/report":

            os.makedirs(
                REPORTS,
                exist_ok=True
            )

            report_path = os.path.join(
                REPORTS,
                "LEA-2025-00124_report.json"
            )

            with open(
                report_path,
                "w",
                encoding="utf-8"
            ) as f:

                json.dump(
                    DEMO,
                    f,
                    ensure_ascii=False,
                    indent=2
                )

            return self.send(
                200,
                {

                    "status":
                        "created",

                    "file":
                        report_path
                }
            )

        # ====================================================
        # UNKNOWN POST
        # ====================================================

        return self.send(
            404,
            {
                "error":
                    "Not found"
            }
        )


# ============================================================
# SERVER START
# ============================================================

if __name__ == "__main__":

    port = int(
        os.getenv(
            "PORT",
            "8000"
        )
    )

    print()

    print(
        "=============================================="
    )

    print(
        "       CryptoTrace India"
    )

    print(
        "       Blockchain Intelligence Platform"
    )

    print(
        "=============================================="
    )

    print(
        f"Server: http://127.0.0.1:{port}"
    )

    print(
        "AI: OpenRouter"
    )

    print(
        "New Investigation API: Enabled"
    )

    print(
        "=============================================="
    )

    print()

    server = ThreadingHTTPServer(
        (
            "127.0.0.1",
            port
        ),
        H
    )

    try:

        server.serve_forever()

    except KeyboardInterrupt:

        print()

        print(
            "CryptoTrace India server stopped."
        )

    finally:

        server.server_close()