import uvicorn

if __name__ == "__main__":
    # Programmatically runs uvicorn on 0.0.0.0:8000 with auto-reload.
    # This ensures it is always accessible via localhost AND local network IPs.
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
