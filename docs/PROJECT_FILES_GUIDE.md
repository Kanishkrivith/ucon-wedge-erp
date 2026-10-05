# UCON WEDGE ERP v2 — Complete Project Files & Repository Directory Guide

This document indexes all project assets, codebases, databases, scans, and export files for **Ucon Wedge Manufacturing Unit**.

---

## 1. Master Project Directory Locations

| Asset Type | Location / Path | Description |
| :--- | :--- | :--- |
| **Main Project Codebase** | `D:\Ucon Wedge Unit\ucon_wedge_erp_v2\` | Full Next.js 15, React 19, TypeScript, Tailwind ERP application. |
| **Project Documentation & Exports** | `D:\Ucon Wedge Unit\ucon_wedge_erp_v2\docs\` | Excel master raw data, JSON database export, PDF technical report, interactive architecture diagrams. |
| **Scanned Documents Storage** | `D:\Ucon Wedge Unit\all scan\` | All 526 original scanned invoice PDFs, Delivery Challans, and QC test reports from 2023 to 2026. |
| **Automation & Ingestion Scripts** | `D:\Ucon Wedge Unit\ucon_wedge_erp_v2\scripts\` | Python & Node.js batch ingestion, Gemini Flash OCR vision extractors, and export tools. |
| **Online Git Repository** | `https://github.com/Kanishkrivith/ucon-wedge-erp` | Secure cloud source code repository on GitHub (Branch: `main`). |
| **Live Deployed Cloud App** | `https://uconwedgeerp.vercel.app` | Production ERP hosted on Vercel with real-time analytics and routing diagram. |
| **Live Database** | Supabase AWS PostgreSQL (Mumbai `ap-south-1`) | Cloud relational database holding all 825 line items, vendors, machines, tools, and DCs. |

---

## 2. Export Files in `docs/` Directory

1. **`UCON_WEDGE_MASTER_RAW_DATA_2023_2026.xlsx`** (889.5 KB)
   - Multi-sheet master Excel workbook:
     - Sheet 1: **Executive KPI Dashboard** (Total inward tonnage, subcontract cost, tool expenses, testing logs)
     - Sheet 2: **Complete Line Items** (825 extracted items with vendor, item code, quantity, rate, tax, invoice no, and date)
     - Sheet 3: **Vendor Master** (NG Sales, Sri Murugan, Everbright, Prema, Bhavya, Ace Micromatic, Unitherm, Techmat, etc.)
     - Sheet 4: **Chronological Timeline** (Sequential transactions from January 2023 to September 2026)
     - Sheet 5: **Manufacturing Classification Breakdown** (Steel raw material, CNC cutting/turning, tapping, slitting, heat treatment, QC tests)

2. **`UCON_WEDGE_MASTER_RAW_DATA_2023_2026.json`** (795.9 KB)
   - Complete machine-readable JSON database dump with 100% extracted fields and metadata.

3. **`UCON_WEDGE_ERP_v2_Technical_Architecture_Report.pdf`** (413.8 KB)
   - Complete formal milestone report including system architecture, manufacturing sequence, security, and schema documentation.

4. **`ucon_wedge_erp_process_and_architecture_diagram.html`** (50.6 KB)
   - Standalone interactive Eraser.io-style architecture and process routing diagram (can be opened in any web browser).

---

## 3. How to Open This Project in Your IDE / Editor

1. Open **Antigravity** or **VS Code**.
2. Click **File** -> **Open Folder...** (or press `Ctrl + K, Ctrl + O`).
3. Select `D:\Ucon Wedge Unit\ucon_wedge_erp_v2` and click **Select Folder**.
4. All files, routes (`app/`), database connections (`lib/`), and documentation (`docs/`) will appear in your file explorer.

---

## 4. How to Sync & Push Changes to GitHub

To ensure all new documents, exports, and changes are permanently backed up to your remote GitHub repository:

```bash
cd "D:\Ucon Wedge Unit\ucon_wedge_erp_v2"
git add .
git commit -m "Update master data exports, scans catalog, and docs"
git push origin main
```

Once pushed, your code is safely preserved in the cloud at `https://github.com/Kanishkrivith/ucon-wedge-erp`.
