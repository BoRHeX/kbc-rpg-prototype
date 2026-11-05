"""Deterministic, bounded line-number edits for AI-authored game changes."""
from game_factory.development_council import GAME_REL, FORBIDDEN

def apply_line_edits(source: str, edits: object) -> str:
    if isinstance(edits, dict):
        edits = [edits]
    if not isinstance(edits, list) or not 1 <= len(edits) <= 2:
        raise ValueError("Provide 1-2 line edits")
    lines = source.splitlines(keepends=True)
    seen = set()
    for index, edit in enumerate(edits, 1):
        if not isinstance(edit, dict) or edit.get("path") != GAME_REL:
            raise ValueError(f"Edit {index}: invalid path")
        line_number = edit.get("line")
        replacement = edit.get("new")
        if type(line_number) is not int or not 1 <= line_number <= len(lines):
            raise ValueError(f"Edit {index}: invalid line number")
        if line_number in seen:
            raise ValueError(f"Edit {index}: duplicate line")
        if not isinstance(replacement, str) or not 8 <= len(replacement) <= 3500:
            raise ValueError(f"Edit {index}: invalid replacement")
        if any(ord(c) < 32 and c not in "\n\t" for c in replacement):
            raise ValueError(f"Edit {index}: control character")
        original = lines[line_number-1].rstrip("\r\n")
        if original == replacement or any(
            bad.lower() in replacement.lower() and bad.lower() not in original.lower()
            for bad in FORBIDDEN
        ):
            raise ValueError(f"Edit {index}: unchanged or forbidden code")
        # Numbered edits refer to ORIGINAL source positions, never shifted positions.
        lines[line_number-1] = replacement.rstrip("\n") + "\n"
        seen.add(line_number)
    result = "".join(lines)
    if result == source or len(result) - len(source) > 5000:
        raise ValueError("No bounded change")
    return result
