$server = "root@72.61.244.88"
$sshArgs = "-o StrictHostKeyChecking=no"

Write-Host "Cleaning up old frontend build on server..."
ssh $sshArgs $server "rm -rf /var/www/linkedin-generator/frontend/dist"
ssh $sshArgs $server "mkdir -p /var/www/linkedin-generator/frontend"

Write-Host "Uploading frontend..."
scp -r $sshArgs frontend/dist "${server}:/var/www/linkedin-generator/frontend/"

Write-Host "Uploading backend files..."
scp $sshArgs backend.env "${server}:/var/www/linkedin-generator/backend/.env"
scp $sshArgs backend/app.py "${server}:/var/www/linkedin-generator/backend/app.py"

Write-Host "Uploading NGINX config..."
scp $sshArgs linkedin-nginx.conf "${server}:/etc/nginx/sites-available/linkedin-generator"
ssh $sshArgs $server "ln -sf /etc/nginx/sites-available/linkedin-generator /etc/nginx/sites-enabled/"

Write-Host "Restarting services on server..."
ssh $sshArgs $server "systemctl daemon-reload"
ssh $sshArgs $server "systemctl restart linkedin-backend"
ssh $sshArgs $server "systemctl restart nginx"

Write-Host "Deployment completed!"
