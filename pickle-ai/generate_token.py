import os
import webbrowser
import socket
import urllib.parse
import requests
from dotenv import load_dotenv

load_dotenv()

CLIENT_ID = os.getenv("TWITCH_CLIENT_ID")
CLIENT_SECRET = os.getenv("TWITCH_CLIENT_SECRET")
REDIRECT_URI = "http://localhost:3000"
SCOPES = "chat:read chat:edit"

def get_token():
    print("=== Twitch Token Generator ===")
    
    if not CLIENT_ID or not CLIENT_SECRET:
        print("Error: TWITCH_CLIENT_ID or TWITCH_CLIENT_SECRET missing from .env")
        print("Please add them to your .env file first.")
        return

    # 1. Authorize
    auth_url = (
        f"https://id.twitch.tv/oauth2/authorize"
        f"?client_id={CLIENT_ID}"
        f"&redirect_uri={REDIRECT_URI}"
        f"&response_type=code"
        f"&scope={urllib.parse.quote(SCOPES)}"
    )
    
    print(f"\n1. Please verify that '{REDIRECT_URI}' is added to your OAuth Redirect URLs in the Twitch Console.")
    print(f"2. Opening browser to authorize...")
    print(f"   URL: {auth_url}\n")
    
    try:
        webbrowser.open(auth_url)
    except Exception:
        print("Could not open browser automatically. Please copy/paste the URL above.")

    # 2. Listen for callback (simple socket server)
    try:
        server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        server.bind(('localhost', 3000))
        server.listen(1)
        
        print("Waiting for authentication callback on http://localhost:3000 ...")
        client, addr = server.accept()
        request = client.recv(1024).decode('utf-8')
        
        # Extract code
        # GET /?code=... HTTP/1.1
        try:
            line1 = request.split('\n')[0]
            path = line1.split(' ')[1]
            if '?' in path:
                params = urllib.parse.parse_qs(path.split('?')[1])
                code = params.get('code', [None])[0]
            else:
                code = None
            
            # Send simple response
            response = "HTTP/1.1 200 OK\r\nContent-Type: text/html\r\n\r\n<html><body><h1>Authentication Successful</h1><p>You can close this window and check your terminal.</p></body></html>"
            client.send(response.encode('utf-8'))
            client.close()
        except Exception as e:
            print(f"Failed to parse code from callback: {e}")
            return
    except OSError as e:
        print(f"Error starting local server: {e}")
        print("Make sure port 3000 is not in use.")
        return
    finally:
        server.close()

    if not code:
        print("Error: No code received.")
        return

    # 3. Exchange code for token
    print("\nExchanging code for token...")
    token_url = "https://id.twitch.tv/oauth2/token"
    data = {
        "client_id": CLIENT_ID,
        "client_secret": CLIENT_SECRET,
        "code": code,
        "grant_type": "authorization_code",
        "redirect_uri": REDIRECT_URI
    }
    
    try:
        res = requests.post(token_url, data=data) 
        if res.status_code == 200:
            json_data = res.json()
            access_token = json_data["access_token"]
            
            print("\n" + "="*40)
            print("SUCCESS! Here is your new Token:")
            print("="*40)
            print(f"TWITCH_BOT_TOKEN={access_token}")
            print("="*40)
            print("\nPlease update your .env file with this token and restart the bot.")
        else:
            print(f"Error exchanging token: {res.status_code} - {res.text}")
    except Exception as e:
        print(f"Error during token exchange request: {e}")

if __name__ == "__main__":
    get_token()
