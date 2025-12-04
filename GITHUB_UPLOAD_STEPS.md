# 🚀 GitHub 上传步骤

## 第 1 步：在 GitHub 创建新仓库

1. 访问 https://github.com/new
2. 填写仓库信息：
   - **Repository name**: `AI_Image_generator` 或 `gemini-image-generator`
   - **Description**: `基于 Gemini 3 的 AI 图片生成器 - 支持文生图、图生图、搜索增强`
   - **Public/Private**: 选择 Public（公开）或 Private（私有）
   - **⚠️ 不要** 勾选 "Initialize this repository with a README"
   - **⚠️ 不要** 添加 .gitignore 或 license
3. 点击 **Create repository**

## 第 2 步：推送代码到 GitHub

创建完仓库后，GitHub 会显示推送命令。你只需要在项目目录运行：

```bash
# 添加远程仓库（替换为你的实际仓库 URL）
git remote add origin https://github.com/hzlgames/AI_Image_generator.git

# 推送代码到 main 分支
git branch -M main
git push -u origin main
```

**注意**：如果仓库名不是 `AI_Image_generator`，请修改 URL 中的仓库名。

## 第 3 步：验证

访问你的仓库页面，应该能看到所有文件已成功上传！

---

## 🔧 如果需要后续更新代码

```bash
# 查看修改的文件
git status

# 添加修改的文件
git add .

# 提交修改
git commit -m "更新说明"

# 推送到 GitHub
git push
```

