'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';

interface SubcontractorAllocation {
  id: string;
  vendorName: string;
  category: 'IN_HOUSE' | 'MAJOR_SUBCONTRACT' | 'MINOR_SUBCONTRACT';
  tonnageAllocated: number; // Tons
  rodsDispatched: number; // 780mm cut rods
  actualPartsReturned: number; // pieces returned
  ratePerPiece: number; // ₹/piece
  boreQcApproved: number; // pieces passed Go/No-Go
  boreQcRejected: number; // pieces rejected on ID bore
  scrapApplicable: boolean;
}

export default function StockFlowPage() {
  // 1. Raw Steel Stock State (20 Tons baseline)
  const [rawSteelBatch, setRawSteelBatch] = useState({
    supplier: 'NG SALES CORPORATION',
    materialGrade: '20MnCr5H Round Rod 25mm',
    poNumber: 'PO-2026-081',
    poTonnage: 20.0,
    receivedTonnage: 20.45,
    sampleTestStatus: 'APPROVED (Techmat QC #QC-841)',
    rodLengthMm: 6000,
    cutLengthMm: 780,
    cuttingVendor: 'SRI MURUGAN INDUSTRIES',
    cuttingChargePerCut: 5.0,
    rodsPerTon: 325, // approx 325 rods of 780mm per ton
  });

  // 2. Subcontractor Allocations & Yield Tracker
  const [allocations, setAllocations] = useState<SubcontractorAllocation[]>([
    {
      id: '1',
      vendorName: 'UCON IN-HOUSE CNC (ACE MICROMATIC)',
      category: 'IN_HOUSE',
      tonnageAllocated: 5.0,
      rodsDispatched: 1625,
      actualPartsReturned: 32500, // 20 pcs/rod
      ratePerPiece: 14.50, // Gross machine run cost
      boreQcApproved: 32420,
      boreQcRejected: 80,
      scrapApplicable: true,
    },
    {
      id: '2',
      vendorName: 'SRI MURUGAN INDUSTRIES',
      category: 'MAJOR_SUBCONTRACT',
      tonnageAllocated: 8.0,
      rodsDispatched: 2600,
      actualPartsReturned: 52000, // 20 pcs/rod
      ratePerPiece: 11.00,
      boreQcApproved: 51850,
      boreQcRejected: 150,
      scrapApplicable: false,
    },
    {
      id: '3',
      vendorName: 'EVERBRIGHT ENGINEERING',
      category: 'MAJOR_SUBCONTRACT',
      tonnageAllocated: 5.0,
      rodsDispatched: 1625,
      actualPartsReturned: 30875, // 19 pcs/rod
      ratePerPiece: 10.00,
      boreQcApproved: 30720,
      boreQcRejected: 155,
      scrapApplicable: false,
    },
    {
      id: '4',
      vendorName: 'PREMA ENGINEERING WORKS',
      category: 'MINOR_SUBCONTRACT',
      tonnageAllocated: 1.2,
      rodsDispatched: 390,
      actualPartsReturned: 6825, // 17.5 pcs/rod
      ratePerPiece: 9.00,
      boreQcApproved: 6760,
      boreQcRejected: 65,
      scrapApplicable: false,
    },
    {
      id: '5',
      vendorName: 'DSM ENGINEERING',
      category: 'MINOR_SUBCONTRACT',
      tonnageAllocated: 1.0,
      rodsDispatched: 325,
      actualPartsReturned: 5200, // 16 pcs/rod (Under-yield trigger)
      ratePerPiece: 9.00,
      boreQcApproved: 5120,
      boreQcRejected: 80,
      scrapApplicable: false,
    },
  ]);

  // 3. In-House Scrap Parameters
  const [scrapSettings, setScrapSettings] = useState({
    scrapRatePerKg: 38.0, // ₹38/kg scrap sale price
    swarfWeightPerPieceKg: 0.041, // approx 41g steel swarf per piece
  });

  // 4. Tapping Planning State across TAP 1, TAP 2, TAP 3
  const [tappingMachines, setTappingMachines] = useState([
    {
      id: 'TAP-1',
      name: 'Tapping Machine 1 (Bhavya High-Speed)',
      operator: 'Ramesh K.',
      piecesProcessed: 42500,
      approved: 42280,
      rejected: 220,
      tapWearCount: 2150, // out of 2,500 limit
      tapWearLimit: 2500,
      status: 'OPTIMAL',
    },
    {
      id: 'TAP-2',
      name: 'Tapping Machine 2 (Bhavya Auto-Reverse)',
      operator: 'Murugan P.',
      piecesProcessed: 40100,
      approved: 39850,
      rejected: 250,
      tapWearCount: 2420, // out of 2,500 limit
      tapWearLimit: 2500,
      status: 'NEARING_LIMIT',
    },
    {
      id: 'TAP-3',
      name: 'Tapping Machine 3 (Syscon Rigidity Head)',
      operator: 'Suresh M.',
      piecesProcessed: 38200,
      approved: 38010,
      rejected: 190,
      tapWearCount: 1200,
      tapWearLimit: 2500,
      status: 'OPTIMAL',
    },
  ]);

  // Calculations for Stage 1 & 2
  const totalCutRodsYielded = useMemo(() => {
    return Math.floor(rawSteelBatch.receivedTonnage * rawSteelBatch.rodsPerTon);
  }, [rawSteelBatch]);

  // Overall Reconciliation Summary
  const reconciliationSummary = useMemo(() => {
    let totalTonnageDispatched = 0;
    let totalRodsDispatched = 0;
    let totalPartsReturned = 0;
    let totalBoreApproved = 0;
    let totalBoreRejected = 0;
    let totalJobCost = 0;
    let inHouseScrapRevenue = 0;

    allocations.forEach((a) => {
      totalTonnageDispatched += a.tonnageAllocated;
      totalRodsDispatched += a.rodsDispatched;
      totalPartsReturned += a.actualPartsReturned;
      totalBoreApproved += a.boreQcApproved;
      totalBoreRejected += a.boreQcRejected;

      if (a.scrapApplicable) {
        // In-House: Gross Cost minus Scrap Revenue
        const gross = a.actualPartsReturned * a.ratePerPiece;
        const scrapKg = a.actualPartsReturned * scrapSettings.swarfWeightPerPieceKg;
        const scrapRev = scrapKg * scrapSettings.scrapRatePerKg;
        inHouseScrapRevenue += scrapRev;
        totalJobCost += gross - scrapRev;
      } else {
        totalJobCost += a.actualPartsReturned * a.ratePerPiece;
      }
    });

    const averageYieldPerRod = totalRodsDispatched > 0 ? (totalPartsReturned / totalRodsDispatched).toFixed(2) : '0';

    return {
      totalTonnageDispatched: totalTonnageDispatched.toFixed(2),
      balanceTonnageInStock: (rawSteelBatch.receivedTonnage - totalTonnageDispatched).toFixed(2),
      totalRodsDispatched,
      balanceRodsInRack: Math.max(0, totalCutRodsYielded - totalRodsDispatched),
      totalPartsReturned,
      totalBoreApproved,
      totalBoreRejected,
      averageYieldPerRod,
      totalJobCost: Math.round(totalJobCost).toLocaleString('en-IN'),
      inHouseScrapRevenue: Math.round(inHouseScrapRevenue).toLocaleString('en-IN'),
    };
  }, [allocations, rawSteelBatch, totalCutRodsYielded, scrapSettings]);

  return (
    <div style={{ padding: '24px 32px 60px', maxWidth: 1440, margin: '0 auto', color: '#1e293b' }}>
      
      {/* Top Header Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
        <div>
          <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '1.2px', textTransform: 'uppercase', color: '#0284c7' }}>
            MANUFACTURING MATERIAL BALANCING
          </span>
          <h1 style={{ fontSize: 26, fontWeight: 800, margin: '4px 0 6px', color: '#0f172a' }}>
            Material &amp; Subcontract Stock Reconciliation
          </h1>
          <p style={{ margin: 0, color: '#64748b', fontSize: 13, lineHeight: 1.5 }}>
            End-to-end mass balance from 20-ton raw steel batches ➔ 780mm rods ➔ Subcontract CNC piece yields ➔ Tapping machines.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Link
            href="/vendors"
            style={{
              background: '#ffffff',
              color: '#334155',
              border: '1px solid #cbd5e1',
              borderRadius: 8,
              padding: '9px 16px',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span>←</span> Back to Vendor Master Directory
          </Link>
        </div>
      </div>

      {/* Top KPI Metric Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 14,
          marginBottom: 24,
        }}
      >
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '16px 18px', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            RAW STEEL INWARD (BATCH)
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#0f172a', marginTop: 4 }}>
            {rawSteelBatch.receivedTonnage} Tons
          </div>
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 3 }}>
            Yields ~{totalCutRodsYielded.toLocaleString('en-IN')} Cut 780mm Rods
          </div>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '16px 18px', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            CUT RODS DISPATCHED
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#0284c7', marginTop: 4 }}>
            {reconciliationSummary.totalRodsDispatched.toLocaleString('en-IN')} Rods
          </div>
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 3 }}>
            Balance in Rack: {reconciliationSummary.balanceRodsInRack.toLocaleString('en-IN')} Rods
          </div>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '16px 18px', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            TOTAL CNC PIECES RETURNED
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#16a34a', marginTop: 4 }}>
            {reconciliationSummary.totalPartsReturned.toLocaleString('en-IN')} pcs
          </div>
          <div style={{ fontSize: 11, color: '#16a34a', marginTop: 3, fontWeight: 600 }}>
            Avg Yield: {reconciliationSummary.averageYieldPerRod} pcs / rod (Target 18-20)
          </div>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '16px 18px', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            ID BORE QC APPROVED
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#0f172a', marginTop: 4 }}>
            {reconciliationSummary.totalBoreApproved.toLocaleString('en-IN')} pcs
          </div>
          <div style={{ fontSize: 11, color: '#dc2626', marginTop: 3, fontWeight: 600 }}>
            {reconciliationSummary.totalBoreRejected} Rejected on Go/No-Go Gauge
          </div>
        </div>
      </div>

      {/* SECTION 1: RAW MATERIAL STEEL TONS & CUTTING STAGE */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 22, marginBottom: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, borderBottom: '1px solid #f1f5f9', paddingBottom: 12 }}>
          <div>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#0284c7', textTransform: 'uppercase' }}>STAGE 1 &amp; STAGE 2</span>
            <h2 style={{ fontSize: 18, fontWeight: 800, margin: '2px 0 0', color: '#0f172a' }}>
              Raw Steel Tonnage (20T Batch) &amp; Rod Cutting (780mm)
            </h2>
          </div>
          <span style={{ background: '#eff6ff', color: '#1d4ed8', padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700 }}>
            Grade: 20MnCr5H
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
          <div style={{ background: '#f8fafc', padding: 14, borderRadius: 8, border: '1px solid #edf2f7', fontSize: 12, lineHeight: 1.6 }}>
            <strong style={{ color: '#0f172a', display: 'block', marginBottom: 6 }}>1. Raw Steel Inward</strong>
            <div><strong>Supplier:</strong> {rawSteelBatch.supplier}</div>
            <div><strong>PO Number:</strong> {rawSteelBatch.poNumber} ({rawSteelBatch.poTonnage} Tons Planned)</div>
            <div><strong>Received Inward:</strong> <span style={{ color: '#0284c7', fontWeight: 800 }}>{rawSteelBatch.receivedTonnage} Metric Tons</span></div>
            <div><strong>Spectrometry &amp; Tensile QC:</strong> <span style={{ color: '#16a34a', fontWeight: 700 }}>✓ {rawSteelBatch.sampleTestStatus}</span></div>
          </div>

          <div style={{ background: '#f8fafc', padding: 14, borderRadius: 8, border: '1px solid #edf2f7', fontSize: 12, lineHeight: 1.6 }}>
            <strong style={{ color: '#0f172a', display: 'block', marginBottom: 6 }}>2. 780mm Cutting Operation</strong>
            <div><strong>Cutting Vendor:</strong> {rawSteelBatch.cuttingVendor}</div>
            <div><strong>Cut Length:</strong> 780mm (6000mm bar yields 7 pieces + end bit)</div>
            <div><strong>Cutting Charge:</strong> ₹{rawSteelBatch.cuttingChargePerCut.toFixed(2)} per cut</div>
            <div><strong>Total Cut Rods Stock:</strong> <span style={{ color: '#16a34a', fontWeight: 800 }}>{totalCutRodsYielded.toLocaleString('en-IN')} Rods</span></div>
          </div>

          <div style={{ background: '#f8fafc', padding: 14, borderRadius: 8, border: '1px solid #edf2f7', fontSize: 12, lineHeight: 1.6 }}>
            <strong style={{ color: '#0f172a', display: 'block', marginBottom: 6 }}>3. Allocation Mass Balance</strong>
            <div><strong>Total Rods Dispatched:</strong> {reconciliationSummary.totalRodsDispatched.toLocaleString('en-IN')} Rods</div>
            <div><strong>Remaining Cut Rods in Rack:</strong> <span style={{ color: '#0284c7', fontWeight: 700 }}>{reconciliationSummary.balanceRodsInRack.toLocaleString('en-IN')} Rods</span></div>
            <div><strong>Uncut Steel Balance:</strong> {reconciliationSummary.balanceTonnageInStock} Tons</div>
            <div><strong>Cutting Cost:</strong> ₹{(totalCutRodsYielded * rawSteelBatch.cuttingChargePerCut).toLocaleString('en-IN')}</div>
          </div>
        </div>
      </div>

      {/* SECTION 2: SUBCONTRACT CNC ALLOCATION, PIECE YIELDS & DEBIT NOTE ENGINE */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 22, marginBottom: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, borderBottom: '1px solid #f1f5f9', paddingBottom: 12 }}>
          <div>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#16a34a', textTransform: 'uppercase' }}>STAGE 3: CNC TURNING &amp; YIELD AUDIT</span>
            <h2 style={{ fontSize: 18, fontWeight: 800, margin: '2px 0 0', color: '#0f172a' }}>
              CNC Subcontractor Piece Yields, Rates &amp; Debit Note Alerts
            </h2>
          </div>
          <div style={{ fontSize: 12, color: '#64748b' }}>
            Normal Tolerance: <strong>18 to 22 pcs / rod</strong> • Trigger Debit Note if <strong>&le; 17 pcs</strong>
          </div>
        </div>

        {/* Allocation Table */}
        <div style={{ overflowX: 'auto', marginBottom: 18 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: 11, textTransform: 'uppercase' }}>
                <th style={{ padding: '12px 14px', fontWeight: 700 }}>CNC Machine Shop / Vendor</th>
                <th style={{ padding: '12px 12px', fontWeight: 700 }}>Tonnage / Rods</th>
                <th style={{ padding: '12px 12px', fontWeight: 700 }}>Parts Returned</th>
                <th style={{ padding: '12px 12px', fontWeight: 700 }}>Yield / Rod</th>
                <th style={{ padding: '12px 12px', fontWeight: 700 }}>Rate / pc</th>
                <th style={{ padding: '12px 12px', fontWeight: 700 }}>ID Bore QC Status</th>
                <th style={{ padding: '12px 12px', fontWeight: 700 }}>Debit Note Audit</th>
                <th style={{ padding: '12px 14px', fontWeight: 700, textAlign: 'right' }}>Net Pay / Cost</th>
              </tr>
            </thead>
            <tbody>
              {allocations.map((a) => {
                const yieldPerRod = a.rodsDispatched > 0 ? a.actualPartsReturned / a.rodsDispatched : 0;
                const isUnderYield = yieldPerRod <= 17.0; // Debit note trigger
                const expectedParts = a.rodsDispatched * 20; // 20 standard
                const shortagePieces = Math.max(0, expectedParts - a.actualPartsReturned);
                const steelLossDebit = shortagePieces * 18.50; // estimated raw steel cost per wedge

                let netPayable = 0;
                if (a.scrapApplicable) {
                  const gross = a.actualPartsReturned * a.ratePerPiece;
                  const scrapRev = a.actualPartsReturned * scrapSettings.swarfWeightPerPieceKg * scrapSettings.scrapRatePerKg;
                  netPayable = gross - scrapRev;
                } else {
                  netPayable = a.actualPartsReturned * a.ratePerPiece;
                }

                return (
                  <tr key={a.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '14px', verticalAlign: 'top', whiteSpace: 'normal', lineHeight: 1.4 }}>
                      <strong style={{ color: '#0f172a', fontSize: 13, display: 'block' }}>{a.vendorName}</strong>
                      <span style={{ fontSize: 10, color: a.scrapApplicable ? '#16a34a' : '#64748b', fontWeight: 600 }}>
                        {a.scrapApplicable ? 'In-House (Scrap Deducted)' : 'Outsource Subcontract'}
                      </span>
                    </td>

                    <td style={{ padding: '14px 12px', verticalAlign: 'top', whiteSpace: 'normal' }}>
                      <div style={{ fontWeight: 700, color: '#0f172a' }}>{a.tonnageAllocated} Tons</div>
                      <div style={{ color: '#64748b', fontSize: 11 }}>{a.rodsDispatched.toLocaleString('en-IN')} Rods</div>
                    </td>

                    <td style={{ padding: '14px 12px', verticalAlign: 'top', whiteSpace: 'normal' }}>
                      <div style={{ fontWeight: 800, color: '#0284c7' }}>{a.actualPartsReturned.toLocaleString('en-IN')} pcs</div>
                      <div style={{ color: '#64748b', fontSize: 11 }}>Expected: {expectedParts.toLocaleString('en-IN')}</div>
                    </td>

                    <td style={{ padding: '14px 12px', verticalAlign: 'top', whiteSpace: 'normal' }}>
                      <div
                        style={{
                          fontWeight: 800,
                          fontSize: 13,
                          color: yieldPerRod >= 19 ? '#16a34a' : yieldPerRod >= 18 ? '#0284c7' : '#dc2626',
                        }}
                      >
                        {yieldPerRod.toFixed(1)} pcs / rod
                      </div>
                      <div style={{ fontSize: 10, color: '#64748b' }}>
                        {yieldPerRod >= 20 ? 'Optimal' : yieldPerRod >= 18 ? 'Acceptable' : 'Low Yield'}
                      </div>
                    </td>

                    <td style={{ padding: '14px 12px', verticalAlign: 'top', whiteSpace: 'normal' }}>
                      <div style={{ fontWeight: 700, color: '#0f172a' }}>₹{a.ratePerPiece.toFixed(2)}</div>
                      <div style={{ fontSize: 10, color: '#64748b' }}>per component</div>
                    </td>

                    <td style={{ padding: '14px 12px', verticalAlign: 'top', whiteSpace: 'normal' }}>
                      <div style={{ color: '#16a34a', fontWeight: 700 }}>✓ {a.boreQcApproved.toLocaleString('en-IN')} Approved</div>
                      {a.boreQcRejected > 0 && (
                        <div style={{ color: '#dc2626', fontSize: 11, fontWeight: 600 }}>
                          ✕ {a.boreQcRejected} Rejected (Bore Go/No-Go)
                        </div>
                      )}
                    </td>

                    <td style={{ padding: '14px 12px', verticalAlign: 'top', whiteSpace: 'normal' }}>
                      {isUnderYield ? (
                        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '6px 8px', borderRadius: 6 }}>
                          <span style={{ color: '#dc2626', fontWeight: 800, fontSize: 11, display: 'block' }}>
                            ⚠️ DEBIT NOTE RAISED
                          </span>
                          <span style={{ fontSize: 10, color: '#991b1b' }}>
                            Shortage: {shortagePieces} pcs (Debit ₹{Math.round(steelLossDebit).toLocaleString('en-IN')})
                          </span>
                        </div>
                      ) : (
                        <span style={{ color: '#16a34a', fontSize: 11, fontWeight: 700 }}>
                          ✓ Within Tolerance (18-22)
                        </span>
                      )}
                    </td>

                    <td style={{ padding: '14px', verticalAlign: 'top', textAlign: 'right', whiteSpace: 'normal' }}>
                      <div style={{ fontWeight: 800, color: '#0f172a', fontSize: 13 }}>
                        ₹{Math.round(netPayable).toLocaleString('en-IN')}
                      </div>
                      {a.scrapApplicable && (
                        <div style={{ fontSize: 10, color: '#16a34a' }}>
                          (Incl. Scrap Credit)
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Note on In-House Scrap Recovery vs Outsource Subcontractors */}
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 14, fontSize: 12, lineHeight: 1.6, color: '#475569' }}>
          <strong>📌 Accounting &amp; Scrap Policy Rule:</strong>
          <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
            <li>
              <strong>Outsource Subcontractors (Murugan ₹11, Everbright ₹10, Others ₹9):</strong> Paid purely on a per-piece component basis. Scrap swarf is retained by the vendor and not credited.
            </li>
            <li>
              <strong>UCON In-House CNC (Ace Micromatic):</strong> Full raw steel input is accounted for. Boring swarf and parting chips (approx 41g/pc) are collected, sold to scrap dealers at <strong>₹{scrapSettings.scrapRatePerKg}/kg</strong>, and credited directly against manufacturing operating cost (Recovered: <strong>₹{reconciliationSummary.inHouseScrapRevenue}</strong>).
            </li>
          </ul>
        </div>
      </div>

      {/* SECTION 3: TAPPING PROCESS & MACHINE PLANNING (TAP 1, TAP 2, TAP 3) */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 22, marginBottom: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, borderBottom: '1px solid #f1f5f9', paddingBottom: 12 }}>
          <div>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase' }}>STAGE 4: TAPPING PROCESS &amp; TOOL WEAR</span>
            <h2 style={{ fontSize: 18, fontWeight: 800, margin: '2px 0 0', color: '#0f172a' }}>
              Tapping Machine Planning (TAP 1, TAP 2, TAP 3) &amp; Buttress Tap Life
            </h2>
          </div>
          <div style={{ fontSize: 12, color: '#64748b' }}>
            Tapping Stock Available: <strong style={{ color: '#0f172a' }}>{reconciliationSummary.totalBoreApproved.toLocaleString('en-IN')} pcs</strong>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
          {tappingMachines.map((m) => {
            const wearPct = ((m.tapWearCount / m.tapWearLimit) * 100).toFixed(0);
            return (
              <div
                key={m.id}
                style={{
                  background: '#f8fafc',
                  border: m.status === 'NEARING_LIMIT' ? '1px solid #f59e0b' : '1px solid #e2e8f0',
                  borderRadius: 10,
                  padding: 18,
                  fontSize: 12,
                  lineHeight: 1.6,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div>
                    <span style={{ fontSize: 10, fontWeight: 800, color: '#7c3aed', textTransform: 'uppercase' }}>{m.id}</span>
                    <h3 style={{ margin: '2px 0', fontSize: 14, fontWeight: 800, color: '#0f172a' }}>{m.name}</h3>
                    <span style={{ color: '#64748b', fontSize: 11 }}>Operator: {m.operator}</span>
                  </div>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: '3px 8px',
                      borderRadius: 4,
                      background: m.status === 'NEARING_LIMIT' ? '#fef3c7' : '#f0fdf4',
                      color: m.status === 'NEARING_LIMIT' ? '#b45309' : '#15803d',
                    }}
                  >
                    {m.status === 'NEARING_LIMIT' ? 'Tap Regrind Soon' : 'Optimal'}
                  </span>
                </div>

                <div style={{ margin: '10px 0', padding: '10px 12px', background: '#ffffff', borderRadius: 8, border: '1px solid #edf2f7' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ color: '#64748b' }}>Approved Tapped:</span>
                    <strong style={{ color: '#16a34a' }}>{m.approved.toLocaleString('en-IN')} pcs</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ color: '#64748b' }}>Tapping Rejections:</span>
                    <strong style={{ color: '#dc2626' }}>{m.rejected} pcs</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Thread Acceptance:</span>
                    <strong>{((m.approved / m.piecesProcessed) * 100).toFixed(1)}%</strong>
                  </div>
                </div>

                {/* Tool Wear Progress Bar */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
                    <span style={{ color: '#475569', fontWeight: 600 }}>Buttress Tap Tool Life:</span>
                    <strong style={{ color: Number(wearPct) > 90 ? '#b45309' : '#0f172a' }}>
                      {m.tapWearCount} / {m.tapWearLimit} pcs ({wearPct}%)
                    </strong>
                  </div>
                  <div style={{ height: 6, background: '#e2e8f0', borderRadius: 4, overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${wearPct}%`,
                        background: Number(wearPct) > 90 ? '#f59e0b' : '#7c3aed',
                        borderRadius: 4,
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 4: DOWNSTREAM MANUFACTURING PIPELINE (SLITTING, HEAT TREATMENT & CENTRAL STORE) */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 22, boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
        <div style={{ marginBottom: 16, borderBottom: '1px solid #f1f5f9', paddingBottom: 12 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase' }}>STAGE 5 THROUGH STAGE 8</span>
          <h2 style={{ fontSize: 18, fontWeight: 800, margin: '2px 0 0', color: '#0f172a' }}>
            Downstream Slitting, Heat Treatment &amp; Central Store Dispatch
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
          {/* Slitting */}
          <div style={{ background: '#f8fafc', padding: 14, borderRadius: 8, border: '1px solid #edf2f7', fontSize: 12, lineHeight: 1.6 }}>
            <span style={{ fontSize: 10, fontWeight: 800, color: '#0284c7', textTransform: 'uppercase' }}>STAGE 5: SLITTING</span>
            <h4 style={{ margin: '4px 0', fontSize: 13, fontWeight: 800, color: '#0f172a' }}>3 Slitting Machines</h4>
            <p style={{ margin: '0 0 8px', color: '#64748b', fontSize: 11 }}>Capacity: 50 pcs/hour per machine.</p>
            <div>• 4&quot; Slitting Cutters (Accurate Engineering / OVS Tools)</div>
            <div>• Blade regrind cost: ₹750 per blade</div>
            <div>• Spindle bearing &amp; arbor washer maintenance verified</div>
          </div>

          {/* Heat Treatment */}
          <div style={{ background: '#f8fafc', padding: 14, borderRadius: 8, border: '1px solid #edf2f7', fontSize: 12, lineHeight: 1.6 }}>
            <span style={{ fontSize: 10, fontWeight: 800, color: '#b45309', textTransform: 'uppercase' }}>STAGE 6: HEAT TREATMENT</span>
            <h4 style={{ margin: '4px 0', fontSize: 13, fontWeight: 800, color: '#0f172a' }}>Unitherm Engineers / Ambattur</h4>
            <p style={{ margin: '0 0 8px', color: '#64748b', fontSize: 11 }}>Sealed Quench Furnace (SQF) carburizing.</p>
            <div>• Required Hardness: <strong style={{ color: '#b45309' }}>54-64 HRC</strong></div>
            <div>• Case Depth: 0.5 - 0.7 mm</div>
            <div>• Accompanied by official MTC Hardness Report</div>
          </div>

          {/* Load Testing */}
          <div style={{ background: '#f8fafc', padding: 14, borderRadius: 8, border: '1px solid #edf2f7', fontSize: 12, lineHeight: 1.6 }}>
            <span style={{ fontSize: 10, fontWeight: 800, color: '#16a34a', textTransform: 'uppercase' }}>STAGE 7: 100% LOAD TESTING</span>
            <h4 style={{ margin: '4px 0', fontSize: 13, fontWeight: 800, color: '#0f172a' }}>190kN Load Efficiency Bench</h4>
            <p style={{ margin: '0 0 8px', color: '#64748b', fontSize: 11 }}>Syscon instrumentation calibrated test.</p>
            <div>• Load increased 0% ➔ 80% (1 hr) ➔ 101% ultimate</div>
            <div>• Spring Assembly (Grace / Viking Springs @ ₹0.80)</div>
            <div>• Plastic crate packing (300 pcs per crate)</div>
          </div>

          {/* Dispatch */}
          <div style={{ background: '#f8fafc', padding: 14, borderRadius: 8, border: '1px solid #edf2f7', fontSize: 12, lineHeight: 1.6 }}>
            <span style={{ fontSize: 10, fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>STAGE 8: CENTRAL DISPATCH</span>
            <h4 style={{ margin: '4px 0', fontSize: 13, fontWeight: 800, color: '#0f172a' }}>Chennai Central Store</h4>
            <p style={{ margin: '0 0 8px', color: '#64748b', fontSize: 11 }}>Final dispatch via Outward Delivery Challan.</p>
            <div>• Complete 20-ton steel reconciliation achieved</div>
            <div>• Zero unaccounted steel losses</div>
            <div>• Permanent ledger trace from NG Sales to Central Store</div>
          </div>
        </div>
      </div>

    </div>
  );
}
