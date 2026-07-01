import puppeteer from 'puppeteer-core';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const APP_URL = 'http://127.0.0.1:5174';

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function uid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

async function main() {
  console.log('Launching Chrome...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  // Set up localStorage with a test page BEFORE navigating
  const testPageId = uid();
  const testBlockId = uid();
  const testData = JSON.stringify([{
    id: testPageId,
    title: 'Test Page for Audit',
    icon: '📄',
    favorite: false,
    trashed: false,
    tags: [],
    parentId: null,
    blocks: [{
      id: testBlockId,
      type: 'text',
      text: 'Hello world',
      richText: [],
      properties: {},
      content: []
    }],
    updatedAt: new Date().toISOString()
  }]);

  await page.goto(APP_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  
  // Inject localStorage data before the React app fully loads
  await page.evaluate((data) => {
    localStorage.setItem('pages', data);
    localStorage.setItem('activeId', JSON.stringify(JSON.parse(data)[0].id));
    localStorage.setItem('workspaceName', JSON.stringify('Test Workspace'));
    localStorage.setItem('appFlowState', JSON.stringify('workspace'));
    localStorage.setItem('sidebarOpen', JSON.stringify(true));
    localStorage.setItem('appView', JSON.stringify('page'));
    localStorage.setItem('stackedPageIds', JSON.stringify([JSON.parse(data)[0].id]));
  }, testData);

  console.log('localStorage set up with test page.');

  // Wait for app to fully render
  await sleep(3000);

  await page.screenshot({ path: 'reproduce_00_initial.png' });
  console.log('Screenshot: reproduce_00_initial.png');

  // Dump visible text to confirm app loaded
  const bodyText = await page.evaluate(() => document.body.innerText.slice(0, 2000));
  console.log('Page body text:\n', bodyText);

  // ---- TEST 1: /bold via slash menu ----
  console.log('\n===== TEST 1: /bold =====');

  // Find the editable area and click it
  const editorClicked = await page.evaluate(() => {
    const editors = document.querySelectorAll('[contenteditable="true"], textarea, .ProseMirror, [role="textbox"]');
    if (editors.length > 0) {
      editors[0].focus();
      // Clear existing content
      if (editors[0].tagName === 'TEXTAREA' || editors[0].tagName === 'INPUT') {
        editors[0].value = '';
      } else {
        editors[0].textContent = '';
      }
      return true;
    }
    return false;
  });

  if (!editorClicked) {
    console.log('No editable element found. Dumping page HTML...');
    const html = await page.content();
    console.log(html.slice(0, 3000));
  } else {
    await sleep(500);

    // Type "some text" first
    await page.keyboard.type('Some text to bold');
    await sleep(300);

    // Now type "/" to open slash menu
    await page.keyboard.type(' /bold');
    await sleep(1500);

    // Hit Enter to select the bold command
    await page.keyboard.press('Enter');
    await sleep(1000);

    await page.screenshot({ path: 'reproduce_01_after_bold.png' });
    console.log('Screenshot: reproduce_01_after_bold.png');

    // Check what the block looks like now
    const afterBold = await page.evaluate(() => {
      const editors = document.querySelectorAll('[contenteditable="true"], textarea, .ProseMirror, [role="textbox"]');
      if (editors.length > 0) {
        return {
          innerHTML: editors[0].innerHTML,
          textContent: editors[0].textContent,
          outerHTML: editors[0].outerHTML.slice(0, 500)
        };
      }
      return 'No editor found';
    });
    console.log('After bold command - editor content:', JSON.stringify(afterBold, null, 2));

    // Also check React state to see block text and richText
    const blockState = await page.evaluate(() => {
      // Try to find the page data in the DOM or localStorage
      try {
        const pages = JSON.parse(localStorage.getItem('pages') || '[]');
        const activeId = JSON.parse(localStorage.getItem('activeId') || 'null');
        const page = pages.find(p => p.id === activeId);
        if (page && page.blocks) {
          return {
            blocks: page.blocks.map(b => ({
              id: b.id,
              type: b.type,
              text: b.text,
              hasRichText: !!(b.properties && b.properties.richText),
              richTextLength: (b.properties && b.properties.richText) ? b.properties.richText.length : 0
            }))
          };
        }
        return { error: 'No page or blocks found', pagesLength: pages.length, activeId };
      } catch (e) {
        return { error: e.message };
      }
    });
    console.log('Block state after bold:', JSON.stringify(blockState, null, 2));
  }

  // ---- TEST 2: /color via slash menu ----
  console.log('\n===== TEST 2: /color =====');

  // Add a new block and test color
  await page.keyboard.press('Enter');
  await sleep(300);
  await page.keyboard.type('/color');
  await sleep(1500);
  await page.keyboard.press('Enter');
  await sleep(1000);

  await page.screenshot({ path: 'reproduce_02_after_color.png' });
  console.log('Screenshot: reproduce_02_after_color.png');

  const afterColor = await page.evaluate(() => {
    const editors = document.querySelectorAll('[contenteditable="true"], textarea, .ProseMirror, [role="textbox"]');
    if (editors.length > 1) {
      return {
        count: editors.length,
        secondEditor: {
          innerHTML: editors[1].innerHTML,
          textContent: editors[1].textContent
        }
      };
    } else if (editors.length > 0) {
      return {
        count: 1,
        innerHTML: editors[0].innerHTML
      };
    }
    return 'No editor';
  });
  console.log('After color command:', JSON.stringify(afterColor, null, 2));

  // ---- TEST 3: /inline-equation via slash menu ----
  console.log('\n===== TEST 3: /inline-equation =====');

  await page.keyboard.press('Enter');
  await sleep(300);
  await page.keyboard.type('/inline equation');
  await sleep(1500);
  await page.keyboard.press('Enter');
  await sleep(1000);

  await page.screenshot({ path: 'reproduce_03_after_equation.png' });
  console.log('Screenshot: reproduce_03_after_equation.png');

  const afterEquation = await page.evaluate(() => {
    const blockElements = document.querySelectorAll('[class*="block"], [data-block-id], .noska-block');
    const info = [];
    blockElements.forEach((el, i) => {
      const textarea = el.querySelector('textarea');
      const editor = el.querySelector('[contenteditable]');
      info.push({
        index: i,
        tagName: el.tagName,
        className: el.className.slice(0, 100),
        hasTextarea: !!textarea,
        hasEditor: !!editor,
        text: (textarea ? textarea.value : editor ? editor.textContent : el.textContent).slice(0, 100)
      });
    });
    return info;
  });
  console.log('Blocks after equation:', JSON.stringify(afterEquation, null, 2));

  await browser.close();
  console.log('\nDone - check screenshots for visual confirmation');
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
