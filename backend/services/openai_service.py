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
        is_new_style = style in (
            "Minimalist", "Timeline", "Checklist", "Step-by-Step", "Comparison Table",
            "Flowchart", "Statistics", "Roadmap", "Problem-Solution"
        )

        if is_new_style:
            # ── Shared system persona ──────────────────────────────────────────
            system_content = (
                "You are an expert LinkedIn content strategist and infographic designer. "
                "You create structured, visually-oriented content for professional audiences. "
                "Every output must be specific, concise, and immediately useful. "
                "BANNED: vague phrases, filler words, generic advice. "
                "Return ONLY strictly valid JSON — no markdown, no code fences, no extra text."
            )

            if style == "Minimalist":
                prompt = f"""Create a minimalist LinkedIn infographic about "{title}".
Tone: {tone} | Audience: {audience or 'professionals'}

Return ONLY valid JSON:
{{
    "hook": "One sharp insight sentence (max 12 words, no emojis)",
    "body": "3 ultra-concise observations. Each line starts with '—'. Max 8 words per line. No emojis.",
    "cta": "One specific debate-starting question (max 15 words)",
    "hashtags": ["#Tag1","#Tag2","#Tag3","#Tag4","#Tag5"],
    "style": "{style}",
    "infographic": {{
        "type": "minimalist",
        "title": "{title}",
        "tagline": "One-line value proposition (6-9 words)",
        "items": [
            {{"phrase": "Short power phrase (3-5 words)", "icon": "🎯"}},
            {{"phrase": "Short power phrase (3-5 words)", "icon": "💡"}},
            {{"phrase": "Short power phrase (3-5 words)", "icon": "⚡"}},
            {{"phrase": "Short power phrase (3-5 words)", "icon": "🔑"}},
            {{"phrase": "Short power phrase (3-5 words)", "icon": "📌"}},
            {{"phrase": "Short power phrase (3-5 words)", "icon": "🚀"}}
        ],
        "stat": "One powerful stat or key number related to {title} (real, known fact)",
        "footer_note": "One crisp takeaway sentence (max 10 words)"
    }}
}}

Make all phrases specific to "{title}" — NOT generic. Items should be distinct concepts/principles."""

            elif style == "Timeline":
                prompt = f"""Create a timeline LinkedIn infographic about "{title}".
Tone: {tone} | Audience: {audience or 'professionals'}

Return ONLY valid JSON:
{{
    "hook": "One powerful sentence about {title} progression (max 15 words, no emojis)",
    "body": "4 key milestones or phases described in 1 sentence each. Use '→' prefix. No emojis.",
    "cta": "One forward-looking question about {title}",
    "hashtags": ["#Tag1","#Tag2","#Tag3","#Tag4","#Tag5","#Tag6"],
    "style": "{style}",
    "infographic": {{
        "type": "timeline",
        "title": "{title}",
        "subtitle": "The Evolution of {title} (or relevant framing)",
        "steps": [
            {{"label": "Phase/Step title (2-4 words)", "desc": "What happened or what to do (8-12 words)", "marker": "Year or Step 1", "color": "#E53E3E", "icon": "🌱"}},
            {{"label": "Phase/Step title (2-4 words)", "desc": "What happened or what to do (8-12 words)", "marker": "Year or Step 2", "color": "#DD6B20", "icon": "🔨"}},
            {{"label": "Phase/Step title (2-4 words)", "desc": "What happened or what to do (8-12 words)", "marker": "Year or Step 3", "color": "#D69E2E", "icon": "⚙️"}},
            {{"label": "Phase/Step title (2-4 words)", "desc": "What happened or what to do (8-12 words)", "marker": "Year or Step 4", "color": "#38A169", "icon": "🚀"}},
            {{"label": "Phase/Step title (2-4 words)", "desc": "What happened or what to do (8-12 words)", "marker": "Year or Step 5", "color": "#3182CE", "icon": "🏆"}}
        ]
    }}
}}

Make steps tell a coherent STORY or PROGRESSION for "{title}". Labels and markers must be specific."""

            elif style == "Checklist":
                prompt = f"""Create a checklist LinkedIn infographic about "{title}".
Tone: {tone} | Audience: {audience or 'professionals'}

Return ONLY valid JSON:
{{
    "hook": "One action-oriented sentence about {title} (max 15 words, no emojis)",
    "body": "5 must-do action items. Each starts with a verb. Use '✓' prefix. No emojis.",
    "cta": "One question asking which item they struggle with most",
    "hashtags": ["#Tag1","#Tag2","#Tag3","#Tag4","#Tag5","#Tag6"],
    "style": "{style}",
    "infographic": {{
        "type": "checklist",
        "title": "{title}",
        "subtitle": "The Essential {title} Checklist",
        "sections": [
            {{
                "title": "Section name (2-3 words)",
                "color": "#E53E3E",
                "icon": "🎯",
                "items": ["Action verb + specific task (5-8 words)", "Action verb + specific task (5-8 words)", "Action verb + specific task (5-8 words)"]
            }},
            {{
                "title": "Section name (2-3 words)",
                "color": "#3182CE",
                "icon": "🔧",
                "items": ["Action verb + specific task (5-8 words)", "Action verb + specific task (5-8 words)", "Action verb + specific task (5-8 words)"]
            }},
            {{
                "title": "Section name (2-3 words)",
                "color": "#38A169",
                "icon": "📊",
                "items": ["Action verb + specific task (5-8 words)", "Action verb + specific task (5-8 words)"]
            }},
            {{
                "title": "Section name (2-3 words)",
                "color": "#D69E2E",
                "icon": "💡",
                "items": ["Action verb + specific task (5-8 words)", "Action verb + specific task (5-8 words)"]
            }}
        ]
    }}
}}

All items must be actionable, specific to "{title}", and immediately useful. Use real tasks, not vague advice."""

            elif style == "Step-by-Step":
                prompt = f"""Create a step-by-step process LinkedIn infographic about "{title}".
Tone: {tone} | Audience: {audience or 'professionals'}

Return ONLY valid JSON:
{{
    "hook": "One sentence about why this process matters for {title} (max 15 words, no emojis)",
    "body": "6 sequential steps described in 1 crisp sentence each. Use numbered format. No emojis.",
    "cta": "One question about which step people find hardest",
    "hashtags": ["#Tag1","#Tag2","#Tag3","#Tag4","#Tag5","#Tag6"],
    "style": "{style}",
    "infographic": {{
        "type": "steps",
        "title": "{title}",
        "subtitle": "How to master {title} step by step",
        "steps": [
            {{"num": 1, "title": "Step name (2-4 words)", "detail": "Exactly what to do (8-12 words)", "tip": "Pro tip (6-9 words)", "icon": "🎯", "color": "#E53E3E"}},
            {{"num": 2, "title": "Step name (2-4 words)", "detail": "Exactly what to do (8-12 words)", "tip": "Pro tip (6-9 words)", "icon": "📋", "color": "#DD6B20"}},
            {{"num": 3, "title": "Step name (2-4 words)", "detail": "Exactly what to do (8-12 words)", "tip": "Pro tip (6-9 words)", "icon": "⚙️", "color": "#D69E2E"}},
            {{"num": 4, "title": "Step name (2-4 words)", "detail": "Exactly what to do (8-12 words)", "tip": "Pro tip (6-9 words)", "icon": "🔨", "color": "#38A169"}},
            {{"num": 5, "title": "Step name (2-4 words)", "detail": "Exactly what to do (8-12 words)", "tip": "Pro tip (6-9 words)", "icon": "🚀", "color": "#3182CE"}},
            {{"num": 6, "title": "Step name (2-4 words)", "detail": "Exactly what to do (8-12 words)", "tip": "Pro tip (6-9 words)", "icon": "🏆", "color": "#7B2D8B"}}
        ]
    }}
}}

Steps MUST be sequential — each step builds on the previous. Specific to "{title}", not generic."""

            elif style == "Comparison Table":
                prompt = f"""Create a comparison table LinkedIn infographic about "{title}".
Tone: {tone} | Audience: {audience or 'professionals'}

Return ONLY valid JSON:
{{
    "hook": "One contrasting statement that sets up the comparison for {title} (max 15 words)",
    "body": "3 key differences explained. Each starts with a comparison word. Use '◆' prefix. No emojis.",
    "cta": "One question about which option they prefer and why",
    "hashtags": ["#Tag1","#Tag2","#Tag3","#Tag4","#Tag5","#Tag6"],
    "style": "{style}",
    "infographic": {{
        "type": "comparison",
        "title": "{title}",
        "subtitle": "Side-by-side comparison for {title}",
        "columns": ["Option A Name (2-4 words)", "Option B Name (2-4 words)", "Option C Name (2-4 words)"],
        "column_colors": ["#E53E3E", "#3182CE", "#38A169"],
        "column_icons": ["⚡", "🔧", "🎯"],
        "rows": [
            {{"criterion": "Criterion (2-3 words)", "values": ["Specific value A (3-6 words)", "Specific value B (3-6 words)", "Specific value C (3-6 words)"]}},
            {{"criterion": "Criterion (2-3 words)", "values": ["Specific value A (3-6 words)", "Specific value B (3-6 words)", "Specific value C (3-6 words)"]}},
            {{"criterion": "Criterion (2-3 words)", "values": ["Specific value A (3-6 words)", "Specific value B (3-6 words)", "Specific value C (3-6 words)"]}},
            {{"criterion": "Criterion (2-3 words)", "values": ["Specific value A (3-6 words)", "Specific value B (3-6 words)", "Specific value C (3-6 words)"]}},
            {{"criterion": "Criterion (2-3 words)", "values": ["Specific value A (3-6 words)", "Specific value B (3-6 words)", "Specific value C (3-6 words)"]}},
            {{"criterion": "Criterion (2-3 words)", "values": ["Specific value A (3-6 words)", "Specific value B (3-6 words)", "Specific value C (3-6 words)"]}}
        ],
        "verdict": "One-line recommendation (8-12 words)"
    }}
}}

Make all comparisons meaningful and specific to "{title}". Columns should be real distinct alternatives."""

            elif style == "Flowchart":
                prompt = f"""Create a flowchart LinkedIn infographic about "{title}".
Tone: {tone} | Audience: {audience or 'professionals'}

Return ONLY valid JSON:
{{
    "hook": "One sentence about why the process matters for {title} (max 15 words, no emojis)",
    "body": "5 flow steps described sequentially. Use '→' prefix. No emojis.",
    "cta": "One question about which step is hardest for most people",
    "hashtags": ["#Tag1","#Tag2","#Tag3","#Tag4","#Tag5","#Tag6"],
    "style": "{style}",
    "infographic": {{
        "type": "flowchart",
        "title": "{title}",
        "subtitle": "Step-by-step decision flow for {title}",
        "nodes": [
            {{"id": 1, "label": "Start (2-3 words)", "detail": "Entry point description (5-8 words)", "shape": "start", "color": "#6366f1"}},
            {{"id": 2, "label": "Process step (2-4 words)", "detail": "Specific action to take (6-9 words)", "shape": "process", "color": "#3b82f6"}},
            {{"id": 3, "label": "Key Decision (2-4 words)", "detail": "What you are deciding here (5-8 words)", "shape": "decision", "color": "#f59e0b", "yes_label": "Yes — proceed", "no_label": "No — rethink"}},
            {{"id": 4, "label": "Path A step (2-4 words)", "detail": "What happens on YES path (6-9 words)", "shape": "process", "color": "#10b981"}},
            {{"id": 5, "label": "Path B step (2-4 words)", "detail": "What happens on NO path (6-9 words)", "shape": "process", "color": "#f97316"}},
            {{"id": 6, "label": "End result (2-3 words)", "detail": "Final outcome achieved (5-8 words)", "shape": "end", "color": "#6366f1"}}
        ],
        "connections": [
            {{"from": 1, "to": 2}},
            {{"from": 2, "to": 3}},
            {{"from": 3, "to": 4, "label": "Yes"}},
            {{"from": 3, "to": 5, "label": "No"}},
            {{"from": 4, "to": 6}},
            {{"from": 5, "to": 6}}
        ]
    }}
}}

Make all labels and details specific to "{title}". Nodes must tell a coherent logical story."""

            elif style == "Statistics":
                prompt = f"""Create a statistics/data LinkedIn infographic about "{title}".
Tone: {tone} | Audience: {audience or 'professionals'}

Return ONLY valid JSON:
{{
    "hook": "One bold data-driven statement about {title} (max 15 words, no emojis)",
    "body": "4 key statistics explained. Each starts with the number. Use '◆' prefix. No emojis.",
    "cta": "One question challenging people to reflect on these numbers",
    "hashtags": ["#Tag1","#Tag2","#Tag3","#Tag4","#Tag5","#Tag6"],
    "style": "{style}",
    "infographic": {{
        "type": "statistics",
        "title": "{title}",
        "subtitle": "The numbers that matter",
        "hero_stat": {{
            "value": "KEY NUMBER (e.g. 73% or 2.4x or $12K)",
            "label": "What this number represents (5-8 words)",
            "source": "Source type (e.g. Industry Report 2024)"
        }},
        "stats": [
            {{"value": "XX%", "label": "Short label (3-5 words)", "detail": "Context for this stat (7-10 words)", "icon": "📈", "color": "#6366f1", "bar_pct": 75}},
            {{"value": "XXx", "label": "Short label (3-5 words)", "detail": "Context for this stat (7-10 words)", "icon": "⚡", "color": "#10b981", "bar_pct": 60}},
            {{"value": "$XXK", "label": "Short label (3-5 words)", "detail": "Context for this stat (7-10 words)", "icon": "💰", "color": "#f59e0b", "bar_pct": 48}},
            {{"value": "XXx", "label": "Short label (3-5 words)", "detail": "Context for this stat (7-10 words)", "icon": "🎯", "color": "#ef4444", "bar_pct": 85}}
        ],
        "insight": "One sharp concluding insight from all the data (10-14 words)",
        "source_line": "Data from [source type] research & industry analysis"
    }}
}}

CRITICAL: bar_pct must be an INTEGER between 10-95. Use real known statistics or clearly approximate ones.
Make all stats specific and compelling for a {audience or 'professional'} audience interested in {title}."""

            elif style == "Roadmap":
                prompt = f"""Create a roadmap LinkedIn infographic about "{title}".
Tone: {tone} | Audience: {audience or 'professionals'}

Return ONLY valid JSON:
{{
    "hook": "One ambitious sentence about the journey to mastering {title} (max 15 words)",
    "body": "4 key phases described. Each starts with the phase name. Use numbered format. No emojis.",
    "cta": "One question about which phase people are currently in",
    "hashtags": ["#Tag1","#Tag2","#Tag3","#Tag4","#Tag5","#Tag6"],
    "style": "{style}",
    "infographic": {{
        "type": "roadmap",
        "title": "{title}",
        "subtitle": "Your path to mastering {title}",
        "phases": [
            {{
                "phase_num": 1,
                "phase_name": "Phase name (2-3 words)",
                "duration": "Week 1–2",
                "color": "#6366f1",
                "bg_color": "#eef2ff",
                "milestones": ["Specific milestone (4-7 words)", "Specific milestone (4-7 words)", "Specific milestone (4-7 words)"],
                "outcome": "What you achieve at end of this phase (6-9 words)"
            }},
            {{
                "phase_num": 2,
                "phase_name": "Phase name (2-3 words)",
                "duration": "Week 3–4",
                "color": "#3b82f6",
                "bg_color": "#eff6ff",
                "milestones": ["Specific milestone (4-7 words)", "Specific milestone (4-7 words)", "Specific milestone (4-7 words)"],
                "outcome": "What you achieve at end of this phase (6-9 words)"
            }},
            {{
                "phase_num": 3,
                "phase_name": "Phase name (2-3 words)",
                "duration": "Month 2",
                "color": "#10b981",
                "bg_color": "#ecfdf5",
                "milestones": ["Specific milestone (4-7 words)", "Specific milestone (4-7 words)", "Specific milestone (4-7 words)"],
                "outcome": "What you achieve at end of this phase (6-9 words)"
            }},
            {{
                "phase_num": 4,
                "phase_name": "Phase name (2-3 words)",
                "duration": "Month 3+",
                "color": "#f59e0b",
                "bg_color": "#fffbeb",
                "milestones": ["Specific milestone (4-7 words)", "Specific milestone (4-7 words)", "Specific milestone (4-7 words)"],
                "outcome": "What you achieve at end of this phase (6-9 words)"
            }}
        ],
        "end_goal": "The ultimate outcome of completing all 4 phases (8-12 words)"
    }}
}}

Make milestones concrete and action-oriented, specific to "{title}". Durations should be realistic."""

            elif style == "Problem-Solution":
                prompt = f"""Create a problem-solution LinkedIn infographic about "{title}".
Tone: {tone} | Audience: {audience or 'professionals'}

Return ONLY valid JSON:
{{
    "hook": "One sentence naming the core problem with {title} that most people face (max 15 words)",
    "body": "4 problem-solution pairs. Format: 'PROBLEM: ... → SOLUTION: ...' per line. Use '◆' prefix.",
    "cta": "One question asking which problem resonates most with them",
    "hashtags": ["#Tag1","#Tag2","#Tag3","#Tag4","#Tag5","#Tag6"],
    "style": "{style}",
    "infographic": {{
        "type": "problem_solution",
        "title": "{title}",
        "subtitle": "From pain points to breakthroughs",
        "pairs": [
            {{
                "problem": "Specific problem (6-10 words — something real people actually face)",
                "solution": "Specific solution (6-10 words — actionable fix)",
                "problem_icon": "😤",
                "solution_icon": "✅",
                "impact": "Measurable result of applying this (5-8 words)"
            }},
            {{
                "problem": "Specific problem (6-10 words)",
                "solution": "Specific solution (6-10 words)",
                "problem_icon": "⚠️",
                "solution_icon": "🎯",
                "impact": "Measurable result (5-8 words)"
            }},
            {{
                "problem": "Specific problem (6-10 words)",
                "solution": "Specific solution (6-10 words)",
                "problem_icon": "😰",
                "solution_icon": "💡",
                "impact": "Measurable result (5-8 words)"
            }},
            {{
                "problem": "Specific problem (6-10 words)",
                "solution": "Specific solution (6-10 words)",
                "problem_icon": "🚫",
                "solution_icon": "🚀",
                "impact": "Measurable result (5-8 words)"
            }}
        ],
        "cta_banner": "One motivating call-to-action statement (8-12 words)"
    }}
}}

Make all problems real pain points that {audience or 'professionals'} actually experience with {title}.
Make solutions immediately actionable. Impact must be specific and believable."""

            # chosen_bullet fallback for new styles (not used in emoji stripping but referenced later)
            chosen_bullet = "arrow"

        elif is_handwritten:
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
                "You are a senior LinkedIn ghostwriter for Fortune 500 executives, VCs, and industry analysts. "
                "You write thought leadership posts that get shared in boardrooms, not just liked on feeds. "
                "CRITICAL RULES — break any of these and the post is rejected: "
                "1. ZERO emojis anywhere in hook, body, or CTA. "
                "2. ZERO fabricated statistics. Never write a percentage, number, or study unless it is a well-known "
                "   published fact (e.g. 'Python is the #1 language on Stack Overflow 2023'). "
                "   If you don't know a real stat, use observation-based language instead: "
                "   'Most teams...', 'The fastest engineers...', 'In every project I've seen...'. "
                "3. ZERO corporate filler: no 'game-changer', 'leverage', 'synergy', 'excited to share', "
                "   'in today's world', 'it's important to note', 'unique solutions', 'transformative'. "
                "4. Write like a smart human — direct, opinionated, slightly contrarian. "
                "5. Each point must be a genuine insight, observation, or mechanism — not a dressed-up platitude. "
                "Return ONLY strictly valid JSON — no markdown, no code fences, no extra text. "
                "Generate EXACTLY 5 tiers AND EXACTLY 10 categories. "
                "Tiers: each has use_cases, what_needs, key_risks, insight — all items 5-8 words max. "
                "Categories 1-6: 4 nodes each. Category 7: 4 nodes. Categories 8-10: 2 nodes each. "
                "Node sublabels: 5-7 words. Category labels: 2-3 words max. Use vivid distinct hex colors."
            )
            prompt = f"""Write a professional LinkedIn post about: "{title}"
Tone: {tone} | Audience: {audience or 'professionals'}
Angle: {chosen_angle}

HOOK RULES:
- One bold sentence that earns the reader's attention immediately
- Can be: a contrarian claim, a hard truth, a confession, a counter-narrative
- NEVER a question. NEVER "Exploring..." or generic openings.
- NEVER a made-up stat. Use real known facts or observation-based statements.
- Good: "Nobody talks about why most {title} implementations quietly fail six months in."
- Good: "I spent three years building with {title} before I understood what it was actually for."
- Good: "The best {title} practitioners I know share one habit that most tutorials never mention."

BODY RULES:
- Exactly 7 points using this exact format: {bullet_format}
- NO emojis. NO fabricated numbers or fake percentages.
- Each point = a real insight, mechanism, or observation about {title}
- Use named concepts, known tools, real trade-offs, or genuine lessons
- Write from a place of earned expertise, not AI-generated statistics
- Bad: "It reduces bugs by 45%, verified across 50+ projects." ← FABRICATED, REJECTED
- Bad: "Utilising NLP capabilities improves readability by 65%." ← FABRICATED, REJECTED
- Good: "Most teams adopt {title} for the obvious use case and miss the one that saves the most time."
- Good: "The failure mode nobody documents: {title} works perfectly in staging, breaks in production."
- Good: "Senior engineers use {title} differently than juniors — the gap is in how they handle edge cases."

CTA: One sharp, specific question that sparks real debate among people who work with {title}.

Return ONLY valid JSON:
{{
    "hook": "One powerful sentence about {title}. No emojis. No fake stats. Max 20 words.",
    "body": "7 expert observations about {title} using format: {bullet_format}. No emojis. No fake percentages.",
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
        if not is_handwritten and not is_new_style:
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
