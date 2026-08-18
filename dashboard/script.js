/**
 * Focus Forest Dashboard - Visualization & Save for Later Logic
 * Handles charts, stats aggregation, and the "Save for Later" queue.
 */

// Safe DOM helper to prevent XSS
function safeTextContent(element, text) {
  if (element) {
    element.textContent = text;
  }
}

// Status message helper (replaces alert/confirm)
function showStatusMessage(text, isError = false) {
  let statusEl = document.getElementById('stats-status');
  if (!statusEl) {
    statusEl = document.createElement('div');
    statusEl.id = 'stats-status';
    statusEl.setAttribute('role', 'status');
    statusEl.setAttribute('aria-live', 'polite');
    statusEl.style.cssText = 'padding:0.75rem;margin:1rem 0;border-radius:8px;text-align:center;font-size:0.875rem;';
    const container = document.querySelector('.dashboard-container');
    if (container) container.prepend(statusEl);
  }
  statusEl.textContent = text;
  statusEl.style.background = isError ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)';
  statusEl.style.color = isError ? '#dc2626' : '#059669';
  statusEl.style.display = 'block';
  setTimeout(() => { statusEl.style.display = 'none'; }, 4000);
}

// Format duration in seconds to human readable string
function formatDuration(seconds) {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  const remainingMins = mins % 60;
  return `${hours}h ${remainingMins}m`;
}

// Format timestamp to date string
function formatDate(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// Aggregation logic for dashboard stats
async function loadDashboardStats() {
  try {
    const response = await chrome.runtime.sendMessage({ type: 'GET_DASHBOARD_STATS' });
    
    if (!response || response.error) {
      console.warn('Could not load dashboard stats:', response?.error);
      return;
    }

    const { totalSessions, totalFocusTime, currentStreak, weeklyData, domainData, history, savedItems } = response;

    // Update summary cards
    safeTextContent(document.getElementById('totalSessions'), totalSessions);
    safeTextContent(document.getElementById('totalFocusTime'), formatDuration(totalFocusTime));
    safeTextContent(document.getElementById('currentStreak'), currentStreak);

    // Render Charts
    renderWeeklyChart(weeklyData);
    renderDomainChart(domainData);

    // Render History Table
    renderHistoryTable(history);

    // Render Saved Items
    renderSavedItems(savedItems);
    safeTextContent(document.getElementById('savedCount'), savedItems.length);

  } catch (error) {
    console.error('Error loading dashboard stats:', error);
  }
}

// Lightweight SVG bar chart (no external dependencies)
function renderWeeklyChart(weeklyData) {
  const svg = document.getElementById('weeklyChart');
  if (!svg) return;
  svg.replaceChildren();

  if (!weeklyData || !weeklyData.length) {
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', '200'); text.setAttribute('y', '125');
    text.setAttribute('text-anchor', 'middle'); text.setAttribute('fill', '#6b7280');
    text.setAttribute('font-size', '14'); text.textContent = 'No data yet.';
    svg.append(text);
    return;
  }

  const maxVal = Math.max(1, ...weeklyData.map(d => d.minutes));
  const barW = 36; const gap = 16; const chartH = 180; const chartY = 220;
  const totalW = weeklyData.length * (barW + gap) - gap;
  const startX = (400 - totalW) / 2;

  // Grid lines
  for (let i = 0; i <= 4; i++) {
    const y = chartY - (chartH * i / 4);
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', '30'); line.setAttribute('y1', String(y));
    line.setAttribute('x2', '370'); line.setAttribute('y2', String(y));
    line.setAttribute('stroke', '#e5e7eb'); line.setAttribute('stroke-width', '1');
    svg.append(line);
    const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    label.setAttribute('x', '25'); label.setAttribute('y', String(y + 4));
    label.setAttribute('text-anchor', 'end'); label.setAttribute('fill', '#9ca3af');
    label.setAttribute('font-size', '10'); label.textContent = String(Math.round(maxVal * i / 4));
    svg.append(label);
  }

  weeklyData.forEach((d, i) => {
    const x = startX + i * (barW + gap);
    const barH = (d.minutes / maxVal) * chartH;
    const y = chartY - barH;

    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', String(x)); rect.setAttribute('y', String(y));
    rect.setAttribute('width', String(barW)); rect.setAttribute('height', String(barH));
    rect.setAttribute('rx', '4'); rect.setAttribute('fill', '#10b981');
    svg.append(rect);

    if (d.minutes > 0) {
      const val = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      val.setAttribute('x', String(x + barW / 2)); val.setAttribute('y', String(y - 6));
      val.setAttribute('text-anchor', 'middle'); val.setAttribute('fill', '#374151');
      val.setAttribute('font-size', '11'); val.setAttribute('font-weight', '600');
      val.textContent = String(d.minutes);
      svg.append(val);
    }

    const lbl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    lbl.setAttribute('x', String(x + barW / 2)); lbl.setAttribute('y', String(chartY + 16));
    lbl.setAttribute('text-anchor', 'middle'); lbl.setAttribute('fill', '#6b7280');
    lbl.setAttribute('font-size', '11'); lbl.textContent = d.day;
    svg.append(lbl);
  });
}

// Lightweight SVG doughnut chart (no external dependencies)
function renderDomainChart(domainData) {
  const svg = document.getElementById('domainChart');
  if (!svg) return;
  svg.replaceChildren();

  if (!domainData || !domainData.length) {
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', '200'); text.setAttribute('y', '125');
    text.setAttribute('text-anchor', 'middle'); text.setAttribute('fill', '#6b7280');
    text.setAttribute('font-size', '14'); text.textContent = 'No data yet.';
    svg.append(text);
    return;
  }

  const colors = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444'];
  const cx = 150; const cy = 125; const r = 90; const innerR = 50;
  const total = domainData.reduce((sum, d) => sum + d.count, 0);
  let angle = -Math.PI / 2;

  domainData.forEach((d, i) => {
    const sliceAngle = (d.count / total) * 2 * Math.PI;
    const x1 = cx + r * Math.cos(angle); const y1 = cy + r * Math.sin(angle);
    const x2 = cx + r * Math.cos(angle + sliceAngle); const y2 = cy + r * Math.sin(angle + sliceAngle);
    const ix1 = cx + innerR * Math.cos(angle); const iy1 = cy + innerR * Math.sin(angle);
    const ix2 = cx + innerR * Math.cos(angle + sliceAngle); const iy2 = cy + innerR * Math.sin(angle + sliceAngle);
    const large = sliceAngle > Math.PI ? 1 : 0;

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', `M${x1.toFixed(2)} ${y1.toFixed(2)} A${r} ${r} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} L${ix2.toFixed(2)} ${iy2.toFixed(2)} A${innerR} ${innerR} 0 ${large} 0 ${ix1.toFixed(2)} ${iy1.toFixed(2)} Z`);
    path.setAttribute('fill', colors[i % colors.length]);
    svg.append(path);
    angle += sliceAngle;
  });

  // Legend
  domainData.forEach((d, i) => {
    const ly = 60 + i * 28;
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', '290'); rect.setAttribute('y', String(ly));
    rect.setAttribute('width', '14'); rect.setAttribute('height', '14');
    rect.setAttribute('rx', '3'); rect.setAttribute('fill', colors[i % colors.length]);
    svg.append(rect);

    const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    label.setAttribute('x', '310'); label.setAttribute('y', String(ly + 11));
    label.setAttribute('fill', '#374151'); label.setAttribute('font-size', '12');
    label.textContent = d.domain.length > 18 ? d.domain.slice(0, 17) + '…' : d.domain;
    svg.append(label);

    const count = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    count.setAttribute('x', '390'); count.setAttribute('y', String(ly + 11));
    count.setAttribute('text-anchor', 'end'); count.setAttribute('fill', '#6b7280');
    count.setAttribute('font-size', '11'); count.textContent = String(d.count);
    svg.append(count);
  });
}

function renderHistoryTable(history) {
  const tbody = document.querySelector('#historyTable tbody');
  if (!tbody) return;

  if (!history || history.length === 0) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 4;
    td.className = 'empty-state';
    td.textContent = 'No sessions recorded yet.';
    tr.appendChild(td);
    tbody.replaceChildren(tr);
    return;
  }

  tbody.replaceChildren();
  history.slice(0, 10).forEach(session => {
    const tr = document.createElement('tr');
    
    const tdDate = document.createElement('td');
    tdDate.textContent = formatDate(session.timestamp);
    tr.appendChild(tdDate);
    
    const tdDomain = document.createElement('td');
    tdDomain.textContent = session.domain || 'Unknown';
    tr.appendChild(tdDomain);
    
    const tdDuration = document.createElement('td');
    tdDuration.textContent = formatDuration(session.duration);
    tr.appendChild(tdDuration);
    
    const tdType = document.createElement('td');
    const tag = document.createElement('span');
    tag.className = 'tag';
    tag.textContent = session.type;
    tdType.appendChild(tag);
    tr.appendChild(tdType);
    
    tbody.appendChild(tr);
  });
}

function renderSavedItems(items) {
  const container = document.getElementById('savedList');
  if (!container) return;

  container.replaceChildren();

  if (!items || items.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.textContent = 'No items saved yet.';
    container.appendChild(empty);
    return;
  }

  items.forEach(item => {
    const div = document.createElement('div');
    div.className = 'saved-item';
    
    const infoDiv = document.createElement('div');
    infoDiv.style.overflow = 'hidden';
    infoDiv.style.textOverflow = 'ellipsis';
    infoDiv.style.whiteSpace = 'nowrap';
    infoDiv.style.maxWidth = '70%';
    
    const titleDiv = document.createElement('div');
    titleDiv.style.fontWeight = '600';
    titleDiv.style.fontSize = '0.9rem';
    titleDiv.textContent = item.title || '';
    infoDiv.appendChild(titleDiv);
    
    const urlDiv = document.createElement('div');
    urlDiv.style.fontSize = '0.8rem';
    urlDiv.style.opacity = '0.7';
    urlDiv.textContent = item.url || '';
    infoDiv.appendChild(urlDiv);
    
    div.appendChild(infoDiv);
    
    const btn = document.createElement('button');
    btn.className = 'btn btn-secondary delete-saved';
    btn.setAttribute('data-id', item.id);
    btn.setAttribute('aria-label', 'Remove item');
    btn.textContent = '×';
    div.appendChild(btn);
    
    container.appendChild(div);
  });

  // Attach event listeners for deletion
  container.querySelectorAll('.delete-saved').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = e.target.dataset.id;
      try {
        await chrome.runtime.sendMessage({ type: 'REMOVE_SAVED_ITEM', id });
        loadDashboardStats(); // Refresh list
      } catch (err) {
        console.error('Failed to remove saved item:', err);
      }
    });
  });
}

// Simple HTML escape to prevent XSS - not used since we use textContent everywhere
// Kept for reference but deprecated
function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// Export data functionality
async function exportData() {
  try {
    const response = await chrome.runtime.sendMessage({ type: 'EXPORT_DATA' });
    if (!response || response.error) throw new Error(response.error);

    const dataStr = JSON.stringify(response.data, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `focus-forest-export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Export failed:', error);
    showStatusMessage('Failed to export data. Please try again.', true);
  }
}

// Reset data functionality — uses the care dialog from app.js if available,
// otherwise falls back to a local inline confirmation.
async function resetData() {
  // Try to use the garden's care dialog if we're embedded in the same page
  const careDialog = document.getElementById('care-dialog');
  if (careDialog) {
    // Delegate to the main dashboard's care dialog system
    document.querySelector('#care-dialog-title').textContent = 'Clear every garden?';
    document.querySelector('#care-dialog-copy').textContent = 'This removes all local gardens, trail notes, and saved curiosities from this device. Nothing is sent anywhere.';
    document.querySelector('#care-confirm').textContent = 'Clear local data';
    careDialog.hidden = false;
    document.querySelector('#care-confirm').focus();
    // Store action for the confirm handler
    careDialog.dataset.pendingAction = 'clear-stats';
    return;
  }

  // Fallback: create a simple inline dialog
  const backdrop = document.createElement('div');
  backdrop.className = 'care-dialog-backdrop';
  backdrop.setAttribute('role', 'dialog');
  backdrop.setAttribute('aria-modal', 'true');
  const dialog = document.createElement('section');
  dialog.className = 'care-dialog';
  const eyebrow = document.createElement('p'); eyebrow.className = 'eyebrow'; eyebrow.textContent = 'A QUIET DECISION';
  const title = document.createElement('h2'); title.textContent = 'Clear every garden?';
  const copy = document.createElement('p'); copy.textContent = 'This removes all local gardens, trail notes, and saved curiosities from this device. Nothing is sent anywhere.';
  const actions = document.createElement('div'); actions.className = 'care-dialog-actions';
  const cancelBtn = document.createElement('button'); cancelBtn.className = 'detail-button quiet'; cancelBtn.type = 'button'; cancelBtn.textContent = 'Keep it';
  const confirmBtn = document.createElement('button'); confirmBtn.className = 'detail-button'; confirmBtn.type = 'button'; confirmBtn.textContent = 'Clear local data';
  actions.append(cancelBtn, confirmBtn);
  dialog.append(eyebrow, title, copy, actions);
  backdrop.append(dialog);
  document.body.append(backdrop);

  cancelBtn.addEventListener('click', () => backdrop.remove());
  backdrop.addEventListener('click', (e) => { if (e.target === backdrop) backdrop.remove(); });
  document.addEventListener('keydown', function handler(e) {
    if (e.key === 'Escape') { backdrop.remove(); document.removeEventListener('keydown', handler); }
  });
  confirmBtn.addEventListener('click', async () => {
    backdrop.remove();
    try {
      await chrome.runtime.sendMessage({ type: 'CLEAR_ALL_DATA' });
      window.location.reload();
    } catch (error) {
      console.error('Reset failed:', error);
      showStatusMessage('Failed to reset data. Please try again.', true);
    }
  });
  confirmBtn.focus();
}

// Initialize dashboard
document.addEventListener('DOMContentLoaded', () => {
  loadDashboardStats();

  const exportBtn = document.getElementById('exportData');
  if (exportBtn) exportBtn.addEventListener('click', exportData);

  const clearBtn = document.getElementById('clear');
  if (clearBtn) clearBtn.addEventListener('click', resetData);
});
