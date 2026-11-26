"""Render export blocks in a local test process using an embedded Cyrillic font."""

import io
import json
import os
import sys
from xml.sax.saxutils import escape

from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen.canvas import Canvas
from reportlab.platypus import Paragraph, SimpleDocTemplate


def mark_test_page(canvas, document):
    canvas.saveState()
    canvas.setFillColorRGB(0.32, 0.35, 0.39)
    canvas.setFont("Fixture", 9)
    canvas.drawString(48, A4[1] - 30, "СИНТЕТИЧКИ ТЕСТ • HUMAN GATE HOLD")
    canvas.drawRightString(A4[0] - 48, 28, f"Страница {document.page}")
    canvas.restoreState()


def render(blocks):
    fonts = os.environ.get("CASE_RESPONSE_PDF_FONT_DIR", "/usr/share/fonts/truetype/dejavu")
    pdfmetrics.registerFont(TTFont("Fixture", os.path.join(fonts, "DejaVuSans.ttf")))
    pdfmetrics.registerFont(TTFont("FixtureBold", os.path.join(fonts, "DejaVuSans-Bold.ttf")))
    body = ParagraphStyle("body", fontName="Fixture", fontSize=10, leading=15, spaceAfter=8)
    heading = ParagraphStyle("heading", parent=body, fontName="FixtureBold", keepWithNext=True)
    styles = {
        "title": ParagraphStyle("title", parent=heading, fontSize=19, leading=24),
        "heading1": ParagraphStyle("h1", parent=heading, fontSize=13, leading=17, spaceBefore=8),
        "heading2": heading,
        "warning": ParagraphStyle("warning", parent=heading, textColor="#922626"),
        "meta": ParagraphStyle("meta", parent=body, fontSize=9, leading=13),
    }
    story = []
    for block in blocks:
        for line in block["text"].splitlines():
            if line.strip():
                story.append(Paragraph(escape(line), styles.get(block["kind"], body)))
    output = io.BytesIO()
    document = SimpleDocTemplate(
        output, pagesize=A4, leftMargin=48, rightMargin=48, topMargin=56,
        bottomMargin=48, title="Изолиран синтетички PDF", author="AI АДВОКАТ QA"
    )
    document.build(story, onFirstPage=mark_test_page, onLaterPages=mark_test_page,
                   canvasmaker=lambda *args, **kwargs: Canvas(*args, **{**kwargs, "invariant": 1}))
    return output.getvalue()


if __name__ == "__main__":
    sys.stdout.buffer.write(render(json.load(sys.stdin)))
