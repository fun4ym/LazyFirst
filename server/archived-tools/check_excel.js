const XLSX = require('xlsx');
const path = require('path');

console.log('Reading Excel file...');
const workbook = XLSX.readFile('/Users/mor/Downloads/sun.xlsx');
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

if (data.length > 0) {
    console.log('Headers:', data[0]);
    console.log('First few rows:');
    for (let i = 1; i < Math.min(5, data.length); i++) {
        console.log(data[i]);
    }
} else {
    console.log('No data found');
}