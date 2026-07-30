import uvicorn
import socket
from dotenv import load_dotenv

# Load environment variables from .env
load_dotenv()

def get_local_ip():
    """Get the machine's local network IP address."""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "192.168.x.x"

if __name__ == "__main__":
    local_ip = get_local_ip()
    print("\n" + "="*55)
    print("  Agrawal Samaj Mansrovar Jaipur API - Starting Backend Server")
    print("="*55)
    print(f"  Local:    http://localhost:8000")
    print(f"  Network:  http://{local_ip}:8000")
    print(f"  Docs:     http://localhost:8000/docs")
    print("="*55)
    print("  NOTE: Do NOT visit http://0.0.0.0:8000 in browser.")
    print("        Use the URLs above instead.\n")

    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
