@echo off
chcp 65001 >nul
title 创建 GitHub Release

echo ===================================================
echo    🎉 创建 GitHub Release
echo ===================================================
echo.

cd /d "%~dp0"

:: 检查是否已配置远程仓库
git remote get-url origin >nul 2>&1
if errorlevel 1 (
    echo ❌ 错误：尚未配置远程仓库
    echo    请先运行 push_to_github.bat 推送代码
    pause
    exit /b 1
)

:: 获取当前远程仓库地址
for /f "delims=" %%i in ('git remote get-url origin') do set REPO_URL=%%i
echo 📦 仓库地址: %REPO_URL%
echo.

:: 设置版本号
set VERSION=v1.0.0
set /p VERSION="请输入版本号 [默认: v1.0.0]: "
if "%VERSION%"=="" set VERSION=v1.0.0

echo.
echo 📌 版本号: %VERSION%
echo.

:: 检查是否有未提交的更改
git status --porcelain >nul 2>&1
for /f %%i in ('git status --porcelain ^| find /v /c ""') do set CHANGES=%%i

if not "%CHANGES%"=="0" (
    echo ⚠️  检测到未提交的更改
    echo.
    git status -s
    echo.
    set /p COMMIT_CHANGES="是否提交这些更改? [Y/n]: "
    if /i "!COMMIT_CHANGES!"=="n" (
        echo ❌ 已取消。请先提交或撤销更改
        pause
        exit /b 1
    )
    
    echo.
    set /p COMMIT_MSG="请输入提交信息: "
    if "!COMMIT_MSG!"=="" set COMMIT_MSG=准备发布 %VERSION%
    
    git add .
    git commit -m "!COMMIT_MSG!"
    
    if errorlevel 1 (
        echo ❌ 提交失败
        pause
        exit /b 1
    )
    
    echo ✅ 更改已提交
    echo.
)

:: 推送代码到远程仓库
echo 📤 推送代码到 GitHub...
git push origin main

if errorlevel 1 (
    echo ❌ 推送失败，请检查网络和 Git 凭据
    pause
    exit /b 1
)

echo ✅ 代码推送成功
echo.

:: 创建 Git 标签
echo 🏷️  创建版本标签 %VERSION%...
git tag -a %VERSION% -m "Release %VERSION%"

if errorlevel 1 (
    echo ⚠️  标签可能已存在，正在删除旧标签...
    git tag -d %VERSION%
    git tag -a %VERSION% -m "Release %VERSION%"
)

:: 推送标签到 GitHub
echo 📤 推送标签到 GitHub...
git push origin %VERSION%

if errorlevel 1 (
    echo ⚠️  标签推送失败，可能需要强制推送
    git push --force origin %VERSION%
)

echo.
echo ===================================================
echo    ✅ 版本标签创建成功！
echo ===================================================
echo.
echo 📋 接下来请在 GitHub 上创建 Release：
echo.
echo 1. 访问: %REPO_URL:.git=%/releases/new
echo 2. 选择标签: %VERSION%
echo 3. 填写 Release 标题: %VERSION% - Gemini 图片生成器首次发布
echo 4. 复制 CHANGELOG.md 中的内容作为 Release 说明
echo 5. 点击 "Publish release"
echo.
echo 💡 正在打开 GitHub Release 页面...
timeout /t 2 >nul

start %REPO_URL:.git=%/releases/new?tag=%VERSION%

echo.
pause

