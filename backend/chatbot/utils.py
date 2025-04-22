import re
from typing import Tuple


def is_stock_analysis_request(message: str) -> Tuple[bool, str]:
    """
    Determine if a message is requesting stock analysis, and extract the ticker symbol.
    Returns (is_analysis_request, ticker_symbol)
    """
    # Common patterns for stock analysis requests
    patterns = [
        r"analyze\s+([A-Za-z]+)(?:\s+stock)?",
        r"what\s+(?:do\s+you\s+think|about)\s+([A-Za-z]+)(?:\s+stock)?",
        r"can\s+you\s+analyze\s+([A-Za-z]+)",
        r"insights?\s+(?:on|about|for)\s+([A-Za-z]+)",
        r"technical\s+analysis\s+(?:on|for)\s+([A-Za-z]+)",
        r"give\s+me\s+analysis\s+(?:on|of|for)\s+([A-Za-z]+)",
    ]

    message = message.lower()
    for pattern in patterns:
        match = re.search(pattern, message)
        if match:
            ticker = match.group(1).upper()
            return True, ticker

    # Check for standalone ticker symbols
    ticker_pattern = r"^([A-Z]{1,5})$"
    match = re.search(ticker_pattern, message.upper())
    if match:
        return True, match.group(1)

    return False, ""
