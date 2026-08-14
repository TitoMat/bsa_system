#!/usr/bin/env python3
"""
Inspect all Btn-type (checkbox) widgets in the EF02 PDF template.

Usage:
  python3 scripts/inspect-ef02-checkboxes.py /path/to/template.pdf

Output per widget:
  Field name, /V (current value), /AS (appearance state), AP/N keys (On/Off export values), Rect (page position)
"""

import sys
import json

try:
    from pypdf import PdfReader
except ImportError:
    try:
        from PyPDF2 import PdfReader
    except ImportError:
        print("Install pypdf first: pip install pypdf", file=sys.stderr)
        sys.exit(1)


def inspect_checkboxes(pdf_path: str):
    reader = PdfReader(pdf_path)
    print(f"PDF: {pdf_path}")
    print(f"Pages: {len(reader.pages)}\n")

    found = 0
    for page_num, page in enumerate(reader.pages, start=1):
        annots = page.get("/Annots", [])
        for annot in annots:
            obj = annot.get_object() if hasattr(annot, "get_object") else annot
            if obj.get("/Subtype") != "/Widget":
                continue
            ft = obj.get("/FT")
            if ft != "/Btn":
                continue

            name = obj.get("/T", "<unnamed>")
            v = obj.get("/V", "<not set>")
            ap_as = obj.get("/AS", "<not set>")

            ap_n_keys = []
            ap = obj.get("/AP")
            if ap:
                ap_obj = ap.get_object() if hasattr(ap, "get_object") else ap
                n = ap_obj.get("/N")
                if n:
                    n_obj = n.get_object() if hasattr(n, "get_object") else n
                    if hasattr(n_obj, "keys"):
                        ap_n_keys = list(n_obj.keys())

            rect = obj.get("/Rect", [])
            print(f"[Page {page_num}] Field: {name!r}")
            print(f"  /V  = {v!r}")
            print(f"  /AS = {ap_as!r}")
            print(f"  AP/N keys = {ap_n_keys}")
            print(f"  Rect = {list(rect)}")
            print()
            found += 1

    if found == 0:
        print("No Btn-type widgets found in this PDF.")
    else:
        print(f"Total Btn-type widgets: {found}")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(f"Usage: python3 {sys.argv[0]} <template.pdf>", file=sys.stderr)
        sys.exit(1)
    inspect_checkboxes(sys.argv[1])
