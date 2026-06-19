import uvicorn

if __name__ == "__main__":
    # Start the FastAPI server binding to 0.0.0.0 to allow access from local network IP (e.g. 192.168.1.38)
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
