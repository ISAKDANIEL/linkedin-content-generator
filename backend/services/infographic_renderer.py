"""
Pillow-based infographic renderer.
Canvas: 1080 × 1350 px (LinkedIn 4:5 portrait).

Primary layout: "Executive's Guide" — dark header, colored tier rows,
Left (use cases + requirements) | Center (colored tier name) | Right (key risks + insight).
Falls back to legacy vertical-card layout when no tiers data is present.
"""
from __future__ import annotations
import os
import re
import uuid
from PIL import Image, ImageDraw, ImageFont

IMAGES_DIR = os.path.join(os.path.dirname(__file__), '..', 'static', 'images')
os.makedirs(IMAGES_DIR, exist_ok=True)

W, H = 1080, 1350

TIER_COLORS = ["#E53E3E", "#DD6B20", "#D69E2E", "#38A169", "#3182CE", "#6B46C1", "#2C7A7B"]
LEGACY_COLORS = [
    "#E53E3E", "#DD6B20", "#2B6CB0", "#6B46C1", "#276749",
    "#0987A0", "#C53030", "#C05621", "#2C7A7B", "#1A365D",
]


# ── Helpers ───────────────────────────────────────────────────────────────────

def _font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    paths = (
        [
            "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
            "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
            "C:/Windows/Fonts/arialbd.ttf",
            "C:/Windows/Fonts/calibrib.ttf",
        ] if bold else [
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


def _lighten(color: str, factor: float = 0.5) -> tuple[int, int, int]:
    r, g, b = _hex(color)
    return (int(r + (255 - r) * factor), int(g + (255 - g) * factor), int(b + (255 - b) * factor))


def _darken(color: str, factor: float = 0.25) -> tuple[int, int, int]:
    r, g, b = _hex(color)
    return (int(r * (1 - factor)), int(g * (1 - factor)), int(b * (1 - factor)))


def _save(img: Image.Image, title: str) -> str:
    safe = re.sub(r"[^a-zA-Z0-9_-]", "_", title)[:36]
    filename = f"{safe}_{uuid.uuid4().hex[:8]}.png"
    img.save(os.path.join(IMAGES_DIR, filename), "PNG", optimize=True)
    return f"/api/images/{filename}"


# ── Public entry point ────────────────────────────────────────────────────────

def render_infographic(title: str, content_data: dict, style: str = "Whiteboard") -> str | None:
    try:
        inf = content_data.get("infographic", {})
        tiers = inf.get("tiers", [])
        if tiers:
            return _render_tiered(title, content_data)
        return _render_legacy(title, content_data, style)
    except Exception as exc:
        import traceback
        print(f"[Renderer] Error: {exc}")
        traceback.print_exc()
        return None


# ── Executive's Guide tiered renderer ────────────────────────────────────────

def _render_tiered(title: str, content_data: dict) -> str | None:
    inf      = content_data.get("infographic", {})
    tiers    = inf.get("tiers", [])[:6]
    subtitle = inf.get("subtitle", "")
    n        = len(tiers)
    if not n:
        return None

    # ── Layout constants ──────────────────────────────────────────────────────
    HDR_H  = 175
    COL_H  = 40
    FOOT_H = 52
    PAD    = 18
    GAP    = 7

    available_h = H - HDR_H - COL_H - FOOT_H - GAP * (n + 1)
    TIER_H = available_h // n

    LEFT_W  = int(W * 0.335)
    CTR_W   = int(W * 0.265)
    RIGHT_W = W - PAD * 2 - LEFT_W - CTR_W - GAP * 2

    scale   = min(1.25, max(0.65, TIER_H / 140))

    # ── Fonts ─────────────────────────────────────────────────────────────────
    f_guide     = _font(max(22, int(30 * scale)), bold=True)
    f_topic     = _font(max(24, int(34 * scale)), bold=True)
    f_subtitle  = _font(max(11, int(13 * scale)))
    f_col_hdr   = _font(max(10, int(12 * scale)), bold=True)
    f_tier_name = _font(max(15, int(20 * scale)), bold=True)
    f_tier_tag  = _font(max(10, int(12 * scale)))
    f_sec_hd    = _font(max(9,  int(11 * scale)), bold=True)
    f_bullet    = _font(max(9,  int(11 * scale)))
    f_insight   = _font(max(8,  int(10 * scale)))
    f_brand     = _font(max(11, int(13 * scale)))

    LINE_H  = max(13, int(14 * scale))
    BPAD    = 10   # inner padding inside panels

    # ── Canvas ────────────────────────────────────────────────────────────────
    img  = Image.new("RGB", (W, H), "#f0f4f8")
    draw = ImageDraw.Draw(img)

    # ── Header ────────────────────────────────────────────────────────────────
    draw.rectangle([0, 0, W, HDR_H], fill="#0d1117")
    draw.rectangle([0, 0, W, 5], fill="#E53E3E")

    # "THE GUIDE TO" text
    gb  = draw.textbbox((0, 0), "THE GUIDE TO", font=f_guide)
    gx  = (W - (gb[2] - gb[0])) // 2
    gy  = 22
    draw.text((gx, gy), "THE GUIDE TO", font=f_guide, fill="#ffffff")

    # Topic pill (accent background)
    topic_upper = title.upper()
    tb  = draw.textbbox((0, 0), topic_upper, font=f_topic)
    tw  = tb[2] - tb[0]
    ph  = (tb[3] - tb[1]) + 18
    pw  = tw + 36
    px  = (W - pw) // 2
    py  = gy + (gb[3] - gb[1]) + 12
    draw.rounded_rectangle([px, py, px + pw, py + ph], radius=8, fill="#E53E3E")
    draw.text((px + 18, py + 9), topic_upper, font=f_topic, fill="#ffffff")

    # Subtitle
    if subtitle:
        sy = py + ph + 10
        sb = draw.textbbox((0, 0), subtitle, font=f_subtitle)
        sx = (W - (sb[2] - sb[0])) // 2
        draw.text((sx, sy), subtitle, font=f_subtitle, fill="#8b949e")

    # Header bottom accent line
    draw.rectangle([0, HDR_H - 3, W, HDR_H], fill="#E53E3E")

    # ── Column header row ─────────────────────────────────────────────────────
    cy0 = HDR_H
    draw.rectangle([0, cy0, W, cy0 + COL_H], fill="#1a1a2e")

    lch = "USE CASES & WHAT IT NEEDS"
    lb  = draw.textbbox((0, 0), lch, font=f_col_hdr)
    lx  = PAD + (LEFT_W - (lb[2] - lb[0])) // 2
    draw.text((lx, cy0 + (COL_H - (lb[3] - lb[1])) // 2), lch, font=f_col_hdr, fill="#a0aec0")

    rch = "KEY RISKS & INSIGHTS"
    rb  = draw.textbbox((0, 0), rch, font=f_col_hdr)
    rx  = PAD + LEFT_W + GAP + CTR_W + GAP + (RIGHT_W - (rb[2] - rb[0])) // 2
    draw.text((rx, cy0 + (COL_H - (rb[3] - rb[1])) // 2), rch, font=f_col_hdr, fill="#a0aec0")

    # ── Tier rows ─────────────────────────────────────────────────────────────
    y = HDR_H + COL_H + GAP

    for i, tier in enumerate(tiers):
        color      = tier.get("color") or TIER_COLORS[i % len(TIER_COLORS)]
        name       = tier.get("name", f"Tier {i+1}")
        tagline    = tier.get("tagline", "")
        use_cases  = tier.get("use_cases", [])[:2]
        what_needs = tier.get("what_needs", [])[:2]
        key_risks  = tier.get("key_risks", [])[:2]
        insight    = tier.get("insight", "")

        x_left  = PAD
        x_ctr   = PAD + LEFT_W + GAP
        x_right = x_ctr + CTR_W + GAP

        # ── Left panel ────────────────────────────────────────────────────────
        draw.rounded_rectangle([x_left, y, x_left + LEFT_W, y + TIER_H], radius=7, fill="#ffffff")
        draw.rounded_rectangle([x_left, y, x_left + LEFT_W, y + TIER_H], radius=7, outline="#e2e8f0", width=1)
        draw.rounded_rectangle([x_left, y, x_left + LEFT_W, y + 4],      radius=4, fill=color)

        ty = y + BPAD + 2
        mw = LEFT_W - BPAD * 2

        if use_cases:
            draw.text((x_left + BPAD, ty), "Use cases", font=f_sec_hd, fill=color)
            ty += LINE_H + 1
            for uc in use_cases:
                for ln in _wrap(f"\u2192 {uc}", f_bullet, mw, draw)[:2]:
                    if ty + LINE_H > y + TIER_H - 4:
                        break
                    draw.text((x_left + BPAD + 4, ty), ln, font=f_bullet, fill="#2d3748")
                    ty += LINE_H

        if what_needs and ty + LINE_H * 2 < y + TIER_H - 4:
            ty += 5
            draw.text((x_left + BPAD, ty), "What it needs", font=f_sec_hd, fill=color)
            ty += LINE_H + 1
            for wn in what_needs:
                for ln in _wrap(f"\u2192 {wn}", f_bullet, mw, draw)[:2]:
                    if ty + LINE_H > y + TIER_H - 4:
                        break
                    draw.text((x_left + BPAD + 4, ty), ln, font=f_bullet, fill="#2d3748")
                    ty += LINE_H

        # ── Center panel — cylinder effect ────────────────────────────────────
        # Main body
        draw.rounded_rectangle([x_ctr, y, x_ctr + CTR_W, y + TIER_H], radius=12, fill=color)

        # Top cap highlight (lighter ellipse)
        light = _lighten(color, 0.35)
        draw.ellipse([x_ctr + 6, y - 6, x_ctr + CTR_W - 6, y + 20], fill=light)

        # Bottom shadow (darker ellipse)
        dark = _darken(color, 0.25)
        draw.ellipse([x_ctr + 6, y + TIER_H - 20, x_ctr + CTR_W - 6, y + TIER_H + 6], fill=dark)

        # Tier name + tagline centered
        name_lines = _wrap(name, f_tier_name, CTR_W - 16, draw)[:2]
        tag_lines  = _wrap(tagline, f_tier_tag, CTR_W - 16, draw)[:2] if tagline else []
        name_h = len(name_lines) * (int(20 * scale) + 3)
        tag_h  = len(tag_lines)  * (int(12 * scale) + 3) + (6 if tag_lines else 0)
        block_h = name_h + tag_h
        ctr_ty  = y + (TIER_H - block_h) // 2

        for ln in name_lines:
            nb  = draw.textbbox((0, 0), ln, font=f_tier_name)
            nx  = x_ctr + (CTR_W - (nb[2] - nb[0])) // 2
            draw.text((nx, ctr_ty), ln, font=f_tier_name, fill="#ffffff")
            ctr_ty += int(20 * scale) + 3

        if tag_lines:
            ctr_ty += 4
            for ln in tag_lines:
                tb2 = draw.textbbox((0, 0), ln, font=f_tier_tag)
                tx2 = x_ctr + (CTR_W - (tb2[2] - tb2[0])) // 2
                draw.text((tx2, ctr_ty), ln, font=f_tier_tag, fill="#f0f0f0")
                ctr_ty += int(12 * scale) + 3

        # ── Right panel ───────────────────────────────────────────────────────
        draw.rounded_rectangle([x_right, y, x_right + RIGHT_W, y + TIER_H], radius=7, fill="#ffffff")
        draw.rounded_rectangle([x_right, y, x_right + RIGHT_W, y + TIER_H], radius=7, outline="#e2e8f0", width=1)
        draw.rounded_rectangle([x_right, y, x_right + RIGHT_W, y + 4],      radius=4, fill=color)

        ry  = y + BPAD + 2
        rmw = RIGHT_W - BPAD * 2

        if key_risks:
            draw.text((x_right + BPAD, ry), "Key risks", font=f_sec_hd, fill=color)
            ry += LINE_H + 1
            insight_reserve = LINE_H * 3 + 8 if insight else 4
            for kr in key_risks:
                for ln in _wrap(f"\u2192 {kr}", f_bullet, rmw, draw)[:2]:
                    if ry + LINE_H > y + TIER_H - insight_reserve:
                        break
                    draw.text((x_right + BPAD + 4, ry), ln, font=f_bullet, fill="#2d3748")
                    ry += LINE_H

        if insight and ry + LINE_H < y + TIER_H - 4:
            ry += 5
            for ln in _wrap(insight, f_insight, rmw, draw)[:3]:
                if ry + LINE_H > y + TIER_H - 4:
                    break
                draw.text((x_right + BPAD, ry), ln, font=f_insight, fill="#4a5568")
                ry += LINE_H

        y = y + TIER_H + GAP

    # ── Footer ────────────────────────────────────────────────────────────────
    fy = H - FOOT_H
    draw.rectangle([0, fy, W, H], fill="#0d1117")
    draw.rectangle([0, fy, W, fy + 3], fill="#E53E3E")
    brand = "makepost.pro  •  AI-Generated LinkedIn Infographic"
    bb    = draw.textbbox((0, 0), brand, font=f_brand)
    bx    = (W - (bb[2] - bb[0])) // 2
    draw.text((bx, fy + (FOOT_H - (bb[3] - bb[1])) // 2), brand, font=f_brand, fill="#718096")

    return _save(img, title)


# ── Legacy vertical-card renderer (fallback) ─────────────────────────────────

def _render_legacy(title: str, content_data: dict, style: str = "Whiteboard") -> str | None:
    inf        = content_data.get("infographic", {})
    categories = inf.get("categories", [])
    subtitle   = inf.get("subtitle", "")

    if not categories:
        return None

    n = min(len(categories), 10)

    THEMES = {
        "Handwritten Notes": dict(
            BG="#fef9ee", HDR_BG="#2d2d2d", HDR_TEXT="#f5f0dc",
            HDR_ACCENT="#D69E2E", CARD_BG="#fffef5", CARD_BORDER="#d4c5a9",
            BODY_TEXT="#3d3520", FOOTER_BG="#2d2d2d", FOOTER_ACCENT="#D69E2E",
            FOOTER_TEXT="#a09070", SUBTITLE_COLOR="#c8b87a", AI_BADGE_COLOR="#D69E2E",
        ),
        "Corporate Modern": dict(
            BG="#dbeafe", HDR_BG="#1e3a5f", HDR_TEXT="#ffffff",
            HDR_ACCENT="#3b82f6", CARD_BG="#ffffff", CARD_BORDER="#93c5fd",
            BODY_TEXT="#1e3a5f", FOOTER_BG="#1e3a5f", FOOTER_ACCENT="#3b82f6",
            FOOTER_TEXT="#7ab0d4", SUBTITLE_COLOR="#93c5fd", AI_BADGE_COLOR="#3b82f6",
        ),
        "Executive Guide": dict(
            BG="#0d1117", HDR_BG="#0d1117", HDR_TEXT="#f0f6fc",
            HDR_ACCENT="#58a6ff", CARD_BG="#161b22", CARD_BORDER="#30363d",
            BODY_TEXT="#c9d1d9", FOOTER_BG="#010409", FOOTER_ACCENT="#58a6ff",
            FOOTER_TEXT="#8b949e", SUBTITLE_COLOR="#8b949e", AI_BADGE_COLOR="#58a6ff",
        ),
    }
    T = THEMES.get(style, dict(
        BG="#f0f4ff", HDR_BG="#1a1a2e", HDR_TEXT="#ffffff",
        HDR_ACCENT="#E53E3E", CARD_BG="#ffffff", CARD_BORDER="#e2e8f0",
        BODY_TEXT="#2d3748", FOOTER_BG="#1a1a2e", FOOTER_ACCENT="#E53E3E",
        FOOTER_TEXT="#718096", SUBTITLE_COLOR="#a0aec0", AI_BADGE_COLOR="#E53E3E",
    ))

    HDR_H  = 185
    FOOT_H = 54
    PAD    = 30
    GAP    = 7
    available_h = H - HDR_H - FOOT_H - GAP * (n + 1)
    SEC_H  = available_h // n

    scale  = max(0.60, min(1.20, SEC_H / 115))

    f_ai_badge = _font(max(11, int(12 * scale)), bold=True)
    f_title_lg = _font(max(26, int(38 * scale)), bold=True)
    f_subtitle = _font(max(14, int(18 * scale)))
    f_badge    = _font(max(13, int(19 * scale)), bold=True)
    f_heading  = _font(max(13, int(17 * scale)), bold=True)
    f_bullet   = _font(max(10, int(13 * scale)))
    f_brand    = _font(max(12, int(15 * scale)))

    BADGE_SZ = max(28, int(40 * scale))
    BAR_W    = 6
    INNER    = max(8, int(12 * scale))

    img  = Image.new("RGB", (W, H), T["BG"])
    draw = ImageDraw.Draw(img)

    draw.rectangle([0, 0, W, HDR_H], fill=T["HDR_BG"])
    draw.rectangle([0, 0, W, 5], fill=T["HDR_ACCENT"])

    ai_text = "\u2746  AI-GENERATED VISUAL"
    ai_bb   = draw.textbbox((0, 0), ai_text, font=f_ai_badge)
    ai_w    = ai_bb[2] - ai_bb[0] + 24
    ai_x    = (W - ai_w) // 2
    ai_top  = 18
    draw.rounded_rectangle([ai_x, ai_top, ai_x + ai_w, ai_top + 22], radius=11, fill=T["AI_BADGE_COLOR"])
    draw.text((ai_x + 12, ai_top + 4), ai_text, font=f_ai_badge, fill="#ffffff")

    dummy       = Image.new("RGB", (W, 10))
    dd          = ImageDraw.Draw(dummy)
    title_lines = _wrap(title.upper(), f_title_lg, W - PAD * 2 - 20, dd)[:2]
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

    draw.rectangle([PAD, HDR_H - 4, W - PAD, HDR_H - 1], fill=T["HDR_ACCENT"])

    LINE_H      = max(13, int(14 * scale))
    heading_h   = BADGE_SZ + INNER
    bullet_zone = SEC_H - INNER * 2 - heading_h - 6
    MAX_LINES   = max(2, bullet_zone // (LINE_H + 3))
    text_max_w  = W - PAD * 2 - BAR_W - INNER - 4

    y = HDR_H + GAP
    for i, cat in enumerate(categories[:n]):
        color  = LEGACY_COLORS[i % len(LEGACY_COLORS)]
        nodes  = cat.get("nodes", [])[:6]
        label  = cat.get("label", f"Section {i+1}")
        icon   = cat.get("icon", "")
        x0, y0 = PAD, y
        x1, y1 = W - PAD, y + SEC_H

        draw.rounded_rectangle([x0, y0, x1, y1], radius=8, fill=T["CARD_BG"])
        draw.rounded_rectangle([x0, y0, x1, y1], radius=8, outline=T["CARD_BORDER"], width=1)
        draw.rounded_rectangle([x0, y0, x0 + BAR_W, y1], radius=4, fill=color)

        bx = x0 + BAR_W + INNER
        by = y0 + INNER
        draw.rounded_rectangle([bx, by, bx + BADGE_SZ, by + BADGE_SZ], radius=6, fill=color)
        num = str(i + 1)
        nb  = draw.textbbox((0, 0), num, font=f_badge)
        nw, nh = nb[2] - nb[0], nb[3] - nb[1]
        draw.text((bx + (BADGE_SZ - nw) // 2, by + (BADGE_SZ - nh) // 2), num, font=f_badge, fill="#ffffff")

        hx = bx + BADGE_SZ + 10
        hy = by + (BADGE_SZ - int(17 * scale)) // 2
        heading = f"{icon} {label.upper()}" if icon else label.upper()
        draw.text((hx, hy), heading, font=f_heading, fill=color)

        bul_x = x0 + BAR_W + INNER + 2
        bul_y = y0 + INNER + BADGE_SZ + 6
        lines_drawn = 0

        for node in nodes:
            if lines_drawn >= MAX_LINES:
                break
            lbl  = node.get("label", "")
            sub  = node.get("sublabel", "")
            full = f"• {lbl}: {sub}" if sub else f"• {lbl}"
            for ln in _wrap(full, f_bullet, text_max_w, draw)[:2]:
                if lines_drawn >= MAX_LINES or bul_y + LINE_H > y1 - 4:
                    break
                draw.text((bul_x, bul_y), ln, font=f_bullet, fill=T["BODY_TEXT"])
                bul_y += LINE_H + 3
                lines_drawn += 1

        y = y1 + GAP

    fy = H - FOOT_H
    draw.rectangle([0, fy, W, H], fill=T["FOOTER_BG"])
    draw.rectangle([0, fy, W, fy + 3], fill=T["FOOTER_ACCENT"])
    brand = "makepost.pro  •  AI-Generated LinkedIn Infographic"
    bb    = draw.textbbox((0, 0), brand, font=f_brand)
    bx    = (W - (bb[2] - bb[0])) // 2
    draw.text((bx, fy + (FOOT_H - (bb[3] - bb[1])) // 2), brand, font=f_brand, fill=T["FOOTER_TEXT"])

    return _save(img, title)
