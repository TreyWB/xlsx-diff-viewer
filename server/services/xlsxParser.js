const XLSX = require('xlsx');

/**
 * Parse an Excel file and extract structured data
 * @param {string} filePath - Path to the Excel file
 * @returns {Object} Parsed workbook data with sheets
 */
function parseXlsx(filePath) {
  const workbook = XLSX.readFile(filePath, {
    cellStyles: true,
    cellFormula: true,
    cellDates: true,
  });

  const sheets = {};

  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    sheets[sheetName] = parseSheet(worksheet);
  }

  return {
    sheetNames: workbook.SheetNames,
    sheets,
  };
}

/**
 * Parse a single worksheet into a structured grid
 * @param {Object} worksheet - XLSX worksheet object
 * @returns {Object} Parsed sheet data
 */
function parseSheet(worksheet) {
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
  const rows = [];

  // Get merged cells info
  const merges = worksheet['!merges'] || [];

  for (let r = range.s.r; r <= range.e.r; r++) {
    const row = [];
    for (let c = range.s.c; c <= range.e.c; c++) {
      const cellRef = XLSX.utils.encode_cell({ r, c });
      const cell = worksheet[cellRef];

      row.push({
        ref: cellRef,
        row: r,
        col: c,
        value: cell ? formatCellValue(cell) : '',
        formula: cell?.f || null,
        type: cell?.t || 'z', // z = blank
        raw: cell?.v,
      });
    }
    rows.push(row);
  }

  return {
    rows,
    rowCount: range.e.r - range.s.r + 1,
    colCount: range.e.c - range.s.c + 1,
    merges,
  };
}

/**
 * Format cell value for display
 * @param {Object} cell - XLSX cell object
 * @returns {string} Formatted value
 */
function formatCellValue(cell) {
  if (!cell) return '';

  // Use formatted value if available
  if (cell.w !== undefined) {
    return cell.w;
  }

  // Handle different cell types
  switch (cell.t) {
    case 'n': // number
      return String(cell.v);
    case 's': // string
      return cell.v || '';
    case 'b': // boolean
      return cell.v ? 'TRUE' : 'FALSE';
    case 'd': // date
      return cell.v instanceof Date ? cell.v.toISOString().split('T')[0] : String(cell.v);
    case 'e': // error
      return cell.v || '#ERROR!';
    default:
      return cell.v !== undefined ? String(cell.v) : '';
  }
}

module.exports = {
  parseXlsx,
  parseSheet,
  formatCellValue,
};
