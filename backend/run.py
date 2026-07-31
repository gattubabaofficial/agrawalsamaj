import os
import uvicorn
from dotenv import load_dotenv

# Load environment variables from .env
load_dotenv()

if __name__ == "__main__":
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "8000"))
    environment = os.getenv("ENVIRONMENT", "development")
    reload_flag = environment == "development"

    print("\n" + "="*55)
    print("  Agrawal Samaj Portal Backend - Starting Uvicorn")
    print("="*55)
    print(f"  Host: {host}")
    print(f"  Port: {port}")
    print(f"  Env:  {environment}")
    print("="*55 + "\n")

    uvicorn.run(
        "app.main:app",
        host=host,
        port=port,
        reload=reload_flag,
        log_level="info"
    )
