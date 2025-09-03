@echo off
echo ========================================
echo    SecureChat - GitHub Setup
echo ========================================
echo.
echo This will help you set up GitHub for Railway deployment
echo.
echo First, create a new repository on GitHub.com:
echo 1. Go to github.com and sign in
echo 2. Click "New repository"
echo 3. Name it "securechat" (or whatever you want)
echo 4. Make it PUBLIC (required for free Railway)
echo 5. Don't initialize with README
echo.
echo Then come back here and press any key...
pause

echo.
echo Now we'll set up Git and push your code...
echo.

echo Initializing Git repository...
git init

echo Adding all files...
git add .

echo Creating initial commit...
git commit -m "Initial SecureChat deployment with PGP keys"

echo.
echo ========================================
echo    Next Steps:
echo ========================================
echo.
echo 1. Go to your GitHub repository
echo 2. Copy the repository URL (looks like: https://github.com/USERNAME/REPO.git)
echo 3. Run these commands (replace with your actual URL):
echo.
echo    git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
echo    git branch -M main
echo    git push -u origin main
echo.
echo 4. Then go to railway.app and deploy from GitHub!
echo.
echo Press any key to continue...
pause
