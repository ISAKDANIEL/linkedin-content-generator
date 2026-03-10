"""
Pillow-based infographic renderer.
Fixed LinkedIn portrait canvas: exactly 1080 × 1350 px (4:5 ratio).
All sections auto-scaled to fit within the fixed canvas.
"""
from __future__ import annotations
import os
import re
import uuid
from PIL import Image, ImageDraw, ImageFont

IMAGES_DIR = os.path.join(os.path.dirname(__file__), '..', 'static', 'images')
os.makedirs(IMAGES_DIR, exist_ok=True)

# ── Fixed LinkedIn canvas ──────────────────────────────────────────────────────
W, H = 1080, 1350   # exact 4:5 portrait

# ── Section color palette ──────────────────────────────────────────────────────
SECTION_COLORS = [
    "#E53E3E", "#DD6B20", "#2B6CB0", "#6B46C1", "#276749",
    "#0987A0", "#C53030", "#C05621", "#2C7A7B", "#1A365D",
]


def _font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    paths = (
        [
            "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
            "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
            "C:/Windows/Fonts/arialbd.ttf",
            "C:/Windows/Fonts/calibrib.ttf",
        ]
        if bold else
        [
            "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
            "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
            "C:/Windows/Fonts/arial.ttf",
            "C:/Windows/Fonts/calibri.ttf",
        ]
    )
    for p in paths:
        if os.path.exists(p):
            try:
                return ImageFont.truetype(p, size)
            except Exception:
                pass
    return ImageFont.load_default()


def _wrap(text: str, font, max_w: int, draw: ImageDraw.ImageDraw) -> list[str]:
    words = text.split()
    lines, cur = [], ""
    for w in words:
        test = (cur + " " + w).strip()
        if draw.textbbox((0, 0), test, font=font)[2] <= max_w:
            cur = test
        else:
            if cur:
                lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines or [""]


def _hex(color: str) -> tuple[int, int, int]:
    c = color.lstrip("#")
    return int(c[0:2], 16), int(c[2:4], 16), int(c[4:6], 16)


def render_infographic(title: str, content_data: dict, style: str = "Whiteboard") -> str | None:
    try:
        inf        = content_data.get("infographic", {})
        categories = inf.get("categories", [])
        subtitle   = inf.get("subtitle", "")
        inf_title  = inf.get("title", title)

        if not categories:
            return None

        n = min(len(categories), 10)

        # ── Theme definitions ─────────────────────────────────────────────────
        # Each theme has meaningfully different BG, header, card, and accent colors
        THEMES = {
            "Handwritten Notes": dict(
                BG="#fef9ee",
                HDR_BG="#2d2d2d",
                HDR_TEXT="#f5f0dc",
                HDR_ACCENT="#D69E2E",
                CARD_BG="#fffef5",
                CARD_BORDER="#d4c5a9",
                BODY_TEXT="#3d3520",
                FOOTER_BG="#2d2d2d",
                FOOTER_ACCENT="#D69E2E",
                FOOTER_TEXT="#a09070",
                SUBTITLE_COLOR="#c8b87a",
                AI_BADGE_COLOR="#D69E2E",
            ),
            "Corporate Modern": dict(
                BG="#dbeafe",
                HDR_BG="#1e3a5f",
                HDR_TEXT="#ffffff",
                HDR_ACCENT="#3b82f6",
                CARD_BG="#ffffff",
                CARD_BORDER="#93c5fd",
                BODY_TEXT="#1e3a5f",
                FOOTER_BG="#1e3a5f",
                FOOTER_ACCENT="#3b82f6",
                FOOTER_TEXT="#7ab0d4",
                SUBTITLE_COLOR="#93c5fd",
                AI_BADGE_COLOR="#3b82f6",
            ),
            "Executive Guide": dict(
                BG="#0d1117",
                HDR_BG="#0d1117",
                HDR_TEXT="#f0f6fc",
                HDR_ACCENT="#58a6ff",
                CARD_BG="#161b22",
                CARD_BORDER="#30363d",
                BODY_TEXT="#c9d1d9",
                FOOTER_BG="#010409",
                FOOTER_ACCENT="#58a6ff",
                FOOTER_TEXT="#8b949e",
                SUBTITLE_COLOR="#8b949e",
                AI_BADGE_COLOR="#58a6ff",
            ),
        }

        # Default / Whiteboard theme — clean white + red accents
        T = THEMES.get(style, dict(
            BG="#f0f4ff",
            HDR_BG="#1a1a2e",
            HDR_TEXT="#ffffff",
            HDR_ACCENT="#E53E3E",
            CARD_BG="#ffffff",
            CARD_BORDER="#e2e8f0",
            BODY_TEXT="#2d3748",
            FOOTER_BG="#1a1a2e",
            FOOTER_ACCENT="#E53E3E",
            FOOTER_TEXT="#718096",
            SUBTITLE_COLOR="#a0aec0",
            AI_BADGE_COLOR="#E53E3E",
        ))

        # ── Fixed layout zones ────────────────────────────────────────────────
        HDR_H  = 185        # fixed header height
        FOOT_H = 54         # fixed footer height
        PAD    = 30         # outer horizontal padding
        GAP    = 7          # gap between cards

        available_h = H - HDR_H - FOOT_H - GAP * (n + 1)
        SEC_H = available_h // n   # exact height per section card

        # ── Font sizes scale with section height ──────────────────────────────
        # Baseline: 115px section → standard font sizes
        scale = SEC_H / 115
        scale = max(0.60, min(1.20, scale))

        f_ai_badge = _font(max(11, int(12 * scale)), bold=True)
        f_title_lg = _font(max(26, int(38 * scale)), bold=True)
        f_subtitle = _font(max(14, int(18 * scale)))
        f_badge    = _font(max(13, int(19 * scale)), bold=True)
        f_heading  = _font(max(13, int(17 * scale)), bold=True)
        f_bullet   = _font(max(10, int(13 * scale)))
        f_brand    = _font(max(12, int(15 * scale)))

        BADGE_SZ = max(28, int(40 * scale))   # number badge square size
        BAR_W    = 6                            # left color bar width
        INNER    = max(8, int(12 * scale))      # inner card padding

        # ── Canvas ────────────────────────────────────────────────────────────
        img  = Image.new("RGB", (W, H), T["BG"])
        draw = ImageDraw.Draw(img)

        # ── Header ───────────────────────────────────────────────────────────
        draw.rectangle([0, 0, W, HDR_H], fill=T["HDR_BG"])
        # Top accent stripe
        draw.rectangle([0, 0, W, 5], fill=T["HDR_ACCENT"])

        # AI badge pill — centered
        ai_text = "✦  AI-GENERATED VISUAL"
        ai_bb   = draw.textbbox((0, 0), ai_text, font=f_ai_badge)
        ai_w    = ai_bb[2] - ai_bb[0] + 24
        ai_x    = (W - ai_w) // 2
        ai_top  = 18
        draw.rounded_rectangle(
            [ai_x, ai_top, ai_x + ai_w, ai_top + 22],
            radius=11, fill=T["AI_BADGE_COLOR"]
        )
        draw.text((ai_x + 12, ai_top + 4), ai_text, font=f_ai_badge, fill="#ffffff")

        # Measure title/subtitle on a dummy canvas for centering
        dummy = Image.new("RGB", (W, 10))
        dd    = ImageDraw.Draw(dummy)
        title_lines = _wrap(inf_title.upper(), f_title_lg, W - PAD * 2 - 20, dd)[:2]
        sub_lines   = _wrap(subtitle, f_subtitle, W - PAD * 2 - 20, dd)[:1] if subtitle else []

        title_block_h = len(title_lines) * 46 + (len(sub_lines) * 24 if sub_lines else 0)
        ty = ai_top + 26 + (HDR_H - ai_top - 26 - title_block_h) // 2

        for line in title_lines:
            bb = draw.textbbox((0, 0), line, font=f_title_lg)
            tx = (W - (bb[2] - bb[0])) // 2
            draw.text((tx, ty), line, font=f_title_lg, fill=T["HDR_TEXT"])
            ty += 46

        for line in sub_lines:
            bb = draw.textbbox((0, 0), line, font=f_subtitle)
            sx = (W - (bb[2] - bb[0])) // 2
            draw.text((sx, ty + 4), line, font=f_subtitle, fill=T["SUBTITLE_COLOR"])

        # Bottom accent line under header
        draw.rectangle([PAD, HDR_H - 4, W - PAD, HDR_H - 1], fill=T["HDR_ACCENT"])

        # ── Section cards ─────────────────────────────────────────────────────
        # Calculate max bullets we can fit per card
        LINE_H    = max(13, int(14 * scale))
        heading_h = BADGE_SZ + INNER          # badge row height
        bullet_zone = SEC_H - INNER * 2 - heading_h - 6
        MAX_LINES = max(2, bullet_zone // (LINE_H + 3))

        text_max_w = W - PAD * 2 - BAR_W - INNER - 4

        y = HDR_H + GAP
        for i, cat in enumerate(categories[:n]):
            color = SECTION_COLORS[i % len(SECTION_COLORS)]
            nodes = cat.get("nodes", [])[:6]
            label = cat.get("label", f"Section {i+1}")
            icon  = cat.get("icon", "")
            x0, y0 = PAD, y
            x1, y1 = W - PAD, y + SEC_H

            # Card background + border
            draw.rounded_rectangle([x0, y0, x1, y1], radius=8, fill=T["CARD_BG"])
            draw.rounded_rectangle([x0, y0, x1, y1], radius=8,
                                   outline=T["CARD_BORDER"], width=1)
            # Left color bar
            draw.rounded_rectangle([x0, y0, x0 + BAR_W, y1], radius=4, fill=color)

            # Number badge
            bx = x0 + BAR_W + INNER
            by = y0 + INNER
            draw.rounded_rectangle(
                [bx, by, bx + BADGE_SZ, by + BADGE_SZ],
                radius=6, fill=color
            )
            num = str(i + 1)
            nb  = draw.textbbox((0, 0), num, font=f_badge)
            nw, nh = nb[2] - nb[0], nb[3] - nb[1]
            draw.text(
                (bx + (BADGE_SZ - nw) // 2, by + (BADGE_SZ - nh) // 2),
                num, font=f_badge, fill="#ffffff"
            )

            # Section heading (next to badge)
            hx = bx + BADGE_SZ + 10
            hy = by + (BADGE_SZ - int(17 * scale)) // 2
            heading = f"{icon} {label.upper()}" if icon else label.upper()
            draw.text((hx, hy), heading, font=f_heading, fill=color)

            # Bullet points
            bul_x = x0 + BAR_W + INNER + 2
            bul_y = y0 + INNER + BADGE_SZ + 6
            lines_drawn = 0

            for node in nodes:
                if lines_drawn >= MAX_LINES:
                    break
                lbl = node.get("label", "")
                sub = node.get("sublabel", "")
                full = f"• {lbl}: {sub}" if sub else f"• {lbl}"
                wrapped = _wrap(full, f_bullet, text_max_w, draw)
                for ln in wrapped[:2]:
                    if lines_drawn >= MAX_LINES or bul_y + LINE_H > y1 - 4:
                        break
                    draw.text((bul_x, bul_y), ln, font=f_bullet, fill=T["BODY_TEXT"])
                    bul_y += LINE_H + 3
                    lines_drawn += 1

            y = y1 + GAP

        # ── Footer ────────────────────────────────────────────────────────────
        fy = H - FOOT_H
        draw.rectangle([0, fy, W, H], fill=T["FOOTER_BG"])
        draw.rectangle([0, fy, W, fy + 3], fill=T["FOOTER_ACCENT"])

        brand = "makepost.pro  •  AI-Generated LinkedIn Infographic"
        bb    = draw.textbbox((0, 0), brand, font=f_brand)
        bx    = (W - (bb[2] - bb[0])) // 2
        draw.text(
            (bx, fy + (FOOT_H - (bb[3] - bb[1])) // 2),
            brand, font=f_brand, fill=T["FOOTER_TEXT"]
        )

        # ── Save ──────────────────────────────────────────────────────────────
        safe     = re.sub(r"[^a-zA-Z0-9_-]", "_", title)[:36]
        filename = f"{safe}_{uuid.uuid4().hex[:8]}.png"
        img.save(os.path.join(IMAGES_DIR, filename), "PNG", optimize=True)
        return f"/api/images/{filename}"

    except Exception as exc:
        import traceback
        print(f"[Renderer] Error: {exc}")
        traceback.print_exc()
        return None
