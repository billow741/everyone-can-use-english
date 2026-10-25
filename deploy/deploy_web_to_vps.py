import os
import sys
import tarfile
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

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.dirname(SCRIPT_DIR)
DIST_DIR = os.path.join(REPO_ROOT, 'enjoy', 'dist-web')
TAR_PATH = os.path.join(REPO_ROOT, 'dist-web.tar.gz')

if not os.path.exists(DIST_DIR):
    raise FileNotFoundError(
        f"Web build directory not found: {DIST_DIR}. Please build the web app first:\n"
        f"  cd enjoy && npm run build:web (or npx vite build -c vite.web.config.ts)"
    )

print(f"1. Packaging {DIST_DIR} into {TAR_PATH} ...")
with tarfile.open(TAR_PATH, "w:gz") as tar:
    for root, dirs, files in os.walk(DIST_DIR):
        for file in files:
            if file.endswith('.map'):
                continue
            full_path = os.path.join(root, file)
            rel_path = os.path.relpath(full_path, DIST_DIR)
            tar.add(full_path, arcname=rel_path.replace(os.sep, '/'))

size_mb = os.path.getsize(TAR_PATH) / (1024 * 1024)
print(f"Archive created! Size: {size_mb:.2f} MB")

print(f"2. Connecting to VPS {VPS_USER}@{VPS_HOST}:{VPS_PORT}...")
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

ssh.connect(**connect_kwargs)

sftp = ssh.open_sftp()
print("3. Uploading archive to /tmp/dist-web.tar.gz ...")
sftp.put(TAR_PATH, '/tmp/dist-web.tar.gz')
sftp.close()
print("Upload completed!")

print("4. Extracting archive into /var/www/sunnybridge-app safely...")
cmds = """
sudo mkdir -p /tmp/web_extract
sudo rm -rf /tmp/web_extract/*
sudo tar -xzf /tmp/dist-web.tar.gz -C /tmp/web_extract/

# Copy assets and files into /var/www/sunnybridge-app (preserving oxford directory and admin.html)
sudo cp -r /tmp/web_extract/* /var/www/sunnybridge-app/
sudo chown -R www-data:www-data /var/www/sunnybridge-app/assets
sudo chown www-data:www-data /var/www/sunnybridge-app/index.html

# Verify index.html content
echo "=== Check /var/www/sunnybridge-app/index.html ==="
head -n 20 /var/www/sunnybridge-app/index.html

# Test Nginx and reload
sudo nginx -t && sudo systemctl reload nginx
echo "=== Nginx reloaded successfully ==="
"""

stdin, stdout, stderr = ssh.exec_command(cmds)
print("STDOUT:\n", stdout.read().decode('utf-8', errors='ignore'))
err = stderr.read().decode('utf-8', errors='ignore')
if err:
    print("STDERR:\n", err)
ssh.close()

# Cleanup local tarball
if os.path.exists(TAR_PATH):
    os.remove(TAR_PATH)

print("🎉 Web frontend deployment completed successfully!")
