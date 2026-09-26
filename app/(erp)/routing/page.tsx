'use client';

import React, { useState } from 'react';

export default function RoutingArchitecturePage() {
  const [activeTab, setActiveTab] = useState<'routing' | 'reconciliation' | 'maintenance' | 'erd' | 'code'>('routing');
  const [copied, setCopied] = useState(false);

  const eraserCode = `// =================================================================
// UCON WEDGE ERP v2 - ARCHITECTURAL FLOWCHART (Eraser.io Syntax)
// Paste into app.eraser.io -> New Diagram -> Diagram-as-Code
// =================================================================

title UCON Wedge Manufacturing & Traceability Architecture

// -------------------------------------------------------------
// STAGE 01: RAW MATERIAL INWARD & TESTING
// -------------------------------------------------------------
NG_Steel [icon: package, color: blue, label: "NG Sales / Thirupathi\\n(Raw 20MnCr5 25mm dia)"]
Spectro_Test [icon: check-circle, color: green, label: "Techmat Spectro & QC\\n(Chemical & Hardness PASS)"]

NG_Steel > Spectro_Test: "Tax Invoice (e.g. #3207)\\nWeight Slip (20 Tons)"

// -------------------------------------------------------------
// STAGE 02: CUTTING OPERATION
// -------------------------------------------------------------
Murugan_Cutting [icon: scissors, color: amber, label: "Sri Murugan Industries\\n(Cutting to ~780mm Rods)"]

Spectro_Test > Murugan_Cutting: "Outward DC\\n(Raw Steel Bar Bundles)"

// -------------------------------------------------------------
// STAGE 03: MULTI-VENDOR CNC MACHINING MESH
// -------------------------------------------------------------
group CNC_Manufacturers [color: purple, label: "Parallel CNC Turning Matrix"] {
  Ucon_CNC [icon: cpu, color: purple, label: "UCON In-House CNC\\n(Ace Micromatic Jobber XL)"]
  Murugan_CNC [icon: settings, color: blue, label: "Sri Murugan CNC Cell\\n(Subcontract Turning)"]
  Everbright_CNC [icon: settings, color: amber, label: "Everbright Engineering\\n(Subcontract Turning)"]
  Prema_CNC [icon: settings, color: cyan, label: "Prema Engineering\\n(Subcontract Turning)"]
}

Murugan_Cutting > Ucon_CNC: "Transport DC\\n(Rod Count: ~430)"
Murugan_Cutting > Murugan_CNC: "Transport DC\\n(Rod Count: ~800)"
Murugan_Cutting > Everbright_CNC: "Transport DC\\n(Rod Count: ~800)"
Murugan_Cutting > Prema_CNC: "Transport DC\\n(Rod Count: ~600)"

// -------------------------------------------------------------
// STAGE 04: UCON IN-HOUSE SECONDARY MACHINING
// -------------------------------------------------------------
Bore_QC [icon: search, color: indigo, label: "Borehole 100% QC\\n(Unique Measurement Gauges)"]
Tapping_Cell [icon: tool, color: indigo, label: "Tapping Operation\\n(Bhavya Machine + Buttress Tap)"]
Slitting_Cell [icon: disc, color: cyan, label: "Slitting & Seating\\n(4\\" HSS M42 Slitting Cutter)"]
Washing_Cell [icon: droplet, color: cyan, label: "Degreasing & Washing\\n(Castrol ILOCUT 1945 Coolant)"]

Ucon_CNC > Bore_QC: "Turned Blanks"
Murugan_CNC > Bore_QC: "Inward DC (Blanks)"
Everbright_CNC > Bore_QC: "Inward DC (Blanks)"
Prema_CNC > Bore_QC: "Inward DC (Blanks)"

Bore_QC > Tapping_Cell: "Plug Gauge Approved"
Tapping_Cell > Slitting_Cell: "Tapped Wedges"
Slitting_Cell > Washing_Cell: "Slit Wedge Segments"

// -------------------------------------------------------------
// STAGE 05: HEAT TREATMENT & METALLURGICAL QC
// -------------------------------------------------------------
Unitherm_HT [icon: zap, color: red, label: "Unitherm Engineers\\n(SQF Case Carburizing)"]
HT_Cert [icon: award, color: green, label: "Manufacturer Test Cert\\n(58-62 HRC, 0.4mm depth)"]

Washing_Cell > Unitherm_HT: "Outward DC (Clean Wedges)"
Unitherm_HT > HT_Cert: "Inward DC + HT Invoice"

// -------------------------------------------------------------
// STAGE 06: FINAL QC, LOAD TESTING & DISPATCH
// -------------------------------------------------------------
Load_Test [icon: shield, color: green, label: "190 kN Efficiency Test\\n(In-House Ucon Inos Rig)"]
Spring_Assembly [icon: layers, color: blue, label: "Spring Assembly & Packing\\n(Grace Springs / Viking)"]
Central_Store [icon: home, color: green, label: "Chennai Central Store\\n(Finished Goods Warehouse)"]

HT_Cert > Load_Test: "Chassis & Core QC"
Load_Test > Spring_Assembly: "100% Load Passed"
Spring_Assembly > Central_Store: "Final Outward DC"

// -------------------------------------------------------------
// TOOL LIFE & MAINTENANCE RECONCILIATION
// -------------------------------------------------------------
Tool_Life_Ledger [icon: activity, color: blue, label: "Tool Life Tracking\\n(Inserts, Taps, Cutters)"]
Bearing_Maint_Ledger [icon: wrench, color: amber, label: "Machine Maintenance\\n(Slitting Bearing Changes)"]

Tapping_Cell - Tool_Life_Ledger
Slitting_Cell - Bearing_Maint_Ledger
Ucon_CNC - Tool_Life_Ledger`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(eraserCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-700/60 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-blue-500 animate-pulse"></span>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Process Routing, Traceability & Architecture
            </h1>
            <span className="px-2 py-0.5 text-xs font-semibold rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
              Eraser.io Visual Model
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            End-to-End Material Traceability (NG Steel → Sri Murugan Cutting → 4 CNC Vendors → Tapping → Slitting → Unitherm Heat Treatment → 190kN Load Test → Chennai Central Store)
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-700/60 overflow-x-auto">
          <button
            onClick={() => setActiveTab('routing')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'routing'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            1. Process Routing
          </button>
          <button
            onClick={() => setActiveTab('reconciliation')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'reconciliation'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            2. 20-Ton Reconciliation
          </button>
          <button
            onClick={() => setActiveTab('maintenance')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'maintenance'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            3. Tool Life & Maintenance
          </button>
          <button
            onClick={() => setActiveTab('erd')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'erd'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            4. Database ERD
          </button>
          <button
            onClick={() => setActiveTab('code')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'code'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            5. Eraser.io Code
          </button>
        </div>
      </div>

      {/* TAB 1: PROCESS ROUTING FLOW */}
      {activeTab === 'routing' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
            {/* Stage 1 */}
            <div className="rounded-xl border border-blue-500/30 bg-slate-900/80 p-5 shadow-lg relative flex flex-col justify-between">
              <div className="space-y-3">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30 uppercase">
                  Stage 01 : Raw Steel Inward
                </span>
                <h3 className="text-base font-bold text-white">NG Sales / Thirupathi Steel</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  20MnCr5 25mm dia raw bars received in bundles/tons with Tax Invoices (e.g. #3207). Chemical & spectro test verified by Techmat.
                </p>
                <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 text-xs font-mono space-y-1 text-slate-300">
                  <div className="flex justify-between"><span>Grade:</span> <span className="text-blue-400">20MnCr5 (25mm)</span></div>
                  <div className="flex justify-between"><span>Inward Weight:</span> <span className="text-white font-bold">20 Tons / Lot</span></div>
                  <div className="flex justify-between"><span>Spectro QC:</span> <span className="text-emerald-400">APPROVED</span></div>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex justify-between">
                <span>Transfer: <strong className="text-slate-200">Outward DC</strong></span>
                <span className="text-blue-400 font-semibold">Step 1 Complete</span>
              </div>
            </div>

            {/* Stage 2 */}
            <div className="rounded-xl border border-amber-500/30 bg-slate-900/80 p-5 shadow-lg relative flex flex-col justify-between">
              <div className="space-y-3">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 uppercase">
                  Stage 02 : Subcontract Cutting
                </span>
                <h3 className="text-base font-bold text-white">Sri Murugan Industries</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Raw bars transported under DC to Murugan. Precision saw cutting into <strong className="text-amber-300">~780 mm</strong> lengths with exact rod counting.
                </p>
                <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 text-xs font-mono space-y-1 text-slate-300">
                  <div className="flex justify-between"><span>Cut Length:</span> <span className="text-slate-200">780 mm ± 2mm</span></div>
                  <div className="flex justify-between"><span>Yield Ratio:</span> <span className="text-amber-400">~260 Rods / Ton</span></div>
                  <div className="flex justify-between"><span>Scrap End-Cuts:</span> <span className="text-slate-400">&lt; 0.6%</span></div>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex justify-between">
                <span>Return DC: <strong className="text-slate-200">Rod Count Verified</strong></span>
                <span className="text-amber-400 font-semibold">Step 2 Complete</span>
              </div>
            </div>

            {/* Stage 3 (Span 2) */}
            <div className="rounded-xl border border-purple-500/30 bg-slate-900/80 p-5 shadow-lg relative flex flex-col justify-between md:col-span-2">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-500/20 text-purple-400 border border-purple-500/30 uppercase">
                    Stage 03 : Parallel CNC Machining Mesh
                  </span>
                  <span className="text-xs text-purple-300 font-mono">4 Machining Streams</span>
                </div>
                <h3 className="text-base font-bold text-white">Distribution to 4 CNC Turning Centers</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  780mm rods are bundled into tons and dispatched with individual transport DCs to 4 CNC centers for turning into wedge blank profiles.
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                  <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex flex-col justify-between">
                    <span className="text-xs font-bold text-purple-300">1. UCON IN-HOUSE</span>
                    <span className="text-[10px] text-slate-400 mt-1">Ace Jobber XL CNC</span>
                    <span className="text-[10px] text-emerald-400 font-mono mt-1">Tool Life Monitored</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex flex-col justify-between">
                    <span className="text-xs font-bold text-blue-300">2. SRI MURUGAN</span>
                    <span className="text-[10px] text-slate-400 mt-1">CNC Subcontract Cell</span>
                    <span className="text-[10px] text-blue-400 font-mono mt-1">98 Invoices & DCs</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex flex-col justify-between">
                    <span className="text-xs font-bold text-amber-300">3. EVERBRIGHT</span>
                    <span className="text-[10px] text-slate-400 mt-1">High Volume Turning</span>
                    <span className="text-[10px] text-amber-400 font-mono mt-1">70 Invoices & DCs</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex flex-col justify-between">
                    <span className="text-xs font-bold text-cyan-300">4. PREMA ENGG</span>
                    <span className="text-[10px] text-slate-400 mt-1">Precision CNC Cell</span>
                    <span className="text-[10px] text-cyan-400 font-mono mt-1">9 Invoices & DCs</span>
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex justify-between">
                <span>Inward DC: <strong className="text-purple-300">Finished Turned Blanks Return to Ucon</strong></span>
                <span className="text-purple-400 font-semibold">Step 3 Complete</span>
              </div>
            </div>
          </div>

          {/* Row 2: Secondary Ops & Finishing */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
            {/* Stage 4 */}
            <div className="rounded-xl border border-indigo-500/30 bg-slate-900/80 p-5 shadow-lg relative flex flex-col justify-between">
              <div className="space-y-3">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 uppercase">
                  Stage 04 : Bore QC & Tapping
                </span>
                <h3 className="text-base font-bold text-white">Borehole Gauging & Tapping</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  100% borehole check with Unique Measurement plug gauges. Tapping on Bhavya Machine using specialized Buttress Taps.
                </p>
                <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 text-xs font-mono space-y-1 text-slate-300">
                  <div className="flex justify-between"><span>Gauge:</span> <span className="text-slate-200">Unique Plug Gauge</span></div>
                  <div className="flex justify-between"><span>Tapping Machine:</span> <span className="text-indigo-300">Bhavya Tapping (CAPEX)</span></div>
                  <div className="flex justify-between"><span>Buttress Tap:</span> <span className="text-amber-400">Micro Tech (~350 pcs)</span></div>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex justify-between">
                <span>Pitch: <strong className="text-slate-200">100% Inspected</strong></span>
                <span className="text-indigo-400 font-semibold">Step 4 Complete</span>
              </div>
            </div>

            {/* Stage 5 */}
            <div className="rounded-xl border border-cyan-500/30 bg-slate-900/80 p-5 shadow-lg relative flex flex-col justify-between">
              <div className="space-y-3">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 uppercase">
                  Stage 05 : Slitting & Washing
                </span>
                <h3 className="text-base font-bold text-white">4" Cutter Slitting & Wash</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Blanks slit into wedge segments using 4" HSS M42 cutters. Degreasing & washing in Castrol ILOCUT 1945 cutting oil.
                </p>
                <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 text-xs font-mono space-y-1 text-slate-300">
                  <div className="flex justify-between"><span>Slitting Cutter:</span> <span className="text-slate-200">OVS 4" HSS M42</span></div>
                  <div className="flex justify-between"><span>Spindle Bearing:</span> <span className="text-rose-400 font-bold">Maintenance Logged</span></div>
                  <div className="flex justify-between"><span>Washing Coolant:</span> <span className="text-cyan-300">Castrol ILOCUT 1945</span></div>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex justify-between">
                <span>Segments: <strong className="text-cyan-300">Slit & Cleaned</strong></span>
                <span className="text-cyan-400 font-semibold">Step 5 Complete</span>
              </div>
            </div>

            {/* Stage 6 */}
            <div className="rounded-xl border border-rose-500/30 bg-slate-900/80 p-5 shadow-lg relative flex flex-col justify-between">
              <div className="space-y-3">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30 uppercase">
                  Stage 06 : Heat Treatment
                </span>
                <h3 className="text-base font-bold text-white">Unitherm SQF Carburizing</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Cleaned wedges sent under Outward DC to Unitherm for Sealed Quench Furnace case hardening & tempering.
                </p>
                <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 text-xs font-mono space-y-1 text-slate-300">
                  <div className="flex justify-between"><span>Surface Hardness:</span> <span className="text-emerald-400 font-bold">58 - 62 HRC</span></div>
                  <div className="flex justify-between"><span>Core Hardness:</span> <span className="text-slate-200">32 - 38 HRC</span></div>
                  <div className="flex justify-between"><span>Case Depth:</span> <span className="text-rose-300 font-bold">0.30 - 0.50 mm</span></div>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex justify-between">
                <span>Cert: <strong className="text-slate-200">Unitherm SQF Cert</strong></span>
                <span className="text-rose-400 font-semibold">Step 6 Complete</span>
              </div>
            </div>

            {/* Stage 7 */}
            <div className="rounded-xl border border-emerald-500/30 bg-slate-900/80 p-5 shadow-lg relative flex flex-col justify-between">
              <div className="space-y-3">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase">
                  Stage 07 : QC & Store Dispatch
                </span>
                <h3 className="text-base font-bold text-white">190 kN Load Test & Store DC</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  100% 190 kN proof load test on Ucon in-house rig. Assembled with Grace Springs, packed and dispatched via DC to Chennai Central Store.
                </p>
                <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 text-xs font-mono space-y-1 text-slate-300">
                  <div className="flex justify-between"><span>Load Proof:</span> <span className="text-emerald-400 font-bold">190 kN PASS</span></div>
                  <div className="flex justify-between"><span>Spring Assembly:</span> <span className="text-slate-200">Grace Springs</span></div>
                  <div className="flex justify-between"><span>Dispatch:</span> <span className="text-blue-300">Chennai Store DC</span></div>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex justify-between">
                <span>Store: <strong className="text-emerald-400">Zero Defect Dispatch</strong></span>
                <span className="text-emerald-400 font-semibold">Step 7 Complete</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: 20-TON RECONCILIATION */}
      {activeTab === 'reconciliation' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-6 shadow-xl space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
              <span className="text-xs text-slate-400">1. Raw Steel Inflow</span>
              <div className="text-lg font-bold text-blue-400 font-mono mt-1">10,020 KG (10.02 MT)</div>
              <div className="text-[11px] text-slate-500 mt-1 font-mono">Invoice #3207 (₹8,61,359)</div>
            </div>
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
              <span className="text-xs text-slate-400">2. Murugan Cutting</span>
              <div className="text-lg font-bold text-amber-400 font-mono mt-1">2,630 Cut Rods (780mm)</div>
              <div className="text-[11px] text-slate-500 mt-1 font-mono">Yield: 99.4% (Scrap 60kg)</div>
            </div>
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
              <span className="text-xs text-slate-400">3. CNC Blanks Produced</span>
              <div className="text-lg font-bold text-purple-400 font-mono mt-1">10,480 Turned Blanks</div>
              <div className="text-[11px] text-slate-500 mt-1 font-mono">Spread across 4 CNC Centers</div>
            </div>
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
              <span className="text-xs text-slate-400">4. Central Store Dispatched</span>
              <div className="text-lg font-bold text-emerald-400 font-mono mt-1">10,320 Wedges (190kN PASS)</div>
              <div className="text-[11px] text-slate-500 mt-1 font-mono">Rejection: 1.5% (160 pcs)</div>
            </div>
          </div>

          <h4 className="text-sm font-semibold text-slate-200 flex items-center justify-between">
            <span>Subcontract CNC Allocation Ledger (Linked to NG Sales Invoice #3207)</span>
            <span className="text-xs text-slate-400 font-normal">Audited against Inward/Outward Delivery Challans</span>
          </h4>

          <div className="overflow-x-auto rounded-lg border border-slate-800">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="p-3">CNC Subcontractor</th>
                  <th className="p-3">Outward DC</th>
                  <th className="p-3">Rods Dispatched</th>
                  <th className="p-3">Expected Blanks</th>
                  <th className="p-3">Return Inward DC</th>
                  <th className="p-3">Blanks Received</th>
                  <th className="p-3">Rejections</th>
                  <th className="p-3">Scrap %</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                <tr className="hover:bg-slate-800/40">
                  <td className="p-3 font-sans font-medium text-purple-300">1. UCON In-House (Ace CNC)</td>
                  <td className="p-3 text-slate-400">UCON-DC-041</td>
                  <td className="p-3 text-slate-200 font-bold">430 Rods</td>
                  <td className="p-3">1,720 pcs</td>
                  <td className="p-3 text-slate-400">INTERNAL-TRANSFER</td>
                  <td className="p-3 text-emerald-400 font-bold">1,705 pcs</td>
                  <td className="p-3 text-rose-400">15 pcs</td>
                  <td className="p-3">0.87%</td>
                  <td className="p-3"><span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px]">RECONCILED</span></td>
                </tr>
                <tr className="hover:bg-slate-800/40">
                  <td className="p-3 font-sans font-medium text-amber-300">2. Everbright Engineering</td>
                  <td className="p-3 text-slate-400">UCONPT-DC-043</td>
                  <td className="p-3 text-slate-200 font-bold">800 Rods (3.04 MT)</td>
                  <td className="p-3">3,200 pcs</td>
                  <td className="p-3 text-slate-400">EB-DC-1641, 1642</td>
                  <td className="p-3 text-emerald-400 font-bold">3,145 pcs</td>
                  <td className="p-3 text-rose-400">55 pcs</td>
                  <td className="p-3">1.71%</td>
                  <td className="p-3"><span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px]">RECONCILED</span></td>
                </tr>
                <tr className="hover:bg-slate-800/40">
                  <td className="p-3 font-sans font-medium text-blue-300">3. Sri Murugan Industries</td>
                  <td className="p-3 text-slate-400">UCONPT-DC-046</td>
                  <td className="p-3 text-slate-200 font-bold">800 Rods (3.04 MT)</td>
                  <td className="p-3">3,200 pcs</td>
                  <td className="p-3 text-slate-400">SMI-DC-5694, 5776</td>
                  <td className="p-3 text-emerald-400 font-bold">3,158 pcs</td>
                  <td className="p-3 text-rose-400">42 pcs</td>
                  <td className="p-3">1.31%</td>
                  <td className="p-3"><span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px]">RECONCILED</span></td>
                </tr>
                <tr className="hover:bg-slate-800/40">
                  <td className="p-3 font-sans font-medium text-cyan-300">4. Prema Engineering Works</td>
                  <td className="p-3 text-slate-400">UCONPT-DC-048</td>
                  <td className="p-3 text-slate-200 font-bold">600 Rods (2.28 MT)</td>
                  <td className="p-3">2,400 pcs</td>
                  <td className="p-3 text-slate-400">PREMA-DC-019</td>
                  <td className="p-3 text-emerald-400 font-bold">2,352 pcs</td>
                  <td className="p-3 text-rose-400">48 pcs</td>
                  <td className="p-3">2.00%</td>
                  <td className="p-3"><span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px]">RECONCILED</span></td>
                </tr>
                <tr className="bg-slate-950 font-bold text-white">
                  <td className="p-3 font-sans">TOTAL INVOICE #3207 ALLOCATION</td>
                  <td className="p-3 text-slate-400">4 Delivery Challans</td>
                  <td className="p-3 text-blue-400">2,630 Rods</td>
                  <td className="p-3 text-purple-400">10,520 pcs</td>
                  <td className="p-3 text-slate-400">7 Inward Challans</td>
                  <td className="p-3 text-emerald-400">10,360 pcs</td>
                  <td className="p-3 text-rose-400">160 pcs</td>
                  <td className="p-3 text-amber-300">1.52% avg</td>
                  <td className="p-3 text-emerald-400">100% ACCOUNTED</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: TOOL LIFE & MACHINE MAINTENANCE */}
      {activeTab === 'maintenance' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
            <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">TOOL CONSUMPTION</span>
            <h3 className="text-base font-bold text-white">CNC Inserts & Tapping Tool Life</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Pieces machined per cutting edge in UCON in-house Ace Micromatic CNC machine and Bhavya tapping setup.
            </p>
            <div className="space-y-2 text-xs font-mono">
              <div className="bg-slate-950 p-2.5 rounded border border-slate-800 flex justify-between items-center">
                <span>CNC Turning Inserts:</span>
                <span className="text-blue-300 font-bold">120 pcs / edge</span>
              </div>
              <div className="bg-slate-950 p-2.5 rounded border border-slate-800 flex justify-between items-center">
                <span>Buttress Tap (Micro Tech):</span>
                <span className="text-amber-300 font-bold">350 pcs / tap</span>
              </div>
              <div className="bg-slate-950 p-2.5 rounded border border-slate-800 flex justify-between items-center">
                <span>4" Slitting Cutter (OVS):</span>
                <span className="text-purple-300 font-bold">1,800 cuts / sharpen</span>
              </div>
            </div>
            <div className="pt-2 text-[11px] text-slate-400 border-t border-slate-800">
              Purchases: <span className="text-slate-200 font-mono">OVS, Micro Tech, Royal Tools</span>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">CRITICAL REPAIRS</span>
            <h3 className="text-base font-bold text-white">Slitting Machine Bearing & Washer Log</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Heavy cutting vibrations and continuous 4-inch cutter load require periodic bearing and arbor washer renewal.
            </p>
            <div className="space-y-2 text-xs font-mono">
              <div className="bg-slate-950 p-2.5 rounded border border-slate-800 flex justify-between items-center">
                <span>Spindle Bearing Replacements:</span>
                <span className="text-rose-400 font-bold">6 Times (2 Yrs)</span>
              </div>
              <div className="bg-slate-950 p-2.5 rounded border border-slate-800 flex justify-between items-center">
                <span>Arbor Spacer Washers:</span>
                <span className="text-amber-300 font-bold">Accurate Engg (#118)</span>
              </div>
              <div className="bg-slate-950 p-2.5 rounded border border-slate-800 flex justify-between items-center">
                <span>Blade Sharpening Machine:</span>
                <span className="text-emerald-400 font-bold">Steel Magic Lazer 450</span>
              </div>
            </div>
            <div className="pt-2 text-[11px] text-slate-400 border-t border-slate-800">
              Table: <span className="text-slate-200 font-mono">maintenance_records</span>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">PREVENTIVE CARE</span>
            <h3 className="text-base font-bold text-white">Coolant Oil Sump & Preventive AMC</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Coolant concentration check, hydraulic oil top-up, and Ace Micromatic AMC service contract schedule.
            </p>
            <div className="space-y-2 text-xs font-mono">
              <div className="bg-slate-950 p-2.5 rounded border border-slate-800 flex justify-between items-center">
                <span>Neat Cutting Oil Inward:</span>
                <span className="text-cyan-300 font-bold">Castrol ILOCUT 1945</span>
              </div>
              <div className="bg-slate-950 p-2.5 rounded border border-slate-800 flex justify-between items-center">
                <span>Ace Micromatic AMC:</span>
                <span className="text-emerald-400 font-bold">Contract #253310004717</span>
              </div>
              <div className="bg-slate-950 p-2.5 rounded border border-slate-800 flex justify-between items-center">
                <span>Electrical Panel Health:</span>
                <span className="text-purple-300 font-bold">Syscon Electro Tech #133</span>
              </div>
            </div>
            <div className="pt-2 text-[11px] text-slate-400 border-t border-slate-800">
              Contract: <span className="text-emerald-400 font-mono">Quarterly Maintenance Cycle</span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: DATABASE SCHEMA */}
      {activeTab === 'erd' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
            <div className="bg-blue-950/60 px-4 py-2.5 border-b border-blue-900/40 flex justify-between items-center">
              <span className="font-mono text-xs font-bold text-blue-300">TABLE: documents & lines</span>
              <span className="text-[10px] text-blue-400 font-mono">Core Ledger</span>
            </div>
            <div className="p-3 text-xs font-mono space-y-1.5 text-slate-300">
              <div className="flex justify-between"><span className="text-blue-400 font-semibold">id</span> <span>UUID (PK)</span></div>
              <div className="flex justify-between"><span>document_number</span> <span>TEXT</span></div>
              <div className="flex justify-between"><span>document_date</span> <span>DATE</span></div>
              <div className="flex justify-between"><span className="text-purple-400">vendor_id</span> <span>UUID (FK)</span></div>
              <div className="flex justify-between"><span>classification_code</span> <span>TEXT (A-V)</span></div>
              <div className="flex justify-between"><span>ai_confidence</span> <span>NUMERIC (0.9800)</span></div>
              <div className="border-t border-slate-800 my-1 pt-1 text-[11px] text-slate-400">Linked to: document_line_items (1:N)</div>
              <div className="flex justify-between"><span>quantity / unit_rate</span> <span>NUMERIC</span></div>
              <div className="flex justify-between"><span>capex_or_opex</span> <span>TEXT ('CAPEX'|'OPEX')</span></div>
              <div className="flex justify-between"><span>destination_module</span> <span>TEXT</span></div>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
            <div className="bg-amber-950/60 px-4 py-2.5 border-b border-amber-900/40 flex justify-between items-center">
              <span className="font-mono text-xs font-bold text-amber-300">TABLE: raw_material_lots</span>
              <span className="text-[10px] text-amber-400 font-mono">Traceability Master</span>
            </div>
            <div className="p-3 text-xs font-mono space-y-1.5 text-slate-300">
              <div className="flex justify-between"><span className="text-amber-400 font-semibold">id</span> <span>UUID (PK)</span></div>
              <div className="flex justify-between"><span className="text-blue-400">raw_invoice_id</span> <span>UUID (FK)</span></div>
              <div className="flex justify-between"><span>steel_grade</span> <span>TEXT ('20MnCr5')</span></div>
              <div className="flex justify-between"><span>inward_weight_kg</span> <span>NUMERIC</span></div>
              <div className="flex justify-between"><span>cutting_vendor_id</span> <span>UUID (Sri Murugan)</span></div>
              <div className="flex justify-between"><span>cut_rods_count</span> <span>INTEGER (~780mm)</span></div>
              <div className="flex justify-between"><span>cutting_dc_out</span> <span>TEXT</span></div>
              <div className="flex justify-between"><span>cutting_dc_in</span> <span>TEXT</span></div>
              <div className="border-t border-slate-800 my-1 pt-1 text-[11px] text-slate-400">Feeds: cnc_allocations (1:N)</div>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
            <div className="bg-emerald-950/60 px-4 py-2.5 border-b border-emerald-900/40 flex justify-between items-center">
              <span className="font-mono text-xs font-bold text-emerald-300">TABLE: machines & maintenance</span>
              <span className="text-[10px] text-emerald-400 font-mono">Asset Health</span>
            </div>
            <div className="p-3 text-xs font-mono space-y-1.5 text-slate-300">
              <div className="flex justify-between"><span className="text-emerald-400 font-semibold">id</span> <span>UUID (PK)</span></div>
              <div className="flex justify-between"><span>machine_code</span> <span>TEXT ('CNC-01', 'SLIT-01')</span></div>
              <div className="flex justify-between"><span>machine_type</span> <span>TEXT ('CNC', 'SLITTING', 'TAPPING')</span></div>
              <div className="flex justify-between"><span className="text-purple-400">vendor_id</span> <span>UUID (Ace, Bhavya)</span></div>
              <div className="flex justify-between"><span>purchase_cost</span> <span>NUMERIC (CAPEX)</span></div>
              <div className="border-t border-slate-800 my-1 pt-1 text-[11px] text-slate-400">Linked to: maintenance_records (1:N)</div>
              <div className="flex justify-between"><span>maintenance_type</span> <span>TEXT ('BEARING', 'WASHER', 'AMC')</span></div>
              <div className="flex justify-between"><span className="text-blue-400">document_id</span> <span>UUID (Bill link)</span></div>
              <div className="flex justify-between"><span>amount</span> <span>NUMERIC</span></div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: ERASER.IO CODE */}
      {activeTab === 'code' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-slate-900 p-4 rounded-xl border border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-white">Eraser.io Diagram-as-Code</h3>
              <p className="text-xs text-slate-400">Copy this code and paste directly into app.eraser.io to edit visually</p>
            </div>
            <button
              onClick={copyToClipboard}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow transition"
            >
              {copied ? 'Copied!' : 'Copy Eraser.io Code'}
            </button>
          </div>
          <pre className="bg-slate-950 p-5 rounded-xl border border-slate-800 text-xs font-mono text-slate-200 overflow-x-auto select-all leading-relaxed">
            {eraserCode}
          </pre>
        </div>
      )}
    </div>
  );
}
