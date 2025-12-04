@echo off
chcp 65001 >nul
title 推送到 GitHub

echo ===================================================
echo    📤 推送到 GitHub
echo ===================================================
echo.
echo 请先在 GitHub 上创建仓库（浏览器已打开）
echo.
echo 仓库配置建议：
echo   - Repository name: AI_Image_generator
echo   - Description: 基于 Gemini 3 的 AI 图片生成器
echo   - Public/Private: 根据需要选择
echo   - ⚠️ 不要勾选 "Initialize with README"
echo.
echo ===================================================
echo.

set /p repo_url="请输入仓库地址（例如：https://github.com/hzlgames/AI_Image_generator.git）: "

if "%repo_url%"=="" (
    echo ❌ 错误：仓库地址不能为空
    pause
    exit /b 1
)

echo.
echo 🔗 添加远程仓库...
git remote add origin %repo_url%

if errorlevel 1 (
    echo ⚠️  远程仓库已存在，正在更新...
    git remote set-url origin %repo_url%
)

echo.
echo 📤 推送到 GitHub...
git branch -M main
git push -u origin main

if errorlevel 1 (
    echo.
    echo ❌ 推送失败！
    echo 可能的原因：
    echo   1. GitHub 身份验证失败（需要配置 Git 凭据）
    echo   2. 仓库地址错误
    echo   3. 网络连接问题
    echo.
    echo 💡 如果是身份验证问题，请参考：
    echo    https://docs.github.com/zh/get-started/getting-started-with-git/set-up-git
    pause
    exit /b 1
)

echo.
echo ===================================================
echo    ✅ 推送成功！
echo ===================================================
echo.
echo 访问你的仓库查看：%repo_url:.git=%
echo.
pause

