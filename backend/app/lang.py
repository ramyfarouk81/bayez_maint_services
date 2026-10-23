import re

ARABIC_SCRIPT = re.compile(r"[\u0600-\u06FF]")
LATIN_SCRIPT = re.compile(r"[A-Za-z]")

# Arabizi markers — digits used as letters in Egyptian Latin-script Arabic
ARABIZI_MARKER = re.compile(r"\b\w*[2375]\w*\b")
COMMON_ARABIZI = re.compile(
    r"\b(el|mesh|ya|ezay|fe|ana|enta|enta|howa|heya|keda|keda|3a|3ala|"
    r"shaghal|mesh|mish|m4|bgd|bs|bas|khalas|tayeb|tamam|ezayak)\b",
    re.IGNORECASE,
)

def detect_language(text: str) -> str:
    has_ar = bool(ARABIC_SCRIPT.search(text))
    has_lat = bool(LATIN_SCRIPT.search(text))
    if has_ar and has_lat:
        return "mixed"
    if has_ar:
        return "ar"
    if has_lat:
        if ARABIZI_MARKER.search(text) or COMMON_ARABIZI.search(text):
            return "arabizi"
        return "en"
    return "unknown"

# Emergency patterns — all three input styles
EMERGENCY_PATTERNS = [
    r"غاز|تسريب\s*غاز|ريحة\s*غاز",
    r"شرر|ماس\s*كهرب|قصر\s*دائرة",
    r"حريقة|حريق|نار",
    r"غرق|تسريب\s*مية\s*(كتير|كبير)",
    r"\bgas\b|\bgas\s*leak\b|\bsmell.{0,10}gas",
    r"\bspark|\bshort\s*circuit|\belectric\s*shock",
    r"\bfire\b|\bburning\b",
    r"\bflood|\bwater\s*everywhere",
    r"\bgaz\b|\bre7et\s*gaz|\bre7a\s*gaz",
    r"\bsharar|\bmass\s*kahraba|\bmas\s*kahraba",
    r"\bharee2?a|\bhareeqa|\bnar\b",
    r"\bghar2?\b|\bgharq\b",
]

def is_emergency(text: str) -> bool:
    return any(re.search(p, text, re.IGNORECASE) for p in EMERGENCY_PATTERNS)