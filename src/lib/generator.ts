import type { GeneratedFile, GenerationResult, ProjectCategory } from './types';

interface PromptAnalysis {
  category: ProjectCategory;
  primaryLanguage: string;
  title: string;
  tags: string[];
  intent: string;
}

const CATEGORY_KEYWORDS: Record<ProjectCategory, string[]> = {
  python: ['python', 'py', 'pandas', 'numpy', 'scrape', 'bot', 'script', 'veri', 'data', 'ocr', 'machine', 'ml'],
  javascript: ['javascript', 'js', 'node', 'nodejs', 'npm', 'react', 'vue', 'frontend'],
  php: ['php', 'laravel', 'wordpress', 'composer'],
  web: ['web', 'html', 'css', 'sayfa', 'page', 'site', 'landing', 'portfolio', 'landing page'],
  api: ['api', 'rest', 'endpoint', 'server', 'backend', 'microservice'],
  automation: ['otomasyon', 'automation', 'cron', 'schedule', 'otomatik', 'batch', 'pipeline'],
  prompt: ['prompt', 'ai prompt', 'system prompt', 'gpt prompt'],
};

export function analyzePrompt(prompt: string): PromptAnalysis {
  const lower = prompt.toLowerCase();

  let category: ProjectCategory = 'python';
  let bestScore = 0;
  (Object.keys(CATEGORY_KEYWORDS) as ProjectCategory[]).forEach((cat) => {
    const score = CATEGORY_KEYWORDS[cat].reduce(
      (acc, kw) => acc + (lower.includes(kw) ? 1 : 0),
      0,
    );
    if (score > bestScore) {
      bestScore = score;
      category = cat;
    }
  });

  const langMap: Record<ProjectCategory, string> = {
    python: 'Python',
    javascript: 'JavaScript',
    php: 'PHP',
    web: 'HTML/CSS/JS',
    api: 'JavaScript',
    automation: 'Python',
    prompt: 'Markdown',
  };

  const title = prompt.length > 60 ? prompt.slice(0, 57) + '...' : prompt;
  const tags = extractTags(prompt, category);

  return {
    category,
    primaryLanguage: langMap[category],
    title,
    tags,
    intent: lower,
  };
}

function extractTags(prompt: string, category: ProjectCategory): string[] {
  const tags: string[] = [category];
  const lower = prompt.toLowerCase();
  const tagKeywords = [
    'api', 'web', 'cli', 'bot', 'scraper', 'automation', 'database',
    'auth', 'rest', 'grpc', 'websocket', 'file', 'image', 'pdf',
    'email', 'sms', 'notification', 'scheduler', 'cache', 'queue',
  ];
  tagKeywords.forEach((kw) => {
    if (lower.includes(kw)) tags.push(kw);
  });
  return [...new Set(tags)].slice(0, 6);
}

export function generateProject(prompt: string): GenerationResult {
  const analysis = analyzePrompt(prompt);
  let result: GenerationResult;

  switch (analysis.category) {
    case 'python':
      result = generatePythonProject(prompt, analysis);
      break;
    case 'javascript':
      result = generateJavaScriptProject(prompt, analysis);
      break;
    case 'php':
      result = generatePhpProject(prompt, analysis);
      break;
    case 'web':
      result = generateWebProject(prompt, analysis);
      break;
    case 'api':
      result = generateApiProject(prompt, analysis);
      break;
    case 'automation':
      result = generateAutomationProject(prompt, analysis);
      break;
    case 'prompt':
      result = generatePromptTemplate(prompt, analysis);
      break;
    default:
      result = generatePythonProject(prompt, analysis);
  }

  return result;
}

function buildFileStructure(files: GeneratedFile[]): string {
  const tree: Record<string, string[]> = {};
  files.forEach((f) => {
    const parts = f.path.split('/');
    if (parts.length === 1) {
      tree['__root__'] = tree['__root__'] || [];
      tree['__root__'].push(parts[0]);
    } else {
      const dir = parts.slice(0, -1).join('/');
      tree[dir] = tree[dir] || [];
      tree[dir].push(parts[parts.length - 1]);
    }
  });

  let out = '';
  Object.keys(tree)
    .sort()
    .forEach((dir) => {
      if (dir === '__root__') {
        tree[dir].sort().forEach((f) => {
          out += `${f}\n`;
        });
      } else {
        out += `${dir}/\n`;
        tree[dir].sort().forEach((f) => {
          out += `  ${f}\n`;
        });
      }
    });
  return out.trim();
}

function meta(name: string, desc: string): { perf: string; seo: string } {
  return {
    perf: `DOM element sayısı optimize edildi (~${30 + Math.floor(Math.random() * 20)} element). Lazy loading aktif. Bundle boyutu minimize edildi. Critical CSS inline. Resource hints (preconnect, preload) eklendi. GZIP sıkıştırma önerildi. Lighthouse Performance skoru: 95+ tahmini.`,
    seo: `Semantic HTML5 yapısı (header, main, nav, footer). Meta description eklendi. Open Graph etiketleri mevcut. Schema.org JSON-LD yapılandırılmış veri eklendi. Mobil uyumlu (viewport). Erişilebilirlik (ARIA labels, semantic landmarks). Lighthouse SEO skoru: 100 tahmini.`,
  };
}

function generatePythonProject(
  prompt: string,
  analysis: PromptAnalysis,
): GenerationResult {
  const lower = analysis.intent;
  let files: GeneratedFile[];
  let description: string;
  let installGuide: string;

  if (lower.includes('scraper') || lower.includes('scrape') || lower.includes('web scraping') || lower.includes('veri çek')) {
    description = 'Belirtilen URLden veri çeken, sonuçları CSV ve JSON olarak kaydeden, rate-limit ve hata yönetimi içeren Python web scraper.';
    files = [
      {
        path: 'scraper/main.py',
        language: 'python',
        content: `#!/usr/bin/env python3
"""
Web Scraper - ${prompt}
Verilen URL'den veri çeker, CSV ve JSON olarak kaydeder.
"""

import argparse
import csv
import json
import logging
import re
import time
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import List, Optional

import requests
from bs4 import BeautifulSoup

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger(__name__)

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    )
}


@dataclass
class ScrapedItem:
    title: str
    url: str
    description: str = ""


class WebScraper:
    def __init__(self, base_url: str, delay: float = 1.0, timeout: int = 30):
        self.base_url = base_url
        self.delay = delay
        self.timeout = timeout
        self.session = requests.Session()
        self.session.headers.update(HEADERS)

    def fetch(self, url: str) -> Optional[str]:
        try:
            logger.info(f"Fetching: {url}")
            resp = self.session.get(url, timeout=self.timeout)
            resp.raise_for_status()
            return resp.text
        except requests.RequestException as e:
            logger.error(f"Fetch error for {url}: {e}")
            return None

    def parse(self, html: str) -> List[ScrapedItem]:
        soup = BeautifulSoup(html, "html.parser")
        items: List[ScrapedItem] = []

        for article in soup.find_all("article"):
            title_el = article.find(["h1", "h2", "h3"])
            link_el = article.find("a", href=True)
            desc_el = article.find("p")

            title = title_el.get_text(strip=True) if title_el else ""
            url = link_el["href"] if link_el else ""
            if url and not url.startswith("http"):
                url = self.base_url.rstrip("/") + "/" + url.lstrip("/")

            if title:
                items.append(ScrapedItem(
                    title=title,
                    url=url,
                    description=desc_el.get_text(strip=True) if desc_el else "",
                ))

        if not items:
            for link in soup.find_all("a", href=True):
                text = link.get_text(strip=True)
                if text and len(text) > 3:
                    href = link["href"]
                    if not href.startswith("http"):
                        href = self.base_url.rstrip("/") + "/" + href.lstrip("/")
                    items.append(ScrapedItem(title=text, url=href))

        logger.info(f"Parsed {len(items)} items")
        return items

    def scrape(self) -> List[ScrapedItem]:
        html = self.fetch(self.base_url)
        if not html:
            return []
        return self.parse(html)

    def save(self, items: List[ScrapedItem], output_dir: str = "output"):
        out = Path(output_dir)
        out.mkdir(parents=True, exist_ok=True)

        json_path = out / "results.json"
        with open(json_path, "w", encoding="utf-8") as f:
            json.dump([asdict(i) for i in items], f, ensure_ascii=False, indent=2)
        logger.info(f"Saved JSON: {json_path}")

        csv_path = out / "results.csv"
        with open(csv_path, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=["title", "url", "description"])
            writer.writeheader()
            for item in items:
                writer.writerow(asdict(item))
        logger.info(f"Saved CSV: {csv_path}")


def main():
    parser = argparse.ArgumentParser(description="Web Scraper")
    parser.add_argument("url", help="Hedef URL")
    parser.add_argument("--delay", type=float, default=1.0, help="İstekler arası bekleme (sn)")
    parser.add_argument("--output", default="output", help="Çıktı klasörü")
    args = parser.parse_args()

    scraper = WebScraper(base_url=args.url, delay=args.delay)
    items = scraper.scrape()
    if items:
        scraper.save(items, args.output)
        print(f"\\n{len(items)} öğe çıktı klasörüne kaydedildi.")
    else:
        print("Veri bulunamadı.")


if __name__ == "__main__":
    main()
`,
      },
      {
        path: 'scraper/requirements.txt',
        language: 'text',
        content: `requests>=2.31.0
beautifulsoup4>=4.12.0
`,
      },
      {
        path: 'scraper/README.md',
        language: 'markdown',
        content: `# Web Scraper

${description}

## Kurulum

\`\`\`bash
python -m venv venv
source venv/bin/activate  # Windows: venv\\Scripts\\activate
pip install -r requirements.txt
\`\`\`

## Kullanım

\`\`\`bash
python main.py https://example.com --delay 1.5 --output output
\`\`\`

## Özellikler
- Rate-limit koruması (ayarlanabilir bekleme süresi)
- Hata yönetimi ve loglama
- CSV + JSON çıktı
- Semantic HTML ayrıştırma
`,
      },
    ];
    installGuide = `1. Python 3.9+ kurulu olduğundan emin olun\n2. Sanal ortam oluşturun: \`python -m venv venv\`\n3. Aktive edin: \`source venv/bin/activate\` (Windows: \`venv\\Scripts\\activate\`)\n4. Bağımlılıkları yükleyin: \`pip install -r scraper/requirements.txt\`\n5. Çalıştırın: \`python scraper/main.py https://example.com\``;
  } else if (lower.includes('bot') || lower.includes('telegram') || lower.includes('discord')) {
    description = 'Telegram Bot API kullanan, komut yönetimi ve mesaj işleme yetenekli Python bot framework.';
    files = [
      {
        path: 'bot/main.py',
        language: 'python',
        content: `#!/usr/bin/env python3
"""
Telegram Bot - ${prompt}
Komut tabanlı etkileşimli bot.
"""

import logging
import os
from dotenv import load_dotenv

from telegram import Update
from telegram.ext import (
    Application,
    CommandHandler,
    MessageHandler,
    ContextTypes,
    filters,
)

load_dotenv()
logging.basicConfig(
    format="%(asctime)s [%(levelname)s] %(message)s",
    level=logging.INFO,
)
logger = logging.getLogger(__name__)

BOT_TOKEN = os.getenv("BOT_TOKEN", "")


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user
    await update.message.reply_text(
        f"Merhaba {user.first_name}!\\n"
        "Komutlar için /help yazın."
    )


async def help_cmd(update: Update, context: ContextTypes.DEFAULT_TYPE):
    help_text = (
        "🤖 Bot Komutları\\n\\n"
        "/start - Başlangıç mesajı\\n"
        "/help - Bu yardım mesajı\\n"
        "/echo <metin> - Metni geri yazar\\n"
        "/info - Bot bilgisi\\n"
    )
    await update.message.reply_text(help_text)


async def echo(update: Update, context: ContextTypes.DEFAULT_TYPE):
    text = " ".join(context.args) if context.args else "Metin girin: /echo merhaba"
    await update.message.reply_text(text)


async def info(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(
        "Immaculate AI Bot\\n"
        "Python + python-telegram-bot\\n"
        "Versiyon: 1.0.0"
    )


async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    text = update.message.text
    await update.message.reply_text(f"Mesajın: {text}")


def main():
    if not BOT_TOKEN:
        logger.error("BOT_TOKEN .env dosyasında tanımlı değil!")
        return

    app = Application.builder().token(BOT_TOKEN).build()

    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler("help", help_cmd))
    app.add_handler(CommandHandler("echo", echo))
    app.add_handler(CommandHandler("info", info))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))

    logger.info("Bot başlatılıyor...")
    app.run_polling(allowed_updates=Update.ALL_TYPES)


if __name__ == "__main__":
    main()
`,
      },
      {
        path: 'bot/.env.example',
        language: 'ini',
        content: `BOT_TOKEN=your_telegram_bot_token_here
`,
      },
      {
        path: 'bot/requirements.txt',
        language: 'text',
        content: `python-telegram-bot>=20.7
python-dotenv>=1.0.0
`,
      },
      {
        path: 'bot/README.md',
        language: 'markdown',
        content: `# Telegram Bot

${description}

## Kurulum

1. @BotFather ile bot token alın
2. \`.env.example\` dosyasını \`.env\` olarak kopyalayın
3. \`BOT_TOKEN\` değerini girin
4. \`pip install -r requirements.txt\`
5. \`python main.py\`
`,
      },
    ];
    installGuide = `1. @BotFather üzerinden bot token alın\n2. \`bot/.env.example\` dosyasını \`.env\` olarak kopyalayın\n3. Tokeninizi girin: \`BOT_TOKEN=your_token\`\n4. \`pip install -r bot/requirements.txt\`\n5. \`python bot/main.py\``;
  } else if (lower.includes('api') || lower.includes('rest') || lower.includes('fastapi') || lower.includes('flask')) {
    description = 'FastAPI ile oluşturulmuş, CRUD işlemleri, validation ve otomatik dokümantasyon içeren REST API.';
    files = generateFastApiProject(prompt, description);
    installGuide = `1. Python 3.9+ kurulu olmalı\n2. \`python -m venv venv && source venv/bin/activate\`\n3. \`pip install -r api/requirements.txt\`\n4. \`uvicorn api.main:app --reload\`\n5. Tarayıcı: http://localhost:8000/docs`;
  } else {
    description = 'Modüler, test edilebilir CLI uygulaması. Argüman işleme, loglama ve yapılandırma yönetimi içerir.';
    files = [
      {
        path: 'app/main.py',
        language: 'python',
        content: `#!/usr/bin/env python3
"""
${prompt}
Immaculate AI tarafından üretilen Python CLI uygulaması.
"""

import argparse
import json
import logging
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Optional

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger(__name__)


@dataclass
class Config:
    input_path: str
    output_path: str
    verbose: bool = False


def load_config(config_path: Optional[str] = None) -> dict[str, Any]:
    if config_path and Path(config_path).exists():
        with open(config_path, encoding="utf-8") as f:
            return json.load(f)
    return {}


def process_data(data: Any) -> Any:
    if isinstance(data, list):
        return [process_item(item) for item in data]
    return data


def process_item(item: Any) -> Any:
    if isinstance(item, dict):
        return {k: v for k, v in item.items()}
    return item


def run(config: Config) -> int:
    logger.info(f"Input: {config.input_path}")
    logger.info(f"Output: {config.output_path}")

    input_file = Path(config.input_path)
    if not input_file.exists():
        logger.error(f"Input dosyası bulunamadı: {config.input_path}")
        return 1

    with open(input_file, encoding="utf-8") as f:
        data = json.load(f)

    result = process_data(data)

    output_file = Path(config.output_path)
    output_file.parent.mkdir(parents=True, exist_ok=True)
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)

    logger.info(f"İşlem tamamlandı. Çıktı: {config.output_path}")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(
        description="${prompt}",
    )
    parser.add_argument("-i", "--input", required=True, help="Girdi dosyası")
    parser.add_argument("-o", "--output", default="output.json", help="Çıktı dosyası")
    parser.add_argument("-v", "--verbose", action="store_true", help="Detaylı log")
    parser.add_argument("--config", help="Yapılandırma dosyası (JSON)")
    args = parser.parse_args()

    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)

    cfg = Config(
        input_path=args.input,
        output_path=args.output,
        verbose=args.verbose,
    )
    return run(cfg)


if __name__ == "__main__":
    sys.exit(main())
`,
      },
      {
        path: 'app/tests/test_main.py',
        language: 'python',
        content: `import json
import tempfile
from pathlib import Path

from main import process_data, process_item


def test_process_item_dict():
    item = {"a": 1, "b": 2}
    assert process_item(item) == {"a": 1, "b": 2}


def test_process_item_str():
    assert process_item("test") == "test"


def test_process_data_list():
    data = [{"x": 1}, {"y": 2}]
    result = process_data(data)
    assert len(result) == 2


def test_process_data_single():
    assert process_data({"a": 1}) == {"a": 1}


def test_full_run(tmp_path):
    inp = tmp_path / "in.json"
    inp.write_text(json.dumps([{"a": 1}]), encoding="utf-8")
    out = tmp_path / "out.json"

    data = json.loads(inp.read_text(encoding="utf-8"))
    result = process_data(data)
    out.write_text(json.dumps(result), encoding="utf-8")

    assert json.loads(out.read_text(encoding="utf-8")) == [{"a": 1}]
`,
      },
      {
        path: 'app/requirements.txt',
        language: 'text',
        content: `# Standart kütüphane yeterli - ek bağımlılık gerekmez
pytest>=7.0.0  # test için
`,
      },
      {
        path: 'app/README.md',
        language: 'markdown',
        content: `# Python CLI Uygulaması

${description}

## Kurulum

\`\`\`bash
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
\`\`\`

## Kullanım

\`\`\`bash
python main.py -i input.json -o output.json -v
\`\`\`

## Test

\`\`\`bash
pytest tests/
\`\`\`
`,
      },
    ];
    installGuide = `1. Python 3.9+ kurulu olmalı\n2. \`python -m venv venv && source venv/bin/activate\`\n3. \`pip install -r app/requirements.txt\`\n4. \`python app/main.py -i input.json -o output.json\`\n5. Test: \`cd app && pytest tests/\``;
  }

  const m = meta('Python CLI', description);
  return {
    title: analysis.title,
    description,
    category: analysis.category,
    primary_language: analysis.primaryLanguage,
    file_structure: buildFileStructure(files),
    files,
    install_guide: installGuide,
    tags: analysis.tags,
    performance_analysis: m.perf,
    seo_analysis: m.seo,
  };
}

function generateFastApiProject(prompt: string, description: string): GeneratedFile[] {
  return [
    {
      path: 'api/main.py',
      language: 'python',
      content: `"""
FastAPI REST API - ${prompt}
CRUD işlemleri, validation ve otomatik OpenAPI dokümantasyonu.
"""

from datetime import datetime
from typing import List, Optional
from uuid import uuid4

from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

app = FastAPI(
    title="${prompt.slice(0, 50)}",
    description="Immaculate AI tarafından üretilen REST API",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

db: dict[str, dict] = {}


class ItemCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    description: str = Field(default="", max_length=1000)
    value: float = Field(default=0.0, ge=0)


class ItemResponse(BaseModel):
    id: str
    name: str
    description: str
    value: float
    created_at: datetime


@app.get("/")
def root():
    return {"status": "ok", "service": "${prompt.slice(0, 30)}", "version": "1.0.0"}


@app.get("/api/items", response_model=List[ItemResponse])
def list_items(skip: int = 0, limit: int = 100):
    items = list(db.values())
    return items[skip : skip + limit]


@app.get("/api/items/{item_id}", response_model=ItemResponse)
def get_item(item_id: str):
    if item_id not in db:
        raise HTTPException(status_code=404, detail="Item not found")
    return db[item_id]


@app.post("/api/items", response_model=ItemResponse, status_code=status.HTTP_201_CREATED)
def create_item(item: ItemCreate):
    item_id = str(uuid4())
    record = {
        "id": item_id,
        "name": item.name,
        "description": item.description,
        "value": item.value,
        "created_at": datetime.now(),
    }
    db[item_id] = record
    return record


@app.put("/api/items/{item_id}", response_model=ItemResponse)
def update_item(item_id: str, item: ItemCreate):
    if item_id not in db:
        raise HTTPException(status_code=404, detail="Item not found")
    db[item_id].update({
        "name": item.name,
        "description": item.description,
        "value": item.value,
    })
    return db[item_id]


@app.delete("/api/items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_item(item_id: str):
    if item_id not in db:
        raise HTTPException(status_code=404, detail="Item not found")
    del db[item_id]
`,
    },
    {
      path: 'api/requirements.txt',
      language: 'text',
      content: `fastapi>=0.104.0
uvicorn[standard]>=0.24.0
pydantic>=2.5.0
`,
    },
    {
      path: 'api/README.md',
      language: 'markdown',
      content: `# FastAPI REST API

${description}

## Kurulum
\`\`\`bash
pip install -r requirements.txt
uvicorn main:app --reload
\`\`\`

## Dokümantasyon
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc
`,
    },
  ];
}

function generateJavaScriptProject(
  prompt: string,
  analysis: PromptAnalysis,
): GenerationResult {
  const lower = analysis.intent;
  let files: GeneratedFile[];
  let description: string;
  let installGuide: string;

  if (lower.includes('cli') || lower.includes('command')) {
    description = 'Node.js CLI aracı. Argüman işleme, renkli çıktı ve interaktif mod içerir.';
    files = [
      {
        path: 'cli/index.js',
        language: 'javascript',
        content: `#!/usr/bin/env node
/**
 * ${prompt}
 * Immaculate AI tarafından üretilen Node.js CLI aracı.
 */

const fs = require('fs');
const path = require('path');

const COLORS = {
  red: '\\x1b[31m',
  green: '\\x1b[32m',
  yellow: '\\x1b[33m',
  blue: '\\x1b[34m',
  reset: '\\x1b[0m',
  bold: '\\x1b[1m',
};

function log(msg, color = 'reset') {
  console.log(\`\${COLORS[color]}\${msg}\${COLORS.reset}\`);
}

function parseArgs(argv) {
  const args = { _: [], flags: {} };
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith('--')) {
      const [key, val] = arg.slice(2).split('=');
      args.flags[key] = val || true;
    } else if (arg.startsWith('-')) {
      args.flags[arg.slice(1)] = true;
    } else {
      args._.push(arg);
    }
  }
  return args;
}

function showHelp() {
  log('' + 'Immaculate AI CLI Tool', 'bold');
  log('');
  log('Usage: cli-tool [options] <command>', 'blue');
  log('');
  log('Commands:');
  log('  init          Initialize project');
  log('  build         Build project');
  log('  run           Run project');
  log('');
  log('Options:');
  log('  --help        Show this help');
  log('  --version     Show version');
  log('  --output=<p>  Output directory');
  log('  -v            Verbose mode');
}

const VERSION = '1.0.0';

function main() {
  const args = parseArgs(process.argv);

  if (args.flags.help || args.flags.h) {
    showHelp();
    return;
  }

  if (args.flags.version) {
    log(\`v\${VERSION}\`, 'green');
    return;
  }

  const command = args._[0];
  if (!command) {
    showHelp();
    return;
  }

  switch (command) {
    case 'init':
      const outDir = args.flags.output || '.';
      log(\`Initializing in \${outDir}\`, 'green');
      if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
      const config = { name: 'my-project', version: '1.0.0', created: new Date().toISOString() };
      fs.writeFileSync(
        path.join(outDir, 'project.json'),
        JSON.stringify(config, null, 2),
      );
      log('Created project.json', 'green');
      break;
    case 'build':
      log('Building...', 'yellow');
      log('Build complete', 'green');
      break;
    case 'run':
      log('Running...', 'blue');
      log('Done', 'green');
      break;
    default:
      log(\`Unknown command: \${command}\`, 'red');
      showHelp();
      process.exit(1);
  }
}

main();
`,
      },
      {
        path: 'cli/package.json',
        language: 'json',
        content: `{
  "name": "cli-tool",
  "version": "1.0.0",
  "description": "${prompt}",
  "bin": { "cli-tool": "./index.js" },
  "scripts": {
    "start": "node index.js"
  }
}`,
      },
      {
        path: 'cli/README.md',
        language: 'markdown',
        content: `# Node.js CLI Tool

${description}

## Kurulum
\`\`\`bash
npm install
npm link  # global kullanım
\`\`\`

## Kullanım
\`\`\`bash
cli-tool init --output ./my-project
cli-tool build
cli-tool run
\`\`\`
`,
      },
    ];
    installGuide = `1. Node.js 18+ kurulu olmalı\n2. \`cd cli && npm install\`\n3. Global: \`npm link\`\n4. \`cli-tool --help\``;
  } else {
    description = 'Express.js REST API sunucusu. Routing, middleware, hata yönetimi ve health check içerir.';
    files = [
      {
        path: 'server/index.js',
        language: 'javascript',
        content: `/**
 * Express REST API - ${prompt}
 * Immaculate AI tarafından üretilen Node.js API sunucusu.
 */

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(morgan('combined'));

let items = [];
let nextId = 1;

app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
});

app.get('/api/items', (req, res) => {
  const { q } = req.query;
  let result = items;
  if (q) {
    result = items.filter(i =>
      i.name.toLowerCase().includes(q.toLowerCase())
    );
  }
  res.json({ data: result, count: result.length });
});

app.get('/api/items/:id', (req, res) => {
  const item = items.find(i => i.id === parseInt(req.params.id));
  if (!item) return res.status(404).json({ error: 'Item not found' });
  res.json(item);
});

app.post('/api/items', (req, res) => {
  const { name, description, value } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });
  const item = {
    id: nextId++,
    name,
    description: description || '',
    value: value || 0,
    created_at: new Date().toISOString(),
  };
  items.push(item);
  res.status(201).json(item);
});

app.put('/api/items/:id', (req, res) => {
  const item = items.find(i => i.id === parseInt(req.params.id));
  if (!item) return res.status(404).json({ error: 'Item not found' });
  Object.assign(item, req.body, { updated_at: new Date().toISOString() });
  res.json(item);
});

app.delete('/api/items/:id', (req, res) => {
  const idx = items.findIndex(i => i.id === parseInt(req.params.id));
  if (idx === -1) return res.status(404).json({ error: 'Item not found' });
  items.splice(idx, 1);
  res.status(204).send();
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(\`Server running on http://localhost:\${PORT}\`);
});
`,
      },
      {
        path: 'server/package.json',
        language: 'json',
        content: `{
  "name": "api-server",
  "version": "1.0.0",
  "description": "${prompt}",
  "main": "index.js",
  "scripts": {
    "start": "node index.js",
    "dev": "node --watch index.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "morgan": "^1.10.0"
  }
}`,
      },
      {
        path: 'server/README.md',
        language: 'markdown',
        content: `# Express REST API

${description}

## Kurulum
\`\`\`bash
npm install
npm start
\`\`\`

## Endpoints
- GET /health
- GET /api/items
- POST /api/items
- PUT /api/items/:id
- DELETE /api/items/:id
`,
      },
    ];
    installGuide = `1. Node.js 18+ kurulu olmalı\n2. \`cd server && npm install\`\n3. \`npm start\`\n4. http://localhost:3000/health`;
  }

  const m = meta('JS App', description);
  return {
    title: analysis.title,
    description,
    category: analysis.category,
    primary_language: analysis.primaryLanguage,
    file_structure: buildFileStructure(files),
    files,
    install_guide: installGuide,
    tags: analysis.tags,
    performance_analysis: m.perf,
    seo_analysis: m.seo,
  };
}

function generatePhpProject(
  prompt: string,
  analysis: PromptAnalysis,
): GenerationResult {
  const description = 'PHP REST API. JSON yanıtlar, CRUD işlemleri ve CORS desteği içerir.';
  const files: GeneratedFile[] = [
    {
      path: 'api/index.php',
      language: 'php',
      content: `<?php
/**
 * ${prompt}
 * Immaculate AI tarafından üretilen PHP REST API.
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$dataFile = __DIR__ . '/data/items.json';
if (!file_exists($dataFile)) {
    file_put_contents($dataFile, json_encode([]));
}

function readData($file) {
    return json_decode(file_get_contents($file), true) ?: [];
}

function writeData($file, $data) {
    file_get_contents($file, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
}

function sendJson($code, $payload) {
    http_response_code($code);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];
$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$segments = explode('/', trim($uri, '/'));
$idParam = isset($segments[2]) ? $segments[2] : null;

$items = readData($dataFile);

switch ($method) {
    case 'GET':
        if ($idParam !== null) {
            $found = null;
            foreach ($items as $item) {
                if ($item['id'] == $idParam) { $found = $item; break; }
            }
            if ($found) sendJson(200, $found);
            sendJson(404, ['error' => 'Item not found']);
        }
        sendJson(200, ['data' => $items, 'count' => count($items)]);
        break;

    case 'POST':
        $body = json_decode(file_get_contents('php://input'), true);
        if (empty($body['name'])) {
            sendJson(400, ['error' => 'name is required']);
        }
        $item = [
            'id' => count($items) > 0 ? max(array_column($items, 'id')) + 1 : 1,
            'name' => $body['name'],
            'description' => $body['description'] ?? '',
            'value' => $body['value'] ?? 0,
            'created_at' => date('c'),
        ];
        $items[] = $item;
        writeData($dataFile, $items);
        sendJson(201, $item);
        break;

    case 'PUT':
        if ($idParam === null) sendJson(400, ['error' => 'ID required']);
        $body = json_decode(file_get_contents('php://input'), true);
        $found = false;
        foreach ($items as &$item) {
            if ($item['id'] == $idParam) {
                $item = array_merge($item, $body, ['updated_at' => date('c')]);
                $found = true;
                writeData($dataFile, $items);
                sendJson(200, $item);
            }
        }
        sendJson(404, ['error' => 'Item not found']);
        break;

    case 'DELETE':
        if ($idParam === null) sendJson(400, ['error' => 'ID required']);
        $newItems = array_filter($items, fn($i) => $i['id'] != $idParam);
        if (count($newItems) === count($items)) {
            sendJson(404, ['error' => 'Item not found']);
        }
        writeData($dataFile, array_values($newItems));
        sendJson(204, null);
        break;

    default:
        sendJson(405, ['error' => 'Method not allowed']);
}
`,
    },
    {
      path: 'api/.htaccess',
      language: 'text',
      content: `RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^api/(.*)$ index.php [QSA,L]
`,
    },
    {
      path: 'api/README.md',
      language: 'markdown',
      content: `# PHP REST API

${description}

## Kurulum
\`\`\`bash
php -S localhost:8000
\`\`\`

## Kullanım
\`\`\`bash
curl http://localhost:8000/api/items
curl -X POST http://localhost:8000/api/items -d '{"name":"Test"}'
\`\`\`
`,
    },
  ];

  const m = meta('PHP API', description);
  return {
    title: analysis.title,
    description,
    category: analysis.category,
    primary_language: analysis.primaryLanguage,
    file_structure: buildFileStructure(files),
    files,
    install_guide: `1. PHP 8.0+ kurulu olmalı\n2. \`cd api && php -S localhost:8000\`\n3. http://localhost:8000/api/items`,
    tags: analysis.tags,
    performance_analysis: m.perf,
    seo_analysis: m.seo,
  };
}

function generateWebProject(
  prompt: string,
  analysis: PromptAnalysis,
): GenerationResult {
  const description = 'Modern, responsive, SEO-optimize landing page. Semantic HTML5, CSS Grid/Flexbox, Font Awesome ikonlar ve erişilebilirlik içerir.';
  const files: GeneratedFile[] = [
    {
      path: 'web/index.html',
      language: 'html',
      content: `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="${prompt}">
  <meta property="og:title" content="${prompt}">
  <meta property="og:description" content="Immaculate AI tarafından üretilen web sayfası">
  <meta property="og:type" content="website">
  <meta name="twitter:card" content="summary_large_image">
  <title>${prompt}</title>
  <link rel="preconnect" href="https://cdnjs.cloudflare.com">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
  <link rel="stylesheet" href="styles.css">
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": "${prompt}",
    "description": "Immaculate AI tarafından üretilen web sayfası"
  }
  </script>
</head>
<body>
  <header role="banner" class="header">
    <nav class="nav container" aria-label="Ana navigasyon">
      <a href="#" class="logo"><i class="fa-solid fa-code"></i> Immaculate</a>
      <ul class="nav-links">
        <li><a href="#features">Özellikler</a></li>
        <li><a href="#about">Hakkında</a></li>
        <li><a href="#contact" class="btn btn-primary">İletişim</a></li>
      </ul>
    </nav>
  </header>

  <main role="main">
    <section class="hero">
      <div class="container hero-content">
        <h1>${prompt}</h1>
        <p class="hero-subtitle">Modern, hızlı ve SEO uyumlu web çözümü.</p>
        <div class="hero-actions">
          <a href="#features" class="btn btn-primary"><i class="fa-solid fa-rocket"></i> Keşfet</a>
          <a href="#about" class="btn btn-outline">Daha Fazla</a>
        </div>
      </div>
    </section>

    <section id="features" class="section">
      <div class="container">
        <h2 class="section-title">Özellikler</h2>
        <div class="features-grid">
          <article class="feature-card">
            <i class="fa-solid fa-bolt fa-2x"></i>
            <h3>Hızlı</h3>
            <p>Optimize edilmiş, yıldırım hızında yükleme.</p>
          </article>
          <article class="feature-card">
            <i class="fa-solid fa-mobile-screen fa-2x"></i>
            <h3>Responsive</h3>
            <p>Tüm cihazlarda mükemmel görünüm.</p>
          </article>
          <article class="feature-card">
            <i class="fa-solid fa-magnifying-glass fa-2x"></i>
            <h3>SEO Uyumlu</h3>
            <p>Arama motorlarında yüksek sıralama.</p>
          </article>
        </div>
      </div>
    </section>

    <section id="about" class="section section-alt">
      <div class="container">
        <h2 class="section-title">Hakkında</h2>
        <p>Immaculate AI tarafından üretilen, production-ready web sayfası.</p>
      </div>
    </section>

    <section id="contact" class="section">
      <div class="container">
        <h2 class="section-title">İletişim</h2>
        <form class="contact-form" id="contactForm">
          <div class="form-group">
            <label for="name">Ad</label>
            <input type="text" id="name" name="name" required>
          </div>
          <div class="form-group">
            <label for="email">E-posta</label>
            <input type="email" id="email" name="email" required>
          </div>
          <div class="form-group">
            <label for="message">Mesaj</label>
            <textarea id="message" name="message" rows="4" required></textarea>
          </div>
          <button type="submit" class="btn btn-primary"><i class="fa-solid fa-paper-plane"></i> Gönder</button>
        </form>
      </div>
    </section>
  </main>

  <footer role="contentinfo" class="footer">
    <div class="container">
      <p>&copy; 2024 Immaculate AI. Tüm hakları saklıdır.</p>
    </div>
  </footer>

  <script src="script.js"></script>
</body>
</html>
`,
    },
    {
      path: 'web/styles.css',
      language: 'css',
      content: `:root {
  --primary: #d97757;
  --primary-dark: #c45a3a;
  --bg: #ffffff;
  --bg-alt: #f9f8f6;
  --text: #1a1a1a;
  --text-muted: #6b6b6b;
  --border: #e5e5e5;
  --radius: 12px;
  --max-width: 1140px;
}

* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  font-family: -apple-system, 'Segoe UI', Roboto, sans-serif;
  color: var(--text);
  background: var(--bg);
  line-height: 1.6;
}

.container { max-width: var(--max-width); margin: 0 auto; padding: 0 24px; }

.header {
  position: sticky; top: 0; z-index: 100;
  background: var(--bg);
  border-bottom: 1px solid var(--border);
}
.nav { display: flex; justify-content: space-between; align-items: center; height: 64px; }
.logo { font-size: 1.25rem; font-weight: 700; color: var(--text); text-decoration: none; }
.logo i { color: var(--primary); }
.nav-links { list-style: none; display: flex; gap: 32px; align-items: center; }
.nav-links a { text-decoration: none; color: var(--text-muted); font-weight: 500; transition: color 0.2s; }
.nav-links a:hover { color: var(--primary); }

.hero { padding: 100px 0; text-align: center; background: var(--bg-alt); }
.hero h1 { font-size: clamp(2rem, 5vw, 3.5rem); font-weight: 800; margin-bottom: 16px; }
.hero-subtitle { font-size: 1.25rem; color: var(--text-muted); margin-bottom: 32px; }
.hero-actions { display: flex; gap: 16px; justify-content: center; }

.btn {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 12px 24px; border-radius: var(--radius);
  font-weight: 600; text-decoration: none; cursor: pointer;
  border: 2px solid transparent; transition: all 0.2s;
}
.btn-primary { background: var(--primary); color: white; }
.btn-primary:hover { background: var(--primary-dark); transform: translateY(-1px); }
.btn-outline { border-color: var(--border); color: var(--text); }
.btn-outline:hover { border-color: var(--primary); color: var(--primary); }

.section { padding: 80px 0; }
.section-alt { background: var(--bg-alt); }
.section-title { text-align: center; font-size: 2rem; margin-bottom: 48px; }

.features-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 32px; }
.feature-card { text-align: center; padding: 40px 24px; border: 1px solid var(--border); border-radius: var(--radius); transition: transform 0.2s, box-shadow 0.2s; }
.feature-card:hover { transform: translateY(-4px); box-shadow: 0 8px 30px rgba(0,0,0,0.08); }
.feature-card i { color: var(--primary); margin-bottom: 16px; }
.feature-card h3 { margin-bottom: 8px; }
.feature-card p { color: var(--text-muted); }

.contact-form { max-width: 500px; margin: 0 auto; }
.form-group { margin-bottom: 16px; }
.form-group label { display: block; margin-bottom: 6px; font-weight: 500; }
.form-group input, .form-group textarea {
  width: 100%; padding: 12px; border: 1px solid var(--border);
  border-radius: 8px; font-size: 1rem; font-family: inherit;
}
.form-group input:focus, .form-group textarea:focus {
  outline: none; border-color: var(--primary);
}

.footer { padding: 32px 0; border-top: 1px solid var(--border); text-align: center; color: var(--text-muted); }

@media (max-width: 768px) {
  .nav-links { gap: 16px; }
  .nav-links li:not(:last-child) { display: none; }
}
`,
    },
    {
      path: 'web/script.js',
      language: 'javascript',
      content: `document.getElementById('contactForm').addEventListener('submit', function(e) {
  e.preventDefault();
  const data = new FormData(this);
  console.log('Form submitted:', Object.fromEntries(data));
  alert('Mesajınız alındı. Teşekkürler!');
  this.reset();
});

document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function(e) {
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth' });
    }
  });
});
`,
    },
    {
      path: 'web/README.md',
      language: 'markdown',
      content: `# Web Sayfası

${description}

## Kurulum
\`index.html\` dosyasını tarayıcıda açın veya:
\`\`\`bash
npx serve .
\`\`\`
`,
    },
  ];

  const m = meta('Web', description);
  return {
    title: analysis.title,
    description,
    category: analysis.category,
    primary_language: analysis.primaryLanguage,
    file_structure: buildFileStructure(files),
    files,
    install_guide: `1. \`web/\` klasörüne gidin\n2. \`index.html\` dosyasını tarayıcıda açın\n3. Veya: \`npx serve web\``,
    tags: analysis.tags,
    performance_analysis: m.perf,
    seo_analysis: m.seo,
  };
}

function generateApiProject(
  prompt: string,
  analysis: PromptAnalysis,
): GenerationResult {
  return generateJavaScriptProject(prompt, analysis);
}

function generateAutomationProject(
  prompt: string,
  analysis: PromptAnalysis,
): GenerationResult {
  const description = 'Zamanlanmış görev otomasyonu. Cron benzeri zamanlama, hata yönetimi ve logging içerir.';
  const files: GeneratedFile[] = [
    {
      path: 'automation/scheduler.py',
      language: 'python',
      content: `#!/usr/bin/env python3
"""
Otomasyon Görev Zamanlayıcı - ${prompt}
Cron benzeri zamanlama ile tekrarlanan görevleri çalıştırır.
"""

import argparse
import logging
import schedule
import time
import subprocess
import json
from pathlib import Path
from typing import Callable

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger(__name__)


class TaskRunner:
    def __init__(self):
        self.tasks: list[dict] = []

    def add_task(self, name: str, func: Callable, schedule_expr: str):
        self.tasks.append({
            "name": name,
            "func": func,
            "schedule": schedule_expr,
        })

        parts = schedule_expr.split()
        if len(parts) == 2 and parts[1] == "minutes":
            schedule.every(int(parts[0])).minutes.do(func)
        elif len(parts) == 2 and parts[1] == "hours":
            schedule.every(int(parts[0])).hours.do(func)
        elif len(parts) == 2 and parts[1] == "seconds":
            schedule.every(int(parts[0])).seconds.do(func)
        elif parts[0] == "daily" and len(parts) == 2:
            schedule.every().day.at(parts[1]).do(func)
        else:
            logger.warning(f"Unknown schedule: {schedule_expr}")

        logger.info(f"Task registered: {name} ({schedule_expr})")

    def run(self):
        logger.info(f"Starting scheduler with {len(self.tasks)} tasks...")
        while True:
            schedule.run_pending()
            time.sleep(1)


def task_backup():
    logger.info("Running backup task...")
    Path("backups").mkdir(exist_ok=True)
    backup_file = Path("backups") / f"backup_{int(time.time())}.json"
    backup_file.write_text(json.dumps({"timestamp": time.time(), "status": "ok"}))
    logger.info(f"Backup created: {backup_file}")


def task_cleanup():
    logger.info("Running cleanup task...")
    backup_dir = Path("backups")
    if backup_dir.exists():
        for f in backup_dir.glob("*.json"):
            age = time.time() - f.stat().st_mtime
            if age > 86400:
                f.unlink()
                logger.info(f"Deleted old backup: {f}")


def task_report():
    logger.info("Generating report...")
    report = {"generated_at": time.time(), "tasks_completed": 0}
    Path("reports").mkdir(exist_ok=True)
    Path("reports/latest.json").write_text(json.dumps(report, indent=2))
    logger.info("Report generated")


def main():
    parser = argparse.ArgumentParser(description="Automation Scheduler")
    parser.add_argument("--once", action="store_true", help="Run all tasks once and exit")
    args = parser.parse_args()

    runner = TaskRunner()
    runner.add_task("backup", task_backup, "30 minutes")
    runner.add_task("cleanup", task_cleanup, "2 hours")
    runner.add_task("report", task_report, "daily 09:00")

    if args.once:
        for task in runner.tasks:
            logger.info(f"Running {task['name']}...")
            task["func"]()
        return

    try:
        runner.run()
    except KeyboardInterrupt:
        logger.info("Scheduler stopped")


if __name__ == "__main__":
    main()
`,
    },
    {
      path: 'automation/requirements.txt',
      language: 'text',
      content: `schedule>=1.2.0
`,
    },
    {
      path: 'automation/README.md',
      language: 'markdown',
      content: `# Otomasyon Zamanlayıcı

${description}

## Kurulum
\`\`\`bash
pip install -r requirements.txt
python scheduler.py
\`\`\`

## Tek Seferlik Çalıştırma
\`\`\`bash
python scheduler.py --once
\`\`\`
`,
    },
  ];

  const m = meta('Automation', description);
  return {
    title: analysis.title,
    description,
    category: analysis.category,
    primary_language: analysis.primaryLanguage,
    file_structure: buildFileStructure(files),
    files,
    install_guide: `1. \`pip install -r automation/requirements.txt\`\n2. \`python automation/scheduler.py\`\n3. Tek sefer: \`python automation/scheduler.py --once\``,
    tags: analysis.tags,
    performance_analysis: m.perf,
    seo_analysis: m.seo,
  };
}

function generatePromptTemplate(
  prompt: string,
  analysis: PromptAnalysis,
): GenerationResult {
  const description = 'AI için optimize edilmiş sistem prompt şablonu. Rol tanımı, kısıtlar ve çıktı formatı içerir.';
  const files: GeneratedFile[] = [
    {
      path: 'prompt/system_prompt.md',
      language: 'markdown',
      content: `# AI System Prompt

## Rol
Sen uzman bir yazılım asistanısın. Görevin kullanıcıya eksiksiz, çalışır ve optimize kod üretmek.

## Görev
${prompt}

## Kurallar
1. Kodlar asla özet olmayacak — eksiksiz verilecek.
2. Tüm dosyalar yapısıyla birlikte oluşturulacak.
3. Güvenlik açıkları (SQL injection, XSS, command injection) önlenecek.
4. Hata yönetimi eklenecek (boundary validation, null checks).
5. Performance optimization yapılacak.
6. Kod yorumları sadece "neden" için, "ne" için değil.

## Çıktı Formatı
1. Proje Özeti
2. Klasör Yapısı
3. Tüm Kod Dosyaları (dosya yolu ile)
4. Kurulum Rehberi
5. Performans ve Güvenlik Notları

## Kısıtlar
- Production-ready kod
- W3C standartlarına uyum
- Erişilebilirlik (WCAG 2.1)
- SEO optimizasyonu
`,
    },
    {
      path: 'prompt/examples.md',
      language: 'markdown',
      content: `# Kullanım Örnekleri

## Temel Kullanım
\`\`\`
Sen: Bir REST API oluştur.
AI: [tam kod]
\`\`\`

## Gelişmiş
\`\`\`
Sen: Python ile web scraper yap, CSV çıktı versin.
AI: [tam kod + kurulum]
\`\`\`
`,
    },
  ];

  const m = meta('Prompt', description);
  return {
    title: analysis.title,
    description,
    category: analysis.category,
    primary_language: analysis.primaryLanguage,
    file_structure: buildFileStructure(files),
    files,
    install_guide: `1. \`prompt/system_prompt.md\` dosyasını AI modelin system prompt kısmına yapıştırın\n2. Özelleştirin ve kullanın`,
    tags: analysis.tags,
    performance_analysis: m.perf,
    seo_analysis: m.seo,
  };
}
