import os
import json
import uuid
import re
from openai import OpenAI

# Directory to save generated PNG images (served as static files)
IMAGES_DIR = os.path.join(os.path.dirname(__file__), '..', 'static', 'images')
os.makedirs(IMAGES_DIR, exist_ok=True)

# Initialize OpenAI client only if key is present
client = None
if os.getenv("OPENAI_API_KEY"):
    client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


def generate_infographic_image(title: str, content_data: dict, style: str = "Whiteboard") -> str | None:
    """
    Generate an infographic image.
    Primary: Pillow-based renderer (guaranteed layout, all sections visible).
    Fallback: DALL-E (if Pillow fails for any reason).
    """
    # ── Primary: Pillow renderer ──────────────────────────────────────────────
    try:
        from services.infographic_renderer import render_infographic
        path = render_infographic(title, content_data, style)
        if path:
            print(f"[Infographic] Pillow render OK → {path}")
            return path
    except Exception as e:
        print(f"[Infographic] Pillow render failed, falling back to DALL-E: {e}")

    # ── Fallback: DALL-E ──────────────────────────────────────────────────────
    if not client:
        return None

    categories  = content_data.get("infographic", {}).get("categories", [])
    subtitle    = content_data.get("infographic", {}).get("subtitle", "")

    sections = []
    for i, cat in enumerate(categories[:10], 1):
        label     = cat.get("label", "")
        icon      = cat.get("icon", "")
        nodes     = cat.get("nodes", [])[:6]
        node_text = "  |  ".join([n.get("label", "") for n in nodes])
        sections.append(f"  {i}. {icon} {label.upper()}: {node_text}")
    sections_text = "\n".join(sections)

    image_prompt = f"""Create a HIGH-RESOLUTION tall vertical NOTEBOOK-STYLE infographic.
STYLE: Handwritten ink on lined paper, chapter-book aesthetic, compact layout.
BACKGROUND: Cream/off-white lined paper with faint blue grid.
All {len(categories)} sections MUST fit on ONE page — use compact spacing.

TOPIC: "{title}"
SUBTITLE: "{subtitle}"

SECTIONS (include ALL of them):
{sections_text}

RULES: All text readable. Numbered sections. All sections visible. Portrait format."""

    try:
        import base64
        response = client.images.generate(
            model="gpt-image-1",
            prompt=image_prompt,
            size="1024x1536",
            quality="high",
            n=1,
        )
        b64_data = response.data[0].b64_json
        if b64_data:
            safe = re.sub(r'[^a-zA-Z0-9_-]', '_', title)[:40]
            filename = f"{safe}_{uuid.uuid4().hex[:8]}.png"
            filepath = os.path.join(IMAGES_DIR, filename)
            with open(filepath, 'wb') as f:
                f.write(base64.b64decode(b64_data))
            return f"/api/images/{filename}"
        return response.data[0].url
    except Exception as e:
        print(f"[DALL-E] Image generation error: {e}")
        return None


def generate_linkedin_post(title: str, tone: str, audience: str, style: str = "Whiteboard") -> dict | None:
    if not client:
        print("OpenAI API key missing.")
        return None
    try:
        is_handwritten = style == "Handwritten Notes"

        if is_handwritten:
            system_content = (
                "You are a sharp, experienced professional who takes handwritten notes while learning. "
                "Your LinkedIn posts feel like someone's personal notebook — raw, honest, and genuinely insightful. "
                "No corporate fluff. No emoji overload. Just clear, flowing thoughts written like ink on paper. "
                "Return ONLY strictly valid JSON — no markdown, no code fences, no extra text. "
                "Generate EXACTLY 10 categories with EXACTLY 5-6 nodes each (category 7 must have 6 nodes). "
                "Node sublabels must read like handwritten margin notes — conversational, specific, human (10-14 words). "
                "Category labels: 2-3 words maximum. Use warm, muted hex colors that feel like colored pens/markers. "
                "The output should feel like a well-studied notebook page anyone would want to photograph and share."
            )
            prompt = f"""Write a LinkedIn post about "{title}" that reads like personal handwritten notes — genuine, flowing, and insightful.
Tone: {tone} | Audience: {audience or 'professionals and curious learners'}

The post should feel like someone actually sat down, studied this topic, and jotted down what they learned.
No excessive emojis. Use "—" dashes, short punchy lines, and a conversational rhythm. Like ink on paper.

Return ONLY valid JSON (no markdown, no code fences):
{{
    "hook": "A single honest, curious, or surprising opening line (max 18 words) — sounds like a real thought, not an ad",
    "body": "7-8 lines that read like handwritten notes. Use '—' or simple line breaks. Mix short observations with one surprising fact or number. No emoji per line — use 1-2 total max. Sound like a real person thinking out loud.",
    "cta": "A genuine, low-pressure question that invites readers to share their own notes or experience",
    "hashtags": ["#Tag1","#Tag2","#Tag3","#Tag4","#Tag5","#Tag6"],
    "style": "{style}",
    "infographic": {{
        "title": "Short punchy title (3-5 words max, specific to topic)",
        "subtitle": "Subtitle as a curious question someone would write at the top of their notes",
        "categories": [
            {{
                "id": 1,
                "label": "2-3 word name",
                "color": "#c05621",
                "icon": "relevant emoji",
                "nodes": [
                    {{"label": "Specific term (2-4 words)", "sublabel": "Written like a margin note — specific and real (10-14 words)"}},
                    {{"label": "Specific term (2-4 words)", "sublabel": "Written like a margin note — specific and real (10-14 words)"}},
                    {{"label": "Specific term (2-4 words)", "sublabel": "Written like a margin note — specific and real (10-14 words)"}},
                    {{"label": "Specific term (2-4 words)", "sublabel": "Written like a margin note — specific and real (10-14 words)"}},
                    {{"label": "Specific term (2-4 words)", "sublabel": "Written like a margin note — specific and real (10-14 words)"}}
                ]
            }}
        ]
    }}
}}

GENERATE EXACTLY 10 CATEGORIES in this precise order:
━━━ HUB DIAGRAM SPOKES (categories 1-6) ━━━
1. Foundations — core definitions and origins
2. Key Components — main building blocks
3. How It Works — the mechanism/process
4. Core Benefits — top value propositions
5. Real Applications — use cases and industries
6. Tools & Stack — software, frameworks, tech

━━━ BOTTOM-LEFT PANEL (category 7) ━━━
7. Types & Variants — ALL major types/variations of "{title}" — MUST have exactly 6 nodes, each node label is a specific type name (3-5 words), sublabel explains it in 10-12 words

━━━ BOTTOM-RIGHT ROWS (categories 8-10) ━━━
8. Best Practices — top proven techniques (exactly 3 nodes)
9. Common Pitfalls — biggest mistakes to avoid (exactly 3 nodes)
10. Future Trends — what's emerging now (exactly 3 nodes)

COLOR RULES: use WARM, MUTED tones that feel like colored ink pens or highlighters on paper:
Category 1: #c05621 (burnt orange), 2: #744210 (brown), 3: #2c7a7b (teal ink),
4: #276749 (forest green), 5: #6b46c1 (purple ink), 6: #2b6cb0 (blue ink),
7: #97266d (deep pink), 8: #e53e3e (red pen), 9: #1a365d (navy), 10: #553c9a (indigo)

QUALITY RULES:
- Node labels: specific domain terms (NOT generic like "Overview" or "Introduction")
- Node sublabels: conversational, precise — written like someone's real margin notes
- Make every section feel like a page from a well-studied notebook on "{title}"
"""
        else:
            system_content = (
                "You are the world's best LinkedIn content strategist and infographic architect. "
                "You create viral educational content and comprehensive visual study guides. "
                "Return ONLY strictly valid JSON — no markdown, no code fences, no extra text. "
                "Generate EXACTLY 10 categories with EXACTLY 5-6 nodes each (category 7 must have 6 nodes). "
                "Node sublabels must be specific, accurate, educational (10-14 words with real details). "
                "Category labels: 2-3 words maximum. Use vivid distinct hex colors for each category. "
                "The output must be a complete, expert-level learning resource about the topic."
            )
            prompt = f"""You are the world's #1 LinkedIn content strategist and infographic architect. Create a VIRAL, deeply educational LinkedIn post about: "{title}"
Tone: {tone} | Audience: {audience or 'professionals and ambitious learners'}

Return ONLY valid JSON (no markdown, no code fences):
{{
    "hook": "One electrifying sentence that stops scrolling (max 18 words, shocking stat or bold claim)",
    "body": "8 specific insights, each line starts with a unique emoji. Include real numbers/percentages. Make each insight immediately actionable and surprising.",
    "cta": "High-engagement question that makes readers comment their opinion or experience",
    "hashtags": ["#Tag1","#Tag2","#Tag3","#Tag4","#Tag5","#Tag6","#Tag7","#Tag8"],
    "style": "{style}",
    "infographic": {{
        "title": "Short punchy title (3-5 words max, specific to topic)",
        "subtitle": "Subtitle as a compelling how/what/why question about the topic",
        "categories": [
            {{
                "id": 1,
                "label": "2-3 word name",
                "color": "#e53e3e",
                "icon": "relevant emoji",
                "nodes": [
                    {{"label": "Specific term (2-4 words)", "sublabel": "Precise explanation with detail (10-14 words)"}},
                    {{"label": "Specific term (2-4 words)", "sublabel": "Precise explanation with detail (10-14 words)"}},
                    {{"label": "Specific term (2-4 words)", "sublabel": "Precise explanation with detail (10-14 words)"}},
                    {{"label": "Specific term (2-4 words)", "sublabel": "Precise explanation with detail (10-14 words)"}},
                    {{"label": "Specific term (2-4 words)", "sublabel": "Precise explanation with detail (10-14 words)"}}
                ]
            }}
        ]
    }}
}}

GENERATE EXACTLY 10 CATEGORIES in this precise order (each serves a specific layout role):
━━━ HUB DIAGRAM SPOKES (categories 1-6) ━━━
1. Foundations — core definitions and origins
2. Key Components — main building blocks
3. How It Works — the mechanism/process
4. Core Benefits — top value propositions
5. Real Applications — use cases and industries
6. Tools & Stack — software, frameworks, tech

━━━ BOTTOM-LEFT PANEL (category 7) ━━━
7. Types & Variants — ALL major types/variations of "{title}" — MUST have exactly 6 nodes, each node label is a specific type name (3-5 words), sublabel explains it in 10-12 words

━━━ BOTTOM-RIGHT ROWS (categories 8-10) ━━━
8. Best Practices — top proven techniques (exactly 3 nodes)
9. Common Pitfalls — biggest mistakes to avoid (exactly 3 nodes)
10. Future Trends — what's emerging in 2024-2025 (exactly 3 nodes)

COLOR RULES: use VIVID distinct hex colors — each category gets a DIFFERENT bright color:
Category 1: #e53e3e (red), 2: #dd6b20 (orange), 3: #2b6cb0 (blue), 4: #276749 (green),
5: #6b46c1 (purple), 6: #c05621 (dark orange), 7: #2c7a7b (teal), 8: #97266d (pink),
9: #744210 (brown), 10: #1a365d (navy)

QUALITY RULES:
- Node labels: specific domain terms (NOT generic words like "Overview" or "Introduction")
- Node sublabels: precise, educational, include numbers/stats where possible
- Make the infographic a complete standalone learning resource on "{title}"
"""

        completion = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_content},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"},
            max_tokens=4000,   # 10 categories × 5-6 nodes with sublabels needs ~3000-3500 tokens
            temperature=0.7,
            top_p=0.9,
        )

        finish_reason = completion.choices[0].finish_reason
        if finish_reason == "length":
            print(f"[OpenAI] Response truncated (finish_reason=length). Increase max_tokens further.")
        content = json.loads(completion.choices[0].message.content)

        # Generate Pillow image in background thread — don't block the API response
        import threading
        def _render_bg():
            try:
                url = generate_infographic_image(title, content, style)
                if url:
                    content["infographic_image_url"] = url
            except Exception as e:
                print(f"[Infographic] bg render failed: {e}")
        threading.Thread(target=_render_bg, daemon=True).start()

        return content
    except Exception as e:
        print(f"Error generating content: {e}")
        return None
