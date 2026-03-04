import os
import json
import base64
from openai import OpenAI

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

    # Build radial/section descriptions from categories for the prompt
    sections = []
    for cat in categories[:6]:
        label = cat.get("label", "")
        icon  = cat.get("icon", "")
        nodes = cat.get("nodes", [])[:4]
        node_text = " | ".join([n.get("label", "") for n in nodes])
        sections.append(f"  • {icon} {label}: {node_text}")
    sections_text = "\n".join(sections)

    # Style-specific prompt adjustments
    style_prompts = {
        'Whiteboard': f"""Create a HIGH-RESOLUTION hand-drawn WHITEBOARD MARKER sketch infographic.
• Style: real educational whiteboard photo.
• Background: Bright white clean whiteboard surface.
• ALL drawing done with thick black dry-erase marker strokes.
• Text: ALL UPPERCASE bold hand-lettered marker font.
• Layout: Top title, middle radial diagram, bottom columns.""",
        
        'Corporate Modern': f"""Create a HIGH-RESOLUTION clean, minimal CORPORATE DIGITAL infographic.
• Style: Modern vector illustration, flat design.
• Background: Very light grey or professional blue-white gradient.
• Typography: Bold sans-serif fonts, clean hierarchy.
• Icons: Digital icons, professional and geometric.
• Layout: Vertical stacked categories, clean borders, professional grid.""",

        'Executive Guide': f"""Create a HIGH-RESOLUTION visual EXECUTIVE GUIDE / STACKED CHART.
• Style: 3D-effect cylinders or stacked colorful layers.
• Background: Clean professional office-style background.
• Typography: Bold professional fonts.
• Color fills: Vibrant, solid premium colors (pink, orange, teal, blue).
• Layout: Vertical central stack with callout boxes on left and right for 'Use cases' and 'Key risks'.""",

        'Handwritten Notes': f"""Create a HIGH-RESOLUTION HANDWRITTEN notebook page.
• Style: Ink pen on lined grid paper.
• Background: Slightly off-white paper texture with blue grid lines.
• Typography: Neat cursive or printed handwriting (black or blue ink).
• Sketches: Hand-drawn diagrams, circled text, felt-tip highlighter accents.
• Layout: Chapter-title, numbered sections, hand-drawn boxes and underlines."""
    }

    selected_style_prompt = style_prompts.get(style, style_prompts['Whiteboard'])

    image_prompt = f"""{selected_style_prompt}

TOPIC: "{title}"
SUBTITLE: "{subtitle}"

══════════════════════════════════════════
DETAILED CONTENT TO INCLUDE:
══════════════════════════════════════════
• Main title: "{title.upper()}"
• 5-6 Key sections to visualize: 
{sections_text}

══════════════════════════════════════════
CRITICAL RULES:
══════════════════════════════════════════
• ALL text must be CLEARLY READABLE.
• Maintain consistent visual style throughout.
• High quality, high resolution, professional presentation for LinkedIn.
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
            return f"data:image/png;base64,{b64_data}"
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
        Create a professional LinkedIn post about '{title}'.
        Tone: {tone}
        Target Audience: {audience}

        Return a JSON object with EXACTLY this structure:
        {{
            "hook": "A single catchy opening sentence",
            "body": "Full body with 3-5 key points, each on a new line starting with an emoji",
            "cta": "A call to action sentence",
            "hashtags": ["#Tag1", "#Tag2", "#Tag3", "#Tag4", "#Tag5"],
            "infographic": {{
                "title": "Main title for the infographic (short, 3-6 words)",
                "subtitle": "A short tagline or description for the infographic",
                "categories": [
                    {{
                        "id": 1,
                        "label": "Category Name",
                        "color": "#hex_color",
                        "icon": "emoji",
                        "nodes": [
                            {{"label": "Key point or fact", "sublabel": "brief explanation in 5-8 words"}},
                            {{"label": "Key point or fact", "sublabel": "brief explanation in 5-8 words"}},
                            {{"label": "Key point or fact", "sublabel": "brief explanation in 5-8 words"}}
                        ]
                    }}
                ]
            }}
        }}

        Create 4-5 categories to cover the most important aspects of '{title}'.
        Each category should have 3-4 nodes.
        Use varied, vibrant hex colors for each category.
        Use relevant emojis for icons.
        The infographic data should be educational, accurate, and informative.
        """

        completion = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are a professional LinkedIn content strategist and infographic designer. Always return valid JSON."},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"}
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
