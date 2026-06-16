#!/usr/bin/env python3
import json
import re
import sys
from pathlib import Path

import fitz


PDF_PATH = Path("data/Kamus_Bahasa_Indonesia-Manggarai.pdf")
OUTPUT_PATH = Path("data/kamus_indonesia_manggarai.json")
START_PAGE = 21
END_PAGE = 464


def clean_text(text):
    text = re.sub(r"\s+", " ", text)
    text = text.replace(" ,", ",").replace(" ;", ";").replace(" .", ".")
    return text.strip()


def is_dictionary_span(span):
    size = round(span["size"], 1)
    font = span["font"]
    text = span["text"].strip()
    if not text:
        return False
    if size != 9.5:
        return False
    if "Calibri" not in font:
        return False
    return ("Bold" in font) or ("Italic" in font)


def span_style(span):
    font = span["font"]
    if "Bold" in font:
        return "bold"
    if "Italic" in font:
        return "italic"
    return "regular"


def iter_page_spans(page, page_number):
    lines = []
    for block in page.get_text("dict", flags=11)["blocks"]:
        for line in block.get("lines", []):
            spans = []
            for span in line["spans"]:
                if not is_dictionary_span(span):
                    continue
                x0, y0, x1, y1 = span["bbox"]
                spans.append(
                    {
                        "text": span["text"],
                        "style": span_style(span),
                        "page": page_number,
                        "x": round(x0, 2),
                        "y": round(y0, 2),
                    }
                )
            if spans:
                spans.sort(key=lambda s: s["x"])
                column = 0 if spans[0]["x"] < 220 else 1
                y = min(s["y"] for s in spans)
                lines.append((column, y, spans[0]["x"], spans))

    lines.sort(key=lambda item: (item[0], item[1], item[2]))
    for _, _, _, spans in lines:
        for span in spans:
            yield span


def append_translation(entry, text):
    text = clean_text(text)
    if not text:
        return
    if entry["manggarai"]:
        previous = entry["manggarai"][-1]
        joiner = "" if previous.endswith("-") else " "
        entry["manggarai"][-1] = clean_text(previous + joiner + text)
    else:
        entry["manggarai"].append(text)


def extract_entries(pdf_path):
    doc = fitz.open(pdf_path)
    entries = []
    current = None

    for page_index in range(START_PAGE - 1, END_PAGE):
        page_number = page_index + 1
        for span in iter_page_spans(doc[page_index], page_number):
            text = clean_text(span["text"])
            if not text:
                continue

            if span["style"] == "bold":
                if current and not current["manggarai"]:
                    joiner = "" if current["headword"].endswith("-") else " "
                    current["headword"] = clean_text(current["headword"] + joiner + text)
                    current["end_page"] = page_number
                    continue

                if current and current["manggarai"]:
                    entries.append(current)

                current = {
                    "headword": text,
                    "manggarai": [],
                    "start_page": page_number,
                    "end_page": page_number,
                }
                continue

            if span["style"] == "italic":
                if current is None:
                    continue
                append_translation(current, text)
                current["end_page"] = page_number

    if current and current["manggarai"]:
        entries.append(current)

    for index, entry in enumerate(entries, start=1):
        entry["id"] = index
        entry["manggarai_text"] = clean_text(" ".join(entry["manggarai"]))
        del entry["manggarai"]

    return entries


def main():
    pdf_path = Path(sys.argv[1]) if len(sys.argv) > 1 else PDF_PATH
    output_path = Path(sys.argv[2]) if len(sys.argv) > 2 else OUTPUT_PATH
    entries = extract_entries(pdf_path)
    output_path.write_text(
        json.dumps(entries, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"Wrote {len(entries)} entries to {output_path}")


if __name__ == "__main__":
    main()
