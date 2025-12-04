# 📦 如何发布 GitHub Release

## 🎯 发布流程概览

```
第 1 步: 推送代码到 GitHub
   ↓
第 2 步: 创建版本标签
   ↓
第 3 步: 在 GitHub 创建 Release
```

---

## 📋 详细步骤

### 第 1 步：推送代码到 GitHub

如果还未推送代码，双击运行：

```
push_to_github.bat
```

按提示操作：
1. 在浏览器中创建 GitHub 仓库
2. 复制仓库地址（例如：`https://github.com/hzlgames/AI_Image_generator.git`）
3. 粘贴到脚本提示中
4. 等待推送完成

---

### 第 2 步：创建版本标签并推送

双击运行：

```
create_release.bat
```

脚本会自动：
- ✅ 检查远程仓库配置
- ✅ 提交未保存的更改（如果有）
- ✅ 推送代码到 GitHub
- ✅ 创建版本标签（默认 v1.0.0）
- ✅ 推送标签到 GitHub
- ✅ 自动打开 GitHub Release 创建页面

---

### 第 3 步：在 GitHub 上创建 Release

浏览器会自动打开 Release 创建页面，请填写：

#### 1. **选择标签**
已自动选择：`v1.0.0`

#### 2. **Release 标题**
```
v1.0.0 - Gemini 图片生成器首次发布
```

#### 3. **描述内容**
打开 `RELEASE_v1.0.0.md` 文件，复制所有内容并粘贴到描述框

或者使用简化版（复制以下内容）：

```markdown
🎨 基于 Vertex AI 的 Gemini 3 图片生成器 - 开盖即食版

## 🚀 快速开始

1. 下载并解压项目
2. 获取 GCP 密钥文件并命名为 key.json 放到根目录
3. Windows：双击 start.bat | Linux/Mac：./start.sh
4. 访问 http://localhost:5000

## ✨ 核心功能

- 📝 文生图：输入描述生成图片
- 🖼️ 图生图：上传参考图生成新图
- 🔍 搜索增强：基于 Google Search 生成
- ✏️ 图像编辑：翻译/风格迁移/修改
- 💡 思考可视化：查看模型推理过程

## 🎁 开盖即食特性

✅ 一键启动脚本
✅ 自动依赖安装
✅ 零配置启动
✅ 智能环境检测

详细说明请查看 [README.md](https://github.com/hzlgames/AI_Image_generator/blob/main/README.md)
```

#### 4. **设置为正式版本**
- ✅ 勾选 "Set as the latest release"
- ⚠️ 不要勾选 "This is a pre-release"（除非是测试版）

#### 5. **发布**
点击 **Publish release** 按钮

---

## ✅ 发布成功

发布后，用户可以：
- 📥 直接下载源代码 ZIP
- 🔖 通过版本号找到特定版本
- 📖 查看详细的 Release 说明

---

## 🔄 后续更新版本

当需要发布新版本时：

1. 修改代码
2. 更新 `CHANGELOG.md`
3. 提交更改：
   ```bash
   git add .
   git commit -m "版本更新说明"
   git push
   ```
4. 再次运行 `create_release.bat`，输入新版本号（如 v1.1.0）
5. 在 GitHub 上创建新 Release

---

## 📝 注意事项

- ✅ 每次发布前确保代码已测试通过
- ✅ 更新 CHANGELOG.md 记录改动
- ✅ 版本号遵循语义化版本规范（主版本.次版本.修订版本）
- ⚠️ 已发布的 Release 不建议删除或修改
- ⚠️ 确保 key.json 等敏感文件已在 .gitignore 中

---

## 🆘 常见问题

**Q: 标签推送失败怎么办？**  
A: 检查网络连接，或使用 `git push --force origin v1.0.0` 强制推送

**Q: Release 创建后可以修改吗？**  
A: 可以，在 GitHub Release 页面点击 Edit 修改

**Q: 如何删除已发布的 Release？**  
A: 在 GitHub Release 页面点击 Delete，但不建议删除已发布版本

**Q: 版本号规则是什么？**  
A: 
- 主版本号（1.x.x）：不兼容的 API 修改
- 次版本号（x.1.x）：功能性新增，向下兼容
- 修订号（x.x.1）：Bug 修复，向下兼容

---

**🎉 祝发布顺利！**

