from flask import Flask, request, jsonify
from flask_cors import CORS
import anthropic
import json
import os
import time
import mysql.connector

from dotenv import load_dotenv

app = Flask(__name__)
CORS(app)
load_dotenv()

API_KEY = os.environ.get("ANTHROPIC_API_KEY")

# MySQL config — match your application.properties
DB_CONFIG = {
    "host": os.environ.get("DB_HOST", "localhost"),
    "user": os.environ.get("DB_USER", "root"),
    "password": os.environ.get("DB_PASSWORD"),
    "database": os.environ.get("DB_NAME", "laptopai")
}

SENTIMENT_PROMPT = """You are a laptop review analyst. Search the web for reviews of the laptop "{laptop_name}" by {brand}.

Find 1-2 real reviews and analyze sentiment for these aspects:
performance, battery, thermals, value, build_quality.

Return ONLY valid JSON, no markdown, no extra text:
{{
  "laptop": "{laptop_name}",
  "overall_sentiment": <float -1.0 to 1.0>,
  "score_modifier": <float 0.7 to 1.3>,
  "aspects": {{
    "performance":  {{"score": <float -1.0 to 1.0>, "label": "<Excellent|Good|Mixed|Poor>", "snippet": "<under 15 words>"}},
    "battery":      {{"score": <float -1.0 to 1.0>, "label": "<Excellent|Good|Mixed|Poor>", "snippet": "<under 15 words>"}},
    "thermals":     {{"score": <float -1.0 to 1.0>, "label": "<Excellent|Good|Mixed|Poor>", "snippet": "<under 15 words>"}},
    "value":        {{"score": <float -1.0 to 1.0>, "label": "<Excellent|Good|Mixed|Poor>", "snippet": "<under 15 words>"}},
    "build_quality":{{"score": <float -1.0 to 1.0>, "label": "<Excellent|Good|Mixed|Poor>", "snippet": "<under 15 words>"}}
  }},
  "review_sources": ["<source>"]
}}

score_modifier rules:
- overall_sentiment > 0.5  -> 1.1 to 1.3
- overall_sentiment 0 to 0.5 -> 1.0 to 1.1
- overall_sentiment -0.5 to 0 -> 0.85 to 1.0
- overall_sentiment < -0.5 -> 0.7 to 0.85
"""
if not API_KEY:
    raise RuntimeError("ANTHROPIC_API_KEY environment variable is not set")

def get_db():
    return mysql.connector.connect(**DB_CONFIG)


def get_cached_sentiment(laptop_name):
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute(
            "SELECT sentiment_json FROM laptop_sentiment_cache WHERE laptop_name = %s",
            (laptop_name,)
        )
        row = cursor.fetchone()
        cursor.close()
        conn.close()
        if row:
            print(f"CACHE HIT: {laptop_name}")
            return json.loads(row[0])
        return None
    except Exception as e:
        print(f"Cache read error: {e}")
        return None


def save_cached_sentiment(laptop_name, brand, sentiment):
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute(
            """INSERT INTO laptop_sentiment_cache (laptop_name, brand, sentiment_json)
               VALUES (%s, %s, %s)
               ON DUPLICATE KEY UPDATE
               sentiment_json = VALUES(sentiment_json),
               created_at = CURRENT_TIMESTAMP""",
            (laptop_name, brand, json.dumps(sentiment))
        )
        conn.commit()
        cursor.close()
        conn.close()
        print(f"CACHE SAVED: {laptop_name}")
    except Exception as e:
        print(f"Cache write error: {e}")


def parse_json_from_text(text):
    text = text.strip()
    try:
        return json.loads(text)
    except:
        pass
    start = text.find('{')
    if start >= 0:
        depth = 0
        for i in range(start, len(text)):
            if text[i] == '{': depth += 1
            elif text[i] == '}': depth -= 1
            if depth == 0:
                try:
                    return json.loads(text[start:i+1])
                except:
                    break
    return None


def fallback_sentiment(laptop_name):
    return {
        "laptop": laptop_name,
        "overall_sentiment": 0.0,
        "score_modifier": 1.0,
        "aspects": {
            "performance":  {"score": 0.0, "label": "Mixed", "snippet": "No review data available"},
            "battery":      {"score": 0.0, "label": "Mixed", "snippet": "No review data available"},
            "thermals":     {"score": 0.0, "label": "Mixed", "snippet": "No review data available"},
            "value":        {"score": 0.0, "label": "Mixed", "snippet": "No review data available"},
            "build_quality":{"score": 0.0, "label": "Mixed", "snippet": "No review data available"}
        },
        "review_sources": []
    }


@app.route('/sentiment', methods=['POST'])
def analyse_sentiment():
    data = request.get_json()
    laptop_name = data.get('laptopName', '')
    brand = data.get('brand', '')

    if not laptop_name:
        return jsonify({'error': 'laptopName is required'}), 400

    # Check cache first — no API call needed if cached
    cached = get_cached_sentiment(laptop_name)
    if cached:
        return jsonify(cached)

    # Not in cache — call Claude with delay to avoid rate limits
    time.sleep(2)
    client = anthropic.Anthropic(api_key=API_KEY)

    try:
        response = client.messages.create(
            model="claude-sonnet-4-5",
            max_tokens=800,
            tools=[{"type": "web_search_20250305", "name": "web_search"}],
            messages=[{
                "role": "user",
                "content": SENTIMENT_PROMPT.format(
                    laptop_name=laptop_name,
                    brand=brand
                )
            }]
        )

        full_text = ""
        for block in response.content:
            if hasattr(block, 'type') and block.type == 'text':
                full_text += block.text

        result = parse_json_from_text(full_text)

        if result:
            save_cached_sentiment(laptop_name, brand, result)
            return jsonify(result)
        else:
            return jsonify(fallback_sentiment(laptop_name))

    except Exception as e:
        print(f"Error analysing sentiment: {e}")
        return jsonify(fallback_sentiment(laptop_name))


@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok', 'service': 'sentiment-analysis'})


if __name__ == '__main__':
    app.run(port=5000, debug=True)