const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://postgres.triqcnkwgyhioycidcxu:Kanishkrivith@aws-0-ap-south-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

const vendorsCsvData = [
  {
    name: "ACE DESIGNERS LIMITED",
    type: "MACHINE SUPPLIER",
    gstin: "29AABCA2364F1ZW",
    pan: "AABCA2364F",
    address: "MINNAPURA PLANT, GOVENAHALLI MINNAPURA VILLAGE, THYAMAGODLU ROAD, BENGALURU RURAL - 562123, KARNATAKA",
    email: "info@acedesigners.co.in",
    contact: "(+91)8022186700",
    material: "CNC Turning Machines & CapEx Equipment",
    stock_type: "CAPEX_MACHINE",
    conversion_rule: "Fixed Asset - Monthly Capacity 5,000-6,000 pieces/month",
    scrap_applicable: false
  },
  {
    name: "ACCURATE AUTO LATHES PVT LTD",
    type: "MACHINE & TOOLS SUPPLIER",
    gstin: "03AABCA2451K1Z3",
    pan: "AABCA2451K",
    address: "DURGI ROAD, NEAR CANAL BRIDGE, LUDHIANA, PUNJAB",
    email: "info@accurate-group.com",
    contact: "0161-2490553, 2492556, 8427700565",
    material: "Lathe & Slitting Machine Spares, Tools",
    stock_type: "MACHINERY_SPARES",
    conversion_rule: "Maintenance & Tool Spares",
    scrap_applicable: false
  },
  {
    name: "ACCURATE ENGINEERING WORKS",
    type: "TOOLS SUPPLIER",
    gstin: "03ADTPS7830G1Z6",
    pan: "ADTPS7830G",
    address: "DURGI ROAD, NEAR CANAL BRIDGE, LUDHIANA, PUNJAB",
    email: "accurate.bindu@gmail.com",
    contact: "0161-2492554, 9316888845",
    material: "4-Inch Slitting Cutters & Regrind Blades",
    stock_type: "TOOLING_BLADES",
    conversion_rule: "Tool Life: 50 pcs/hr per blade; regrind @ ₹750",
    scrap_applicable: false
  },
  {
    name: "AMBATTUR HEAT TREATERS",
    type: "HEAT TREATERS",
    gstin: "33AAACA3141P1ZU",
    pan: "AAACA3141P",
    address: "NO.7/6, M.T.H.ROAD, (OPP. GOVT. I.T.I), AMBATTUR INDUSTRIAL ESTATE, CHENNAI - 600058",
    email: "customercare@ahtpl.com",
    contact: "26524503, 26524504",
    material: "Case Hardening & Carburizing Services",
    stock_type: "HEAT_TREATED_PARTS",
    conversion_rule: "Hardness: 54-64 HRC, Case Depth 0.5-0.7mm",
    scrap_applicable: false
  },
  {
    name: "A R TRADERS",
    type: "TOOLS SUPPLIER",
    gstin: "33AYEPP9827C1ZD",
    pan: "AYEPP9827C",
    address: "NO.30/46, MUTHURAMALINGAM STREET, POONAMALLE ROAD, EKKATTUTHANGAL, CHANNEI - 600032",
    email: "artraders321@yahoo.com",
    contact: "044-42702131, 9944861666",
    material: "Workshop Tools, Fasteners, Drill Bits",
    stock_type: "WORKSHOP_TOOLS",
    conversion_rule: "Consumable & Workshop Tooling",
    scrap_applicable: false
  },
  {
    name: "AR TRADERS CNC",
    type: "TOOLS SUPPLIER",
    gstin: "33ABEFA7258F1ZL",
    pan: "ABEFA7258F",
    address: "NO.30/46, MUTHURAMALINGAM STREET, POONAMALLE ROAD, EKKATTUTHANGAL, CHANNEI - 600032",
    email: "",
    contact: "044-45514149, 9944865222",
    material: "CNC Toolholders, Chuck Jaws & Hardware",
    stock_type: "CNC_TOOLING",
    conversion_rule: "CNC Lathe Tooling & Inserts",
    scrap_applicable: false
  },
  {
    name: "BHAVYA MACHINE TOOLS LLP",
    type: "MACHINE SUPPLIER",
    gstin: "24AATFB8613R1ZO",
    pan: "AATFB8613R",
    address: "PLOT NO.3, BLOCK NO.86, SURVEY NO.147, NR. DIVYA BHASKAR PRESS, VILLAGE CHACHARVADI VASNA, BAVLA-CHANGODAR HIGHWAY SANAND, AHMEDABAD - 382213",
    email: "",
    contact: "",
    material: "Tapping & Slitting Machines (CapEx)",
    stock_type: "CAPEX_MACHINE",
    conversion_rule: "Tapping Machine Capacity: 20,000 pcs/month per machine",
    scrap_applicable: false
  },
  {
    name: "DSM ENGINEERING",
    type: "CNC MACHINING WORKS",
    gstin: "33BTKPA4240G1Z6",
    pan: "BTKPA4240G",
    address: "S.F.NO.199/2, BHARATH NAGAR, PODANUR (P.O), COIMBATORE - 641023",
    email: "machineworksds@gmail.com",
    contact: "8072254877, 8667213104",
    material: "Wedge CNC Machined Components",
    stock_type: "CNC_WEDGE_PARTS",
    conversion_rule: "1 Rod (780mm) = 20 CNC Pieces. Job work per piece.",
    scrap_applicable: false
  },
  {
    name: "EVERBRIGHT ENGINEERING",
    type: "CNC MACHINING WORKS",
    gstin: "33AAEFE0753E2ZY",
    pan: "AAEFE0753E",
    address: "NO.3/2, BALAJI NAGAR, 1ST CROSS STREET, EKKATTUTHANGAL, CHENNAI - 600032",
    email: "everbrightengineering@yahoo.com",
    contact: "8754452026",
    material: "Wedge CNC Turning & Machining (Subcontract)",
    stock_type: "CNC_WEDGE_PARTS",
    conversion_rule: "1 Rod (780mm) = 20 CNC Pieces. Rate: ₹10.00/pc. Capacity: 400-600 pcs/day.",
    scrap_applicable: false
  },
  {
    name: "GRACE SPRINGS",
    type: "WEDGE SPRING SUPPLIER",
    gstin: "33BNQPS2217H1Z7",
    pan: "BNQPS2217H",
    address: "NO.246, 3RD LINK STREET, NEHRU NAGAR, KOTTIVAKKAM, CHENNAI - 600096",
    email: "gracesprings2004@gmail.com",
    contact: "9382150596, 9080418612, 04424540596",
    material: "Wedge Retaining Springs (12.7mm & 15.2mm)",
    stock_type: "SPRING_STOCK",
    conversion_rule: "1 Spring per Finished Wedge (Cost ~₹0.80/spring)",
    scrap_applicable: false
  },
  {
    name: "INDUSTRIAL MACHINES & TOOL",
    type: "TOOLS SUPPLIER",
    gstin: "33AAAFI1840G1ZX",
    pan: "AAAFI1840G",
    address: "NO.132, LINGHI CHETTY STREET, CHENNAI - 600001",
    email: "industrialmachinesandtools_1990@yahoo.co.in",
    contact: "9445076371, 6369864385",
    material: "Lathe Chucks, Arbor Washers, Bearing Tools",
    stock_type: "MACHINE_SPARES",
    conversion_rule: "Slitting arbor washers & spindle bearings",
    scrap_applicable: false
  },
  {
    name: "JANANI ENTERPRISES",
    type: "OIL & LUBRICATION SUPPLIER",
    gstin: "33BZDPA2469L1ZF",
    pan: "BZDPA2469L",
    address: "NO.313/27, VADIVEL STREET, H.L COLONY, PAMMAL, CHENNAI - 600075",
    email: "jananienterprises.lub@gmail.com",
    contact: "9790855348",
    material: "YBZ Semi-Synthetic Coolant Oil & Way Lubricants",
    stock_type: "COOLANT_OIL_LITRES",
    conversion_rule: "CNC: ₹230/Litre. Tapping: 10L = ₹1800. Slitting: 10L = ₹2300.",
    scrap_applicable: false
  },
  {
    name: "MATERIAL POINT LLP",
    type: "STEEL SUPPLIER",
    gstin: "33ACCFM6928R1ZL",
    pan: "ACCFM6928R",
    address: "41, HIG-1, PHASE-1, MOGAPPAIR WEST MAIN ROAD, NOLAMBUR, CHENNAI - 600037",
    email: "gm@materialpoint.in",
    contact: "044-45808176, 9600535253",
    material: "20MnCr5 Round Rods 25mm / 26mm (Steel)",
    stock_type: "RAW_STEEL_TONS",
    conversion_rule: "6000mm Rod ➔ 7 Pieces of 780mm (+ end bit). Rate ~₹74,000/ton.",
    scrap_applicable: false
  },
  {
    name: "MICRO TECH ENGINEERING",
    type: "CNC MACHINING WORKS",
    gstin: "33BPGPS3189J1ZF",
    pan: "BPGPS3189J",
    address: "PLOT NO. 18, VELMURUGAN STREET, SRP NAGAR (EXTN), NUNKUM PALAYAM LINK ROAD, CHEMMANCHERRY, CHENNAI - 600119",
    email: "microtechshekar@gmail.com",
    contact: "",
    material: "Wedge CNC Job Work & Boring Services",
    stock_type: "CNC_WEDGE_PARTS",
    conversion_rule: "1 Rod (780mm) = 20 CNC Pieces",
    scrap_applicable: false
  },
  {
    name: "NATIONAL TOOLS",
    type: "TOOLS SUPPLIER",
    gstin: "03AEWPA6894A1ZH",
    pan: "AEWPA6894A",
    address: "B-29, ST.NO.8, HARGOBIND NAGAR, OPP. JAIN COLONY, GIASPURA, LUDHIANA",
    email: "nationaltoolproducts@gmail.com",
    contact: "0161-5011454, 9814430167, 8558991017",
    material: "Buttress Taps & Thread Gauges",
    stock_type: "TAPPING_TOOLS",
    conversion_rule: "New Tap: 2,500-3,000 pcs/tap (₹2,600). Regrind: 20-25 regrinds.",
    scrap_applicable: false
  },
  {
    name: "NG SALES CORPORATION",
    type: "STEEL SUPPLIER",
    gstin: "33AAAPA5788K1ZO",
    pan: "AAAPA5788K",
    address: "NO.101, SIDCO INDUSTRIAL ESTATE, AMBATTUR, CHANNAI - 600098",
    email: "ngs718@gmail.com",
    contact: "044-26251866, 9381032888",
    material: "20MnCr5H Round Steel Rods (25mm / 26mm)",
    stock_type: "RAW_STEEL_TONS",
    conversion_rule: "Primary Raw Material Supplier (~20 Tons lots @ ₹74,000/ton + GST)",
    scrap_applicable: false
  },
  {
    name: "NU TECH BEARINGS",
    type: "TOOLS SUPPLIER",
    gstin: "33AAEFN6417E1ZL",
    pan: "AAEFN6417E",
    address: "OLD NO. 151, THAMBU CHEETY STREET, CHENNAI - 600001",
    email: "nutechbearings@ymail.com",
    contact: "25345559, 23456211, 9840542725",
    material: "Spindle Bearings & Slitting Machine Bearings",
    stock_type: "MACHINE_SPARES",
    conversion_rule: "Slitting machine spindle bearing replacements",
    scrap_applicable: false
  },
  {
    name: "OERLIKON BALZERS COATING INDIA PVT LTD",
    type: "MATERIAL COATING",
    gstin: "33AAACI3916N1ZJ",
    pan: "AAACI3916N",
    address: "PLOT NO.A-15, SIPCOT INDUSTRIAL PARK, IRRUNGATTUKOTTAI, SRIPERUMBUDUR, KANCHEEPURAM",
    email: "a.s.sivasankar@oerlikon.com",
    contact: "044-47115300, 044-47115320",
    material: "PVD / BALINIT Tool & Cutter Coating",
    stock_type: "COATED_TOOLS",
    conversion_rule: "Enhances tap and cutter life by 2.5x",
    scrap_applicable: false
  },
  {
    name: "OVS TOOLS",
    type: "TOOLS SUPPLIER",
    gstin: "33SBAPS0135P1Z5",
    pan: "SBAPS0135P",
    address: "NH-2, NO.10/12, SINGARAVELAN STREET, MARAIMALAI NAGAR, CHENGALPATTU",
    email: "ovstools2022@gmail.com",
    contact: "8778489909, 9884879854",
    material: "Carbide Turning Inserts (TNMG 0.8, TNMG 0.4, CCMT, TDC2)",
    stock_type: "CNC_INSERTS",
    conversion_rule: "TNMG 0.8 (₹250), TNMG 0.4 (₹250), CCMT 060204 (₹175), TDC2 (₹600)",
    scrap_applicable: false
  },
  {
    name: "PERFORMANCE PRODUCTS AND SERVICES",
    type: "OIL & LUBRICATION SUPPLIER",
    gstin: "33AAIFP2825Q1ZU",
    pan: "AAIFP2825Q",
    address: "NO-2/116, BYE PASS ROAD, SENEERKUPPAM, POONAMALLEE, CHENNAI - 600056",
    email: "",
    contact: "044-26494495, 044-26495115",
    material: "Hydraulic Oils, Slideway Oils, Chuck Grease",
    stock_type: "COOLANT_OIL_LITRES",
    conversion_rule: "Chuck grease (₹1850) & lubrication oil (4L @ ₹180 = ₹720)",
    scrap_applicable: false
  },
  {
    name: "PREMA ENGINEERING WORKS",
    type: "CNC MACHINING WORKS",
    gstin: "33BLAPP5447C1ZE",
    pan: "BLAPP5447C",
    address: "2/12, SHED NO 4B, 3RD STREET, M.R.AVENUE, MR INDUSTRIAL COMPLEX, ATHIPET, CHENNAI - 600058",
    email: "premaengineering2019@gmail.com",
    contact: "",
    material: "Wedge CNC Turning Subcontract",
    stock_type: "CNC_WEDGE_PARTS",
    conversion_rule: "1 Rod (780mm) = 20 CNC Pieces",
    scrap_applicable: false
  },
  {
    name: "PREWO REFORM",
    type: "MACHINE & OIL LUBRICATION SUPPLIER",
    gstin: "33AAEFR1084P1ZX",
    pan: "AAEFR1084P",
    address: "1/130, (OLD NO.1/98), VALLEESWARAN KOIL STREET, MANAPAKKAM, CHENNAI - 60125",
    email: "reform_p@hotmail.com",
    contact: "9884032625, 9840023625",
    material: "Workshop Machinery Spares & Oils",
    stock_type: "MACHINE_SPARES",
    conversion_rule: "Machine Spares & Maintenance Consumables",
    scrap_applicable: false
  },
  {
    name: "RC VENTURES",
    type: "CRATES SUPPLIER",
    gstin: "33AFWPC8217Q1ZS",
    pan: "AFWPC8217Q",
    address: "NO.3/1803, MADANANDAPURAM, KUNDRATHUR ROAD, CHENNAI - 600116",
    email: "",
    contact: "7358030034, 9940143541",
    material: "Plastic Storage Crates & Handling Bins",
    stock_type: "PACKAGING_CRATES",
    conversion_rule: "Lot handling: 300 pieces per packing crate",
    scrap_applicable: false
  },
  {
    name: "ROYAL TOOL AGENCIES",
    type: "TOOLS SUPPLIER",
    gstin: "33AAEFR6488D1Z4",
    pan: "AAEFR6488D",
    address: "OLD NO. 11, NEW NO.21, ERRABALU STREET, PARRYS, CHENNAI - 600001",
    email: "royaltoolsagencieschennai@gmail.com",
    contact: "044-25383048, 044-25396247, 8825676160",
    material: "Taper Shank Center Drills & Tooling",
    stock_type: "CNC_TOOLING",
    conversion_rule: "12mm taper shank drill (₹400), 11.5mm main drill (₹750)",
    scrap_applicable: false
  },
  {
    name: "R.S.TRADERS",
    type: "TOOLS SUPPLIER",
    gstin: "33AAJPB4490J1ZR",
    pan: "AAJPB4490J",
    address: "146-147, KANNAPPAR THIDAL, NEW MOORE MARKET, CHENNAI - 600003",
    email: "",
    contact: "6840069303",
    material: "Workshop Tools, Fasteners & Hardware",
    stock_type: "WORKSHOP_TOOLS",
    conversion_rule: "Maintenance Consumables",
    scrap_applicable: false
  },
  {
    name: "SATHISH LUBRICANTS",
    type: "OIL & LUBRICATION SUPPLIER",
    gstin: "33AABPD8432A1ZI",
    pan: "AABPD8432A",
    address: "FLAT 1C, 1ST FLOOR, PLOT NO.211, 6TH STREET, KAMAKOTI NAGAR 1ST MAIN ROAD, PALLIKARANAI, CHANNEI - 600100",
    email: "sathishlubricants4@gmail.com",
    contact: "9382199463",
    material: "Castrol ILOCUT 1945 Neat Cutting Oil",
    stock_type: "COOLANT_OIL_LITRES",
    conversion_rule: "High-grade neat cutting oil for tapping and slitting",
    scrap_applicable: false
  },
  {
    name: "SRI MURUGAN INDUSTRIES",
    type: "CNC MACHINING WORKS",
    gstin: "33AGOPA9907A1ZQ",
    pan: "AGOPA9907A",
    address: "NO.56, 3RD CROSS STREET, CORPORATION ROAD, SARAVANA NAGAR, SEEVARAM, PERUNGUDI, CHANNAI - 600096",
    email: "srimuruganindustries2008@gmail.com",
    contact: "9445111114",
    material: "Steel Cutting (780mm) & Wedge CNC Machining",
    stock_type: "CUT_RODS_AND_CNC_PARTS",
    conversion_rule: "Cutting: ₹5/cut (780mm). CNC: 1 Rod (780mm) = 20 CNC Pieces @ ₹10.80/pc. Daily: 800-1000 pcs.",
    scrap_applicable: false
  },
  {
    name: "SRINIDHI INDUSTRIAL ENTERPRISES",
    type: "TOOLS SUPPLIER",
    gstin: "33BSCPK6004K1ZZ",
    pan: "BSCPK6004K",
    address: "NO.13/1, 6TH CROSS STREET, GROUND FLOOR, M.G.R.NAGAR, PUZHAL, CHENNAI - 600066",
    email: "srinidhi2009ent@gmail.com",
    contact: "9940377832, 7708081710",
    material: "Chamfering Tools, Deburring Blades",
    stock_type: "CNC_TOOLING",
    conversion_rule: "Chamfer tool (₹800), deburring consumables",
    scrap_applicable: false
  },
  {
    name: "STEEL MAGIC",
    type: "MACHINE & TOOLS SUPPLIER",
    gstin: "03AXAPS9605A1ZV",
    pan: "AXAPS9605A",
    address: "NEAR BAPU ASHARAM ASHRAM, SIDHWAN CANAL ROAD, VPO: TIBBA, LUDHIANA - 141120",
    email: "info@pipecuttingmachine.co.in",
    contact: "",
    material: "Pipe / Rod Cutting Machine Blades & Spares",
    stock_type: "MACHINE_SPARES",
    conversion_rule: "Circular cutting blades & clamp jaws",
    scrap_applicable: false
  },
  {
    name: "SYSCON ELECRO TECH INDIA PVT LTD",
    type: "EQUIPMENT SUPPLIER",
    gstin: "29ABKCS5164K1ZO",
    pan: "ABKCS5164K",
    address: "NO.3, G.F, 5TH CROSS STREET, 1ST MAIN ROAD, PRASHANTH NAGAR, BANGALORE - 560079",
    email: "director@syscon-tech.com, umasyscon@gmail.com",
    contact: "9611887180, 9611068167, 9343797320",
    material: "Electronic Digital Gauges & Load Cells (190kN)",
    stock_type: "EQUIPMENT_GAUGES",
    conversion_rule: "100% Load testing bench electronics (190kN verification)",
    scrap_applicable: false
  },
  {
    name: "TECHMAT ENTERPRISES INDIA PVT LTD PLANT II",
    type: "HEAT TREATERS",
    gstin: "33AAACT7635H1ZD",
    pan: "AAACT7635H",
    address: "46, VANAGARAM ROAD, AYANAMBAKKAM, CHENNAI - 600095",
    email: "salesp2@techmatheattreaters.in",
    contact: "044-26531207, 044-26530131",
    material: "Spectrometry Testing, Micro-Hardness & Metallurgical QC",
    stock_type: "QC_TEST_REPORTS",
    conversion_rule: "Batch Spectrometry & Tensile/Hardness testing",
    scrap_applicable: false
  },
  {
    name: "THIRUPATHY BRIGHT INDUSTRIES",
    type: "STEEL SUPPLIER",
    gstin: "33AAAFT5563D1ZG",
    pan: "AAAFT5563D",
    address: "SURVEY NO.37 AND 38/1A, 1B, THANDALACHERRY VILLAGE, GUMMUDIPOONDI TALUK, THIRUVALLORE - 601201",
    email: "accounts@thirupathybright.com",
    contact: "",
    material: "20MnCr5 Bright Drawn Steel Bars (25mm / 26mm)",
    stock_type: "RAW_STEEL_TONS",
    conversion_rule: "High tolerance bright drawn round bars",
    scrap_applicable: false
  },
  {
    name: "TRUTEC TECHNOLOGIES",
    type: "TOOLS SUPPLIER",
    gstin: "33AALFT1340F1ZI",
    pan: "AALFT1340F",
    address: "PLOT NO.219, WIP, SIDCO, THIRUMULLAIVOYAL, KATOOR, CHENNAI - 600062",
    email: "sales@trutec.in",
    contact: "7338897990",
    material: "Precision Go / No-Go Thread Plug Gauges",
    stock_type: "QC_GAUGES",
    conversion_rule: "Go gauge acceptable; No-Go rejected",
    scrap_applicable: false
  },
  {
    name: "UNITHERM ENGINEERS LIMITED",
    type: "HEAT TREATERS",
    gstin: "33AAACU4041L1ZH",
    pan: "AAACU4041L",
    address: "PLOT NO.L-7/1C, L-7/1D, SIPCOT INDUSTRIAL PARK, AEROSPACE, VALLAM VADAGAL, SRIPERUMBUDUR, KANCHEEPURAM, TAMILNADU - 602105",
    email: "",
    contact: "8925925872",
    material: "Sealed Quench Furnace (SQF) Case Hardening",
    stock_type: "HEAT_TREATED_PARTS",
    conversion_rule: "54-64 HRC, 0.5-0.7mm Case depth with MTC certificate",
    scrap_applicable: false
  },
  {
    name: "VIKING SPRINGS",
    type: "WEDGE SPRING SUPPLIER",
    gstin: "33AEWPM2877B1Z9",
    pan: "AEWPM2877B",
    address: "NO.17/5, MADUVINKARAI, 4TH STREET, ALANDUR, CHENNAI - 600016",
    email: "mail@vikingsprings.in",
    contact: "044-22334035, 044-22342220, 9381044465",
    material: "Wedge Springs (12.7mm & 15.2mm Retainers)",
    stock_type: "SPRING_STOCK",
    conversion_rule: "1 Spring per Wedge (~₹0.80/piece)",
    scrap_applicable: false
  },
  {
    name: "UCON IN-HOUSE CNC UNIT",
    type: "IN-HOUSE CNC MACHINING",
    gstin: "33AAACU6685L1ZV",
    pan: "AAACU6685L",
    address: "UCON WEDGE MANUFACTURING UNIT, CHENNAI",
    email: "production@uconpt.com",
    contact: "In-House Plant",
    material: "Wedge CNC Turning (Ace Micromatic) + Scrap Recovery",
    stock_type: "CNC_WEDGE_PARTS",
    conversion_rule: "1 Rod (780mm) = 20 CNC Pieces. Scrap credited against operating cost.",
    scrap_applicable: true
  }
];

async function runMigration() {
  try {
    console.log('Ensuring columns exist in vendors table...');
    await pool.query(`
      ALTER TABLE vendors ADD COLUMN IF NOT EXISTS pan TEXT;
      ALTER TABLE vendors ADD COLUMN IF NOT EXISTS vendor_type TEXT;
      ALTER TABLE vendors ADD COLUMN IF NOT EXISTS material_supplied TEXT;
      ALTER TABLE vendors ADD COLUMN IF NOT EXISTS inward_stock_type TEXT;
      ALTER TABLE vendors ADD COLUMN IF NOT EXISTS conversion_rule TEXT;
      ALTER TABLE vendors ADD COLUMN IF NOT EXISTS scrap_applicable BOOLEAN DEFAULT false;
    `);

    // Ensure inventory_items has vendor_id and scrap tracking columns
    await pool.query(`
      ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS vendor_id UUID REFERENCES vendors(id);
      ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS yield_factor NUMERIC DEFAULT 1;
      ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS scrap_recovery_rate NUMERIC DEFAULT 0;
    `);

    console.log('Upserting 36 registered vendors (35 verified suppliers + Ucon in-house)...');

    for (const v of vendorsCsvData) {
      // Check if vendor exists by GSTIN or canonical_name
      let existingRes = null;
      if (v.gstin) {
        existingRes = await pool.query('SELECT id FROM vendors WHERE gstin = $1 LIMIT 1', [v.gstin]);
      }
      if (!existingRes || existingRes.rows.length === 0) {
        existingRes = await pool.query(
          'SELECT id FROM vendors WHERE UPPER(canonical_name) = UPPER($1) OR UPPER(canonical_name) LIKE UPPER($2) LIMIT 1',
          [v.name, `%${v.name.split(' ')[0]}%`]
        );
      }

      if (existingRes && existingRes.rows.length > 0) {
        const id = existingRes.rows[0].id;
        await pool.query(`
          UPDATE vendors SET
            canonical_name = $1,
            category = $2,
            vendor_type = $2,
            gstin = $3,
            pan = $4,
            address = $5,
            email = $6,
            phone = $7,
            material_supplied = $8,
            inward_stock_type = $9,
            conversion_rule = $10,
            scrap_applicable = $11,
            active = true
          WHERE id = $12
        `, [
          v.name, v.type, v.gstin, v.pan, v.address, v.email, v.contact,
          v.material, v.stock_type, v.conversion_rule, v.scrap_applicable, id
        ]);
        console.log(`Updated existing vendor: ${v.name}`);
      } else {
        await pool.query(`
          INSERT INTO vendors (
            canonical_name, category, vendor_type, gstin, pan, address,
            email, phone, material_supplied, inward_stock_type, conversion_rule,
            scrap_applicable, active
          ) VALUES ($1, $2, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, true)
        `, [
          v.name, v.type, v.gstin, v.pan, v.address, v.email, v.contact,
          v.material, v.stock_type, v.conversion_rule, v.scrap_applicable
        ]);
        console.log(`Inserted new vendor: ${v.name}`);
      }
    }

    const totalCount = await pool.query('SELECT count(*) FROM vendors WHERE active = true');
    console.log(`Total active vendors in database: ${totalCount.rows[0].count}`);

  } catch (err) {
    console.error('Migration error:', err);
  } finally {
    await pool.end();
  }
}

runMigration();
