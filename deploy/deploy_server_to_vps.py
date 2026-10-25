import os
import sys
import paramiko

# Ensure UTF-8 stdout
sys.stdout.reconfigure(encoding='utf-8')

# Configurations with environment variable overrides
VPS_HOST = os.environ.get('VPS_HOST', '43.153.210.165')
VPS_PORT = int(os.environ.get('VPS_PORT', '22'))
VPS_USER = os.environ.get('VPS_USER', 'ubuntu')
VPS_PASSWORD = os.environ.get('VPS_PASSWORD')
VPS_KEY_FILE = os.environ.get('VPS_KEY_FILE')

# Auto-detect default key file if present
DEFAULT_KEY_CANDIDATES = [
    r'D:\Download\Compressed\deploy-web-20261025T032845Z-1-001\deploy-web\id_deploy',
    os.path.expanduser('~/.ssh/id_deploy'),
    os.path.expanduser('~/.ssh/id_ed25519'),
    os.path.expanduser('~/.ssh/id_rsa'),
]

if not VPS_KEY_FILE:
    for candidate in DEFAULT_KEY_CANDIDATES:
        if os.path.exists(candidate):
            VPS_KEY_FILE = candidate
            break

# Local file path
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.dirname(SCRIPT_DIR)
LOCAL_SERVER_PATH = os.path.join(REPO_ROOT, 'server', 'vps_server.py')
REMOTE_SERVER_PATH = '/opt/sunnybridge-auth/server.py'

print(f"1. Target VPS: {VPS_USER}@{VPS_HOST}:{VPS_PORT}")
print(f"   Local Server Source: {LOCAL_SERVER_PATH}")

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())

connect_kwargs = {
    'hostname': VPS_HOST,
    'port': VPS_PORT,
    'username': VPS_USER,
    'timeout': 30
}

if VPS_KEY_FILE and os.path.exists(VPS_KEY_FILE):
    print(f"   Using SSH Key: {VPS_KEY_FILE}")
    connect_kwargs['key_filename'] = VPS_KEY_FILE
elif VPS_PASSWORD:
    print("   Using SSH Password authentication")
    connect_kwargs['password'] = VPS_PASSWORD
else:
    print("   No explicit key or password provided; attempting default SSH agent/keys...")

ssh.connect(**connect_kwargs)

print("2. Uploading server.py to /tmp/server.py ...")
sftp = ssh.open_sftp()
sftp.put(LOCAL_SERVER_PATH, '/tmp/server.py')
sftp.close()

print("3. Moving to /opt/sunnybridge-auth/server.py and restarting sunnybridge-auth service...")
cmd = """
sudo cp /tmp/server.py /opt/sunnybridge-auth/server.py
sudo chown ubuntu:ubuntu /opt/sunnybridge-auth/server.py
sudo systemctl restart sunnybridge-auth
sleep 2
sudo systemctl status sunnybridge-auth --no-pager | head -n 15

echo "=== Health check: /api/ai/tts ==="
curl -s -i "http://127.0.0.1:8001/api/ai/tts?text=think&voice=en-GB-SoniaNeural&rate=-10%25" | head -n 12
"""

stdin, stdout, stderr = ssh.exec_command(cmd)
print(stdout.read().decode('utf-8', errors='ignore'))
err = stderr.read().decode('utf-8', errors='ignore')
if err:
    print("STDERR:\n", err)

ssh.close()
print("🎉 Server deployment completed successfully!")
