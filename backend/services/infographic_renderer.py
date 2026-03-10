"""
Pillow-based infographic renderer.
Generates a structured, fully-visible PNG directly from the JSON content data.
No DALL-E dependency — guaranteed layout, all sections on one page.
"""
import os
import uuid
import textwrap
from PIL import Image, ImageDraw, ImageFont

IMAGES_DIR = os.path.join(os.path.dirname(__file__), '..', 'static', 'images')
os.makedirs(IMAGES_DIR, exist_ok=True)

# ── Section color palette (cycles if more than 10 sections) ──────────────────
SECTION_COLORS = [
    "#e74c4c",  # red
    "#e67e22",  # orange
    "#2980b9",  # blue
    "#8e44ad",  # purple
    "#27ae60",  # green
    "#16a085",  # teal
    "#c0392b",  # dark red
    "#d35400",  # dark orange
    "#1abc9c",  # mint
    "#2c3e50",  # charcoal blue
]

# ── Font loader — works on both Windows and Ubuntu ────────────────────────────
def _load_font(size: int, bold: bool = False) -> ImageFont.ImageFont:
    """Try several font paths; fall back to PIL default."""
    candidates = []
    if bold:
        candidates = [
            "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
            "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
            "C:/Windows/Fonts/arialbd.ttf",
            "C:/Windows/Fonts/calibrib.ttf",
            "C:/Windows/Fonts/segoeui.ttf",
            "/System/Library/Fonts/Helvetica.ttc",
        ]
    else:
        candidates = [
            "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
            "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
            "C:/Windows/Fonts/arial.ttf",
            "C:/Windows/Fonts/calibri.ttf",
            "C:/Windows/Fonts/segoeui.ttf",
            "/System/Library/Fonts/Helvetica.ttc",
        ]
    for path in candidates:
        if os.path.exists(path):
            try:
                return ImageFont.truetype(path, size)
            except Exception:
                continue
    return ImageFont.load_default()


def _wrap(text: str, font: ImageFont.ImageFont, max_width: int, draw: ImageDraw.ImageDraw) -> list[str]:
    """Word-wrap text to fit max_width pixels."""
    words = text.split()
    lines, current = [], ""
    for word in words:
        test = (current + " " + word).strip()
        bbox = draw.textbbox((0, 0), test, font=font)
        if bbox[2] <= max_width:
            current = test
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines or [""]


def render_infographic(title: str, content_data: dict, style: str = "Whiteboard") -> str | None:
    """
    Render a structured infographic PNG from JSON content data.
    Returns the server path /api/images/<filename> or None on error.
    """
    try:
        infographic = content_data.get("infographic", {})
        categories  = infographic.get("categories", [])
        subtitle    = infographic.get("subtitle", "")
        inf_title   = infographic.get("title", title)

        if not categories:
            return None

        # ── Canvas geometry ───────────────────────────────────────────────────
        W          = 800
        PAD        = 28          # horizontal outer padding
        INNER_PAD  = 20          # padding inside section blocks

        # Choose theme based on style
        if style == "Handwritten Notes":
            BG       = "#fdf9f0"    # cream paper
            HDR_BG   = "#2c3e50"
            TEXT_HDR = "#ffffff"
            CARD_BG  = "#ffffff"
            CARD_BORDER = True
            FONT_COLOR = "#1a1a2e"
            SUB_COLOR  = "#555555"
            TAG_BG     = "#e8f4fd"
            TAG_FG     = "#2980b9"
        elif style == "Corporate Modern":
            BG       = "#f0f4f8"
            HDR_BG   = "#1e3a5f"
            TEXT_HDR = "#ffffff"
            CARD_BG  = "#ffffff"
            CARD_BORDER = False
            FONT_COLOR = "#1e3a5f"
            SUB_COLOR  = "#4a6fa5"
            TAG_BG     = "#e3f2fd"
            TAG_FG     = "#1565c0"
        elif style == "Executive Guide":
            BG       = "#0d1117"
            HDR_BG   = "#161b22"
            TEXT_HDR = "#ffffff"
            CARD_BG  = "#161b22"
            CARD_BORDER = False
            FONT_COLOR = "#e6edf3"
            SUB_COLOR  = "#8b949e"
            TAG_BG     = "#21262d"
            TAG_FG     = "#58a6ff"
        else:  # Whiteboard / default
            BG       = "#ffffff"
            HDR_BG   = "#1a1a2e"
            TEXT_HDR = "#ffffff"
            CARD_BG  = "#f8f9fa"
            CARD_BORDER = True
            FONT_COLOR = "#1a1a2e"
            SUB_COLOR  = "#555555"
            TAG_BG     = "#e8f5e9"
            TAG_FG     = "#2e7d32"

        # ── Fonts ─────────────────────────────────────────────────────────────
        f_title    = _load_font(30, bold=True)
        f_subtitle = _load_font(16, bold=False)
        f_sec_name = _load_font(18, bold=True)
        f_tag      = _load_font(13, bold=False)
        f_bullet   = _load_font(13, bold=False)
        f_badge    = _load_font(16, bold=True)

        # ── Pre-measure total height ──────────────────────────────────────────
        # Use a dummy image to measure text
        dummy   = Image.new("RGB", (W, 100))
        dd      = ImageDraw.Draw(dummy)
        content_width = W - PAD * 2

        HDR_H   = 110   # header block
        SEC_GAP = 10    # gap between sections
        BADGE_W = 44    # number badge width
        SECTION_PAD = INNER_PAD

        def measure_section(cat):
            nodes      = cat.get("nodes", [])[:6]
            h = SECTION_PAD * 2
            # Section name line
            h += 28
            # Tags row
            h += 26
            # Bullet points
            for node in nodes:
                label    = node.get("label", "")
                sublabel = node.get("sublabel", "")
                full     = f"• {label}: {sublabel}" if sublabel else f"• {label}"
                lines    = _wrap(full, f_bullet, content_width - BADGE_W - SECTION_PAD * 2, dd)
                h += len(lines) * 18 + 4
            h += 6  # bottom breathing room
            return h

        section_heights = [measure_section(c) for c in categories]
        total_h = (
            HDR_H
            + sum(section_heights)
            + SEC_GAP * len(categories)
            + 60    # footer
        )
        # Minimum height
        total_h = max(total_h, 600)

        # ── Create final image ────────────────────────────────────────────────
        img  = Image.new("RGB", (W, total_h), BG)
        draw = ImageDraw.Draw(img)

        # ── Header ────────────────────────────────────────────────────────────
        draw.rectangle([0, 0, W, HDR_H], fill=HDR_BG)
        # AI badge
        draw.rectangle([PAD, 12, PAD + 140, 32], fill="#e74c4c", outline=None)
        draw.text((PAD + 8, 13), "AI-GENERATED VISUAL", font=_load_font(11, bold=True), fill="#ffffff")
        # Main title — wrap if needed
        title_lines = _wrap(inf_title.upper(), f_title, W - PAD * 2 - 20, draw)
        ty = 38
        for tl in title_lines[:2]:
            bbox = draw.textbbox((0, 0), tl, font=f_title)
            tx = (W - (bbox[2] - bbox[0])) // 2
            draw.text((tx, ty), tl, font=f_title, fill=TEXT_HDR)
            ty += 34
        # Subtitle
        if subtitle:
            sub_lines = _wrap(subtitle, f_subtitle, W - PAD * 2, draw)
            sy = ty + 4
            for sl in sub_lines[:2]:
                bbox = draw.textbbox((0, 0), sl, font=f_subtitle)
                sx = (W - (bbox[2] - bbox[0])) // 2
                draw.text((sx, sy), sl, font=f_subtitle, fill="#a0aec0")
                sy += 20

        # ── Sections ─────────────────────────────────────────────────────────
        y = HDR_H + SEC_GAP

        for idx, cat in enumerate(categories):
            sec_h   = section_heights[idx]
            color   = SECTION_COLORS[idx % len(SECTION_COLORS)]
            nodes   = cat.get("nodes", [])[:6]
            label   = cat.get("label", f"Section {idx+1}")
            icon    = cat.get("icon", "")

            # Card background
            x0, y0, x1, y1 = PAD, y, W - PAD, y + sec_h
            draw.rectangle([x0, y0, x1, y1], fill=CARD_BG)
            if CARD_BORDER:
                draw.rectangle([x0, y0, x1, y1], outline="#e0e0e0", width=1)

            # Left color accent bar
            draw.rectangle([x0, y0, x0 + 6, y1], fill=color)

            # Number badge
            bx, by = x0 + 14, y0 + SECTION_PAD - 2
            draw.rectangle([bx, by, bx + BADGE_W, by + BADGE_W], fill=color)
            num_str = str(idx + 1)
            nb = draw.textbbox((0, 0), num_str, font=f_badge)
            nw, nh = nb[2] - nb[0], nb[3] - nb[1]
            draw.text((bx + (BADGE_W - nw) // 2, by + (BADGE_W - nh) // 2 - 2), num_str, font=f_badge, fill="#ffffff")

            # Section heading
            heading    = f"{icon}  {label.upper()}" if icon else label.upper()
            hx         = x0 + 6 + BADGE_W + 20
            hy         = y0 + SECTION_PAD + 2
            draw.text((hx, hy), heading, font=f_sec_name, fill=color)

            # Tags row (node labels as chips)
            tags      = [n.get("label", "") for n in nodes if n.get("label")]
            tag_text  = "  |  ".join(tags)
            tag_y     = hy + 26
            draw.text((hx, tag_y), tag_text, font=f_tag, fill=SUB_COLOR)

            # Bullet points (label + sublabel)
            bullet_x = x0 + 6 + SECTION_PAD + 8
            bullet_y = tag_y + 22
            for node in nodes:
                lbl  = node.get("label", "")
                sub  = node.get("sublabel", "")
                full = f"• {lbl}: {sub}" if sub else f"• {lbl}"
                lines = _wrap(full, f_bullet, W - PAD * 2 - SECTION_PAD * 2 - 14, draw)
                for li, line in enumerate(lines):
                    # Bold the label part on first line
                    draw.text((bullet_x, bullet_y), line, font=f_bullet, fill=FONT_COLOR)
                    bullet_y += 18
                bullet_y += 4

            y = y1 + SEC_GAP

        # ── Footer ────────────────────────────────────────────────────────────
        draw.rectangle([0, total_h - 48, W, total_h], fill=HDR_BG)
        footer_text = "makepost.pro  •  AI-Generated Infographic"
        fb = draw.textbbox((0, 0), footer_text, font=f_subtitle)
        fx = (W - (fb[2] - fb[0])) // 2
        draw.text((fx, total_h - 34), footer_text, font=f_subtitle, fill="#718096")

        # ── Save ──────────────────────────────────────────────────────────────
        safe = __import__("re").sub(r"[^a-zA-Z0-9_-]", "_", title)[:36]
        filename = f"{safe}_{uuid.uuid4().hex[:8]}.png"
        filepath = os.path.join(IMAGES_DIR, filename)
        img.save(filepath, "PNG", optimize=True)

        return f"/api/images/{filename}"

    except Exception as e:
        import traceback
        print(f"[Infographic renderer error]: {e}")
        traceback.print_exc()
        return None
