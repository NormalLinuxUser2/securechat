@echo off
echo ========================================
echo    SecureChat - Fort Knox Deployment
echo ========================================
echo.
echo This will deploy your secure chat platform to Railway
echo Make sure to change the kill switch passcode after deployment!
echo.
echo Default kill switch passcode: SECURE_CHAT_KILL_SWITCH_2024
echo.
pause

echo.
echo Installing Railway CLI...
npm install -g @railway/cli

echo.
echo Logging into Railway...
railway login

echo.
echo Initializing Railway project...
railway init

echo.
echo Deploying to Railway...
railway up

echo.
echo ========================================
echo    Deployment Complete!
echo ========================================
echo.
echo Your secure chat platform is now live!
echo.
echo IMPORTANT: Change the kill switch passcode in Railway dashboard:
echo 1. Go to your Railway project
echo 2. Go to Variables tab
echo 3. Change KILL_SWITCH_PASSCODE to something secure
echo.
echo Your site URL will be shown above.
echo.
pause
