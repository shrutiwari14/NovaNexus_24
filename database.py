def get_connection():
    # Will set up and return a SQLite connection.
    pass

# database.py
from collections import defaultdict

_confusion_counts = defaultdict(int)
_flagged_log = []  # optional: keeps a simple history with timestamps

def flag_topic(topic: str):
    _confusion_counts[topic] += 1
    return _confusion_counts[topic]

def get_confusion_summary():
    summary = [
        {"topic": topic, "count": count}
        for topic, count in _confusion_counts.items()
    ]
    summary.sort(key=lambda x: x["count"], reverse=True)
    return summary
