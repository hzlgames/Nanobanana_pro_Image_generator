@echo off
chcp 65001 >nul
title Gemini 图片生成器

echo ===================================================
echo    🎨 Gemini 图片生成器 - 一键启动
echo ===================================================
echo.

:: 切换到脚本所在目录
cd /d "%~dp0"

:: 检查 Python 是否安装
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ 错误: 未检测到 Python，请先安装 Python 3.9+
    echo    下载地址: https://www.python.org/downloads/
    pause
    exit /b 1
)

:: 检查 key.json 是否存在
if not exist "key.json" (
    echo ⚠️  警告: 未找到 key.json 密钥文件
    echo    请将 GCP 服务账号密钥文件放在此目录并命名为 key.json
    echo.
    echo    获取方式:
    echo    1. 访问 https://console.cloud.google.com/iam-admin/serviceaccounts
    echo    2. 创建服务账号并赋予 Vertex AI User 权限
    echo    3. 创建并下载 JSON 密钥文件
    echo.
    pause
    exit /b 1
)

:: 检查并安装依赖
echo 📦 检查依赖...
pip show flask >nul 2>&1
if errorlevel 1 (
    echo 📥 首次运行，正在安装依赖...
    pip install -r requirements.txt
    if errorlevel 1 (
        echo ❌ 依赖安装失败，请检查网络连接
        pause
        exit /b 1
    )
    echo ✅ 依赖安装完成
    echo.
)

:: 启动应用
echo 🚀 启动应用...
echo.
echo ===================================================
echo    应用已启动！请在浏览器中访问:
echo    👉 http://localhost:5000
echo ===================================================
echo    按 Ctrl+C 停止服务
echo ===================================================
echo.

python app.py

pause

