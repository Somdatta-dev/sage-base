"""Diff generation service for page version comparison."""
from diff_match_patch import diff_match_patch
from typing import Dict, List, Any


def extract_text_from_content(content_json: dict) -> str:
    """Extract plain text from editor JSON content."""
    if not content_json:
        return ""

    def extract_text(node):
        text_parts = []
        if isinstance(node, dict):
            if node.get("type") == "text":
                text_parts.append(node.get("text", ""))
            if "content" in node:
                for child in node["content"]:
                    text_parts.extend(extract_text(child))
        elif isinstance(node, list):
            for item in node:
                text_parts.extend(extract_text(item))
        return text_parts

    return " ".join(extract_text(content_json))


def generate_content_diff(old_content: dict, new_content: dict, old_title: str = "", new_title: str = "") -> Dict[str, Any]:
    """
    Generates structured diff for TipTap JSON content.

    Args:
        old_content: Previous version's content JSON
        new_content: New version's content JSON
        old_title: Previous version's title
        new_title: New version's title

    Returns:
        Dict containing text_diff, stats, and metadata
    """
    dmp = diff_match_patch()

    # Convert to text for diff
    old_text = extract_text_from_content(old_content)
    new_text = extract_text_from_content(new_content)

    # Include title in comparison if different
    if old_title != new_title:
        old_text = f"# {old_title}\n\n{old_text}"
        new_text = f"# {new_title}\n\n{new_text}"

    # Generate diff
    diffs = dmp.diff_main(old_text, new_text)
    dmp.diff_cleanupSemantic(diffs)

    # Calculate statistics
    additions = sum(len(text) for op, text in diffs if op == 1)
    deletions = sum(len(text) for op, text in diffs if op == -1)
    unchanged = sum(len(text) for op, text in diffs if op == 0)

    return {
        "text_diff": diffs,
        "stats": {
            "additions": additions,
            "deletions": deletions,
            "unchanged": unchanged,
            "total_changes": additions + deletions
        }
    }


def format_diff_for_display(diffs: List[tuple]) -> str:
    """
    Formats diff output for human-readable display.

    Args:
        diffs: List of (operation, text) tuples from diff_match_patch

    Returns:
        Formatted string with +/- prefixes
    """
    lines = []
    for op, text in diffs:
        if op == -1:  # Deletion
            for line in text.split('\n'):
                if line:
                    lines.append(f"- {line}")
        elif op == 1:  # Addition
            for line in text.split('\n'):
                if line:
                    lines.append(f"+ {line}")
        else:  # Unchanged
            for line in text.split('\n'):
                if line:
                    lines.append(f"  {line}")

    return '\n'.join(lines)
