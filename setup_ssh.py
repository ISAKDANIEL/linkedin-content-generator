import paramiko
import os

hostname = "191.101.2.4"
username = "root"
password = "Manoj@121295"
key_file = os.path.expanduser("~/.ssh/id_rsa.pub")

with open(key_file, "r") as f:
    public_key = f.read().strip()

try:
    print(f"Connecting to {hostname}...")
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(hostname, username=username, password=password)
    
    # Create .ssh directory and set permissions
    print("Setting up .ssh directory...")
    ssh.exec_command("mkdir -p ~/.ssh && chmod 700 ~/.ssh")
    
    # Add public key to authorized_keys
    print("Adding public key to authorized_keys...")
    ssh.exec_command(f"echo '{public_key}' >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys")
    
    print("Successfully authorized the SSH key!")
    ssh.close()
except Exception as e:
    print(f"Error: {e}")
