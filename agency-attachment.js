function projectAgencyAttachment(p, agency, kind = 'original') {
  return kind === 'agency' ? p.agencyAttachment || '' : p.agencyAttachments?.[agency] || '';
}

function saveAgencyAttachment(i, kind, j, agency, input) {
  const t = task();
  const s = t?.subs[i];
  const p = kind === 'original' ? s?.projects[j] : s?.agencyProjects?.[j];
  if (!p || !agency || t.agency !== agency || t.paymentConfirmed || ['草稿','接单失败'].includes(t.status)) return;
  const value = input.value.trim();
  if (value.length > 35) { toast('机构附加物最多输入35字'); return; }
  if (kind === 'original') {
    p.agencyAttachments ||= {};
    if (value) p.agencyAttachments[agency] = value;
    else delete p.agencyAttachments[agency];
  } else {
    p.agencyAttachment = value;
  }
  input.value = value;
  save();
}

function decorateAgencyAttachment(t) {
  t.subs.forEach((s, i) => {
    const table = document.querySelector(`[data-subtask="${i}"] .quote-table table`);
    if (!table) return;
    const agency = s.agency || t.agency || '';
    const header = document.createElement('th');
    header.textContent = '机构附加物';
    table.tHead.rows[0].lastElementChild.before(header);
    [...table.tBodies[0].rows].slice(0, 2).forEach(row => {
      const cell = document.createElement('td');
      cell.textContent = '—';
      row.lastElementChild.before(cell);
    });
    table.tBodies[0].querySelectorAll('[data-quote-kind]').forEach(row => {
      const kind = row.dataset.quoteKind;
      const j = Number(row.dataset.quoteIndex);
      const p = kind === 'original' ? s.projects[j] : s.agencyProjects?.[j];
      if (!p) return;
      const cell = document.createElement('td');
      const input = document.createElement('input');
      input.type = 'text';
      input.maxLength = 35;
      input.value = projectAgencyAttachment(p, agency, kind);
      input.placeholder = agency ? '填写机构附加物' : '';
      input.setAttribute('aria-label', `${s.id} ${p.name} 机构附加物`);
      input.disabled = !agency || t.paymentConfirmed || ['草稿','接单失败'].includes(t.status);
      input.style.minWidth = '140px';
      input.addEventListener('change', () => saveAgencyAttachment(i, kind, j, agency, input));
      cell.append(input);
      row.lastElementChild.before(cell);
    });
  });
}
