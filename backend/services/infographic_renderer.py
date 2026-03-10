"""
Pillow-based infographic renderer.
Output: 1080px wide (LinkedIn standard) × dynamic height.
LinkedIn recommended portrait size: 1080 × 1350px (4:5 ratio).
All sections guaranteed to be visible on one image.
"""
from __future__ import annotations
import os
import re
import uuid
from PIL import Image, ImageDraw, ImageFont

IMAGES_DIR = os.path.join(os.path.dirname(__file__), '..', 'static', 'images')
os.makedirs(IMAGES_DIR, exist_ok=True)

# ── LinkedIn canvas dimensions ────────────────────────────────────────────────
W = 1080          # LinkedIn standard post width
MIN_H = 1350      # 4:5 portrait ratio minimum

# ── Section color palette ─────────────────────────────────────────────────────
SECTION_COLORS = [
    "#E53E3E",  # red
    "#DD6B20",  # orange
    "#2B6CB0",  # blue
    "#6B46C1",  # purple
    "#276749",  # green
    "#0987A0",  # teal
    "#C53030",  # dark red
    "#C05621",  # burnt orange
    "#2C7A7B",  # cyan
    "#1A365D",  # navy
]

# ── Font loader ───────────────────────────────────────────────────────────────
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


def _darken(color: str, factor: float = 0.75) -> tuple[int, int, int]:
    r, g, b = _hex(color)
    return int(r * factor), int(g * factor), int(b * factor)


def render_infographic(title: str, content_data: dict, style: str = "Whiteboard") -> str | None:
    try:
        inf        = content_data.get("infographic", {})
        categories = inf.get("categories", [])
        subtitle   = inf.get("subtitle", "")
        inf_title  = inf.get("title", title)

        if not categories:
            return None

        # ── Theme ─────────────────────────────────────────────────────────────
        themes = {
            "Handwritten Notes": dict(
                BG="#fefcf3", HDR_BG="#1a202c", HDR_TEXT="#ffffff",
                CARD_BG="#ffffff", CARD_BORDER="#e2e8f0",
                BODY_TEXT="#2d3748", SUB_TEXT="#4a5568",
                ACCENT_MUL=1.0, FOOTER_BG="#1a202c",
            ),
            "Corporate Modern": dict(
                BG="#EBF4FF", HDR_BG="#1e3a5f", HDR_TEXT="#ffffff",
                CARD_BG="#ffffff", CARD_BORDER="#bee3f8",
                BODY_TEXT="#1e3a5f", SUB_TEXT="#4a6fa5",
                ACCENT_MUL=1.0, FOOTER_BG="#1e3a5f",
            ),
            "Executive Guide": dict(
                BG="#0d1117", HDR_BG="#0d1117", HDR_TEXT="#ffffff",
                CARD_BG="#161b22", CARD_BORDER="#30363d",
                BODY_TEXT="#e6edf3", SUB_TEXT="#8b949e",
                ACCENT_MUL=1.0, FOOTER_BG="#010409",
            ),
        }
        T = themes.get(style, dict(
            BG="#f7fafc", HDR_BG="#1a1a2e", HDR_TEXT="#ffffff",
            CARD_BG="#ffffff", CARD_BORDER="#e2e8f0",
            BODY_TEXT="#2d3748", SUB_TEXT="#718096",
            ACCENT_MUL=1.0, FOOTER_BG="#1a1a2e",
        ))

        # ── Fonts (scaled for 1080px LinkedIn) ────────────────────────────────
        PAD       = 40           # outer horizontal padding
        INNER     = 22           # inner card padding
        BADGE_SZ  = 54           # number badge square size
        BAR_W     = 8            # left color accent bar width
        SEC_GAP   = 14           # gap between section cards
        HDR_PAD   = 20           # header top/bottom padding
        LINE_H_B  = 22           # bullet line height
        LINE_H_T  = 28           # tag line height

        f_badge    = _font(24, bold=True)
        f_heading  = _font(26, bold=True)
        f_tag      = _font(16, bold=False)
        f_bullet   = _font(16, bold=False)
        f_title_lg = _font(38, bold=True)
        f_subtitle = _font(20, bold=False)
        f_brand    = _font(17, bold=False)
        f_ai_badge = _font(14, bold=True)

        text_width = W - PAD * 2 - BAR_W - BADGE_SZ - INNER * 2

        # ── Measure sections ──────────────────────────────────────────────────
        dummy = Image.new("RGB", (W, 10))
        dd    = ImageDraw.Draw(dummy)

        def measure_section(cat: dict) -> int:
            nodes = cat.get("nodes", [])[:6]
            h = INNER * 2 + BADGE_SZ + 8   # top padding + heading row
            h += LINE_H_T + 6              # tags row
            for node in nodes:
                lbl = node.get("label", "")
                sub = node.get("sublabel", "")
                txt = f"• {lbl}: {sub}" if sub else f"• {lbl}"
                lines = _wrap(txt, f_bullet, text_width, dd)
                h += len(lines) * LINE_H_B + 5
            h += INNER                     # bottom padding
            return h

        # Measure header
        title_lines = _wrap(inf_title.upper(), f_title_lg, W - PAD * 2 - 20, dd)
        sub_lines   = _wrap(subtitle, f_subtitle, W - PAD * 2 - 20, dd) if subtitle else []
        HDR_H = (
            HDR_PAD * 2
            + 32                         # AI badge row
            + len(title_lines[:3]) * 46  # title lines
            + (len(sub_lines[:2]) * 28 if sub_lines else 0)
            + 12
        )
        HDR_H = max(HDR_H, 160)

        sec_heights = [measure_section(c) for c in categories]
        FOOTER_H    = 64
        total_h = HDR_H + sum(sec_heights) + SEC_GAP * (len(categories) + 1) + FOOTER_H
        total_h = max(total_h, MIN_H)

        # ── Draw ─────────────────────────────────────────────────────────────
        img  = Image.new("RGB", (W, total_h), T["BG"])
        draw = ImageDraw.Draw(img)

        # ── Header ───────────────────────────────────────────────────────────
        draw.rectangle([0, 0, W, HDR_H], fill=T["HDR_BG"])

        # AI badge pill
        ai_text = "✦  AI-GENERATED VISUAL"
        ai_bb   = draw.textbbox((0, 0), ai_text, font=f_ai_badge)
        ai_w    = ai_bb[2] - ai_bb[0] + 28
        ai_x    = (W - ai_w) // 2
        draw.rounded_rectangle([ai_x, HDR_PAD, ai_x + ai_w, HDR_PAD + 26], radius=13, fill="#E53E3E")
        draw.text((ai_x + 14, HDR_PAD + 5), ai_text, font=f_ai_badge, fill="#ffffff")

        # Title
        ty = HDR_PAD + 36
        for line in title_lines[:3]:
            bb = draw.textbbox((0, 0), line, font=f_title_lg)
            tx = (W - (bb[2] - bb[0])) // 2
            draw.text((tx, ty), line, font=f_title_lg, fill=T["HDR_TEXT"])
            ty += 46

        # Subtitle
        for line in sub_lines[:2]:
            bb = draw.textbbox((0, 0), line, font=f_subtitle)
            sx = (W - (bb[2] - bb[0])) // 2
            draw.text((sx, ty + 4), line, font=f_subtitle, fill="#a0aec0")
            ty += 28

        # Thin accent line under header
        draw.rectangle([PAD, HDR_H - 5, W - PAD, HDR_H - 3], fill="#E53E3E")

        # ── Section cards ─────────────────────────────────────────────────────
        y = HDR_H + SEC_GAP

        for i, cat in enumerate(categories):
            sh     = sec_heights[i]
            color  = SECTION_COLORS[i % len(SECTION_COLORS)]
            nodes  = cat.get("nodes", [])[:6]
            label  = cat.get("label", f"Section {i+1}")
            icon   = cat.get("icon", "")
            x0, y0 = PAD, y
            x1, y1 = W - PAD, y + sh

            # Card background + border
            draw.rounded_rectangle([x0, y0, x1, y1], radius=10, fill=T["CARD_BG"])
            draw.rounded_rectangle([x0, y0, x1, y1], radius=10,
                                   outline=T["CARD_BORDER"], width=1)

            # Left color bar
            draw.rounded_rectangle([x0, y0, x0 + BAR_W, y1], radius=4, fill=color)

            # ── Badge (number) ────────────────────────────────────────────────
            bx = x0 + BAR_W + INNER
            by = y0 + INNER
            draw.rounded_rectangle(
                [bx, by, bx + BADGE_SZ, by + BADGE_SZ],
                radius=8, fill=color
            )
            num = str(i + 1)
            nb  = draw.textbbox((0, 0), num, font=f_badge)
            nw, nh = nb[2] - nb[0], nb[3] - nb[1]
            draw.text(
                (bx + (BADGE_SZ - nw) // 2, by + (BADGE_SZ - nh) // 2 - 1),
                num, font=f_badge, fill="#ffffff"
            )

            # ── Section heading ───────────────────────────────────────────────
            hx = bx + BADGE_SZ + 14
            hy = by + (BADGE_SZ - 26) // 2
            heading = f"{icon}  {label.upper()}" if icon else label.upper()
            draw.text((hx, hy), heading, font=f_heading, fill=color)

            # ── Tags row ──────────────────────────────────────────────────────
            tags     = [n.get("label", "") for n in nodes if n.get("label")]
            tag_line = "   |   ".join(tags)
            tag_y    = y0 + INNER + BADGE_SZ + 10
            tag_x    = x0 + BAR_W + INNER
            # Tag background pill
            tag_bb   = draw.textbbox((0, 0), tag_line, font=f_tag)
            tag_pill_w = min(tag_bb[2] - tag_bb[0] + 24, W - PAD * 2 - BAR_W - INNER * 2)
            draw.rounded_rectangle(
                [tag_x, tag_y, tag_x + tag_pill_w, tag_y + LINE_H_T],
                radius=6,
                fill=color + "20" if len(color) == 7 else "#f0f0f0",
            )
            draw.text((tag_x + 10, tag_y + 4), tag_line, font=f_tag, fill=color)

            # ── Bullet points ─────────────────────────────────────────────────
            bul_x = x0 + BAR_W + INNER + 4
            bul_y = tag_y + LINE_H_T + 8

            for node in nodes:
                lbl = node.get("label", "")
                sub = node.get("sublabel", "")
                full = f"• {lbl}: {sub}" if sub else f"• {lbl}"
                wrapped = _wrap(full, f_bullet, text_width + BADGE_SZ + 10, draw)
                for ln_i, ln in enumerate(wrapped):
                    draw.text((bul_x, bul_y), ln, font=f_bullet, fill=T["BODY_TEXT"])
                    bul_y += LINE_H_B
                bul_y += 5

            y = y1 + SEC_GAP

        # ── Footer ────────────────────────────────────────────────────────────
        fy = total_h - FOOTER_H
        draw.rectangle([0, fy, W, total_h], fill=T["FOOTER_BG"])

        # Thin top accent on footer
        draw.rectangle([0, fy, W, fy + 3], fill="#E53E3E")

        brand = "makepost.pro  •  AI-Generated LinkedIn Infographic"
        bb    = draw.textbbox((0, 0), brand, font=f_brand)
        bx    = (W - (bb[2] - bb[0])) // 2
        draw.text((bx, fy + (FOOTER_H - (bb[3] - bb[1])) // 2), brand,
                  font=f_brand, fill="#718096")

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
