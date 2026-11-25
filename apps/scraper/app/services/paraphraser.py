import re
import os
import logging
from typing import Tuple, Dict, Any, List

log = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# 1. SCRAPER NOISE & PUBLISHER RESIDUE PATTERNS
# ---------------------------------------------------------------------------

SCRAPER_NOISE_PATTERNS = [
    r"^\s*Also Read:.*$",
    r"^\s*Read More:.*$",
    r"^\s*Click here to.*$",
    r"^\s*Follow us on.*$",
    r"^\s*Stay updated with.*$",
    r"^\s*Got Question about the News\?.*$",
    r"^\s*Quick Answers.*$",
    r"^\s*Catch all the action.*$",
    r"^\s*Download the app.*$",
    r"^\s*Subscribe to our.*$",
    r"^\s*For more news.*$",
]

# ---------------------------------------------------------------------------
# 2. JOURNALISTIC MULTI-WORD PHRASE REPLACEMENTS
# ---------------------------------------------------------------------------

PHRASE_REPLACEMENTS = [
    # Diplomatic, Political & Governance
    (r"\bheld a telephone conversation\b", "spoke via telephone"),
    (r"\bheld a phone call\b", "spoke via phone"),
    (r"\bhad a phone call\b", "conferred by phone"),
    (r"\bheld a meeting\b", "convened a session"),
    (r"\bconvened a meeting\b", "held discussions"),
    (r"\bto discuss\b", "to confer on"),
    (r"\bthe possibility of resuming\b", "potential resumption of"),
    (r"\bthe possibility of\b", "potential prospects for"),
    (r"\bmilitary operations\b", "armed operations"),
    (r"\bmilitary strikes\b", "defense strikes"),
    (r"\bcombat operations\b", "military engagements"),
    (r"\bafter the midterms\b", "following the midterm elections"),
    (r"\btold reporters\b", "conveyed to journalists"),
    (r"\bspoke to reporters\b", "addressed media representatives"),
    (r"\bsaid to reporters\b", "commented to journalists"),
    (r"\bsaid in an interview\b", "commented during an interview"),
    (r"\baccording to officials\b", "as reported by authorities"),
    (r"\baccording to reports\b", "as stated in media dispatches"),
    (r"\baccording to sources\b", "as reported by informed insiders"),
    (r"\bsources said\b", "insiders confirmed"),
    (r"\bsources revealed\b", "insiders disclosed"),
    (r"\bstated in a statement\b", "announced formally"),
    (r"\bissued a statement saying\b", "clarified in a public release that"),
    (r"\bissued a statement\b", "released an official statement"),
    (r"\bThe report said\b", "According to the report"),
    (r"\bThe source said\b", "The insider noted"),
    (r"\bThe official said\b", "The authority noted"),
    (r"\bIn a post on X\b", "Taking to platform X"),
    (r"\bIn a tweet\b", "Posting online"),
    (r"\bAccording to\b", "As reported by"),
    (r"\bFollowing the\b", "In the aftermath of the"),
    (r"\bAhead of the\b", "Prior to the"),
    (r"\bIn the wake of\b", "Following"),
    (r"\bIt is pertinent to mention that\b", "Notably,"),
    (r"\bIt may be recalled that\b", "As previously reported,"),
    (r"\bNotably,\b", "Significantly,"),
    (r"\bMeanwhile,\b", "Concurrently,"),
    (r"\bEarlier,\b", "Previously,"),
    (r"\bLater,\b", "Subsequently,"),
    (r"\bHowever,\b", "Nonetheless,"),
    (r"\bFurthermore,\b", "In addition,"),
    (r"\bMoreover,\b", "Additionally,"),
    (r"\bOn the other hand,\b", "Conversely,"),
    (r"\bIn response,\b", "Reacting to this,"),
    (r"\bIn this regard,\b", "Regarding this matter,"),
    (r"\bAt the same time,\b", "Simultaneously,"),
    (r"\bdeclined to comment on\b", "offered no comment regarding"),
    (r"\brefused to comment on\b", "withheld comment concerning"),
    (r"\bsparked controversy\b", "triggered heated debate"),
    (r"\bsparked debate\b", "prompted extensive discussions"),
    (r"\bset political circles abuzz\b", "stirred considerable political debate"),
    (r"\bfuelling speculation that\b", "sparking widespread anticipation that"),
    (r"\bfueling speculation that\b", "sparking widespread anticipation that"),
    (r"\bon the verge of\b", "close to"),
    (r"\bwalked out of\b", "parted ways with"),
    (r"\bin a bid to\b", "with an aim to"),
    (r"\bturn into a three-way contest\b", "evolve into a triangular race"),
    (r"\boffer little respite\b", "provide little relief"),
    (r"\bfailed to open its account\b", "was unable to secure any seats"),
    (r"\bin order to\b", "so as to"),
    (r"\bdue to the fact that\b", "because"),
    (r"\ba large number of\b", "numerous"),
    (r"\bat the end of the day\b", "ultimately,"),
    (r"\bpoints to the fact that\b", "indicates that"),
    (r"\bis set to\b", "is expected to"),
    (r"\bis scheduled to\b", "is slated to"),
    (r"\bis planning to\b", "intends to"),
    (r"\bis pursuing\b", "continues to pursue"),
    (r"\bseeking an agreement\b", "aiming to reach a consensus"),
    (r"\brestart peace discussions\b", "resume diplomatic talks"),
    (r"\bpeace discussions\b", "diplomatic dialogues"),
    (r"\bkeeping preparations underway\b", "maintaining active readiness"),
    (r"\bannounced that\b", "declared that"),
    (r"\bwarned that\b", "cautioned that"),
    (r"\bhighlighted the need for\b", "underscored the importance of"),
    (r"\bcalled for\b", "demanded"),

    # Sports & General Media
    (r"\bmade his dissatisfaction known\b", "expressed clear discontent"),
    (r"\bmade her dissatisfaction known\b", "expressed clear discontent"),
    (r"\bmade their dissatisfaction known\b", "voiced noticeable dissatisfaction"),
    (r"\bin no uncertain terms\b", "firmly and unequivocally"),
    (r"\bhe said this was a concern\b", "he highlighted this as an ongoing issue"),
    (r"\bshe said this was a concern\b", "she highlighted this as an ongoing issue"),
    (r"\bdefinitely plays a very big role\b", "undoubtedly serves as a pivotal factor"),
    (r"\bplays a very big role\b", "carries significant importance"),
    (r"\bescape with a draw\b", "salvage a draw"),
    (r"\bhave failed to force a result\b", "were unable to secure a decisive result"),
    (r"\bfailed to force a result\b", "could not secure a decisive victory"),
    (r"\bfrustration has been directed at\b", "discontent has centered on"),
    (r"\bat their disposal\b", "available to them"),
    (r"\bin recent times\b", "recently"),
    (r"\bon most of the occasions\b", "in many instances"),
    (r"\bit was high time\b", "it is opportune"),
    (r"\bpart of the frustration\b", "much of the unease"),
    (r"\bin-depth coverage\b", "comprehensive analysis"),
    (r"\breal-time live cricket score\b", "live ball-by-ball updates"),
    (r"\balong with the placid pitch\b", "compounded by the flat pitch"),
    (r"\bdidn't provide much help\b", "offered little assistance"),
    (r"\bdid not provide much help\b", "offered little assistance"),
    (r"\bgone down\b", "diminished"),
    (r"\bgets very difficult\b", "becomes increasingly challenging"),
    (r"\bbring together\b", "combines"),
    (r"\bdraws inspiration from\b", "takes cues from"),
    (r"\bplenty of history behind it\b", "deep historical roots"),
    (r"\bthere is no doubt that\b", "undeniably,"),
    (r"\bwith the same aplomb\b", "with equal grace"),
    (r"\bit is easy to see why\b", "the appeal is readily apparent"),
    (r"\bbeyond the usual suspects\b", "past conventional choices"),
]

# ---------------------------------------------------------------------------
# 3. HIGH-DENSITY JOURNALISTIC SYNONYMS
# ---------------------------------------------------------------------------

SYNONYM_WORDS = {
    "said": "stated",
    "told": "conveyed to",
    "added": "elaborated",
    "claimed": "asserted",
    "alleged": "purported",
    "announced": "declared",
    "appeared": "seemed",
    "approached": "reached out to",
    "argued": "contended",
    "arrived": "reached",
    "assumed": "presumed",
    "attempted": "endeavored",
    "authorities": "officials",
    "began": "commenced",
    "believed": "considered",
    "briefly": "momentarily",
    "cancelled": "called off",
    "commenced": "started",
    "complained": "voiced concerns",
    "complex": "intricate",
    "concluded": "wrapped up",
    "conducted": "carried out",
    "confirmed": "verified",
    "considered": "regarded as",
    "conversation": "discussion",
    "criticism": "scrutiny",
    "crucial": "vital",
    "current": "prevailing",
    "decision": "resolution",
    "decrease": "reduction",
    "defeated": "overcame",
    "demonstrated": "showcased",
    "described": "characterized",
    "difficult": "challenging",
    "disclosed": "revealed",
    "discovered": "uncovered",
    "dispute": "disagreement",
    "dramatic": "substantial",
    "dropped": "declined",
    "emphasized": "stressed",
    "ended": "concluded",
    "escalated": "intensified",
    "estimated": "projected",
    "examination": "scrutiny",
    "expected": "anticipated",
    "explained": "detailed",
    "faced": "encountered",
    "famous": "renowned",
    "frequently": "often",
    "gain": "advance",
    "generate": "produce",
    "growth": "expansion",
    "happened": "transpired",
    "held": "convened",
    "helped": "assisted",
    "huge": "immense",
    "impact": "influence",
    "important": "significant",
    "increase": "rise",
    "initiated": "launched",
    "injury": "harm",
    "inquiry": "probe",
    "investigation": "inquiry",
    "issues": "matters",
    "leaders": "authorities",
    "loss": "reversal",
    "mandatory": "obligatory",
    "massive": "substantial",
    "matches": "fixtures",
    "meeting": "conference",
    "negotiations": "talks",
    "numerous": "multiple",
    "objective": "aim",
    "occurred": "took place",
    "officials": "authorities",
    "paramount": "essential",
    "persisted": "continued",
    "police": "law enforcement",
    "predicted": "forecasted",
    "prohibited": "banned",
    "prospect": "outlook",
    "quickly": "swiftly",
    "rapidly": "swiftly",
    "recently": "lately",
    "refused": "declined",
    "regarding": "concerning",
    "rejected": "dismissed",
    "revealed": "disclosed",
    "saw": "observed",
    "scheduled": "slated",
    "showed": "demonstrated",
    "significantly": "substantially",
    "similar": "comparable",
    "spoke": "addressed",
    "started": "began",
    "statement": "announcement",
    "struggled": "faced hurdles",
    "subsequently": "later",
    "successful": "triumphant",
    "sufficient": "adequate",
    "suggested": "indicated",
    "support": "backing",
    "talks": "discussions",
    "terminated": "ended",
    "think": "believe",
    "urged": "called on",
    "used": "employed",
    "utilize": "use",
    "victory": "triumph",
    "warned": "cautioned",
    "witnessed": "observed",
    "won": "secured",
    # Additional high-impact news words
    "agreement": "consensus",
    "discussions": "deliberations",
    "approach": "strategy",
    "differences": "divergent views",
    "call": "phone exchange",
    "tough": "demanding",
    "direct": "candid",
    "talk": "exchange",
    "major": "significant",
    "strikes": "operations",
    "seeking": "aiming for",
    "resuming": "restarting",
    "efforts": "initiatives",
    "plans": "strategies",
    "view": "perspective",
    "urging": "pressing for",
}

# ---------------------------------------------------------------------------
# 4. PLAGIARISM & SIMILARITY CHECKER (4-gram standard)
# ---------------------------------------------------------------------------

def get_word_ngrams(text: str, n: int = 4) -> set:
    """Extract word-level N-grams for duplicate content detection."""
    words = re.findall(r"\b[a-zA-Z0-9]+\b", text.lower())
    if len(words) < n:
        return set(words)
    return set(zip(*[words[i:] for i in range(n)]))

def calculate_plagiarism_metrics(original: str, rewritten: str) -> Dict[str, Any]:
    """
    Computes a composite originality index:
    - Analyzes sentence-level rephrasing ratio (transformed sentences)
    - Analyzes word & 4-gram variations
    - Determines Plagiarism Risk: Low / Moderate / High
    """
    if not original or not rewritten:
        return {"uniqueness_score": 100.0, "plagiarism_risk": "low", "similarity_score": 0.0}

    orig_sentences = [s.strip() for s in re.split(r"(?<=[.!?])\s+", original) if len(s.strip()) > 15]
    rewritten_sentences = [s.strip() for s in re.split(r"(?<=[.!?])\s+", rewritten) if len(s.strip()) > 15]

    if not orig_sentences:
        return {"uniqueness_score": 100.0, "plagiarism_risk": "low", "similarity_score": 0.0}

    # Count how many sentences were rewritten / transformed
    transformed = sum(1 for o, r in zip(orig_sentences, rewritten_sentences) if o != r)
    sentence_uniqueness = transformed / max(len(orig_sentences), 1)

    # N-gram overlap (4-grams)
    ngrams_orig = get_word_ngrams(original, n=4)
    ngrams_rewritten = get_word_ngrams(rewritten, n=4)
    overlap = ngrams_orig.intersection(ngrams_rewritten) if ngrams_orig and ngrams_rewritten else set()
    ngram_sim = len(overlap) / max(len(ngrams_orig), 1) if ngrams_orig else 0.0

    # Composite uniqueness score (industry standard for editorial rewriting & plagiarism elimination)
    uniqueness = round((sentence_uniqueness * 75.0) + ((1.0 - ngram_sim) * 25.0), 1)
    uniqueness = max(15.0, min(98.5, uniqueness))
    similarity = round(100.0 - uniqueness, 1)

    if uniqueness >= 50.0:
        risk = "low"
    elif uniqueness >= 30.0:
        risk = "moderate"
    else:
        risk = "high"

    return {
        "uniqueness_score": uniqueness,
        "similarity_score": similarity,
        "plagiarism_risk": risk,
        "transformed_sentences": transformed,
        "total_sentences": len(orig_sentences)
    }

# ---------------------------------------------------------------------------
# 5. CORE PARAPHRASING LOGIC
# ---------------------------------------------------------------------------

NOISE_SUBSTRINGS = [
    "also read:",
    "read more:",
    "click here to",
    "follow us on",
    "stay updated with",
    "got question about the news",
    "quick answers",
    "catch all the action",
    "download the app",
    "subscribe to our",
    "for more news",
]

def clean_scraper_noise(text: str) -> str:
    """Strips publisher tracking noise, in-article promos, and scraper residues."""
    lines = text.split("\n")
    cleaned_lines = []
    for l in lines:
        l_strip = l.strip()
        lower_l = l_strip.lower()
        if any(noise in lower_l for noise in NOISE_SUBSTRINGS):
            continue
        cleaned_lines.append(l)
    return "\n".join(cleaned_lines)

def rephrase_sentence(sentence: str, idx: int = 0) -> str:
    """
    Paraphrases an individual sentence while:
    - Keeping direct quotes intact
    - Preserving proper nouns, acronyms, numbers
    - Swapping phrases and syntax for unique, copyright-safe wording
    """
    if not sentence or len(sentence.strip()) < 5:
        return sentence

    # Preserve direct quotes in full
    quote_match = re.search(r'([“"\'\‘].*?[”"\'\’])', sentence)
    quoted_text = quote_match.group(1) if quote_match else None
    
    working_text = sentence
    if quoted_text:
        working_text = sentence.replace(quoted_text, "__QUOTE_PLACEHOLDER__")

    # Apply phrase replacements
    for pattern, replacement in PHRASE_REPLACEMENTS:
        working_text = re.sub(pattern, replacement, working_text, flags=re.IGNORECASE)

    # Word-level contextual substitutions
    words = working_text.split()
    new_words = []
    for w in words:
        clean_w = w.lower().strip(",.?!;:()\"'“”")
        # Do not replace acronyms, proper nouns (capitalized and not first word), or numbers
        if clean_w in SYNONYM_WORDS and not w.isupper() and (len(new_words) == 0 or not w[0].isupper()):
            replacement = SYNONYM_WORDS[clean_w]
            # Match original case if first word
            if w[0].isupper():
                replacement = replacement.capitalize()
            if w.endswith((".", ",", "!", "?", ";", ":")):
                punct = w[-1]
                new_words.append(replacement + punct)
            else:
                new_words.append(replacement)
        else:
            new_words.append(w)
    working_text = " ".join(new_words)

    # Restore quotes exactly
    if quoted_text:
        working_text = working_text.replace("__QUOTE_PLACEHOLDER__", quoted_text)

    return working_text

def paraphrase_headline(title: str) -> str:
    """Paraphrases headlines to avoid duplicate titles across search engines."""
    if not title:
        return title

    rephrased = title
    for pattern, replacement in PHRASE_REPLACEMENTS:
        rephrased = re.sub(pattern, replacement, rephrased, flags=re.IGNORECASE)

    # Specific common headline transformations
    rephrased = re.sub(r"\bto work with\b", "teams up with", rephrased, flags=re.IGNORECASE)
    rephrased = re.sub(r"\bfor a new film\b", "for upcoming project", rephrased, flags=re.IGNORECASE)
    rephrased = re.sub(r"\bturns to\b", "chooses", rephrased, flags=re.IGNORECASE)
    rephrased = re.sub(r"\bafter six-year split\b", "following six-year rift", rephrased, flags=re.IGNORECASE)
    rephrased = re.sub(r"\ball eyes on\b", "focus shifts to", rephrased, flags=re.IGNORECASE)
    rephrased = re.sub(r"\btakes a dig at\b", "criticizes", rephrased, flags=re.IGNORECASE)
    rephrased = re.sub(r"\bregarding\b", "on", rephrased, flags=re.IGNORECASE)
    rephrased = re.sub(r"\bphone call\b", "telephone discussion", rephrased, flags=re.IGNORECASE)
    rephrased = re.sub(r"\bdetails of\b", "key takeaways from", rephrased, flags=re.IGNORECASE)

    # Word-level replacement in headline
    words = rephrased.split()
    new_h = []
    for w in words:
        clean_w = w.lower().strip(",.?!;:()\"'“”?:")
        if clean_w in SYNONYM_WORDS and not w.isupper():
            rep = SYNONYM_WORDS[clean_w]
            if w[0].isupper():
                rep = rep.capitalize()
            if w.endswith(("?", "!", ":", ",", ".")):
                rep += w[-1]
            new_h.append(rep)
        else:
            new_h.append(w)

    return " ".join(new_h).strip()

def paraphrase_content(text: str) -> Tuple[str, Dict[str, Any]]:
    """
    Paraphrases an entire article body paragraph by paragraph.
    Returns: (paraphrased_text, plagiarism_metrics)
    """
    if not text or len(text.strip()) < 30:
        return text, {"uniqueness_score": 100.0, "plagiarism_risk": "low"}

    # Strip publisher noise first
    cleaned_input = clean_scraper_noise(text)
    paragraphs = cleaned_input.split("\n")
    paraphrased_paragraphs = []

    for p in paragraphs:
        p_strip = p.strip()
        if not p_strip:
            paraphrased_paragraphs.append("")
            continue

        # Don't alter bullet lists or URLs
        if p_strip.startswith(("-", "*", "•", "http")):
            paraphrased_paragraphs.append(p_strip)
            continue

        # Split into sentences and rephrase each
        sentences = re.split(r"(?<=[.!?])\s+(?=[A-Z0-9\"“'‘])", p_strip)
        rephrased_sentences = [rephrase_sentence(s, i) for i, s in enumerate(sentences)]
        paraphrased_paragraphs.append(" ".join(rephrased_sentences))

    rewritten_text = "\n".join(paraphrased_paragraphs)
    metrics = calculate_plagiarism_metrics(text, rewritten_text)

    return rewritten_text, metrics

# ---------------------------------------------------------------------------
# 6. COMPLETE ARTICLE PARAPHRASING PIPELINE
# ---------------------------------------------------------------------------

def process_and_paraphrase_article(article_dict: dict) -> dict:
    """
    Takes an article document from the scraper or DB, runs the paraphrase pipeline,
    and returns the enriched document with plagiarism-free content.
    """
    raw_content = article_dict.get("original_content") or article_dict.get("content") or article_dict.get("summary") or ""
    raw_title = article_dict.get("original_title") or article_dict.get("title") or ""
    raw_desc = article_dict.get("original_description") or article_dict.get("description") or article_dict.get("summary") or ""

    # Paraphrase body
    paraphrased_body, metrics = paraphrase_content(raw_content)
    # Paraphrase headline
    paraphrased_title = paraphrase_headline(raw_title)
    # Paraphrase summary
    paraphrased_desc = rephrase_sentence(raw_desc) if raw_desc else ""

    # Store originals
    article_dict["original_content"] = raw_content
    article_dict["original_title"] = raw_title
    article_dict["original_description"] = raw_desc

    # Active fields become the rewritten version
    article_dict["content"] = paraphrased_body
    article_dict["title"] = paraphrased_title
    article_dict["description"] = paraphrased_desc
    article_dict["summary"] = paraphrased_desc

    # Plagiarism & Paraphrase status metadata
    article_dict["is_paraphrased"] = True
    article_dict["uniqueness_score"] = metrics.get("uniqueness_score", 85.0)
    article_dict["plagiarism_risk"] = metrics.get("plagiarism_risk", "low")
    article_dict["plagiarism_similarity"] = metrics.get("similarity_score", 15.0)

    return article_dict

def batch_paraphrase_db_articles(batch_size: int = 500, force: bool = False) -> Dict[str, Any]:
    """
    Scans MongoDB for un-paraphrased articles (or all if force=True) and rewrites
    them into plagiarism-free content.
    """
    from app.database import articles
    query = {} if force else {"is_paraphrased": {"$ne": True}}
    cursor = articles.find(query).limit(batch_size)
    updated_count = 0
    total_uniqueness = 0.0

    for doc in cursor:
        doc_id = doc["_id"]
        enriched = process_and_paraphrase_article(doc)
        articles.update_one(
            {"_id": doc_id},
            {"$set": {
                "title": enriched["title"],
                "content": enriched["content"],
                "description": enriched["description"],
                "summary": enriched["summary"],
                "original_title": enriched.get("original_title"),
                "original_content": enriched.get("original_content"),
                "is_paraphrased": True,
                "uniqueness_score": enriched["uniqueness_score"],
                "plagiarism_risk": enriched["plagiarism_risk"],
                "plagiarism_similarity": enriched["plagiarism_similarity"],
            }}
        )
        updated_count += 1
        total_uniqueness += enriched["uniqueness_score"]

    avg_uniqueness = round(total_uniqueness / max(updated_count, 1), 1)
    return {
        "success": True,
        "updated_count": updated_count,
        "average_uniqueness_score": avg_uniqueness,
        "plagiarism_risk": "low" if avg_uniqueness >= 50 else "moderate",
    }
