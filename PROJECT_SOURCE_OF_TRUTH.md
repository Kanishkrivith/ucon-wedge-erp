# UCON WEDGE ERP — PROJECT SOURCE OF TRUTH

## MASTER REQUIREMENTS, BUSINESS PROCESS AND PERMANENT PROJECT MEMORY

- **Version**: 2.0 (Consolidated Master Reference)
- **Date**: 21 September 2026
- **Project**: UCON WEDGE MANUFACTURING MANAGEMENT SYSTEM (WEB & MOBILE)
- **Active Workspace**: `D:\Ucon Wedge Unit\ucon_wedge_erp_v2\`
- **Database**: PostgreSQL 17 on `localhost:5432` (`ucon_wedge`)
- **Organized Master Requirements Document**: [`MASTER_REQUIREMENTS.md`](./MASTER_REQUIREMENTS.md)

---

# 1. PURPOSE AND PERMANENT MEMORY PRINCIPLE

This document is the permanent single source of truth and persistent project memory for the UCON Wedge ERP project.

### The Problem It Solves:
Over extended conversations and iterations, requirements and discussions must never be lost, diluted, or silently altered. When a business process, machine detail, vendor rate, tooling specification, or costing rule is agreed upon, it must be permanently recorded here as reading text.

### The Memory Rule:
1. **Never forget previous agreements**: The AI assistant and engineering team must preserve all established facts.
2. **Convert discussions into permanent reference**: Every new operational detail dictated by management must be incorporated into this document.
3. **No silent changes or assumptions**: If a new requirement appears to conflict with an earlier one, the conflict must be explicitly highlighted and verified.
4. **No loss across chat resets or restarts**: This file lives inside the project root and acts as the project's permanent memory bank.

---

# 2. ACTIVE PROJECT FOLDER AND REPOSITORIES

The active master development workspace is:
`D:\Ucon Wedge Unit\ucon_wedge_erp_v2\`

- Server Port: `http://localhost:3000`
- Database: PostgreSQL 17 on `localhost:5432`, Database: `ucon_wedge`
- Do not repeatedly re-create or split the project into different disconnected folders.
- Do not reset or wipe the production database merely to solve an application issue.

---

# 3. PROJECT OBJECTIVE & SCOPE

Build a fast, enterprise-grade, mobile-responsive UCON Wedge Manufacturing Management System covering both Web and Mobile devices.

The system manages the entire business lifecycle:
- Raw Material Purchase & QC (Chemical, Tensile, Hardness testing at Micro Lab)
- Material Movement & Cutting (780mm blanks for CNC spindles at Sri Murugan)
- Subcontractor CNC Machining & In-house CNC Machining
- CNC Tooling (10–12 insert types, coolant, grease)
- Chamfering, Tapping (T1 & T2 machines, Product 1305 coolant, Go/No-Go inspection)
- In-house Regrinding (Babiya Industries regrinder)
- Slitting (S1, S2, S3 machines, 4-inch Accurate Engineering saw blades)
- Washing & Degreasing
- Heat Treatment / Case Hardening (Techmat Metallurgical Services, Unitherm / Thermal)
- 100% Load Testing on dedicated test rig (`UCON-RIG-01`)
- Spring / Circlip Assembly (Viking Spring, Grace Springs, Micromatic)
- Packing (Polythene bags ~300 pcs/box)
- Finished Goods Store & Site Dispatch with Delivery Challans
- Scrap Recovery (monthly turnings & boring scrap sales credited against costs)
- Machinery / CapEx Investment (strictly segregated from monthly wedge cost)
- Document Intelligence & OCR (35 vendor recognition profiles, line-level routing, confidence metrics)
- Human Review & Controlled ERP Posting
- Executive Management Intelligence (Ask UCON verified PostgreSQL queries)
- Monthly Business Snapshot (January 2024 to September 2026 and forward)

---

# 4. USER ROLES AND PERMISSION CONTROL

1. **Super Admin** (`kanishkrivith@gmail.com`): Highest system authority. Full control over users, role assignment, system settings, audit logs, and master costing rules.
2. **MD**: Executive oversight, approves major purchase orders, reviews CapEx investments, monitors monthly cost per wedge and Ask UCON management reports.
3. **Director**: Operational oversight, reviews production trends, inventory levels, and subcontractor rates.
4. **Purchase Manager**: Manages vendors, purchase orders, deliveries, raw material receipts, and invoice entries.
5. **Production Staff** (`logesh71994@gmail.com`): Day-to-day shop floor entries across all 15 stages, machine logs, tool usage, rejection tracking, and dispatch requests.
6. **Document Admin** (`equiments@ucon.co.in`): Ingestion of scanned invoices/DCs, review of OCR extracted fields, correction of line items, and execution of controlled ERP posting.

---

# 5. COMPLETE 15-STAGE WEDGE MANUFACTURING PROCESS (DETAILED DICTATION)

The wedge manufacturing process represents the physical reality of the factory:

### Stage 1: Raw Material Purchase (20MnCr5 Steel)
- **Material Specification**: 20MnCr5 (20 mm CRFI / 20MnCr5), 25 mm diameter round black bar. (Previously 26 mm dia was also purchased; currently standardized on 25 mm black bar).
- **Incoming Bar Length**: Delivered in standard mill lengths of 5.7 meters or 6.0 meters.
- **Vendors**: NG Sales Corporation (NG Steels), Srinivasa Industries, Thirupathi Bright Steel, Steel Magic, Materials Point LLP, AR Traders.
- **Document Chain**: Purchase Order (PO) issued -> advance payment or payment on delivery -> Vendor Invoice + Delivery Challan (DC) + Manufacturer Test Certificate (MTC).

### Stage 2: Raw Material QC & Laboratory Testing
- **Procedure**: Before steel moves from the vendor/distributor yard, Ucon QC personnel visit and cut a **300 mm test sample**.
- **Laboratory**: Sent to **Micro Lab Testing Services** (or metallurgical agency) accompanied by an official Ucon cover letter requesting:
  - Chemical composition analysis
  - Hardness testing
  - Tensile strength testing
- **Witnessing**: Ucon QC team witnesses test execution against 20MnCr5 standards.
- **Authorization**: Only after laboratory test certificate passes standard specifications is the batch released for movement.

### Stage 3: Cutting (Sri Murugan Industry)
- **Delivery**: Released steel moves directly from store/supplier to **Sri Murugan Industry** under a Delivery Challan.
- **Operation**: Murugan cuts the 5.7m / 6.0m bars into **780 mm blanks** (the exact spindle length required for CNC turning).
- **Accounting**: Cutting charges logged, cutting scrap tracked.

### Stage 4: CNC Machining Distribution & Allocation
- **Tonnage Allocation**: Cut 780mm blanks are distributed among 5 CNC processing sources:
  - Example: For a 10-ton batch:
    - 2 tons retained by Sri Murugan Industry
    - 2 tons delivered to Everbright Engineers
    - 2 tons each to other subcontractor CNC vendors
    - 2 tons delivered to in-house Ucon Wedge Manufacturing Unit
- **Master Thumb Rule (Section 14)**:
  $$\text{1 Ton Raw Material} \approx 6,600\text{ CNC Finished Wedges}$$
  *(99% approximate calculation thumb rule established from historical production).*
- **Subcontractor Machining Rates**:
  - Sri Murugan Industries: Initially charged ₹8.50/piece → ₹9.50/piece → currently ₹11.00/piece.
  - Other CNC Vendors: Paid ₹9.00/piece.
- **Work Orders & Return**: Work Orders issued per batch. CNC machined wedges return to Ucon Unit accompanied by vendor Delivery Challan and work invoice.

### Stage 5: CNC QC & Rejection Management
- **Verification**: Ucon QC inspects incoming machined pieces for dimensional accuracy.
- **Rejections**: Any rejected piece generates a formal Rejection Record and **Credit Note**, which is adjusted/deducted directly from the vendor's pending bill.

### Stage 6: Chamfering
- Chamfering operation performed to remove sharp edges and prepare wedges for tapping.

### Stage 7: Tapping (T1 & T2 Machines)
- **Equipment**: Two dedicated internal tapping machines designated **T1** and **T2**.
- **Tooling**: HSS Taps and Go/No-Go Thread Plug Gauges.
- **Coolant / Oil**: **Product 1305 Tapping Coolant/Oil** purchased in **200-liter barrels**. Poured continuously during tapping operations.
- **Tap Life & Regrinding**: A single tap runs approximately 500 to 1,000 pieces before requiring regrinding.
- **Regrinding Shift**: In earlier years, taps were sent to external vendors for regrinding. The unit subsequently invested in an **in-house regrinding machine from Babiya Industries**, handled by designated in-house staff.
- **Tool Suppliers**: **Accurate Auto Lathe** supplies taps, butter taps, and Go/No-Go gauges.

### Stage 8: Slitting (S1, S2, S3 Machines)
- **Equipment**: Three dedicated slitting machines designated **S1**, **S2**, and **S3** (commissioned sequentially as production volume scaled).
- **Major Tooling**: **4-inch Slitting Saw Cutters / Blades**.
- **Vendor**: **Accurate Engineering Works** supplies the slitting machines and 4-inch slitting saw blades.

### Stage 9: Washing & Degreasing
- Wedges undergo ultrasonic/chemical washing to remove tapping oil, coolant, chips, and debris before heat treatment.

### Stage 10: Heat Treatment / Case Hardening
- **Subcontractors**: **Techmat Metallurgical Services** (primary in earlier period) and **Unitherm Engineers / Thermal**.
- **Specifications**: Target Case Depth: **0.5 – 0.7 mm**; Target Surface Hardness: **54 – 64 HRC**.
- **Process Chain**: Ucon issues Work Order -> Parts dispatched with DC -> Heat treated -> Returned with vendor invoice, DC, and batch test report. Payment made on per-wedge rate.

### Stage 11: Final QC & 100% Load Testing
- 100% of finished heat-treated wedges undergo load testing on the in-house **Load Testing Rig (`UCON-RIG-01`)**.
- Passed parts routed to assembly; failed parts scrapped with failure reason recorded.

### Stage 12: Spring / Circlip Assembly
- Installation of retaining spring / circlip ring into wedge groove.
- **Spring Vendors**: Viking Springs, Grace Springs, Micromatic, Super Fasteners.

### Stage 13: Packing
- Finished wedges packed in heavy-duty polythene bags (~300 pieces per bag/carton).
- Packaging materials supplied by industrial packaging vendors (Industrial Poly Products).

### Stage 14: Finished Goods Store & Site Dispatch
- Goods moved to Finished Goods Store inventory.
- Dispatched to customer project sites with official Delivery Challan (DC) and invoice.

### Stage 15: Scrap Recovery & Credit
- Turning scrap, boring scrap, and cutting ends generated at Ucon in-house CNC and cutting operations are collected.
- Scrap is weighed and sold monthly to scrap recyclers.
- **Accounting Treatment (Section 31)**: Monthly scrap revenue is credited directly against monthly manufacturing expenses, reducing net manufacturing cost.

---

# 6. MACHINES & CAPEX SEGREGATION (SECTION 34 STRICT RULE)

A fundamental financial requirement established by management:
- **CapEx (Capital Expenditure)**: Purchases of CNC Turning Centers, Tapping Machines (T1, T2), Slitting Machines (S1, S2, S3), and the Babiya Regrinding Machine are **capital assets**.
- **Segregation Rule**: Capital machine investments must **never** be added directly into the monthly wedge operating cost or per-wedge unit cost.
- **Operating Consumables**: Taps, 4-inch saw blades, CNC inserts, Product 1305 coolant, grease, springs, packing bags, and electricity are consumables and belong in monthly operating expenses.

---

# 7. MONTHLY BUSINESS SNAPSHOT MASTER STRUCTURE (SECTION 81)

Every month from **January 2024 to September 2026** and forward follows this exact hierarchy:

```
                  MONTHLY BUSINESS SNAPSHOT
Month (e.g., January 2024 ... September 2026)
│
├── 1. Production
│   ├── Good Output (Nos)
│   ├── Rejection (Nos)
│   └── Actual Yield %
│
├── Raw Material Purchases (20MnCr5 steel)
│   ├── Opening Stock (kg)
│   ├── Purchased (kg & ₹)
│   ├── Consumed (kg)
│   └── Closing Stock (kg)
│
├── Operating Expenses
│   ├── CNC Machining Expenses (Sri Murugan, Everbright, etc.)
│   ├── Tapping Expenses
│   ├── Slitting Expenses
│   ├── Tools & Accessories (Inserts, Taps, 4" Saw Blades, Coolant)
│   ├── Heat Treatment (Techmat, Unitherm)
│   ├── Labour & Staff
│   └── Other Operating Expenses
│
├── Less: Scrap Recovery Credit (Monthly Scrap Sales ₹)
│
├── Total Manufacturing Cost (Net Operating Expense)
│
├── Cost / Wedge (Total Manufacturing Cost ÷ Good Output)
│
└── 2. Machines / CapEx Investment (Segregated Asset Additions)
```

---

# 8. DOCUMENT INTELLIGENCE & AI SCANNING ARCHITECTURE (SECTION 83)

### A. Non-Template Vendor Recognition (35 Factory Vendors)
Invoices differ vastly across vendors. The AI scanner does **not** rely on rigid templates. It combines:
1. **Vendor Detection Pattern**: Identifies the vendor from a library of 35 known factory vendor profiles.
2. **Common UCON Field Dictionary**: Maps vendor-specific labels to standardized canonical fields.
3. **Dynamic / Extensible Fields**:
   - Invoice / DC Number
   - Document Date (normalized to YYYY-MM-DD)
   - PO Number & Date
   - DC Number & Date
   - Vendor GSTIN & PAN
   - E-Way Bill Number
   - Vehicle Number
   - HSN / SAC Codes
   - Subtotal / Taxable Value
   - CGST, SGST, IGST
   - Grand Total

### B. Dynamic Handling of New & Missing Fields (e.g., HSN Code)
- When a document contains a field that was not in an earlier sample (such as an HSN code, SAC code, or vehicle number), the AI scanner:
  - Dynamically extracts the field using regex and contextual keyword search.
  - Stores it in the extensible key-value extraction table (`document_extractions`).
  - Attaches line-level HSN codes directly to the line items (`document_line_items.hsn_code`).
  - **Never drops or ignores new fields**.

### C. Line-Level Classification & ERP Destination Routing
A single invoice may contain multiple types of items. The scanner evaluates each line independently:
- Machine purchase → `MACHINES_CAPEX` → Routes to Machines Register
- 4" Slitting blades → `SLITTING_TOOLS` → Routes to Tools Register
- Taps / Gauges → `TAPPING_TOOLS` → Routes to Tools Register
- CNC Inserts → `CNC_TOOLS` → Routes to Tools Register
- Product 1305 Coolant → `CONSUMABLES` → Routes to Inventory
- 20MnCr5 steel → `RAW_MATERIAL` → Routes to Materials Purchase
- Heat treatment charges → `HEAT_TREATMENT_EXPENSE` → Routes to Purchase Ledger

### D. Human Verification, Deletion, and Controlled ERP Posting (Section 86 Master Principle)
$$\text{Original Scanned Evidence} \rightarrow \text{OCR / AI Extraction} \rightarrow \text{Confidence Scoring} \rightarrow \text{Human Review / Adjustment} \rightarrow \text{Controlled Posting / Deletion}$$
- **AI assists; AI does not silently decide financial truth.**
- The side-by-side review screen allows the Document Admin or Super Admin to inspect the original PDF/image, edit canonical fields or line items, delete unwanted lines, add missing items, and control final execution:
  - **🗑️ Delete Document Option**: Replaces legacy "Flag/Reject". Permanently deletes invalid, mis-scanned, or duplicate documents along with all associated draft extractions and ledger links.
  - **✓ Approve & Post to ERP**: Officially writes verified records into `invoices`, `invoice_items`, `capex`, `inventory_items`, `inventory_movements`, and `tool_life_events`.
- **Automated Account Routing by Purchase Type**:
  1. **Machineries (CapEx / Fixed Assets)**:
     - Automatically matches our 7–8 workshop machines:
       * `MCH-CNC-01`: 1 x CNC Turning Centre
       * `MCH-TAP-01`: Automated Tapping Machine #1 (M16)
       * `MCH-TAP-02`: Automated Tapping Machine #2 (M20)
       * `MCH-CUT-01`: 3-Blade Slitting / Cutting Machine #1
       * `MCH-CUT-02`: 3-Blade Slitting / Cutting Machine #2
       * `MCH-CUT-03`: 3-Blade Slitting / Cutting Machine #3
       * `MCH-REGR-01`: 1 x Carbide Insert Regrinding Machine
       * `MCH-REGR-02`: 1 x Normal Tool & Cutter Grinder
       * `MCH-CHAMF-01`: 1 x Precision Wedge Chamfering Machine
     - Records capital purchases in `capex` linked to the specific machine ID, strictly excluding them from per-wedge direct operating cost calculations (Section 34).
  2. **Tooling, Raw Materials & Inventory (OpEx)**:
     - **Tooling & Inserts**: CNC turning inserts (CNMG/WNMG), 4" slitting saw blades, M16/M20 taps auto-convert to registered tools in `tools`, update stock receipts in `inventory_movements`, and record tracking events in `tool_life_events`.
     - **Raw Materials**: 20MnCr5 round bars (25mm / 26mm) update raw material stock receipts in `inventory_movements` with received weight and batch rate.
     - **Consumables & Packaging**: Coolant oil 1305, springs (12.7mm/15.2mm), circlips, polybags record as consumable receipts with unit costs in `inventory_movements`.

---

# 9. EXECUTIVE INTELLIGENCE — ASK UCON AI

Senior executives (Super Admin, MD, Director) can query the ERP in natural language.
Ask UCON evaluates queries directly against verified PostgreSQL tables (`daily_production`, `monthly_expenses`, `invoices`, `capex`, `vendor_rates`, `tools`):
- *"What is our current cost per wedge?"* → Evaluates latest month good production and operating expenses.
- *"How much have we invested in machinery (CapEx)?"* → Sums registered machine assets, confirming Section 34 segregation.
- *"Which vendor supplied the cheapest raw material?"* → Compares effective-dated steel rates.
- *"What are our CNC machining rates?"* → Reports Murugan (₹8.50 → ₹9.50 → ₹11.00) vs Everbright (₹9.00) and links to the 6,600 wedges/ton thumb rule.
- *"What is our expected cost at 75,000 wedges/month?"* → Models fixed-overhead dilution.
- *"What are our tapping and slitting tooling details?"* → Details T1/T2, Product 1305, Babiya regrinder, and Accurate Engineering 4" saw blades.

---

# 10. REVISION HISTORY & PERSISTENCE LOG

- **v1.0 (19 Sep 2026)**: Initial 86-section master requirements document.
- **v1.1 (20 Sep 2026)**: Consolidated permanent memory reference incorporating factory workflow, machine registers, tooling/consumables, scrap recovery, and CapEx segregation.
- **v1.2 (20 Sep 2026)**: Document Intelligence review enhancement:
  - Replaced "Flag/Reject" with permanent "🗑️ Delete Document" action during approval.
  - Resolved ERP posting property lookup ensuring verified amounts and vendor bindings register accurately into `invoices` and `invoice_items`.
  - Implemented automatic CapEx routing linking invoices to the 9 specific workshop machines (`MCH-CNC-01`, `MCH-TAP-01/02`, `MCH-CUT-01/02/03`, `MCH-REGR-01/02`, `MCH-CHAMF-01`).
  - Implemented automatic OpEx routing into `inventory_movements`, `inventory_items`, and `tool_life_events` for tooling, 20MnCr5 raw materials, and consumables.