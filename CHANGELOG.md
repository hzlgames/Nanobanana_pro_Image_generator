# 更新日志

## [v1.0.0] - 2024-12-04

### 🎉 首次发布

基于 Vertex AI 的 Gemini 3 图片生成器 - 开盖即食版

### ✨ 核心功能

- **📝 文生图**：输入文本描述生成高质量图片
- **🖼️ 图生图**：上传参考图片 + 描述生成新图
- **🔍 搜索增强模式**：基于 Google Search 结果生成更准确的图片
- **✏️ 图像编辑**：支持文字翻译、风格迁移、局部修改
- **💡 思考过程可视化**：实时查看模型推理过程
- **💾 对话历史管理**：保存和管理历史创作

### 🎨 高级配置

- **多种比例支持**：1:1, 3:2, 2:3, 3:4, 4:3, 4:5, 5:4, 9:16, 16:9, 21:9
- **多档分辨率**：1K / 2K / 4K 可选
- **三种编辑类型**：通用编辑 / 文字翻译 / 风格迁移

### 🚀 开盖即食特性

- ✅ **一键启动脚本**：Windows (`start.bat`) / Linux/Mac (`start.sh`)
- ✅ **自动环境检查**：自动检测 Python 和依赖安装状态
- ✅ **智能配置加载**：自动从 `key.json` 读取 GCP 凭证
- ✅ **依赖自动安装**：首次运行自动安装所有依赖
- ✅ **开箱即用**：仅需 2 步即可启动（放置密钥 → 双击启动）

### 📦 技术栈

- **后端**：Flask + Google Gen AI SDK
- **前端**：原生 JavaScript + 现代 CSS
- **AI 模型**：gemini-3-pro-image-preview
- **部署方式**：本地运行

### 📝 文件结构

```
AI_Image_generator/
├── app.py                  # Flask 主程序
├── start.bat              # Windows 一键启动
├── start.sh               # Linux/Mac 一键启动
├── push_to_github.bat     # GitHub 推送脚本
├── requirements.txt       # Python 依赖
├── env.example            # 环境变量模板
├── static/                # 前端资源
├── templates/             # HTML 模板
└── data/                  # 运行时数据
```

### 🛡️ 安全特性

- ✅ `.gitignore` 保护敏感文件（`key.json`, `.env`）
- ✅ 用户数据本地存储，不上传云端
- ✅ API 密钥文件不会被提交到 Git

### 📋 系统要求

- Python 3.9+
- Google Cloud Platform 账号
- Vertex AI API 权限

### 🔗 相关链接

- [项目仓库](https://github.com/hzlgames/AI_Image_generator)
- [Google Cloud Console](https://console.cloud.google.com/)
- [Vertex AI 文档](https://cloud.google.com/vertex-ai/docs)

---

## 未来计划

- [ ] 支持批量生成
- [ ] 添加图片风格预设
- [ ] 支持更多图片格式导出
- [ ] 添加 Docker 部署选项
- [ ] 多语言界面支持

