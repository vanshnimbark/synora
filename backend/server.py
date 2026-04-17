from fastapi import FastAPI
app = FastAPI()

@app.get("/")
def root():
    return {"ok": True, "service": "synora-backend-stub", "note": "Synora uses Supabase; this is a stub."}

@app.get("/api/health")
def health():
    return {"status": "ok"}
