const Diff = require('diff');

/**
 * Compare two workbooks and generate diff data
 * @param {Object} original - Original workbook data
 * @param {Object} modified - Modified workbook data
 * @returns {Object} Diff result with stats and aligned data
 */
function diffWorkbooks(original, modified) {
  const allSheetNames = new Set([
    ...original.sheetNames,
    ...modified.sheetNames,
  ]);

  const sheets = {};
  const stats = {
    added: 0,
    removed: 0,
    modified: 0,
    unchanged: 0,
  };

  // Track sheet-level changes
  const sheetStatus = {};

  for (const sheetName of allSheetNames) {
    const originalSheet = original.sheets[sheetName];
    const modifiedSheet = modified.sheets[sheetName];

    if (!originalSheet) {
      // Sheet was added
      sheetStatus[sheetName] = 'added';
      sheets[sheetName] = diffSheet(null, modifiedSheet, stats);
    } else if (!modifiedSheet) {
      // Sheet was removed
      sheetStatus[sheetName] = 'removed';
      sheets[sheetName] = diffSheet(originalSheet, null, stats);
    } else {
      // Sheet exists in both - compare cells
      const sheetDiff = diffSheet(originalSheet, modifiedSheet, stats);
      sheets[sheetName] = sheetDiff;

      // Determine sheet status based on cell changes
      if (sheetDiff.hasChanges) {
        sheetStatus[sheetName] = 'modified';
      } else {
        sheetStatus[sheetName] = 'unchanged';
      }
    }
  }

  // Sort sheet names: original order first, then new sheets
  const sortedSheetNames = [
    ...original.sheetNames,
    ...modified.sheetNames.filter((name) => !original.sheetNames.includes(name)),
  ];

  return {
    sheetNames: sortedSheetNames,
    sheetStatus,
    sheets,
    stats,
  };
}

/**
 * Compare two sheets and generate cell-level diff
 * @param {Object|null} original - Original sheet data
 * @param {Object|null} modified - Modified sheet data
 * @param {Object} stats - Stats object to update
 * @returns {Object} Sheet diff data
 */
function diffSheet(original, modified, stats) {
  // Handle sheet addition/removal
  if (!original) {
    // All cells are added
    const rows = modified.rows.map((row) =>
      row.map((cell) => {
        stats.added++;
        return {
          left: null,
          right: { ...cell, status: 'added' },
          status: 'added',
        };
      })
    );
    return {
      rows,
      rowCount: modified.rowCount,
      colCount: modified.colCount,
      hasChanges: true,
    };
  }

  if (!modified) {
    // All cells are removed
    const rows = original.rows.map((row) =>
      row.map((cell) => {
        stats.removed++;
        return {
          left: { ...cell, status: 'removed' },
          right: null,
          status: 'removed',
        };
      })
    );
    return {
      rows,
      rowCount: original.rowCount,
      colCount: original.colCount,
      hasChanges: true,
    };
  }

  // Both sheets exist - compare cell by cell
  const maxRows = Math.max(original.rowCount, modified.rowCount);
  const maxCols = Math.max(original.colCount, modified.colCount);

  const rows = [];
  let hasChanges = false;

  for (let r = 0; r < maxRows; r++) {
    const row = [];
    const origRow = original.rows[r] || [];
    const modRow = modified.rows[r] || [];

    for (let c = 0; c < maxCols; c++) {
      const origCell = origRow[c] || null;
      const modCell = modRow[c] || null;

      const cellDiff = diffCell(origCell, modCell, stats);
      if (cellDiff.status !== 'unchanged') {
        hasChanges = true;
      }
      row.push(cellDiff);
    }
    rows.push(row);
  }

  return {
    rows,
    rowCount: maxRows,
    colCount: maxCols,
    hasChanges,
  };
}

/**
 * Compare two cells and determine their diff status
 * @param {Object|null} original - Original cell
 * @param {Object|null} modified - Modified cell
 * @param {Object} stats - Stats object to update
 * @returns {Object} Cell diff data
 */
function diffCell(original, modified, stats) {
  const origValue = original?.value ?? '';
  const modValue = modified?.value ?? '';

  // Both empty
  if (!origValue && !modValue) {
    return {
      left: original ? { ...original, status: 'unchanged' } : null,
      right: modified ? { ...modified, status: 'unchanged' } : null,
      status: 'unchanged',
    };
  }

  // Cell added (was empty or didn't exist)
  if (!origValue && modValue) {
    stats.added++;
    return {
      left: original ? { ...original, status: 'added' } : null,
      right: { ...modified, status: 'added' },
      status: 'added',
    };
  }

  // Cell removed (now empty or doesn't exist)
  if (origValue && !modValue) {
    stats.removed++;
    return {
      left: { ...original, status: 'removed' },
      right: modified ? { ...modified, status: 'removed' } : null,
      status: 'removed',
    };
  }

  // Both have values - compare
  if (origValue === modValue) {
    stats.unchanged++;
    return {
      left: { ...original, status: 'unchanged' },
      right: { ...modified, status: 'unchanged' },
      status: 'unchanged',
    };
  }

  // Values differ - generate word diff
  stats.modified++;
  const wordDiff = Diff.diffWords(String(origValue), String(modValue));

  return {
    left: { ...original, status: 'modified' },
    right: { ...modified, status: 'modified' },
    status: 'modified',
    wordDiff,
  };
}

module.exports = {
  diffWorkbooks,
  diffSheet,
  diffCell,
};
