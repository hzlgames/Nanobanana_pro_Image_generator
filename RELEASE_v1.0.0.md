# 🎨 Gemini 图片生成器 v1.0.0 - 首次发布

> 基于 Vertex AI 的 `gemini-3-pro-image-preview` 模型，支持文生图、图生图、搜索增强 - **开盖即食版**

---

## 🚀 快速开始（2 步即用）

### 1️⃣ 获取并放置密钥
- 访问 [Google Cloud Console](https://console.cloud.google.com/iam-admin/serviceaccounts)
- 创建服务账号 → 赋予 **Vertex AI User** 权限
- 下载 JSON 密钥并重命名为 `key.json`，放到项目根目录

### 2️⃣ 一键启动
**Windows**: 双击 `start.bat`  
**Linux/Mac**: `chmod +x start.sh && ./start.sh`

首次运行自动安装依赖，然后访问 **http://localhost:5000** 🎉

---

## ✨ 核心功能

| 功能 | 说明 |
|------|------|
| 📝 **文生图** | 输入文本描述生成高质量图片 |
| 🖼️ **图生图** | 上传参考图 + 描述生成新图 |
| 🔍 **搜索增强** | 基于 Google Search 结果生成更准确的图片 |
| ✏️ **图像编辑** | 翻译文字 / 风格迁移 / 局部修改 |
| 💡 **思考可视化** | 实时查看模型推理过程和中间图像 |
| 💾 **对话管理** | 保存和管理历史创作记录 |

---

## 🎨 高级配置

- **📐 多种比例**：1:1, 3:2, 2:3, 3:4, 4:3, 4:5, 5:4, 9:16, 16:9, 21:9
- **🖼️ 多档分辨率**：1K / 2K / 4K 可选
- **✏️ 三种编辑类型**：通用编辑 / 文字翻译 / 风格迁移

---

## 🎁 "开盖即食"特性

这是一个**真正开箱即用**的项目：

✅ **一键启动脚本** - Windows/Linux/Mac 通用  
✅ **自动环境检查** - 检测 Python 和 key.json  
✅ **自动依赖安装** - 首次运行自动安装所有依赖  
✅ **智能配置加载** - 自动从 key.json 读取 GCP 凭证  
✅ **零配置启动** - 无需手动设置环境变量  

**下载 → 放密钥 → 双击启动** - 就是这么简单！

---

## 📦 下载安装

### 方式 1：下载 ZIP（推荐新手）
1. 点击右上角 **Code** → **Download ZIP**
2. 解压到任意目录
3. 按照上方"快速开始"操作

### 方式 2：Git Clone
```bash
git clone https://github.com/hzlgames/AI_Image_generator.git
cd AI_Image_generator
```

---

## 📋 系统要求

- **Python**: 3.9 或更高版本
- **操作系统**: Windows / Linux / macOS
- **网络**: 需要访问 Google Cloud API
- **GCP 账号**: 需要启用 Vertex AI API

---

## 📝 主要文件说明

```
AI_Image_generator/
├── start.bat              # Windows 一键启动
├── start.sh               # Linux/Mac 一键启动
├── app.py                 # Flask 主程序
├── requirements.txt       # Python 依赖列表
├── env.example            # 环境变量模板（可选）
├── static/                # 前端静态资源
├── templates/             # HTML 模板
└── README.md              # 项目文档
```

---

## 🛡️ 安全提示

- ✅ `key.json` 已加入 `.gitignore`，不会被提交
- ✅ 所有用户数据存储在本地 `data/` 目录
- ✅ 不会上传任何数据到第三方服务器
- ⚠️ **请勿** 将 `key.json` 分享给他人

---

## ❓ 常见问题

**Q: 提示"未找到 key.json"**  
A: 确保已将 GCP 服务账号密钥文件放在项目根目录并命名为 `key.json`

**Q: 图片生成失败，被安全策略拦截**  
A: 调整提示词，避免敏感内容

**Q: 依赖安装失败**  
A: 检查网络连接，或手动运行 `pip install -r requirements.txt`

**Q: Location 404 错误**  
A: 复制 `env.example` 为 `.env`，设置 `GOOGLE_CLOUD_LOCATION=global`

---

## 🔗 相关链接

- 📖 [完整文档](https://github.com/hzlgames/AI_Image_generator/blob/main/README.md)
- 🐛 [问题反馈](https://github.com/hzlgames/AI_Image_generator/issues)
- 💬 [讨论区](https://github.com/hzlgames/AI_Image_generator/discussions)
- 🌐 [Google Cloud Console](https://console.cloud.google.com/)

---

## 📄 开源协议

MIT License - 自由使用、修改和分发

---

## 🙏 致谢

- Google Vertex AI 团队提供强大的 Gemini 模型
- Flask 社区提供轻量级 Web 框架
- 所有使用和支持本项目的开发者

---

**⭐ 如果这个项目对你有帮助，欢迎点个 Star！**

