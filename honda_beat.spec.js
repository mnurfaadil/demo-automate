import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

test('test download brochure', async ({ page }) => {
  // Berikan timeout lebih panjang untuk mengantisipasi jaringan lambat saat mengunduh file besar
  test.setTimeout(60000);

  // Navigasi langsung ke halaman produk Honda BeAT (Playwright best practice: direct navigation & test isolation)
  await page.goto('https://www.astra-honda.com/product/beat', { waitUntil: 'domcontentloaded' });

  const brochureLink = page.getByRole('link', { name: 'Download Brochure' });
  const brochureUrl = await brochureLink.getAttribute('href');

  // Di headless mode Chromium memicu event 'download', sedangkan di headed mode membuka tab baru ('popup')
  const downloadOrPopup = Promise.race([
    page.waitForEvent('download').then(d => ({ type: 'download', download: d })),
    page.waitForEvent('popup').then(p => ({ type: 'popup', popup: p })),
  ]);

  await brochureLink.click();
  const result = await downloadOrPopup;

  const filename = result.type === 'download' 
    ? result.download.suggestedFilename() 
    : path.basename(new URL(brochureUrl).pathname);
  const targetPath = path.join(__dirname, 'downloads', filename);

  if (result.type === 'download') {
    expect(await result.download.failure()).toBeNull();
    await result.download.saveAs(targetPath);
  } else {
    // Pada mode headed: unduh konten PDF via request context dan tutup popup tab
    const response = await page.request.get(brochureUrl);
    expect(response.ok()).toBeTruthy();
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.writeFileSync(targetPath, await response.body());
    await result.popup.close();
  }

  // Assertion: pastikan file berhasil disimpan di filesystem
  expect(fs.existsSync(targetPath)).toBeTruthy();
  console.log(`File tersimpan di: ${targetPath}`);
});
