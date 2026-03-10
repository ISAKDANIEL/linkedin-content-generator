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
        prompt = f"""
You are a world-class LinkedIn content strategist and expert infographic designer.

Create a comprehensive, deeply informative LinkedIn post about: "{title}"
Tone: {tone}
Target Audience: {audience}

Return a JSON object with EXACTLY this structure:
{{
    "hook": "A single powerful, curiosity-triggering opening sentence (max 20 words)",
    "body": "Full body with 7-9 key insights, each on a new line starting with a relevant emoji. Each point should be specific, actionable, and valuable. Include a surprising stat or fact where possible.",
    "cta": "A compelling call-to-action sentence that drives engagement (comment/share/save)",
    "hashtags": ["#Tag1", "#Tag2", "#Tag3", "#Tag4", "#Tag5", "#Tag6", "#Tag7", "#Tag8"],
    "infographic": {{
        "title": "Concise infographic title (4-7 words maximum)",
        "subtitle": "One-line tagline summarizing the full scope of the topic",
        "categories": [
            {{
                "id": 1,
                "label": "Section Name (2-4 words)",
                "color": "#hex_color",
                "icon": "single relevant emoji",
                "nodes": [
                    {{"label": "Key concept or term", "sublabel": "Precise explanation in 8-14 words"}},
                    {{"label": "Key concept or term", "sublabel": "Precise explanation in 8-14 words"}},
                    {{"label": "Key concept or term", "sublabel": "Precise explanation in 8-14 words"}},
                    {{"label": "Key concept or term", "sublabel": "Precise explanation in 8-14 words"}},
                    {{"label": "Key concept or term", "sublabel": "Precise explanation in 8-14 words"}},
                    {{"label": "Key concept or term", "sublabel": "Precise explanation in 8-14 words"}}
                ]
            }}
        ]
    }}
}}

INFOGRAPHIC RULES — CRITICAL:
- Generate EXACTLY 8-10 categories that comprehensively cover "{title}" from fundamentals to advanced.
- Category progression: Basics → Core Concepts → Intermediate → Advanced → Tools/Libraries → Best Practices → Real-World Applications → Common Mistakes → Performance & Optimization → Future Trends
- Each category MUST have EXACTLY 5-6 nodes (no fewer, no more).
- Use a different vibrant hex color for each category.
- Node labels: specific technical/domain terms (2-5 words, concise).
- Node sublabels: accurate, educational detail (8-14 words each, specific facts/techniques).
- The infographic must be a complete standalone study guide on "{title}".
"""

        completion = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a world-class LinkedIn content strategist and expert infographic designer. "
                        "You specialize in creating deeply informative, comprehensive study guides and educational content. "
                        "Always return strictly valid JSON with no markdown, no code fences, no extra text. "
                        "Always generate exactly 8-10 categories with exactly 5-6 nodes each. "
                        "Node sublabels must be specific, accurate, and educational (8-14 words). "
                        "Category labels must be concise (2-4 words). Colors must be varied vibrant hex codes."
                    )
                },
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"},
            max_tokens=4000,
        )

        content = json.loads(completion.choices[0].message.content)

        # Generate infographic image (Pillow renderer primary, DALL-E fallback)
        try:
            image_url = generate_infographic_image(title, content, style)
            if image_url:
                content["infographic_image_url"] = image_url
        except Exception as img_err:
            print(f"[Infographic] generation failed (non-fatal): {img_err}")

        return content
    except Exception as e:
        print(f"Error generating content: {e}")
        return None
