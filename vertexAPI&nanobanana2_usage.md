在 Vertex AI 中调用 **Gemini 3 Pro Image Preview** 模型（官方 ID：`gemini-3-pro-image-preview`）进行生图，推荐使用 Google 最新的统一 SDK `google-genai`。

以下是完整的客户端语法规范汇总，包含环境配置、核心代码结构、参数说明及完整示例。

### 1. 环境准备

首先安装 Google Gen AI SDK（注意：不是旧版的 `google-cloud-aiplatform`）：

```bash
pip install -U google-genai
```

### 2. 核心语法规范汇总

#### 2.1 客户端初始化
使用 `genai.Client` 并指定 `vertexai=True` 来连接 Vertex AI 后端。

```python
from google import genai
from google.genai import types

client = genai.Client(
    vertexai=True, 
    project="你的项目ID", 
    location="global" 
)
```

#### 2.2 模型调用语法
与旧版不同，Gemini 3 的生图不再使用独立的 `generate_images` 方法，而是通过 `generate_content` 配合 **`response_modalities`** 配置来实现。

*   **Model ID**: `gemini-3-pro-image-preview`
*   **关键配置**: 必须在 `config` 中指定 `response_modalities=["IMAGE"]`。

```python
response = client.models.generate_content(
    model="gemini-3-pro-image-preview",
    contents="你的提示词 (例如: 一只在太空中吃披萨的猫)",
    config=types.GenerateContentConfig(
        response_modalities=["IMAGE"],  # 强制模型输出图片
        image_config=types.ImageConfig(
            aspect_ratio="1:1",         # 可选: "1:1", "16:9", "9:16", "4:3", "3:4"
            person_generation="ALLOW_ADULT", # 可选: 控制人物生成策略
        ),
        # safety_settings=...           # 可选: 安全设置
    )
)
```

#### 2.3 响应处理规范
响应对象 `response` 包含 `parts` 列表。生成的图片以 `inline_data` (字节流) 的形式返回，需要解码。

```python
for part in response.candidates[0].content.parts:
    if part.inline_data:
        # 处理图片数据 (part.inline_data.data 是 raw bytes)
        pass
    elif part.text:
        # 如果设置了 ["TEXT", "IMAGE"]，这里可能包含文本推理过程
        print(part.text)
```

---

### 3. 完整可运行代码示例

以下代码展示了从初始化到保存图片的完整流程：

```python
import os
from google import genai
from google.genai import types
from PIL import Image
from io import BytesIO

# 1. 初始化客户端 (确保已设置 ADC 或直接传入 API Key)
# 推荐方式：在终端运行 `gcloud auth application-default login`
client = genai.Client(
    vertexai=True,
    project="YOUR_PROJECT_ID",  # 替换为你的 GCP 项目 ID
    location="global"
)

# 2. 定义提示词和配置
prompt = "Generate a hyper-realistic image of a futuristic city with flying cars at sunset."

generation_config = types.GenerateContentConfig(
    # 关键点：指定返回模态为图片。Gemini 3 Pro Image 支持文本和图片混合输出。
    response_modalities=["IMAGE"], 
    
    # 图片特定参数配置
    image_config=types.ImageConfig(
        aspect_ratio="16:9",      # 设置宽高比
        include_rai_reasoning=True # 是否包含负责任AI的推理信息(仅供调试)
    ),
    
    # 安全设置 (可选)
    safety_settings=[
        types.SafetySetting(
            category="HARM_CATEGORY_HATE_SPEECH",
            threshold="BLOCK_ONLY_HIGH"
        )
    ]
)

try:
    print("正在生成图片...")
    # 3. 调用 generate_content
    response = client.models.generate_content(
        model="gemini-3-pro-image-preview",
        contents=prompt,
        config=generation_config
    )

    # 4. 解析并保存结果
    if response.candidates and response.candidates[0].content.parts:
        for i, part in enumerate(response.candidates[0].content.parts):
            if part.inline_data:
                # 将字节流转换为图像对象
                img_data = part.inline_data.data
                img = Image.open(BytesIO(img_data))
                
                # 保存图片
                output_filename = f"generated_image_{i}.png"
                img.save(output_filename)
                print(f"✅ 图片已保存至: {output_filename}")
                img.show()
            
            # 如果模型同时也输出了文本（例如推理思考过程），可以在这里捕获
            if part.text:
                print(f"Model Thought: {part.text}")
    else:
        print("未生成任何内容，可能触发了安全拦截。")

except Exception as e:
    print(f"调用失败: {e}")
```

### 4. 关键参数详解

| 参数字段 | 规范值 / 说明 |
| :--- | :--- |
| **`model`** | **`gemini-3-pro-image-preview`** <br> (注意：不要用 `gemini-3-pro-preview`，那是纯文本/多模态理解模型，不具备生图能力) |
| **`response_modalities`** | `["IMAGE"]` (仅生图) 或 `["TEXT", "IMAGE"]` (文本+图)。<br>这是新版 SDK 的核心差异，用于激活生图功能。 |
| **`image_config`** | 类型为 `types.ImageConfig`，包含以下子参数：<br>- `aspect_ratio`: 字符串，如 `"1:1"`, `"16:9"`, `"3:4"` 等。<br>- `person_generation`: 字符串，如 `"allow_adult"`, `"allow_all"` (需权限) 或 `"dont_allow"`。 |
| **`safety_settings`** | 列表，包含 `types.SafetySetting`。用于过滤暴力、色情等内容。 |

### 常见错误排查
*   **404 Not Found**: 检查 `location` 是否正确（Gemini 3 预览版通常先在 `us-central1` 或 `global` 上线）。
*   **400 Invalid Argument**: 确保 `model` 名称拼写正确，且 `response_modalities` 已设置为 `["IMAGE"]`。如果只传提示词而不设置 modalites，模型可能会默认只输出文本描述。

--- 
在 Vertex AI 中使用 `google-genai` SDK 调用 Gemini 3 Pro Preview-image 模型时，**流式传输 (Streaming)** 和 **多模态文件上传 (Uploading)** 是两个核心的高级功能。

以下是针对这两个功能的完整语法规范与代码实现。

---

### 1. 流式传输 (Streaming)

Gemini 3 Pro 是 "Thinking Model"（思考模型），**流式传输**不仅能让你更快获得响应，还能实时看到模型的**推理过程（Thoughts）**，最后才接收生成的图片。

#### 语法规范
*   **方法**: 使用 `client.models.generate_content_stream` 替代 `generate_content`。
*   **返回对象**: 返回一个可迭代的 `Iterator[GenerateContentResponse]`。
*   **处理逻辑**:
    *   **Text Part**: 在生图模式下，流式返回的文本通常是模型的“思考/推理”过程。
    *   **Inline Data**: 最后的 `inline_data` 包含生成的图片字节流。

#### 代码示例：实时打印思考过程并接收图片

```python
from google import genai
from google.genai import types
from PIL import Image
from io import BytesIO

client = genai.Client(vertexai=True, project="YOUR_PROJECT_ID", location="us-central1")

prompt = "一只赛博朋克风格的猫在霓虹灯雨中。思考构图和光影。"

# 1. 发起流式请求
# 注意：配置中必须保留 response_modalities=["IMAGE"]
response_stream = client.models.generate_content_stream(
    model="gemini-3-pro-image-preview",
    contents=prompt,
    config=types.GenerateContentConfig(
        response_modalities=["IMAGE"],
        image_config=types.ImageConfig(aspect_ratio="16:9")
    )
)

print("--- 开始生成 (Thinking Process) ---")

# 2. 循环处理流式块 (Chunk)
final_image_bytes = None

for chunk in response_stream:
    # 处理模型产生的"思考"文本
    if chunk.text:
        print(chunk.text, end="", flush=True)
    
    # 捕获最终的图片数据 (通常在流的最后)
    if chunk.candidates and chunk.candidates[0].content.parts:
        for part in chunk.candidates[0].content.parts:
            if part.inline_data:
                final_image_bytes = part.inline_data.data

print("\n--- 生成结束 ---")

# 3. 保存图片
if final_image_bytes:
    img = Image.open(BytesIO(final_image_bytes))
    img.save("streamed_output.png")
    print("✅ 图片已保存: streamed_output.png")
else:
    print("⚠️ 未检测到图片输出 (可能被安全策略拦截)")
```

---

### 2. 上传图片与文件 (Input Images & Files)

在 Vertex AI 中，将图片或文件作为 Prompt 的一部分（例如：“参考这张图的风格生成...” 或 “修改这张图...”），主要有两种标准方式：

#### 方式 A：直接传输字节流 (Inline Bytes)
适用于本地小文件（< 20MB），无需上传到云存储，直接将文件读取为 bytes 发送。

*   **类**: `types.Part.from_bytes`
*   **参数**: `data` (bytes), `mime_type` (str)

```python
# 读取本地文件
with open("local_sketch.jpg", "rb") as f:
    image_bytes = f.read()

# 构建请求内容
contents = [
    "把这张素描变成一张逼真的照片：",
    types.Part.from_bytes(
        data=image_bytes,
        mime_type="image/jpeg"
    )
]

# 发送请求
response = client.models.generate_content(
    model="gemini-3-pro-image-preview",
    contents=contents,
    config=types.GenerateContentConfig(response_modalities=["IMAGE"])
)
```

#### 方式 B：引用 Google Cloud Storage (GCS URI)
适用于大文件或生产环境。文件需预先存储在 GCS Bucket 中。

*   **类**: `types.Part.from_uri`
*   **参数**: `file_uri` (str), `mime_type` (str)

```python
# 构建请求内容 (引用 GCS 路径)
contents = [
    "描述这个PDF文件里的设计草图，并基于此生成一张效果图：",
    types.Part.from_uri(
        file_uri="gs://your-bucket-name/design_doc.pdf",
        mime_type="application/pdf"
    )
]

# 发送请求
response = client.models.generate_content(
    model="gemini-3-pro-image-preview",
    contents=contents,
    config=types.GenerateContentConfig(response_modalities=["IMAGE"])
)
```

---

### 3. 综合汇总示例 (All-in-One Client)

这是一个集成了**本地图片上传** + **流式传输** + **图片生成**的完整客户端脚本。

```python
import os
from google import genai
from google.genai import types
from PIL import Image
from io import BytesIO

# --- 配置部分 ---
PROJECT_ID = "YOUR_PROJECT_ID"
LOCATION = "us-central1"
MODEL_ID = "gemini-3-pro-image-preview"
INPUT_IMAGE_PATH = "ref_image.jpg" # 确保本地有这张图，或注释掉相关代码

# 1. 初始化
client = genai.Client(vertexai=True, project=PROJECT_ID, location=LOCATION)

def generate_with_stream_and_upload():
    parts = []
    
    # 2. 准备提示词 (Text Part)
    prompt_text = "Generate a variation of this image in a cyberpunk style."
    parts.append(types.Part.from_text(text=prompt_text))

    # 3. 准备上传图片 (File Part - Inline)
    if os.path.exists(INPUT_IMAGE_PATH):
        print(f"正在读取本地图片: {INPUT_IMAGE_PATH}")
        with open(INPUT_IMAGE_PATH, "rb") as f:
            img_data = f.read()
            parts.append(types.Part.from_bytes(data=img_data, mime_type="image/jpeg"))
    else:
        print("未找到本地图片，仅使用文本提示。")
        parts = ["A cyberpunk city with neon lights, realistic, 8k."]

    # 4. 配置参数
    config = types.GenerateContentConfig(
        response_modalities=["IMAGE"], # 强制输出图片
        image_config=types.ImageConfig(
            aspect_ratio="16:9",
            person_generation="ALLOW_ADULT"
        )
    )

    print("\n--- 请求发送中 (Streaming) ---")
    
    try:
        # 5. 调用流式接口
        stream = client.models.generate_content_stream(
            model=MODEL_ID,
            contents=parts,
            config=config
        )

        final_image = None
        
        # 6. 处理流式响应
        for chunk in stream:
            # 打印推理文本 (Gemini 3 Pro 的思考过程)
            if chunk.text:
                print(f"\033[94m{chunk.text}\033[0m", end="", flush=True) # 蓝色打印思考
            
            # 提取图片数据
            if chunk.candidates:
                for part in chunk.candidates[0].content.parts:
                    if part.inline_data:
                        final_image = part.inline_data.data

        # 7. 保存结果
        if final_image:
            print("\n\n--- 捕获到图片数据 ---")
            img = Image.open(BytesIO(final_image))
            output_file = "result_cyberpunk.png"
            img.save(output_file)
            print(f"✅ 图片已保存至: {os.path.abspath(output_file)}")
            img.show()
        else:
            print("\n❌ 生成结束，但未收到图片数据。")

    except Exception as e:
        print(f"\n❌ 发生错误: {e}")

if __name__ == "__main__":
    generate_with_stream_and_upload()
```

### 关键差异总结

| 功能 | 方法/类 | 关键点 |
| :--- | :--- | :--- |
| **流式传输** | `client.models.generate_content_stream(...)` | 需循环迭代 `chunk`；`chunk.text` 是思考过程，`chunk.inline_data` 是结果图片。 |
| **本地文件** | `types.Part.from_bytes(data=..., mime_type=...)` | 适合快速测试和小文件；数据直接包含在 API 请求体中。 |
| **GCS文件** | `types.Part.from_uri(file_uri=..., mime_type=...)` | 适合生产环境；支持超大文件；需确保 Vertex AI Service Agent 有存储桶的读取权限。 |

--- 
## vertex本地验证

#### 1. 创建服务账号并下载 Key
1.  进入 [Google Cloud Console - IAM & Admin](https://console.cloud.google.com/iam-admin/serviceaccounts)。
2.  创建一个服务账号 (Service Account)。
3.  赋予它权限，例如 **Vertex AI User**。
4.  进入该账号的 "Keys" 选项卡 -> "Add Key" -> "Create new key" -> 选择 **JSON**。
5.  文件会自动下载到本地，例如 `key.json`。

#### 2. 设置环境变量
Python SDK 通过环境变量 `GOOGLE_APPLICATION_CREDENTIALS` 来寻找这个文件。

**在终端中 (Linux/macOS):**
```bash
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/your/key.json"
```

**在终端中 (Windows PowerShell):**
```powershell
$env:GOOGLE_APPLICATION_CREDENTIALS="C:\path\to\your\key.json"
```

