# CryptoTrace India — Working Prototype

## Run (no dependencies)
From the project root:

```powershell
python backend/server.py
```

Open http://127.0.0.1:8000

This prototype is deliberately dependency-free so it can run on a normal Windows Python 3 installation.

## What is actually functional
- Interactive dashboard
- API-backed demo data
- Interactive transaction graph (node clicks)
- VASP evidence factors
- Risk/peel-chain/cross-chain/ML tabs
- Transaction timeline
- AI investigation assistant (deterministic demo responses)
- Mock SAHYOG submission with submission ID
- SHA-256 evidence hash and verification endpoint
- JSON and CSV export
- Report JSON generation
- Responsive dark UI

## Demo / safety
All blockchain relationships and scores are synthetic demonstration data. They are not claims about real-world criminal activity or VASP ownership.

## Optional next integration
A production version can replace the demo services with PostgreSQL, Neo4j, blockchain APIs and an OpenRouter-backed LLM while retaining the same frontend API contract.
