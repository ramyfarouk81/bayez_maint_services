from .config import CLASSIFIER_BACKEND

CATEGORIES = ["home_appliances", "plumbing", "electrical", "car_service", "other"]

_KEYWORDS = {
    "home_appliances": [
        "غسالة", "تلاجة", "ثلاجة", "تكييف", "مكيف", "سخان", "بوتاجاز",
        "فرن", "ميكروويف", "ديب فريزر", "مكنسة",
        "washing machine", "fridge", "refrigerator", "ac", "air conditioner",
        "heater", "oven", "microwave", "vacuum",
    ],
    "plumbing": [
        "سباكة", "سباك", "حنفية", "صنبور", "تسريب", "ماسورة", "مواسير",
        "سيفون", "بانيو", "حمام", "بالوعة", "طلمبة مية",
        "plumber", "pipe", "leak", "faucet", "tap", "drain", "toilet", "sink",
    ],
    "electrical": [
        "كهرباء", "كهربائي", "لمبة", "نور", "قاطع", "فيوز", "بريزة",
        "مفتاح", "سلك", "دواية",
        "electrician", "electrical", "light", "breaker", "fuse", "socket", "wiring",
    ],
    "car_service": [
        "عربية", "سيارة", "موتور", "فرامل", "كاوتش", "زيت", "ميكانيكي",
        "سمكري", "كهرباء عربية",
        "car", "vehicle", "brake", "tire", "engine", "oil", "mechanic",
    ],
}

def _keyword_classify(text: str) -> tuple[str, float]:
    t = text.lower()
    scores = {c: 0 for c in CATEGORIES}
    for cat, words in _KEYWORDS.items():
        for w in words:
            if w.lower() in t:
                scores[cat] += 1
    best = max(scores, key=scores.get)
    total = sum(scores.values())
    if total == 0:
        return "other", 0.3
    return best, min(0.99, scores[best] / total)

def _faisal_classify(text: str) -> tuple[str, float]:
    # Placeholder — wire in when CLASSIFIER_BACKEND=faisal
    # from transformers import AutoTokenizer, AutoModelForCausalLM
    # ... load Omartificial-Intelligence-Space/ara-jev-Faisal
    # return choice, probability
    raise NotImplementedError("Faisal backend not wired yet")

def classify(text: str) -> tuple[str, float]:
    if CLASSIFIER_BACKEND == "faisal":
        return _faisal_classify(text)
    return _keyword_classify(text)