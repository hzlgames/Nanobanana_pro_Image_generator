"""
Gemini 图片生成器 - Flask 后端服务
基于 Vertex AI API 调用 gemini-3-pro-image-preview 模型
增强版：支持图片尺寸、Google Search Grounding、图像编辑、思考过程可视化
"""

import os
import json
import uuid
import base64
from datetime import datetime
from io import BytesIO
from pathlib import Path

from flask import Flask, render_template, request, jsonify, Response, send_from_directory
from dotenv import load_dotenv

# 加载环境变量
load_dotenv()

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024  # 50MB 上传限制

# 数据目录配置
BASE_DIR = Path(__file__).parent
DATA_DIR = BASE_DIR / "data"
UPLOADS_DIR = DATA_DIR / "uploads"
GENERATED_DIR = DATA_DIR / "generated"
CONVERSATIONS_FILE = DATA_DIR / "conversations.json"

# 确保目录存在
for dir_path in [DATA_DIR, UPLOADS_DIR, GENERATED_DIR]:
    dir_path.mkdir(parents=True, exist_ok=True)

# 初始化对话存储
if not CONVERSATIONS_FILE.exists():
    CONVERSATIONS_FILE.write_text("[]", encoding="utf-8")

# Vertex AI 客户端 (延迟初始化)
_client = None

# 有效的图片比例选项
VALID_ASPECT_RATIOS = ["1:1", "3:2", "2:3", "3:4", "4:3", "4:5", "5:4", "9:16", "16:9", "21:9"]
# 有效的图片尺寸选项
VALID_IMAGE_SIZES = ["1K", "2K", "4K"]


def get_vertex_client():
    """获取 Vertex AI 客户端 (延迟初始化)"""
    global _client
    if _client is None:
        try:
            from google import genai
            
            # 从 key.json 读取项目 ID
            key_file = BASE_DIR / "key.json"
            if key_file.exists():
                import json
                key_data = json.loads(key_file.read_text(encoding="utf-8"))
                default_project = key_data.get("project_id", "")
                # 设置凭证环境变量
                os.environ.setdefault("GOOGLE_APPLICATION_CREDENTIALS", str(key_file))
            else:
                default_project = ""
            
            project_id = os.getenv("GOOGLE_CLOUD_PROJECT", os.getenv("PROJECT_ID", default_project))
            location = os.getenv("GOOGLE_CLOUD_LOCATION", "global")
            
            if not project_id:
                raise ValueError("请设置 GOOGLE_CLOUD_PROJECT 环境变量或提供 key.json")
            
            _client = genai.Client(
                vertexai=True,
                project=project_id,
                location=location
            )
            print(f"✅ Vertex AI 客户端已初始化 (项目: {project_id}, 区域: {location})")
        except Exception as e:
            print(f"❌ Vertex AI 客户端初始化失败: {e}")
            raise
    return _client


def load_conversations():
    """加载对话历史"""
    try:
        return json.loads(CONVERSATIONS_FILE.read_text(encoding="utf-8"))
    except:
        return []


def save_conversations(conversations):
    """保存对话历史"""
    CONVERSATIONS_FILE.write_text(
        json.dumps(conversations, ensure_ascii=False, indent=2),
        encoding="utf-8"
    )


def save_image_from_bytes(image_bytes: bytes, prefix: str = "") -> tuple:
    """保存图片并返回文件名和base64"""
    from PIL import Image
    
    img = Image.open(BytesIO(image_bytes))
    filename = f"{prefix}{uuid.uuid4()}.png"
    output_path = GENERATED_DIR / filename
    img.save(output_path)
    
    img_base64 = base64.b64encode(image_bytes).decode("utf-8")
    return filename, img_base64


def parse_grounding_metadata(grounding_metadata) -> dict:
    """解析 grounding 元数据"""
    result = {
        "sources": [],
        "search_queries": [],
    }
    
    if not grounding_metadata:
        return result
    
    # 解析搜索查询
    if grounding_metadata.web_search_queries:
        result["search_queries"] = list(grounding_metadata.web_search_queries)
    
    # 解析 grounding chunks
    if grounding_metadata.grounding_chunks:
        for chunk in grounding_metadata.grounding_chunks:
            context = chunk.web or chunk.retrieved_context
            if context:
                source = {
                    "title": getattr(context, "title", "Source") or "Source",
                    "uri": getattr(context, "uri", "") or ""
                }
                # 转换 GCS URI 为 HTTPS
                if source["uri"].startswith("gs://"):
                    source["uri"] = source["uri"].replace(
                        "gs://", "https://storage.googleapis.com/", 1
                    )
                result["sources"].append(source)
    
    return result


# ============ 路由 ============

@app.route("/")
def index():
    """主页"""
    return render_template("index.html")


@app.route("/api/config")
def get_config():
    """获取可用配置选项"""
    return jsonify({
        "aspect_ratios": VALID_ASPECT_RATIOS,
        "image_sizes": VALID_IMAGE_SIZES,
        "modes": ["standard", "search", "edit"]
    })


@app.route("/api/conversations", methods=["GET"])
def get_conversations():
    """获取所有对话列表（包含完整消息）"""
    conversations = load_conversations()
    return jsonify(conversations)


@app.route("/api/conversations/<conv_id>", methods=["GET"])
def get_conversation(conv_id):
    """获取单个对话详情"""
    conversations = load_conversations()
    for c in conversations:
        if c["id"] == conv_id:
            return jsonify(c)
    return jsonify({"error": "对话不存在"}), 404


@app.route("/api/conversations", methods=["POST"])
def create_conversation():
    """创建新对话"""
    conversations = load_conversations()
    new_conv = {
        "id": str(uuid.uuid4()),
        "title": "新对话",
        "messages": [],
        "created_at": datetime.now().isoformat(),
        "updated_at": datetime.now().isoformat()
    }
    conversations.insert(0, new_conv)
    save_conversations(conversations)
    return jsonify(new_conv)


@app.route("/api/conversations/<conv_id>", methods=["PUT"])
def update_conversation(conv_id):
    """更新对话"""
    data = request.json
    conversations = load_conversations()
    for c in conversations:
        if c["id"] == conv_id:
            if "title" in data:
                c["title"] = data["title"]
            if "messages" in data:
                c["messages"] = data["messages"]
            c["updated_at"] = datetime.now().isoformat()
            save_conversations(conversations)
            return jsonify(c)
    return jsonify({"error": "对话不存在"}), 404


@app.route("/api/conversations/<conv_id>", methods=["DELETE"])
def delete_conversation(conv_id):
    """删除对话"""
    conversations = load_conversations()
    conversations = [c for c in conversations if c["id"] != conv_id]
    save_conversations(conversations)
    return jsonify({"success": True})


@app.route("/api/conversations/<conv_id>/messages/<int:msg_index>", methods=["DELETE"])
def delete_message(conv_id, msg_index):
    """删除对话中的单条消息"""
    conversations = load_conversations()
    for c in conversations:
        if c["id"] == conv_id:
            messages = c.get("messages", [])
            if 0 <= msg_index < len(messages):
                messages.pop(msg_index)
                c["messages"] = messages
                c["updated_at"] = datetime.now().isoformat()
                save_conversations(conversations)
                return jsonify({"success": True, "messages": messages})
            else:
                return jsonify({"error": "消息索引超出范围"}), 400
    return jsonify({"error": "对话不存在"}), 404


@app.route("/api/upload", methods=["POST"])
def upload_file():
    """上传文件"""
    if "file" not in request.files:
        return jsonify({"error": "没有文件"}), 400
    
    file = request.files["file"]
    if file.filename == "":
        return jsonify({"error": "文件名为空"}), 400
    
    ext = Path(file.filename).suffix.lower()
    filename = f"{uuid.uuid4()}{ext}"
    filepath = UPLOADS_DIR / filename
    
    file.save(filepath)
    
    mime_map = {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".gif": "image/gif",
        ".webp": "image/webp",
        ".pdf": "application/pdf"
    }
    mime_type = mime_map.get(ext, "application/octet-stream")
    
    return jsonify({
        "filename": filename,
        "original_name": file.filename,
        "mime_type": mime_type,
        "path": f"/uploads/{filename}"
    })


@app.route("/uploads/<filename>")
def serve_upload(filename):
    """提供上传文件访问"""
    return send_from_directory(UPLOADS_DIR, filename)


@app.route("/generated/<filename>")
def serve_generated(filename):
    """提供生成图片访问"""
    return send_from_directory(GENERATED_DIR, filename)


def build_history_contents(history: list, types_module):
    """构建历史消息内容"""
    contents = []
    for msg in history:
        role = "user" if msg.get("role") == "user" else "model"
        parts = []
        
        # 添加文本
        if msg.get("text"):
            parts.append(msg["text"])
        
        # 添加图片（如果有的话）
        if msg.get("image"):
            image_path = msg["image"]
            # 处理路径
            if image_path.startswith("/generated/"):
                filename = image_path.replace("/generated/", "")
                filepath = GENERATED_DIR / filename
            elif image_path.startswith("/uploads/"):
                filename = image_path.replace("/uploads/", "")
                filepath = UPLOADS_DIR / filename
            else:
                filepath = None
            
            if filepath and filepath.exists():
                with open(filepath, "rb") as fp:
                    img_data = fp.read()
                parts.append(types_module.Part.from_bytes(
                    data=img_data,
                    mime_type="image/png"
                ))
        
        if parts:
            contents.append(types_module.Content(role=role, parts=parts))
    
    return contents


@app.route("/api/generate", methods=["POST"])
def generate_image():
    """生成图片 (SSE 流式响应) - 标准模式"""
    data = request.json
    prompt = data.get("prompt", "")
    files = data.get("files", [])
    aspect_ratio = str(data.get("aspect_ratio", "1:1")).strip() or "1:1"
    image_size = str(data.get("image_size", "1K")).strip() or "1K"
    include_text = data.get("include_text", True)  # 是否同时返回文本
    history = data.get("history", [])  # 历史消息
    
    # 验证参数
    if aspect_ratio not in VALID_ASPECT_RATIOS:
        aspect_ratio = "1:1"
    if image_size not in VALID_IMAGE_SIZES:
        image_size = "1K"
    
    if not prompt and not files:
        return jsonify({"error": "请输入提示词或上传文件"}), 400
    
    def generate():
        try:
            from google.genai import types
            
            client = get_vertex_client()
            
            # 构建请求内容
            # 如果有历史消息，使用多轮对话格式
            if history:
                contents = build_history_contents(history, types)
                # 添加当前用户消息
                current_parts = []
                if prompt:
                    current_parts.append(prompt)
                for f in files:
                    filepath = find_image_file(f["filename"])
                    if filepath and filepath.exists():
                        with open(filepath, "rb") as fp:
                            file_data = fp.read()
                        current_parts.append(types.Part.from_bytes(
                            data=file_data,
                            mime_type=f["mime_type"]
                        ))
                if current_parts:
                    contents.append(types.Content(role="user", parts=current_parts))
                print(f"📜 使用上下文记忆，共 {len(contents)} 轮消息")
            else:
                # 单轮对话
                parts = []
                if prompt:
                    parts.append(prompt)
                
                for f in files:
                    filepath = UPLOADS_DIR / f["filename"]
                    if filepath.exists():
                        with open(filepath, "rb") as fp:
                            file_data = fp.read()
                        parts.append(types.Part.from_bytes(
                            data=file_data,
                            mime_type=f["mime_type"]
                        ))
                contents = parts
            
            # 配置响应模态
            response_modalities = ["IMAGE"]
            if include_text:
                response_modalities = ["TEXT", "IMAGE"]
            
            config = types.GenerateContentConfig(
                response_modalities=response_modalities,
                image_config=types.ImageConfig(
                    aspect_ratio=aspect_ratio,
                    image_size=image_size
                )
            )
            
            yield f"data: {json.dumps({'type': 'start', 'message': '开始生成...'})}\n\n"
            
            print(f"🛰️ 请求模型: gemini-3-pro-image-preview, aspect_ratio={aspect_ratio}, image_size={image_size}")
            response_stream = client.models.generate_content_stream(
                model="gemini-3-pro-image-preview",
                contents=contents,
                config=config
            )
            
            final_image_bytes = None
            all_text = ""
            thinking_text = ""
            thinking_images = []
            
            for chunk in response_stream:
                # 处理各个 part
                if chunk.candidates and chunk.candidates[0].content and chunk.candidates[0].content.parts:
                    for part in chunk.candidates[0].content.parts:
                        # 检查是否是思考过程
                        if hasattr(part, 'thought') and part.thought:
                            if part.text:
                                thinking_text += part.text
                                yield f"data: {json.dumps({'type': 'thinking', 'text': part.text})}\n\n"
                            elif part.inline_data:
                                # 思考过程中的图片
                                img_data = part.inline_data.data
                                filename, img_b64 = save_image_from_bytes(img_data, "thought_")
                                thinking_images.append({
                                    "filename": filename,
                                    "path": f"/generated/{filename}"
                                })
                                yield f"data: {json.dumps({'type': 'thinking_image', 'filename': filename, 'path': f'/generated/{filename}', 'base64': img_b64})}\n\n"
                        else:
                            # 普通内容
                            if part.text:
                                all_text += part.text
                                yield f"data: {json.dumps({'type': 'text', 'text': part.text})}\n\n"
                            elif part.inline_data:
                                final_image_bytes = part.inline_data.data
                                print(f"🖼️ 收到图片分片: {len(final_image_bytes)} bytes")
            
            if final_image_bytes:
                filename, img_base64 = save_image_from_bytes(final_image_bytes)
                
                yield f"data: {json.dumps({'type': 'image', 'filename': filename, 'path': f'/generated/{filename}', 'base64': img_base64})}\n\n"
                yield f"data: {json.dumps({'type': 'done', 'message': '生成完成!', 'full_text': all_text, 'thinking': thinking_text, 'thinking_images': thinking_images})}\n\n"
            else:
                yield f"data: {json.dumps({'type': 'error', 'message': '未生成图片，可能被安全策略拦截'})}\n\n"
                
        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"
    
    return Response(generate(), mimetype="text/event-stream")


@app.route("/api/generate-with-search", methods=["POST"])
def generate_with_search():
    """Google Search 增强生成 (SSE 流式响应)"""
    data = request.json
    prompt = data.get("prompt", "")
    aspect_ratio = str(data.get("aspect_ratio", "1:1")).strip() or "1:1"
    image_size = str(data.get("image_size", "1K")).strip() or "1K"
    
    if aspect_ratio not in VALID_ASPECT_RATIOS:
        aspect_ratio = "1:1"
    if image_size not in VALID_IMAGE_SIZES:
        image_size = "1K"
    
    if not prompt:
        return jsonify({"error": "请输入提示词"}), 400
    
    def generate():
        try:
            from google.genai import types
            
            client = get_vertex_client()
            
            # 创建 Google Search 工具
            google_search = types.Tool(google_search=types.GoogleSearch())
            
            config = types.GenerateContentConfig(
                response_modalities=["TEXT", "IMAGE"],
                image_config=types.ImageConfig(
                    aspect_ratio=aspect_ratio,
                    image_size=image_size
                ),
                tools=[google_search]
            )
            
            yield f"data: {json.dumps({'type': 'start', 'message': '正在搜索并生成...'})}\n\n"
            
            print(f"🔍 搜索增强生成: {prompt[:50]}...")
            
            # 使用非流式调用以获取完整的 grounding metadata
            response = client.models.generate_content(
                model="gemini-3-pro-image-preview",
                contents=prompt,
                config=config
            )
            
            # 检查响应状态
            if response.candidates[0].finish_reason != types.FinishReason.STOP:
                reason = response.candidates[0].finish_reason
                yield f"data: {json.dumps({'type': 'error', 'message': f'生成被中断: {reason}'})}\n\n"
                return
            
            final_image_bytes = None
            all_text = ""
            thinking_text = ""
            thinking_images = []
            
            for part in response.candidates[0].content.parts:
                if hasattr(part, 'thought') and part.thought:
                    if part.text:
                        thinking_text += part.text
                        yield f"data: {json.dumps({'type': 'thinking', 'text': part.text})}\n\n"
                    elif part.inline_data:
                        img_data = part.inline_data.data
                        filename, img_b64 = save_image_from_bytes(img_data, "thought_")
                        thinking_images.append({"filename": filename, "path": f"/generated/{filename}"})
                        yield f"data: {json.dumps({'type': 'thinking_image', 'filename': filename, 'path': f'/generated/{filename}', 'base64': img_b64})}\n\n"
                else:
                    if part.text:
                        all_text += part.text
                        yield f"data: {json.dumps({'type': 'text', 'text': part.text})}\n\n"
                    elif part.inline_data:
                        final_image_bytes = part.inline_data.data
            
            # 解析 grounding 数据
            grounding_data = {}
            if response.candidates[0].grounding_metadata:
                grounding_data = parse_grounding_metadata(response.candidates[0].grounding_metadata)
                yield f"data: {json.dumps({'type': 'grounding', 'data': grounding_data})}\n\n"
            
            if final_image_bytes:
                filename, img_base64 = save_image_from_bytes(final_image_bytes)
                
                yield f"data: {json.dumps({'type': 'image', 'filename': filename, 'path': f'/generated/{filename}', 'base64': img_base64})}\n\n"
                yield f"data: {json.dumps({'type': 'done', 'message': '搜索增强生成完成!', 'full_text': all_text, 'thinking': thinking_text, 'thinking_images': thinking_images, 'grounding': grounding_data})}\n\n"
            else:
                yield f"data: {json.dumps({'type': 'error', 'message': '未生成图片'})}\n\n"
                
        except Exception as e:
            import traceback
            traceback.print_exc()
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"
    
    return Response(generate(), mimetype="text/event-stream")


def find_image_file(filename: str):
    """在 uploads 和 generated 目录中查找图片文件"""
    # 先在 uploads 目录查找
    filepath = UPLOADS_DIR / filename
    if filepath.exists():
        return filepath
    
    # 再在 generated 目录查找
    filepath = GENERATED_DIR / filename
    if filepath.exists():
        return filepath
    
    # 处理可能带有 edit_ 或其他前缀的文件名
    # 也处理路径中可能包含的目录前缀
    clean_filename = filename.split('/')[-1]  # 移除可能的路径前缀
    
    filepath = UPLOADS_DIR / clean_filename
    if filepath.exists():
        return filepath
    
    filepath = GENERATED_DIR / clean_filename
    if filepath.exists():
        return filepath
    
    return None


@app.route("/api/edit-image", methods=["POST"])
def edit_image():
    """图像编辑 (SSE 流式响应) - 支持本地化/翻译/局部修改"""
    data = request.json
    prompt = data.get("prompt", "")
    files = data.get("files", [])
    aspect_ratio = str(data.get("aspect_ratio", "")).strip()  # 编辑模式可能保持原比例
    image_size = str(data.get("image_size", "1K")).strip() or "1K"
    edit_type = data.get("edit_type", "general")  # general, translate, style
    
    if image_size not in VALID_IMAGE_SIZES:
        image_size = "1K"
    
    if not files:
        return jsonify({"error": "请上传要编辑的图片"}), 400
    
    if not prompt:
        return jsonify({"error": "请输入编辑指令"}), 400
    
    def generate():
        try:
            from google.genai import types
            
            client = get_vertex_client()
            
            # 构建内容 - 图片在前，指令在后
            contents = []
            
            for f in files:
                filepath = find_image_file(f["filename"])
                if filepath and filepath.exists():
                    with open(filepath, "rb") as fp:
                        file_data = fp.read()
                    contents.append(types.Part.from_bytes(
                        data=file_data,
                        mime_type=f["mime_type"]
                    ))
                    print(f"📎 已加载图片: {filepath}")
            
            # 根据编辑类型构建提示
            if edit_type == "translate":
                full_prompt = f"请将图片中的文字翻译/转换为以下语言，保持图片其他元素不变：{prompt}"
            elif edit_type == "style":
                full_prompt = f"请按照以下风格修改图片，保持主要内容不变：{prompt}"
            else:
                full_prompt = prompt
            
            contents.append(full_prompt)
            
            # 配置
            image_config_params = {"image_size": image_size}
            if aspect_ratio and aspect_ratio in VALID_ASPECT_RATIOS:
                image_config_params["aspect_ratio"] = aspect_ratio
            
            config = types.GenerateContentConfig(
                response_modalities=["TEXT", "IMAGE"],
                image_config=types.ImageConfig(**image_config_params)
            )
            
            yield f"data: {json.dumps({'type': 'start', 'message': '正在编辑图片...'})}\n\n"
            
            print(f"✏️ 图像编辑: {full_prompt[:50]}...")
            response_stream = client.models.generate_content_stream(
                model="gemini-3-pro-image-preview",
                contents=contents,
                config=config
            )
            
            final_image_bytes = None
            all_text = ""
            thinking_text = ""
            thinking_images = []
            
            for chunk in response_stream:
                if chunk.candidates and chunk.candidates[0].content and chunk.candidates[0].content.parts:
                    for part in chunk.candidates[0].content.parts:
                        if hasattr(part, 'thought') and part.thought:
                            if part.text:
                                thinking_text += part.text
                                yield f"data: {json.dumps({'type': 'thinking', 'text': part.text})}\n\n"
                            elif part.inline_data:
                                img_data = part.inline_data.data
                                filename, img_b64 = save_image_from_bytes(img_data, "thought_")
                                thinking_images.append({"filename": filename, "path": f"/generated/{filename}"})
                                yield f"data: {json.dumps({'type': 'thinking_image', 'filename': filename, 'path': f'/generated/{filename}', 'base64': img_b64})}\n\n"
                        else:
                            if part.text:
                                all_text += part.text
                                yield f"data: {json.dumps({'type': 'text', 'text': part.text})}\n\n"
                            elif part.inline_data:
                                final_image_bytes = part.inline_data.data
                                print(f"🖼️ 编辑结果: {len(final_image_bytes)} bytes")
            
            if final_image_bytes:
                filename, img_base64 = save_image_from_bytes(final_image_bytes, "edit_")
                
                yield f"data: {json.dumps({'type': 'image', 'filename': filename, 'path': f'/generated/{filename}', 'base64': img_base64})}\n\n"
                yield f"data: {json.dumps({'type': 'done', 'message': '编辑完成!', 'full_text': all_text, 'thinking': thinking_text, 'thinking_images': thinking_images})}\n\n"
            else:
                yield f"data: {json.dumps({'type': 'error', 'message': '编辑失败，未生成图片'})}\n\n"
                
        except Exception as e:
            import traceback
            traceback.print_exc()
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"
    
    return Response(generate(), mimetype="text/event-stream")


if __name__ == "__main__":
    print("=" * 50)
    print("🎨 Gemini 图片生成器 - 增强版")
    print("=" * 50)
    print(f"📁 数据目录: {DATA_DIR}")
    print(f"📁 上传目录: {UPLOADS_DIR}")
    print(f"📁 生成目录: {GENERATED_DIR}")
    print("=" * 50)
    print("支持的功能:")
    print("  ✅ 标准图片生成 (TEXT + IMAGE)")
    print("  ✅ Google Search 搜索增强生成")
    print("  ✅ 图像编辑 (翻译/本地化/风格)")
    print("  ✅ 图片尺寸选择 (1K/2K/4K)")
    print("  ✅ 完整比例支持 (1:1 到 21:9)")
    print("  ✅ 思考过程可视化")
    print("=" * 50)
    print("请确保已设置以下环境变量:")
    print("  - GOOGLE_APPLICATION_CREDENTIALS (服务账号密钥路径)")
    print("  - GOOGLE_CLOUD_PROJECT (GCP 项目 ID)")
    print("  - GOOGLE_CLOUD_LOCATION (可选，默认 global)")
    print("=" * 50)
    
    app.run(host="0.0.0.0", port=5000, debug=True)
