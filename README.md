# 🎨 Gemini 图片生成器

基于 Vertex AI 的 `gemini-3-pro-image-preview` 模型，支持文生图、图生图、搜索增强等功能。

---

## ⚡ 快速开始（3 步即用）

### 1️⃣ 获取 GCP 密钥

1. 访问 [Google Cloud Console](https://console.cloud.google.com/iam-admin/serviceaccounts)
2. 创建服务账号 → 赋予 **Vertex AI User** 权限
3. 创建 JSON 密钥 → 下载并重命名为 `key.json`

### 2️⃣ 放置密钥文件

将 `key.json` 放到项目根目录：

```
AI_Image_generator/
├── key.json        ← 放这里
├── app.py
├── start.bat
└── ...
```

### 3️⃣ 一键启动

**Windows：** 双击 `start.bat`

**Linux/Mac：**
```bash
chmod +x start.sh && ./start.sh
```

首次运行会自动安装依赖，然后打开浏览器访问 **http://localhost:5000** 🎉

---

## 🛠️ 手动安装（可选）

如果一键脚本不适用，可手动操作：

```bash
# 安装依赖
pip install -r requirements.txt

# 启动应用
python app.py
```

---

## ✨ 功能特性

| 功能 | 说明 |
| --- | --- |
| 📝 文生图 | 输入描述生成高质量图片 |
| 🖼️ 图生图 | 上传参考图 + 描述生成新图 |
| 🔍 搜索增强 | 基于 Google Search 结果生成更准确的图片 |
| ✏️ 图像编辑 | 翻译文字 / 风格迁移 / 局部修改 |
| 📐 多种比例 | 1:1, 16:9, 9:16, 3:2, 4:3, 21:9 等 |
| 🖼️ 多种尺寸 | 1K / 2K / 4K 分辨率 |
| 💡 思考可视化 | 查看模型的推理过程 |
| 💾 对话历史 | 保存和管理历史创作 |

---

## 📁 项目结构

```
AI_Image_generator/
├── app.py              # Flask 后端
├── key.json            # GCP 密钥（需自行添加）
├── start.bat           # Windows 一键启动
├── start.sh            # Linux/Mac 一键启动
├── requirements.txt    # Python 依赖
├── env.example         # 环境变量模板
├── static/             # 前端资源
├── templates/          # 页面模板
└── data/               # 运行时数据（自动创建）
```

---

## ❓ 常见问题

**Q: 提示"未找到 key.json"**  
A: 确保已将 GCP 服务账号密钥文件放在项目根目录并命名为 `key.json`

**Q: 图片生成失败，被安全策略拦截**  
A: 调整提示词，避免敏感内容

**Q: Location 404 错误**  
A: 在 `.env` 文件中设置 `GOOGLE_CLOUD_LOCATION=global`

**Q: 如何配置环境变量？**  
A: 复制 `env.example` 为 `.env`，填入配置即可（通常只需 key.json 即可运行）

---

## 📄 License

MIT
