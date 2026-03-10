import os
import json
import base64
import uuid
import re
from openai import OpenAI

# Directory to save generated PNG images (served as static files)
IMAGES_DIR = os.path.join(os.path.dirname(__file__), '..', 'static', 'images')
os.makedirs(IMAGES_DIR, exist_ok=True)

# Initialize client only if key is present
client = None
if os.getenv("OPENAI_API_KEY"):
    client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


def generate_infographic_image(title, content_data, style='Whiteboard'):
    """Generate a DALL-E 3 infographic based on the selected style."""
    if not client:
        return None

    categories = content_data.get("infographic", {}).get("categories", [])
    subtitle   = content_data.get("infographic", {}).get("subtitle", "")

    # Build ALL sections — no cap, more = richer image
    sections = []
    for i, cat in enumerate(categories[:10], 1):
        label     = cat.get("label", "")
        icon      = cat.get("icon", "")
        nodes     = cat.get("nodes", [])[:6]
        node_text = "  |  ".join([n.get("label", "") for n in nodes])
        sublabels = "  •  ".join([n.get("sublabel", "") for n in nodes if n.get("sublabel")])
        sections.append(f"  {i}. {icon} {label.upper()}\n     Topics: {node_text}\n     Details: {sublabels}")
    sections_text = "\n\n".join(sections)

    # Style-specific prompt adjustments
    style_prompts = {
        'Whiteboard': f"""Create a HIGH-RESOLUTION hand-drawn WHITEBOARD MARKER sketch infographic on a tall vertical canvas.
STYLE: Real educational whiteboard photo aesthetic.
BACKGROUND: Bright white clean whiteboard surface with faint grid lines.
DRAWING: Thick black dry-erase marker strokes, hand-drawn boxes, arrows, and underlines.
TEXT: ALL CAPS bold hand-lettered marker font — every word must be sharp and legible.
LAYOUT: Title at top, then numbered vertical sections stacked top-to-bottom, each with icon + bold heading + 4-6 bullet sub-items. Fit ALL sections on one page by keeping text compact and tight. Add a thick border around the whole page.""",

        'Corporate Modern': f"""Create a HIGH-RESOLUTION clean minimal CORPORATE DIGITAL infographic on a tall vertical canvas.
STYLE: Modern vector illustration, flat design icons, strong grid system.
BACKGROUND: Light grey or white with subtle blue-white gradient.
TYPOGRAPHY: Bold sans-serif headers, smaller regular-weight body text, strong visual hierarchy.
LAYOUT: Top title + subtitle banner, then 8-10 vertical sections each with a colored left-accent bar, icon, bold heading, and 4-6 sub-items listed below. All sections must fit on ONE page. Use alternating background rows (white / very light grey) for readability.""",

        'Executive Guide': f"""Create a HIGH-RESOLUTION EXECUTIVE GUIDE visual on a tall vertical canvas.
STYLE: Premium business report with 3D-depth stacked card layers.
BACKGROUND: Clean white or dark navy professional background.
TYPOGRAPHY: Bold professional sans-serif fonts, color-coded headings.
COLOR FILLS: Each section card in a different vibrant premium color (pink, orange, teal, blue, purple, green, red, yellow).
LAYOUT: Main title at top, then 8-10 stacked horizontal section cards each showing: colored number badge, bold section name, and 4-6 bullet points. Callout stats or key facts on the right margin. All sections visible on one page.""",

        'Handwritten Notes': f"""Create a HIGH-RESOLUTION HANDWRITTEN NOTEBOOK PAGE infographic on a tall vertical A4-style canvas.
STYLE: Blue or black ink pen writing on lined grid/ruled notebook paper — like a student's detailed study notes.
BACKGROUND: Slightly off-white aged paper texture with light blue horizontal lines and faint vertical margin line on left.
TYPOGRAPHY: Neat cursive or printed handwriting — chapter title in stylish cursive at top, section headings in bold printed caps, sub-items in neat regular print.
DECORATIVE ELEMENTS: Hand-drawn small icons/sketches next to each section, circle bullet points, underlines on headings, felt-tip highlighter rectangles in yellow/pink on key terms, corner doodles.
LAYOUT:
  - "Chapter X" header at very top (cursive, centered)
  - Main title in bold ALL CAPS with highlighter background
  - Subtitle in italic cursive below title
  - Then ALL {len(categories)} numbered sections packed compactly top-to-bottom:
    * Each section: circled number + BOLD CAPS heading + small sketch icon
    * Under each heading: 4-6 sub-items in neat handwriting separated by | or on separate lines
  - Keep ALL sections on one single page — reduce line spacing if needed to fit everything
  - Bottom: small "Page X of 1" footer doodle"""
    }

    selected_style_prompt = style_prompts.get(style, style_prompts['Whiteboard'])

    image_prompt = f"""{selected_style_prompt}

TOPIC: "{title}"
SUBTITLE: "{subtitle}"

══════════════════════════════════════════════════════
CONTENT — INCLUDE ALL {len(categories)} SECTIONS BELOW:
══════════════════════════════════════════════════════
{sections_text}

══════════════════════════════════════════════════════
ABSOLUTE REQUIREMENTS:
══════════════════════════════════════════════════════
• ALL {len(categories)} sections must appear on the image — do NOT omit any section.
• Every section must show its heading AND at least 4 sub-items/topics.
• ALL text must be clearly readable — no blurry or cut-off text.
• Keep the visual style consistent from top to bottom.
• This is for LinkedIn — make it look professional, detailed, and visually impressive.
• Tall vertical layout (portrait orientation) to fit all content.
"""

    try:
        response = client.images.generate(
            model="gpt-image-1",
            prompt=image_prompt,
            size="1024x1536",
            quality="high",
            n=1,
        )
        b64_data = response.data[0].b64_json
        if b64_data:
            safe_title = re.sub(r'[^a-zA-Z0-9_-]', '_', title)[:40]
            filename = f"{safe_title}_{uuid.uuid4().hex[:8]}.png"
            filepath = os.path.join(IMAGES_DIR, filename)
            with open(filepath, 'wb') as f:
                f.write(base64.b64decode(b64_data))
            return f"/api/images/{filename}"
        return response.data[0].url
    except Exception as e:
        print(f"Image generation error: {e}")
        return None


def generate_linkedin_post(title, tone, audience, style='Whiteboard'):
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

INFOGRAPHIC RULES:
- Generate EXACTLY 8-10 categories that comprehensively cover "{title}" from beginner to advanced.
- Each category MUST have exactly 5-6 nodes (no fewer).
- Categories should progress logically (e.g., fundamentals → intermediate → advanced → applications → tools → best practices → real-world examples → future trends).
- Use varied vibrant hex colors for each category (no two the same).
- Use highly relevant, specific emojis as icons.
- Node labels: concise (2-5 words), specific technical/domain terms.
- Node sublabels: detailed, educational, accurate explanations (8-14 words each).
- The infographic must be a comprehensive standalone study guide on "{title}".
- Make it so detailed that someone could learn the complete topic just from the infographic.
"""

        completion = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a world-class LinkedIn content strategist and expert infographic designer. "
                        "You specialize in creating deeply informative, visually rich study guides and educational content. "
                        "Always return strictly valid JSON with no markdown, no code fences, no extra text. "
                        "Your infographics are famous for being comprehensive, accurate, and beautifully structured — "
                        "covering every important aspect of a topic with precise, actionable insights. "
                        "Always generate 8-10 categories with 5-6 nodes each."
                    )
                },
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"},
            max_tokens=4000,
        )

        content = json.loads(completion.choices[0].message.content)

        # Generate AI infographic image via DALL-E (style-based)
        try:
            image_url = generate_infographic_image(title, content, style)
            if image_url:
                content["infographic_image_url"] = image_url
        except Exception as img_err:
            print(f"DALL-E image generation failed (non-fatal): {img_err}")

        return content
    except Exception as e:
        print(f"Error generating content: {e}")
        return None
