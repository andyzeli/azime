#!/usr/bin/env python3
"""Extract the structure of supplied AMA row Markdown without interpreting rules.

Usage: python3 scripts/parse-ama-rows.py INPUT.md OUTPUT.json

The JSON contains row descriptions, introductory/trailing prose, entry values, and
CH/PE/CS text and lists. Source positions are used internally for validation
and console diagnostics, not exported. An absent CH or PE section stays null. A
stated count has no inferred minimum/exact interpretation. Regenerate this
file from the source rather than editing the generated JSON.
"""

import argparse
import json
import re
from pathlib import Path


ROW = re.compile(r"^#{3,4}\s+(\d{2}-\d{2}-\d{2})\s+(.+)$")
ENTRY = re.compile(
    r"^(\d{2}-\d{2}-\d{2})\s+class\s+(\d+[A-Z])\s*"
    r"\((\d+(?:\.\d+)?)%\s*(WPI)?\)(?:\s+CH\s*:?\s*(.*))?$"
)
ENTRY_START = re.compile(r"^\d{2}-\d{2}-\d{2}\s+class\b")
SECTION = re.compile(r"^(?:-\s*)?and\s+(PE|CS)\b\s*:?\s*(.*)$")
BULLET = re.compile(r"^([ \t]*)-\s+(.*)$")
LIST_INSTRUCTION = re.compile(
    r"\((all|one|two|three|four|five|\d+) of the following\)", re.IGNORECASE
)
NUMBER_WORDS = {"one": 1, "two": 2, "three": 3, "four": 4, "five": 5}


def marker_text(line):
    # Normalize formatting only for recognizing headings and section markers.
    # The original text is retained separately in source_markdown.
    return line.replace("**", "").replace("\u00a0", " ").strip()


def parse_rows(source_text):
    lines = source_text.splitlines(keepends=True)
    warnings = []
    notes = []
    headings = []
    for index, line in enumerate(lines):
        heading = ROW.fullmatch(marker_text(line))
        if heading:
            headings.append((index, heading.group(1), heading.group(2)))
        elif re.match(r"^#+\s+\d{2}-\d{2}-\d{2}\b", marker_text(line)):
            raise ValueError(f"Unrecognized row heading at line {index + 1}")
    if not headings:
        raise ValueError("No row headings found")
    if any(line.strip() for line in lines[:headings[0][0]]):
        raise ValueError("Unexpected content before the first row heading")

    def warn(row_id, entry_id, section, code, line, detail):
        warnings.append({
            "row_id": row_id, "entry_id": entry_id, "section": section,
            "code": code, "line": line, "detail": detail,
        })

    def parse_section(start, end, name, lead, row_id, entry_id):
        items = []
        stack = []
        for index in range(start + 1, end):
            line = lines[index].rstrip("\r\n")
            if not line.strip():
                continue
            bullet = BULLET.fullmatch(line)
            if not bullet:
                raise ValueError(f"Unrecognized section content at line {index + 1}")
            indent = len(bullet.group(1).expandtabs(4))
            item = {
                "text": bullet.group(2),
                "source_lines": [index + 1, index + 1],
                "indent": indent,
                "items": [],
            }
            while stack and stack[-1]["indent"] >= indent:
                stack.pop()
            target = stack[-1]["items"] if stack else items
            target.append(item)
            for ancestor in stack:
                ancestor["source_lines"][1] = index + 1
            stack.append(item)
            if BULLET.fullmatch(item["text"]):
                warn(row_id, entry_id, name, "repeated_bullet_marker", index + 1,
                     "Repeated bullet marker retained; review the intended list structure.")

        instruction = LIST_INSTRUCTION.search(lead)
        list_instruction = None
        if instruction:
            word = instruction.group(1).lower()
            count = None if word == "all" else (
                NUMBER_WORDS[word] if word in NUMBER_WORDS else int(word)
            )
            list_instruction = {
                "source_phrase": instruction.group(0),
                "kind": "all" if word == "all" else "stated_count",
                "count": count,
            }
            if count is not None and count > len(items):
                warn(row_id, entry_id, name, "count_exceeds_top_level_items", start + 1,
                     f"Source states {count}, but indentation yields {len(items)} top-level items; "
                     "review formatting or inline alternatives.")
            if items and lead[instruction.end():].strip():
                warn(row_id, entry_id, name, "inline_text_and_list", start + 1,
                     "Text follows the list instruction before the bullets; retain it and review "
                     "whether it is an alternative or a qualification of the list.")
        if items and items[0]["indent"] == 0 and marker_text(lines[start]).startswith("-"):
            warn(row_id, entry_id, name, "flat_section_bullets", start + 1,
                 "Bullets share the section marker's indentation; section boundaries retain them, "
                 "but their logical grouping needs review.")
        return {
            "source_lines": [start + 1, end],
            "source_markdown": "".join(lines[start:end]),
            "lead": lead,
            "list_instruction": list_instruction,
            "items": items,
        }

    rows = []
    seen_rows = set()
    for row_index, (start, row_id, description) in enumerate(headings):
        if row_id in seen_rows:
            raise ValueError(f"Duplicate row {row_id}")
        seen_rows.add(row_id)
        end = headings[row_index + 1][0] if row_index + 1 < len(headings) else len(lines)
        entries = []
        markers = []
        for index in range(start + 1, end):
            plain = marker_text(lines[index])
            entry = ENTRY.fullmatch(plain)
            if entry:
                markers.append((index, entry))
            elif ENTRY_START.match(plain):
                raise ValueError(f"Unrecognized entry header at line {index + 1}")
        if not markers:
            raise ValueError(f"No entries found for {row_id}")
        # Unbulleted paragraphs after the final section are row-level notes.
        # Keep them outside the last entry's criteria.
        last_section = max((index for index in range(markers[-1][0] + 1, end)
                            if SECTION.fullmatch(marker_text(lines[index]))),
                           default=markers[-1][0])
        content_end = end
        for index in range(last_section + 1, end):
            if lines[index].strip() and not BULLET.fullmatch(lines[index].rstrip("\r\n")):
                if lines[index - 1].strip() or lines[index][0].isspace():
                    raise ValueError(f"Unrecognized section content at line {index + 1}")
                content_end = index
                break
        for index in range(content_end, end):
            if lines[index].lstrip().startswith(("-", "#")):
                raise ValueError(f"Unexpected structure in row notes at line {index + 1}")
        seen_entries = set()
        for entry_index, (entry_start, entry) in enumerate(markers):
            entry_end = (markers[entry_index + 1][0]
                         if entry_index + 1 < len(markers) else content_end)
            entry_row, entry_id, value, unit, ch_lead = entry.groups()
            if entry_row != row_id:
                raise ValueError(f"Entry {entry_row} {entry_id} is under row {row_id}")
            if entry_id in seen_entries:
                raise ValueError(f"Duplicate entry {row_id} {entry_id}")
            seen_entries.add(entry_id)
            section_markers = [(entry_start, "CH", ch_lead)] if ch_lead is not None else []
            for index in range(entry_start + 1, entry_end):
                section = SECTION.fullmatch(marker_text(lines[index]))
                if section:
                    section_markers.append((index, section.group(1), section.group(2)))
            names = [name for _, name, _ in section_markers]
            if names not in (["CH", "PE", "CS"], ["CH", "CS"], ["PE", "CS"]):
                raise ValueError(f"Unexpected section order for {row_id} {entry_id}: {names}")
            header_markdown = ""
            if ch_lead is None:
                if any(line.strip() for line in lines[entry_start + 1:section_markers[0][0]]):
                    raise ValueError(f"Unexpected content after header for {row_id} {entry_id}")
                header_markdown = "".join(lines[entry_start:section_markers[0][0]])
                notes.append({
                    "row_id": row_id, "entry_id": entry_id, "section": "CH",
                    "code": "section_absent", "line": entry_start + 1,
                    "detail": "No CH block is stated; retained as null without inferring requirements.",
                })
            sections = {"CH": None, "PE": None, "CS": None}
            for section_index, (section_start, name, lead) in enumerate(section_markers):
                section_end = (section_markers[section_index + 1][0]
                               if section_index + 1 < len(section_markers) else entry_end)
                sections[name] = parse_section(
                    section_start, section_end, name, lead, row_id, entry_id
                )
            if sections["PE"] is None:
                notes.append({
                    "row_id": row_id, "entry_id": entry_id, "section": "PE",
                    "code": "section_absent", "line": entry_start + 1,
                    "detail": "No separate PE block is stated. PE-related language in CH "
                              "and the row introduction remains in those source sections.",
                })
            if unit is None:
                warn(row_id, entry_id, None, "unit_not_stated", entry_start + 1,
                     "Header states a percentage without WPI; retain null pending source context.")
            entries.append({
                "entry_id": entry_id,
                "impairment": {"value": float(value) if "." in value else int(value), "unit": unit},
                "source_lines": [entry_start + 1, entry_end],
                "header_markdown": header_markdown,
                "sections": sections,
            })
        rows.append({
            "row_id": row_id,
            "description": description,
            "source_lines": [start + 1, end],
            "heading_markdown": lines[start],
            "intro_markdown": "".join(lines[start + 1:markers[0][0]]),
            "notes_markdown": "".join(lines[content_end:end]),
            "entries": entries,
        })

    prefix = "".join(lines[:headings[0][0]])
    # Every source character must survive extraction, including row-level prose,
    # malformed bullets, whitespace, and the differently formatted CH headers.
    reconstructed = prefix + "".join(
        row["heading_markdown"] + row["intro_markdown"] + "".join(
            entry["header_markdown"] + "".join(
                section["source_markdown"]
                for section in entry["sections"].values() if section is not None
            ) for entry in row["entries"]
        ) + row["notes_markdown"] for row in rows
    )
    if reconstructed != source_text:
        raise ValueError("Extraction failed the source-preservation check")
    def export_item(item):
        result = {"text": item["text"]}
        if item["items"]:
            result["items"] = [export_item(child) for child in item["items"]]
        return result

    def export_section(section):
        if section is None:
            return None
        result = {"lead": section["lead"]}
        instruction = section["list_instruction"]
        if instruction:
            result["list_instruction"] = {"kind": instruction["kind"]}
            if instruction["count"] is not None:
                result["list_instruction"]["count"] = instruction["count"]
        if section["items"]:
            result["items"] = [export_item(item) for item in section["items"]]
        return result

    exported_rows = []
    for row in rows:
        result = {"row_id": row["row_id"], "description": row["description"]}
        if row["intro_markdown"].strip():
            result["intro"] = row["intro_markdown"].strip()
        if row["notes_markdown"].strip():
            result["notes"] = row["notes_markdown"].strip()
        result["entries"] = [{
            "entry_id": entry["entry_id"],
            "impairment": entry["impairment"],
            "sections": {name: export_section(section)
                         for name, section in entry["sections"].items()},
        } for entry in row["entries"]]
        exported_rows.append(result)
    return {"rows": exported_rows}, warnings, notes


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    if args.source.resolve() == args.output.resolve():
        parser.error("Input and output must be different files")
    try:
        data, warnings, notes = parse_rows(args.source.read_bytes().decode("utf-8"))
    except ValueError as error:
        parser.error(str(error))
    args.output.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    entry_count = sum(len(row["entries"]) for row in data["rows"])
    print(f"Extracted {len(data['rows'])} rows, {entry_count} entries; "
          f"{len(warnings)} structural review flags, "
          f"{len(notes)} informational notes. Source-preservation check passed.")
    for label, messages in [("Warning", warnings), ("Note", notes)]:
        for message in messages:
            print(f"{label}: {message['row_id']} {message['entry_id']} "
                  f"(line {message['line']}): {message['detail']}")


if __name__ == "__main__":
    main()
