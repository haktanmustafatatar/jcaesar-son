# JCAESAR-AGENT — Teknik İyileştirme ve Production Yol Haritası

## FAZ 1 — Kritik Bug Fix ve Crawler Performans İyileştirmesi
**Öncelik:** KRİTİK

### Amaç
- Sistem darboğazlarını kaldırmak
- Crawl ve indexleme hızını artırmak
- Veri/chunk kaybını önlemek
- Production seviyesinde ingestion pipeline hazırlamak

### Yapılacaklar
- fileSize, URL normalization ve chunk loss problemlerinin çözülmesi
- Sıralı crawl yerine paralel crawl sistemine geçiş
- Batch embedding sistemi
- Batch database insert optimizasyonu
- Retry mekanizması + timeout optimizasyonu
- Plan bazlı dinamik sitemap kapasitesi
- Thin-content filtering
- JS-rendered page fallback (Playwright / Firecrawl)

### Kabul Kriterleri
- 1000 sayfanın 10 dakikanın altında indexlenmesi
- Chunk loss oranı ≤ %0.1
- 10.000+ URL destekleyen e-ticaret altyapısı

### Gerekli Uzmanlık
- Backend Engineering
- Distributed Systems
- Web Crawling
- Data Pipeline Engineering
- Node.js Performance Optimization

---

## FAZ 2 — RAG / AI Retrieval Kalite Overhaul
**Öncelik:** KRİTİK

### Amaç
- Production-grade Türkçe RAG sistemi kurmak
- Hallucination oranını düşürmek
- Retrieval doğruluğunu artırmak
- Semantik kaliteyi yükseltmek

### Yapılacaklar
- Embedding model yükseltmesi
- Hybrid retrieval sistemi:
  - BM25
  - Dense Vector Search
  - RRF Fusion
- Re-ranking katmanı
- Metadata extraction:
  - marka
  - kategori
  - fiyat
  - yaş
- Query intent extraction
- Metadata pre-filtering
- Hallucination guard promptları
- Confidence threshold sistemi
- Clarification fallback sistemi
- Türkçe e-ticaret benchmark/eval sistemi
- Re-index migration scriptleri

### Kabul Kriterleri
- Alakasız retrieval oranı ≤ %10
- SKU/marka/fiyat sorularında hallucination = %0
- Spesifik ürün sorularında ≥ %85 doğru retrieval

### Gerekli Uzmanlık
- RAG Engineering
- LLM Engineering
- Search Engineering
- Vector Database Systems
- Information Retrieval Systems

---

## FAZ 3 — Production Altyapı ve Ölçeklenebilirlik
**Öncelik:** KRİTİK

### Amaç
- Sistemi gerçek production yüküne hazırlamak
- Çökme ve OOM problemlerini engellemek
- Multi-tenant ölçeklenebilir mimari kurmak

### Yapılacaklar
- PgBouncer kurulumu
- Prisma connection pool tuning
- BullMQ shared queue scaling
- Tenant fairness + rate limiting
- Redis persistence / clustering
- Sentry logging
- Structured logging (Pino)
- Prometheus + OpenTelemetry metrics
- Grafana dashboard
- Token usage tracking
- Worker CPU/RAM protection
- 100+ paralel crawl load testleri

### Kabul Kriterleri
- 100 paralel crawl altında stabil çalışma
- Worker başına ≤ 8 GB RAM kullanımı
- ≥ %99.5 uptime SLA

### Gerekli Uzmanlık
- Distributed Systems
- DevOps / SRE
- Backend Infrastructure
- Queue Systems
- Redis / PostgreSQL Scaling

---

## FAZ 4 — CI/CD, Test ve Production Deploy
**Öncelik:** ORTA

### Amaç
- Deploy süreçlerini otomatikleştirmek
- Güvenli production pipeline oluşturmak
- Test altyapısını kurmak

### Yapılacaklar
- Vitest test sistemi
- End-to-end integration testleri
- GitHub Actions CI/CD pipeline
- Docker build pipeline
- Staging environment
- Zero-downtime deploy sistemi
- Rollback prosedürleri
- Production deployment
- Teknik handover

### Kabul Kriterleri
- ≥ %60 kritik path test coverage
- ≤ 10 dakika staging deploy süresi
- Production go-live tamamlanması

### Gerekli Uzmanlık
- DevOps
- CI/CD
- Docker
- Automated Testing
- Production Operations

---

## Mevcut Sistem Durumu

**Şu an sistem:**
- gelişmiş bir RAG chatbot prototipine daha yakın

**Hedef sistem:**
- production-grade multi-tenant AI satış ajanı platformu

**Şu an eksik olan ana mimari katmanlar:**
- Agent orchestration
- Tool execution layer
- Autonomous workflows
- Long-term memory systems
- AI action policies
- Multi-step reasoning infrastructure
- Gerçek agent davranış mimarisi