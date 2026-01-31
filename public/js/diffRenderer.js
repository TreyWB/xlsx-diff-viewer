/**
 * Diff Renderer
 * Renders the spreadsheet diff result to the DOM
 */

const DiffRenderer = {
  currentSheet: null,
  diffData: null,

  render(data) {
    this.diffData = data;

    // Update stats
    this.updateStats(data.stats);

    // Render sheet tabs
    this.renderSheetTabs(data.sheetNames, data.sheetStatus);

    // Render the first sheet by default
    if (data.sheetNames.length > 0) {
      this.renderSheet(data.sheetNames[0]);
    }
  },

  updateStats(stats) {
    document.getElementById('stat-added').textContent = stats.added;
    document.getElementById('stat-removed').textContent = stats.removed;
    document.getElementById('stat-modified').textContent = stats.modified;
    document.getElementById('stat-unchanged').textContent = stats.unchanged;
    document.getElementById('stats').style.display = 'flex';
  },

  renderSheetTabs(sheetNames, sheetStatus) {
    const tabsContainer = document.getElementById('sheet-tabs');
    tabsContainer.innerHTML = '';

    for (const sheetName of sheetNames) {
      const tab = document.createElement('button');
      tab.className = 'sheet-tab';
      tab.dataset.sheet = sheetName;

      // Status indicator dot
      const status = sheetStatus[sheetName] || 'unchanged';
      const dot = document.createElement('span');
      dot.className = `status-dot ${status}`;
      tab.appendChild(dot);

      // Sheet name
      const nameSpan = document.createElement('span');
      nameSpan.textContent = sheetName;
      tab.appendChild(nameSpan);

      tab.addEventListener('click', () => {
        this.renderSheet(sheetName);
      });

      tabsContainer.appendChild(tab);
    }
  },

  renderSheet(sheetName) {
    this.currentSheet = sheetName;

    // Update tab active state
    const tabs = document.querySelectorAll('.sheet-tab');
    tabs.forEach((tab) => {
      tab.classList.toggle('active', tab.dataset.sheet === sheetName);
    });

    const sheetData = this.diffData.sheets[sheetName];
    if (!sheetData) return;

    // Render both tables
    this.renderTable('left-table', sheetData, 'left');
    this.renderTable('right-table', sheetData, 'right');

    // Reset scroll positions
    ScrollSync.reset();
  },

  renderTable(tableId, sheetData, side) {
    const table = document.getElementById(tableId);
    table.innerHTML = '';

    const { rows, colCount } = sheetData;
    if (!rows || rows.length === 0) {
      table.innerHTML = '<tr><td class="cell-empty">Empty sheet</td></tr>';
      return;
    }

    // Create header row with column letters
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');

    // Corner cell
    const cornerCell = document.createElement('th');
    cornerCell.className = 'corner-header';
    cornerCell.textContent = '';
    headerRow.appendChild(cornerCell);

    // Column headers (A, B, C, ...)
    for (let c = 0; c < colCount; c++) {
      const th = document.createElement('th');
      th.textContent = this.getColumnLetter(c);
      headerRow.appendChild(th);
    }
    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Create body rows
    const tbody = document.createElement('tbody');

    for (let r = 0; r < rows.length; r++) {
      const row = rows[r];
      const tr = document.createElement('tr');

      // Row number header
      const rowHeader = document.createElement('td');
      rowHeader.className = 'row-header';
      rowHeader.textContent = r + 1;
      tr.appendChild(rowHeader);

      // Cells
      for (let c = 0; c < row.length; c++) {
        const cellDiff = row[c];
        const td = document.createElement('td');

        const cellData = side === 'left' ? cellDiff.left : cellDiff.right;

        if (!cellData) {
          td.className = 'cell-empty';
          td.textContent = '';
        } else {
          td.className = `cell-${cellData.status}`;

          // Apply word diff for modified cells
          if (cellDiff.status === 'modified' && cellDiff.wordDiff) {
            td.innerHTML = this.applyWordDiff(cellDiff.wordDiff, side);
          } else {
            td.textContent = cellData.value || '';
          }
        }

        tr.appendChild(td);
      }

      tbody.appendChild(tr);
    }

    table.appendChild(tbody);
  },

  applyWordDiff(wordDiff, side) {
    const parts = [];

    for (const part of wordDiff) {
      if (part.added && side === 'left') {
        // Skip added parts on left side
        continue;
      }
      if (part.removed && side === 'right') {
        // Skip removed parts on right side
        continue;
      }

      let className = '';
      if (part.removed) {
        className = 'diff-word-removed';
      } else if (part.added) {
        className = 'diff-word-added';
      }

      if (className) {
        parts.push(`<span class="${className}">${this.escapeHtml(part.value)}</span>`);
      } else {
        parts.push(this.escapeHtml(part.value));
      }
    }

    return parts.join('');
  },

  getColumnLetter(index) {
    let letter = '';
    let temp = index;

    while (temp >= 0) {
      letter = String.fromCharCode((temp % 26) + 65) + letter;
      temp = Math.floor(temp / 26) - 1;
    }

    return letter;
  },

  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },

  clear() {
    document.getElementById('left-table').innerHTML = '';
    document.getElementById('right-table').innerHTML = '';
    document.getElementById('sheet-tabs').innerHTML = '';
    this.diffData = null;
    this.currentSheet = null;
  },
};
