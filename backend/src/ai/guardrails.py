import re

from src.ai.exceptions import AIContentPolicyViolation

# Patterns that indicate prompt injection, jailbreak, or security probing attempts.
# Each tuple: (compiled regex, user-facing message)
_BLOCKED: list[tuple[re.Pattern, str]] = [
    # ── Prompt injection / instruction override ──────────────────────────────
    (
        # Matches "ignore [any words] instructions/system prompt/rules"
        re.compile(
            r"ignore\s+.{0,30}(instructions?|system\s*prompt|rules?)",
            re.IGNORECASE,
        ),
        "Yêu cầu không hợp lệ.",
    ),
    (
        re.compile(r"\byou\s+are\s+now\b", re.IGNORECASE),
        "Yêu cầu không hợp lệ.",
    ),
    (
        re.compile(r"\bpretend\s+(you\s+are|to\s+be)\b", re.IGNORECASE),
        "Yêu cầu không hợp lệ.",
    ),
    (
        re.compile(r"\bact\s+as\s+(an?\s+)?(unrestricted|unfiltered|uncensored)\b", re.IGNORECASE),
        "Yêu cầu không hợp lệ.",
    ),
    (
        re.compile(r"\bDAN\s+mode\b", re.IGNORECASE),
        "Yêu cầu không hợp lệ.",
    ),
    (
        re.compile(r"\bjailbreak\b", re.IGNORECASE),
        "Yêu cầu không hợp lệ.",
    ),
    (
        re.compile(
            r"reveal\s+(your|the)\s+(system\s*prompt|instructions?|rules?|config)",
            re.IGNORECASE,
        ),
        "Yêu cầu không hợp lệ.",
    ),
    # ── Financial market manipulation ────────────────────────────────────────
    (
        re.compile(
            r"(manipulate|manipulation)\s+(stock|market|share|price)",
            re.IGNORECASE,
        ),
        "Yêu cầu vi phạm chính sách: thao túng thị trường là hành vi bất hợp pháp.",
    ),
    (
        # Vietnamese: "đẩy giá", "làm giá", "thao túng giá"
        re.compile(
            r"(đẩy\s+giá|làm\s+giá|thao\s+túng\s+(giá|thị\s+trường|cổ\s+phiếu))",
            re.IGNORECASE,
        ),
        "Yêu cầu vi phạm chính sách: thao túng thị trường là hành vi bất hợp pháp.",
    ),
    (
        # pump and dump variants
        re.compile(r"\bpump\s+and\s+dump\b", re.IGNORECASE),
        "Yêu cầu vi phạm chính sách: pump and dump là hành vi bất hợp pháp.",
    ),
    # ── Security / credential probing ────────────────────────────────────────
    (
        re.compile(
            r"\b(api[_\s]?key|secret[_\s]?key|password|access[_\s]?token)\b.{0,40}\b(database|backend|server|system|env)\b",
            re.IGNORECASE,
        ),
        "Câu hỏi liên quan đến thông tin bảo mật hệ thống không được hỗ trợ.",
    ),
    (
        re.compile(r"\bSELECT\b.{0,60}\bFROM\b", re.IGNORECASE),
        "Câu hỏi không hợp lệ.",
    ),
    (
        re.compile(r"\bDROP\s+TABLE\b", re.IGNORECASE),
        "Câu hỏi không hợp lệ.",
    ),
    (
        re.compile(r"\bact\s+as\s+(a\s+)?(?:hacker|attacker|malicious)\b", re.IGNORECASE),
        "Yêu cầu không hợp lệ.",
    ),
]


def check_input_policy(message: str) -> None:
    """
    Raise AIContentPolicyViolation if the message matches any blocked pattern.
    Call this before invoking any AI agent.
    """
    for pattern, detail in _BLOCKED:
        if pattern.search(message):
            raise AIContentPolicyViolation(detail=detail)
