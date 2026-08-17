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

// Lightweight custom chart renderer (fallback if Chart.js not available)
function renderWeeklyChart(weeklyData) {
  const ctx = document.getElementById('weeklyChart');
  if (!ctx) return;

  // Check if Chart.js is loaded
  if (typeof Chart !== 'undefined') {
    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: weeklyData.map(d => d.day),
        datasets: [{
          label: 'Focus Minutes',
          data: weeklyData.map(d => d.minutes),
          backgroundColor: '#10b981',
          borderRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, grid: { color: '#e5e7eb' } },
          x: { grid: { display: false } }
        }
      }
    });
  } else {
    // Fallback simple text representation if library fails
    const fallback = document.createElement('div');
    fallback.style.padding = '1rem';
    fallback.style.opacity = '0.7';
    fallback.textContent = `Chart library unavailable. Data: ${JSON.stringify(weeklyData)}`;
    ctx.parentElement.replaceChildren(fallback);
  }
}

function renderDomainChart(domainData) {
  const ctx = document.getElementById('domainChart');
  if (!ctx) return;

  if (typeof Chart !== 'undefined') {
    new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: domainData.map(d => d.domain),
        datasets: [{
          data: domainData.map(d => d.count),
          backgroundColor: ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444'],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'right' } }
      }
    });
  } else {
    const fallback = document.createElement('div');
    fallback.style.padding = '1rem';
    fallback.style.opacity = '0.7';
    fallback.textContent = `Chart library unavailable. Top domains: ${domainData.slice(0,3).map(d=>d.domain).join(', ')}`;
    ctx.parentElement.replaceChildren(fallback);
  }
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
    alert('Failed to export data. Check console for details.');
  }
}

// Reset data functionality
async function resetData() {
  if (!confirm('Are you sure you want to clear all local data? This cannot be undone.')) return;
  
  try {
    await chrome.runtime.sendMessage({ type: 'CLEAR_ALL_DATA' });
    window.location.reload();
  } catch (error) {
    console.error('Reset failed:', error);
    alert('Failed to reset data.');
  }
}

// Initialize dashboard
document.addEventListener('DOMContentLoaded', () => {
  loadDashboardStats();

  const exportBtn = document.getElementById('exportData');
  if (exportBtn) exportBtn.addEventListener('click', exportData);

  const clearBtn = document.getElementById('clear');
  if (clearBtn) clearBtn.addEventListener('click', resetData);
});
