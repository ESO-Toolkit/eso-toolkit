/** Trigger a browser download of a text file (Blob + temporary anchor). */
export function downloadTextFile(
  filename: string,
  contents: string,
  mimeType = 'text/plain',
): void {
  const blob = new Blob([contents], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
