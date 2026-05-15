def infer_body_type(text: str) -> str:
    """
    Optional lightweight feature to detect basic Ayurveda dosha (body type)
    based on keywords in the user text.
    """
    text = text.lower()
    if any(word in text for word in ["heat", "hot", "acidity", "anger", "intense", "sweaty"]):
        return "Pitta"
    elif any(word in text for word in ["dry", "cold", "anxiety", "light", "airy", "gas"]):
        return "Vata"
    elif any(word in text for word in ["heavy", "sluggish", "congestion", "sweet", "lethargic"]):
        return "Kapha"
    return "Unknown"
