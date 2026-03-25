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
                "You are a top LinkedIn ghostwriter who has written viral posts for Fortune 500 CEOs. "
                "Your posts get 50K+ impressions. You NEVER write generic content. "
                "Every line must be SPECIFIC, SURPRISING, or contain a real insight/number/fact. "
                "BANNED phrases: 'unique solutions', 'enhances collaboration', 'vital', 'rewarding', 'potential', "
                "'let's discuss', 'game-changer', 'leverage', 'excited to share'. "
                "Return ONLY strictly valid JSON — no markdown, no code fences, no extra text. "
                "Generate EXACTLY 5 tiers (top=most advanced, bottom=most basic) AND EXACTLY 10 categories. "
                "Tiers: each has use_cases, what_needs, key_risks, insight — all items 5-8 words max. "
                "Categories 1-6: 4 nodes each. Category 7: 4 nodes. Categories 8-10: 2 nodes each. "
                "Node sublabels: 5-7 words. Category labels: 2-3 words max. Use warm muted hex colors."
            )
            prompt = f"""Write a LinkedIn post about "{title}" in a personal, honest, handwritten-notes style.
Tone: {tone} | Audience: {audience or 'professionals'}

HOOK RULES: Start with a counterintuitive truth, a confession, or a specific number. NOT a question. NOT "Exploring...".
BODY RULES: Each line = one real insight, lesson, or observation. Specific details > vague statements.
  BAD: "— It enhances collaboration and efficiency."
  GOOD: "— I wasted 3 months before realizing X is the bottleneck."
  BAD: "— Understanding its core components is vital."
  GOOD: "— Most people skip step 2. That's why they fail."

Return ONLY valid JSON:
{{
    "hook": "One powerful sentence — counterintuitive truth or specific stat (max 15 words)",
    "body": "6 lines starting with '—'. Each line = specific insight, real observation, or number. 1-2 emojis max.",
    "cta": "One specific question that makes readers want to reply (not generic 'share your thoughts')",
    "hashtags": ["#Tag1","#Tag2","#Tag3","#Tag4","#Tag5","#Tag6"],
    "style": "{style}",
    "infographic": {{
        "subtitle": "Curious question about {title}",
        "tiers": [
            {{
                "id": 1,
                "name": "Most Advanced Tier (2-4 words)",
                "tagline": "Action phrase (5-7 words)",
                "color": "#E53E3E",
                "use_cases": ["Specific use case (5-7 words)", "Specific use case (5-7 words)"],
                "what_needs": ["Key requirement (4-6 words)", "Key requirement (4-6 words)"],
                "key_risks": ["Specific risk (5-7 words)", "Specific risk (5-7 words)"],
                "insight": "Pro tip or key insight (8-12 words)"
            }},
            {{"id": 2, "name": "...", "tagline": "...", "color": "#DD6B20", "use_cases": ["...","..."], "what_needs": ["...","..."], "key_risks": ["...","..."], "insight": "..."}},
            {{"id": 3, "name": "...", "tagline": "...", "color": "#D69E2E", "use_cases": ["...","..."], "what_needs": ["...","..."], "key_risks": ["...","..."], "insight": "..."}},
            {{"id": 4, "name": "...", "tagline": "...", "color": "#38A169", "use_cases": ["...","..."], "what_needs": ["...","..."], "key_risks": ["...","..."], "insight": "..."}},
            {{"id": 5, "name": "Foundation Tier (2-4 words)", "tagline": "...", "color": "#3182CE", "use_cases": ["...","..."], "what_needs": ["...","..."], "key_risks": ["...","..."], "insight": "..."}}
        ],
        "categories": [
            {{
                "id": 1, "label": "2-3 word name", "color": "#c05621", "icon": "🧱",
                "nodes": [
                    {{"label": "Term (2-4 words)", "sublabel": "Margin note (5-7 words)"}},
                    {{"label": "Term (2-4 words)", "sublabel": "Margin note (5-7 words)"}},
                    {{"label": "Term (2-4 words)", "sublabel": "Margin note (5-7 words)"}},
                    {{"label": "Term (2-4 words)", "sublabel": "Margin note (5-7 words)"}}
                ]
            }}
        ]
    }}
}}

TIERS: arrange from most advanced/complex (tier 1) to most basic/foundational (tier 5).
Make tier names and taglines specific to "{title}" — not generic.

EXACTLY 10 CATEGORIES (use a relevant single emoji for each "icon" field — actual emoji character, NOT the word "emoji"):
1. Foundations (4 nodes) — #c05621 — icon: 🧱
2. Key Components (4 nodes) — #744210 — icon: ⚙️
3. How It Works (4 nodes) — #2c7a7b — icon: 🔄
4. Core Benefits (4 nodes) — #276749 — icon: ✅
5. Real Applications (4 nodes) — #6b46c1 — icon: 🚀
6. Tools & Stack (4 nodes) — #2b6cb0 — icon: 🛠️
7. Types & Variants (4 nodes, specific type names) — #97266d — icon: 📊
8. Best Practices (2 nodes) — #e53e3e — icon: 💡
9. Common Pitfalls (2 nodes) — #1a365d — icon: ⚠️
10. Future Trends (2 nodes) — #553c9a — icon: 🔮
"""
        else:
            import random
            angles = [
                "Share a counterintuitive truth most people get wrong about this topic.",
                "Tell a personal failure story and what you learned from it.",
                "Give a step-by-step breakdown nobody else explains this clearly.",
                "Share 7 hard-won lessons that took years to learn.",
                "Compare the wrong way vs the right way most people approach this.",
                "Reveal an insider secret that experts know but rarely share publicly.",
                "Start with a shocking industry statistic and unpack why it matters.",
            ]
            chosen_angle = random.choice(angles)

            bullet_styles = ["numbered", "arrow", "diamond", "letter", "dash"]
            chosen_bullet = random.choice(bullet_styles)
            bullet_format = {
                "numbered": "1. text\\n2. text\\n3. text (use numbers)",
                "arrow":    "→ text\\n→ text\\n→ text (use → arrow)",
                "diamond":  "◆ text\\n◆ text\\n◆ text (use ◆ diamond)",
                "letter":   "A. text\\nB. text\\nC. text (use letters A-G)",
                "dash":     "— text\\n— text\\n— text (use — em dash)",
            }[chosen_bullet]

            system_content = (
                "You are a top LinkedIn ghostwriter who writes viral posts for C-suite executives and thought leaders. "
                "Your posts get 100K+ impressions. You write with authority, precision, and NO emojis. "
                "Style: clean, numbered bullet points (1. 2. 3. ...). Professional and direct. "
                "RULES: Real numbers, specific facts, contrarian takes. Zero vague statements. "
                "BANNED: emojis of any kind, 'unique solutions', 'game-changer', 'leverage', "
                "'excited to share', 'let's discuss', 'in today's world', 'it's important', 'vital'. "
                "Every bullet must contain a SPECIFIC insight — data point, mechanism, or lesson. "
                "Return ONLY strictly valid JSON — no markdown, no code fences, no extra text. "
                "Generate EXACTLY 5 tiers AND EXACTLY 10 categories. "
                "Tiers: each has use_cases, what_needs, key_risks, insight — all items 5-8 words max. "
                "Categories 1-6: 4 nodes each. Category 7: 4 nodes. Categories 8-10: 2 nodes each. "
                "Node sublabels: 5-7 words. Category labels: 2-3 words max. Use vivid distinct hex colors."
            )
            prompt = f"""Write a LinkedIn post about: "{title}"
Tone: {tone} | Audience: {audience or 'professionals'}
Angle for this post: {chosen_angle}

HOOK RULES:
- Must be a bold statement, a surprising stat, or a short personal confession
- NO questions as the hook. NO "Exploring..." or "Let's talk about..."
- Good example: "Most engineers spend 80% of their time on the 20% that doesn't matter."
- Good example: "I got this wrong for 4 years. Here's what changed everything:"

BODY RULES:
- Exactly 7 points using this format: {bullet_format}
- NO emojis anywhere. No mixing formats.
- Every point must directly mention "{title}" concepts, names, tools, or facts
- Each point must have a real number, statistic, or named mechanism
- Bad: "It improves your workflow significantly."
- Good: "Python's asyncio library handles 10,000+ concurrent connections vs Java's 1,000 thread limit."

CTA: One sharp question that only someone who knows "{title}" would ask. Not generic.

Return ONLY valid JSON:
{{
    "hook": "Bold opening about {title} — stat, confession, or provocative claim. No emojis. Max 18 words.",
    "body": "7 points about {title} using format: {bullet_format}. No emojis. Topic-specific facts only.",
    "bullet_style": "{chosen_bullet}",
    "cta": "Specific debate-starting or experience-sharing question (not 'what are your thoughts?')",
    "hashtags": ["#Tag1","#Tag2","#Tag3","#Tag4","#Tag5","#Tag6","#Tag7","#Tag8"],
    "style": "{style}",
    "infographic": {{
        "subtitle": "Compelling how/what/why question about {title}",
        "tiers": [
            {{
                "id": 1,
                "name": "Most Advanced Tier (2-4 words)",
                "tagline": "Action phrase (5-7 words)",
                "color": "#E53E3E",
                "use_cases": ["Specific use case (5-7 words)", "Specific use case (5-7 words)"],
                "what_needs": ["Key requirement (4-6 words)", "Key requirement (4-6 words)"],
                "key_risks": ["Specific risk (5-7 words)", "Specific risk (5-7 words)"],
                "insight": "Pro tip or key insight (8-12 words)"
            }},
            {{"id": 2, "name": "...", "tagline": "...", "color": "#DD6B20", "use_cases": ["...","..."], "what_needs": ["...","..."], "key_risks": ["...","..."], "insight": "..."}},
            {{"id": 3, "name": "...", "tagline": "...", "color": "#D69E2E", "use_cases": ["...","..."], "what_needs": ["...","..."], "key_risks": ["...","..."], "insight": "..."}},
            {{"id": 4, "name": "...", "tagline": "...", "color": "#38A169", "use_cases": ["...","..."], "what_needs": ["...","..."], "key_risks": ["...","..."], "insight": "..."}},
            {{"id": 5, "name": "Foundation Tier (2-4 words)", "tagline": "...", "color": "#3182CE", "use_cases": ["...","..."], "what_needs": ["...","..."], "key_risks": ["...","..."], "insight": "..."}}
        ],
        "categories": [
            {{
                "id": 1, "label": "2-3 word name", "color": "#e53e3e", "icon": "🧱",
                "nodes": [
                    {{"label": "Term (2-4 words)", "sublabel": "Precise detail (5-7 words)"}},
                    {{"label": "Term (2-4 words)", "sublabel": "Precise detail (5-7 words)"}},
                    {{"label": "Term (2-4 words)", "sublabel": "Precise detail (5-7 words)"}},
                    {{"label": "Term (2-4 words)", "sublabel": "Precise detail (5-7 words)"}}
                ]
            }}
        ]
    }}
}}

TIERS: arrange from most advanced/complex (tier 1) to most basic/foundational (tier 5).
Make tier names and taglines specific to "{title}" — not generic.

EXACTLY 10 CATEGORIES (use a relevant single emoji for each "icon" field — actual emoji character, NOT the word "emoji"):
1. Foundations (4 nodes) — #e53e3e — icon: 🧱
2. Key Components (4 nodes) — #dd6b20 — icon: ⚙️
3. How It Works (4 nodes) — #2b6cb0 — icon: 🔄
4. Core Benefits (4 nodes) — #276749 — icon: ✅
5. Real Applications (4 nodes) — #6b46c1 — icon: 🚀
6. Tools & Stack (4 nodes) — #c05621 — icon: 🛠️
7. Types & Variants (4 nodes, specific type names) — #2c7a7b — icon: 📊
8. Best Practices (2 nodes) — #97266d — icon: 💡
9. Common Pitfalls (2 nodes) — #744210 — icon: ⚠️
10. Future Trends (2 nodes) — #1a365d — icon: 🔮
"""

        completion = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": system_content},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"},
            max_tokens=2800,
            temperature=0.8,
            top_p=0.95,
        )

        finish_reason = completion.choices[0].finish_reason
        if finish_reason == "length":
            print(f"[OpenAI] Response truncated (finish_reason=length). Increase max_tokens further.")
        content = json.loads(completion.choices[0].message.content)

        # ── Strip all emojis from hook, body, cta (guaranteed clean text) ────────
        if not is_handwritten:
            import re as _re
            _emoji_pattern = _re.compile(
                "[\U00010000-\U0010ffff"
                "\U0001F600-\U0001F64F"
                "\U0001F300-\U0001F5FF"
                "\U0001F680-\U0001F6FF"
                "\U0001F1E0-\U0001F1FF"
                "\U00002702-\U000027B0"
                "\U000024C2-\U0001F251"
                "]+", flags=_re.UNICODE
            )
            def _strip(text):
                if not isinstance(text, str): return text
                cleaned = _emoji_pattern.sub('', text).strip()
                # Clean up leading bullet artifacts left after emoji removal
                cleaned = _re.sub(r'^[\s\-–—•*]+', '', cleaned, flags=_re.MULTILINE)
                return cleaned.strip()

            # Re-format body lines with chosen bullet style
            if content.get('body'):
                lines = [l.strip() for l in content['body'].split('\n') if l.strip()]
                clean_lines = []
                letters = 'ABCDEFG'
                num = 1
                bs = chosen_bullet
                for line in lines:
                    clean = _strip(line)
                    if not clean:
                        continue
                    # Strip any existing prefix (number, letter, arrow, dash, diamond)
                    clean = _re.sub(r'^(\d+[\.\)]\s*|[A-G][\.\)]\s*|→\s*|◆\s*|—\s*|•\s*|\*\s*)', '', clean).strip()
                    if not clean:
                        continue
                    if bs == 'numbered':
                        clean_lines.append(f"{num}. {clean}")
                    elif bs == 'arrow':
                        clean_lines.append(f"→ {clean}")
                    elif bs == 'diamond':
                        clean_lines.append(f"◆ {clean}")
                    elif bs == 'letter':
                        clean_lines.append(f"{letters[min(num-1,6)]}. {clean}")
                    elif bs == 'dash':
                        clean_lines.append(f"— {clean}")
                    num += 1
                content['body'] = '\n'.join(clean_lines)
            content['bullet_style'] = chosen_bullet

            content['hook'] = _strip(content.get('hook', ''))
            content['cta']  = _strip(content.get('cta', ''))

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
