import sys
import os

# Add directory to sys.path for cPanel Passenger execution
sys.path.insert(0, os.path.dirname(__file__))

try:
    from a2wsgi import ASGIMiddleware
    from app.main import app
    application = ASGIMiddleware(app)
except Exception as e:
    # Fallback/logging helper for initial cPanel setup troubleshooting
    def application(environ, start_response):
        start_response('500 Internal Server Error', [('Content-Type', 'text/plain')])
        return [f"Error loading application: {str(e)}".encode('utf-8')]
