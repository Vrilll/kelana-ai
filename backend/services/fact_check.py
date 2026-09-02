"""
KelanaAI - Fact coverage scoring
Session 9

Shared by scripts/check_retrieval.py and scripts/compare_rag.py so both score
the same way. Keyword coverage, not a judge model: crude, but reproducible and
free, and it never quietly changes its mind between runs.

The important rule is the numeric one. An early version accepted a fact when
70% of its words appeared, which passed "Yogyakarta's Backpacker allowance is
USD 25 per day" against text containing neither "Yogyakarta" nor "25" - the
filler words alone cleared the bar. Numbers and proper nouns carry the fact;
they are now required outright.
"""

import re

# Words that carry no signal when checking whether a fact is present.
FILLER = frozenset(
    """a an and are as at be because before by for from in is it its of on or
    that the to up with within not never anything above cap so per each""".split()
)

_WORD = re.compile(r"[a-z0-9]+")
_NUMBER = re.compile(r"^\d[\d.,]*$")


def normalise(text: str) -> str:
    """Lowercase, drop punctuation and possessives, collapse whitespace."""
    text = text.lower().replace("'s", "").replace("’s", "")
    return " ".join(_WORD.findall(text))


def _content_words(fact: str) -> list[str]:
    return [w for w in normalise(fact).split() if w not in FILLER]


def covers(fact: str, haystack: str, threshold: float = 0.7) -> tuple[bool, list[str]]:
    """
    Is this fact present in the text?

    `haystack` must already be normalised. Returns (covered, missing_words).

    A fact counts as present only when:
      1. every number in it appears, and
      2. at least `threshold` of its content words appear.
    """
    words = _content_words(fact)
    if not words:
        return True, []

    tokens = set(haystack.split())
    missing = [w for w in words if w not in tokens]

    numbers_missing = [w for w in missing if _NUMBER.match(w)]
    if numbers_missing:
        return False, missing

    ratio = (len(words) - len(missing)) / len(words)
    return ratio >= threshold, missing


def score(text: str, expected_facts: list[str]) -> tuple[int, list[str]]:
    """How many of the expected facts appear in this text, and which do not."""
    haystack = normalise(text)
    missed = [fact for fact in expected_facts if not covers(fact, haystack)[0]]
    return len(expected_facts) - len(missed), missed
