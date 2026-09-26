const XLSX = require('xlsx');
const path = require('path');

const files = [
  'D:\\Ucon Wedge Unit\\all scan\\Others Expences - 2025.xlsx',
  'D:\\Ucon Wedge Unit\\all scan\\Others Expences-2026.xlsx',
  'D:\\Ucon Wedge Unit\\all scan\\Wedge_Manufacturing_Costing.xlsx',
  'D:\\Ucon Wedge Unit\\all scan\\UCON_Monthly_Costing_Forecast_Tool.xlsx',
  'D:\\Ucon Wedge Unit\\all scan\\24.09.2026\\Wedge Machineing Data Format-24.09.2026.xlsx'
];

files.forEach(f => {
  try {
    console.log('\n=============================================');
    console.log('FILE:', path.basename(f));
    const wb = XLSX.readFile(f);
    console.log('Sheets:', wb.SheetNames);
    const firstSheet = wb.Sheets[wb.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
    console.log('Total rows in first sheet:', data.length);
    console.log('Header / First 5 rows:');
    console.log(data.slice(0, 5));
  } catch (err) {
    console.error('Error reading', f, err.message);
  }
});
