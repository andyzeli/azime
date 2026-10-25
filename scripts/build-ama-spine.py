#!/usr/bin/env python3
"""Rebuild working Markdown, parsed JSON, and upload JSON, then run checks.

Original *.source.md snapshots are read-only inputs. Preparation replays the
reviewed formatting fixes and user-approved C6/L1 dermatome corrections.
"""

import re
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
REGIONS = ("cervical", "thoracic", "lumbar")


def replace_once(text, old, new):
    if text.count(old) != 1:
        raise ValueError(f"Expected one occurrence of {old!r}; review changed source")
    return text.replace(old, new)


def edit_entry(text, row_id, entry_id, transform):
    pattern = re.compile(
        rf"^\*\*{row_id} class\s*{entry_id}\b.*?"
        r"(?=^\*\*\d{2}-\d{2}-\d{2} class|^#{3,4} |\Z)", re.MULTILINE | re.DOTALL)
    matches = list(pattern.finditer(text))
    if len(matches) != 1:
        raise ValueError(f"Expected one entry {row_id} {entry_id}")
    match = matches[0]
    return text[:match.start()] + transform(match.group()) + text[match.end():]


def prepare_source(region, original):
    text = re.sub(r"\[([^\]\n]+)\]\(https?://[^\s)]+\)", r"\1", original)
    if "](" in text:
        raise ValueError("Unexpected Markdown link format; review source")
    if region == "cervical":
        text = replace_once(text, "**17-19-06 class1B**", "**17-19-06 class 1B**")
        text = edit_entry(text, "17-19-08", "1C", lambda block:
                          replace_once(block, "C5 dermatome", "C6 dermatome"))
    elif region == "thoracic":
        text = replace_once(text, "**17-20-03 class1B**", "**17-20-03 class 1B**")
    elif region == "lumbar":
        text = edit_entry(text, "17-21-03", "1A", lambda block:
                          replace_once(block, "L2 dermatome", "L1 dermatome"))

        def flatten_l5_pe(block):
            block = replace_once(block, "**and PE**", "- **and PE**")
            block = replace_once(block, "- - sensory", "  - sensory")
            block, count = re.subn(r"^    - ", "  - ", block, flags=re.MULTILINE)
            if count != 3:
                raise ValueError("Expected three misindented L5 3B PE items")
            return block

        text = edit_entry(text, "17-21-07", "3B", flatten_l5_pe)

        def fracture_bullets(block):
            block = replace_once(block, "- **and CS**\u00a0(one of the following) ",
                                 "- **and CS**\u00a0(one of the following)\n  - ")
            return re.sub(r"^- (nondisplaced|displaced)", r"  - \1", block, flags=re.MULTILINE)

        for entry_id in ("1A", "1B"):
            text = edit_entry(text, "17-21-09", entry_id, fracture_bullets)
        for entry_id, value in (("1A", 2), ("1B", 4)):
            text = replace_once(text, f"**17-21-10 class {entry_id} ({value}%) CH**",
                                 f"**17-21-10 class {entry_id}** ({value}% WPI) **CH**")
    else:
        raise ValueError(f"Unknown spine region: {region}")
    return text


def run(*args):
    subprocess.run([sys.executable, "-B", *args], cwd=ROOT, check=True)


def main():
    # Prepare every input successfully before replacing any working copy.
    prepared = {region: prepare_source(region, (ROOT / f"docs/rowparse/ama-rows-{region}.source.md").read_text())
                for region in REGIONS}
    for region, text in prepared.items():
        working = f"docs/rowparse/ama-rows-{region}.md"
        (ROOT / working).write_text(text)
        run("scripts/parse-ama-rows.py", working, f"docs/rowparse/ama-rows-{region}.parsed.json")
    run("scripts/normalize-ama-spine.py")
    run("scripts/normalize-ama-spine.py", "--validate-only", "docs/ama-spine.upload.json")
    run("-m", "unittest", "discover", "-s", "scripts", "-p", "test_normalize_ama_spine.py", "-v")
    print("Full source-to-upload build and checks passed.")


if __name__ == "__main__":
    main()
