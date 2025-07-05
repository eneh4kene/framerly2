#!/usr/bin/env python3
import http.server
import socketserver
import ssl
import os
import sys

PORT = 3000
DIRECTORY = "dist"

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)
    
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

def main():
    # Check if dist directory exists
    if not os.path.exists(DIRECTORY):
        print(f"❌ Directory '{DIRECTORY}' not found!")
        print("💡 Run 'npm run build' first to create the dist directory")
        sys.exit(1)
    
    try:
        with socketserver.TCPServer(("", PORT), MyHTTPRequestHandler) as httpd:
            # Create SSL context
            context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
            context.load_cert_chain(certfile=r'C:\Users\austi\localhost.crt', keyfile=r'C:\Users\austi\localhost.key')

            
            # Generate self-signed certificate
            # context.load_default_certs()
            
            # Wrap socket with SSL
            httpd.socket = context.wrap_socket(httpd.socket, server_side=True)
            
            print(f"🚀 HTTPS Server running on port {PORT}")
            print(f"📱 Access: https://localhost:{PORT}")
            print(f"📱 Mobile: https://192.168.1.174:{PORT}")
            print("📝 Accept certificate warnings to proceed")
            print("Press Ctrl+C to stop")
            
            httpd.serve_forever()
            
    except Exception as e:
        print(f"❌ HTTPS failed: {e}")
        print("🔄 Starting HTTP server instead...")
        
        # Fallback to HTTP
        with socketserver.TCPServer(("", PORT), MyHTTPRequestHandler) as httpd:
            print(f"🚀 HTTP Server running on port {PORT}")
            print(f"📱 Access: http://localhost:{PORT}")
            print(f"📱 Mobile: http://192.168.1.174:{PORT}")
            print("⚠️  Note: AR features require HTTPS")
            print("Press Ctrl+C to stop")
            
            httpd.serve_forever()

if __name__ == "__main__":
    main() 