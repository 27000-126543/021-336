export function exportToCSV(
  data: Record<string, any>[],
  filename: string,
  headers?: { key: string; label: string }[]
) {
  if (data.length === 0) return;

  const actualHeaders =
    headers ||
    Object.keys(data[0]).map((key) => ({ key, label: key }));

  const headerRow = actualHeaders.map((h) => `"${h.label}"`).join(',');

  const dataRows = data.map((row) => {
    return actualHeaders
      .map((h) => {
        const value = row[h.key];
        if (value === null || value === undefined) return '""';
        const strValue = String(value).replace(/"/g, '""');
        return `"${strValue}"`;
      })
      .join(',');
  });

  const csvContent = '\uFEFF' + [headerRow, ...dataRows].join('\n');

  const blob = new Blob([csvContent], {
    type: 'text/csv;charset=utf-8;',
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
