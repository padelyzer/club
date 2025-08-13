import { chromium } from 'playwright';
import { promises as fs } from 'fs';
import path from 'path';
import { createHash } from 'crypto';

interface VisualTestConfig {
  storybookUrl: string;
  outputDir: string;
  threshold: number; // Percentage of pixels that can differ
  viewports: Array<{ width: number; height: number; name: string }>;
}

const config: VisualTestConfig = {
  storybookUrl: process.env.STORYBOOK_URL || 'http://localhost:6006',
  outputDir: './visual-tests',
  threshold: 0.1, // 0.1% difference allowed
  viewports: [
    { width: 375, height: 667, name: 'mobile' },
    { width: 768, height: 1024, name: 'tablet' },
    { width: 1280, height: 800, name: 'desktop' },
  ],
};

class VisualRegressionTester {
  private browser: any;
  private baselineDir: string;
  private currentDir: string;
  private diffDir: string;

  constructor() {
    this.baselineDir = path.join(config.outputDir, 'baseline');
    this.currentDir = path.join(config.outputDir, 'current');
    this.diffDir = path.join(config.outputDir, 'diff');
  }

  async setup() {
    // Create directories
    await fs.mkdir(this.baselineDir, { recursive: true });
    await fs.mkdir(this.currentDir, { recursive: true });
    await fs.mkdir(this.diffDir, { recursive: true });

    // Launch browser
    this.browser = await chromium.launch();
  }

  async teardown() {
    await this.browser.close();
  }

  async captureStory(storyId: string, storyName: string) {
    const results = [];

    for (const viewport of config.viewports) {
      const context = await this.browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
      });
      const page = await context.newPage();

      try {
        // Navigate to story
        const url = `${config.storybookUrl}/iframe.html?id=${storyId}&viewMode=story`;
        await page.goto(url, { waitUntil: 'networkidle' });

        // Wait for story to render
        await page.waitForTimeout(1000);

        // Take screenshot
        const screenshotName = `${storyName}--${viewport.name}.png`;
        const screenshotPath = path.join(this.currentDir, screenshotName);
        await page.screenshot({ path: screenshotPath, fullPage: true });

        // Compare with baseline
        const baselinePath = path.join(this.baselineDir, screenshotName);
        const hasBaseline = await this.fileExists(baselinePath);

        if (!hasBaseline) {
          // Copy to baseline if it doesn't exist
          await fs.copyFile(screenshotPath, baselinePath);
          results.push({
            story: storyName,
            viewport: viewport.name,
            status: 'new',
            message: 'New baseline created',
          });
        } else {
          // Compare images
          const isDifferent = await this.compareImages(
            baselinePath,
            screenshotPath,
            path.join(this.diffDir, screenshotName)
          );

          results.push({
            story: storyName,
            viewport: viewport.name,
            status: isDifferent ? 'failed' : 'passed',
            message: isDifferent ? 'Visual differences detected' : 'No changes',
          });
        }
      } finally {
        await context.close();
      }
    }

    return results;
  }

  async compareImages(baseline: string, current: string, _diffPath: string): Promise<boolean> {
    // Simple comparison using file hashes
    // In production, use a proper image comparison library like pixelmatch
    const baselineHash = await this.getFileHash(baseline);
    const currentHash = await this.getFileHash(current);

    return baselineHash !== currentHash;
  }

  async getFileHash(filePath: string): Promise<string> {
    const fileBuffer = await fs.readFile(filePath);
    return createHash('md5').update(fileBuffer).digest('hex');
  }

  async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async runTests() {
    console.log('🎨 Starting Visual Regression Tests...\n');

    await this.setup();

    // Get stories from Storybook
    const stories = await this.getStories();
    const results = [];

    for (const story of stories) {
      console.log(`📸 Testing: ${story.name}`);
      const storyResults = await this.captureStory(story.id, story.name);
      results.push(...storyResults);
    }

    await this.teardown();

    // Generate report
    this.generateReport(results);
  }

  async getStories() {
    // In a real implementation, fetch this from Storybook's stories.json
    // For now, return a sample list
    return [
      { id: 'ui-button--default', name: 'Button-Default' },
      { id: 'ui-button--all-variants', name: 'Button-AllVariants' },
      { id: 'ui-card--default', name: 'Card-Default' },
      { id: 'ui-typography--display-variants', name: 'Typography-Display' },
      { id: 'clubs-clubcard--grid-view', name: 'ClubCard-Grid' },
      { id: 'clubs-clubcard--list-view', name: 'ClubCard-List' },
    ];
  }

  generateReport(results: any[]) {
    console.log('\n📊 Visual Regression Test Report\n');
    console.log('================================\n');

    const passed = results.filter(r => r.status === 'passed').length;
    const failed = results.filter(r => r.status === 'failed').length;
    const newBaselines = results.filter(r => r.status === 'new').length;

    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`🆕 New Baselines: ${newBaselines}`);
    console.log(`📊 Total: ${results.length}\n`);

    if (failed > 0) {
      console.log('Failed Tests:');
      results
        .filter(r => r.status === 'failed')
        .forEach(r => {
          console.log(`  - ${r.story} (${r.viewport}): ${r.message}`);
        });
    }

    // Save report as JSON
    const reportPath = path.join(config.outputDir, 'report.json');
    fs.writeFile(reportPath, JSON.stringify(results, null, 2));
  }
}

// Run tests if called directly
if (require.main === module) {
  const tester = new VisualRegressionTester();
  tester.runTests().catch(console.error);
}

export { VisualRegressionTester };