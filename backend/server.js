import express from 'express';
import cors from 'cors';
import { chromium, devices } from 'playwright';
import { GoogleGenerativeAI } from "@google/generative-ai";

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// --- SHARED UTILITIES ---

class AI_Provider {
  constructor() {
    const apiKey = process.env.GOOGLE_API_KEY || "";
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  async generate(prompt, imageParts, preferredModel) {
    const modelsToTry = [
      preferredModel,
      "gemini-2.5-flash",
      "gemini-2.0-flash-exp",
      "gemini-1.5-pro",
      "gemini-1.5-flash"
    ].filter(Boolean); // Filter out undefined if preferredModel is null

    for (const modelName of modelsToTry) {
      try {
        console.log(`🧠 [AI] Trying model: ${modelName}...`);
        const model = this.genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent([prompt, ...imageParts]);
        const response = await result.response;
        return response.text();
      } catch (error) {
        console.warn(`⚠️ [AI] Model ${modelName} failed.`);
      }
    }
    throw new Error("All AI agents failed to respond.");
  }
}

// --- AGENT 1: THE ARCHITECT (Planner) ---
// Analyzes the page and creates a Testing Strategy
class ArchitectAgent {
  constructor(aiProvider) {
    this.ai = aiProvider;
  }

  async createTestPlan(htmlSnippet, screenshotBase64, device) {
    console.log("📐 [Architect] Creating Test Plan...");
    
    const prompt = `
      ROLE: Senior QA Architect.
      CONTEXT: We are testing a web application on ${device.toUpperCase()}.
      INPUT: Screenshot and HTML snippet.
      
      TASK: Create a concise Testing Plan (JSON).
      Identify 4-6 critical user flows or visual elements that MUST be verified based on the UI visible.
      
      OUTPUT JSON FORMAT:
      {
        "test_plan": [
          { "id": 1, "action": "Check Header", "expectation": "Logo and Nav visible" },
          { "id": 2, "action": "Interact with CTA", "expectation": "Button should be clickable" }
        ]
      }
    `;

    const imagePart = { inlineData: { data: screenshotBase64, mimeType: "image/png" } };
    
    try {
      const rawText = await this.ai.generate(prompt, [imagePart]);
      const cleanJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(cleanJson).test_plan;
    } catch (e) {
      console.error("Architect failed:", e);
      return [{ id: 0, action: "Fallback Plan", expectation: "Verify Page Load" }];
    }
  }
}

// --- AGENT 2: THE EXECUTOR (Tester) ---
// Runs the technical audit using Playwright
class ExecutorAgent {
  async executeAudit(url, deviceName) {
    console.log(`⚙️ [Executor] Running technical audit on ${url}...`);
    
    let browser;
    const auditResults = {
      consoleLogs: [],
      networkStatus: 0,
      screenshot: null,
      title: "",
      htmlSnippet: ""
    };

    try {
      browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
      
      // Device Setup
      let viewport = { width: 1920, height: 1080 };
      let isMobile = false;
      if (deviceName === 'mobile') {
        viewport = devices['iPhone 12'].viewport;
        isMobile = true;
      } else if (deviceName === 'tablet') {
        viewport = devices['iPad Pro 11'].viewport;
        isMobile = true;
      }

      const context = await browser.newContext({ viewport, isMobile });
      const page = await context.newPage();

      // 1. Listeners (The "Execution" part)
      page.on('console', msg => {
        if (msg.type() === 'error' || msg.type() === 'warning') {
          auditResults.consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
        }
      });

      page.on('response', response => {
        if (response.url() === url) auditResults.networkStatus = response.status();
      });

      // 2. Navigation
      await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 });
      await page.waitForTimeout(2000); // Stability wait

      // 3. Capture Data
      auditResults.title = await page.title();
      const buffer = await page.screenshot({ fullPage: false });
      auditResults.screenshot = buffer.toString('base64');
      auditResults.htmlSnippet = await page.evaluate(() => document.body.innerText.substring(0, 3000));

      await browser.close();
      return auditResults;

    } catch (error) {
      if (browser) await browser.close();
      throw new Error(`Executor Audit Failed: ${error.message}`);
    }
  }
}

// --- AGENT 3: THE DESIGNER (Visual Validator) ---
// Compares Live vs Figma
class DesignAgent {
  constructor(aiProvider) {
    this.ai = aiProvider;
  }

  async fetchFigmaImage(token, fileKey) {
    if (!token || !fileKey) return null;
    console.log(`🎨 [Design] Fetching Figma original...`);
    
    try {
      const resp = await fetch(`https://api.figma.com/v1/files/${fileKey}`, {
        headers: { 'X-Figma-Token': token }
      });
      const data = await resp.json();
      // Figma API returns 'thumbnailUrl'
      if (data.thumbnailUrl) {
        const imgResp = await fetch(data.thumbnailUrl);
        const buffer = await imgResp.arrayBuffer();
        return Buffer.from(buffer).toString('base64');
      }
    } catch (e) {
      console.error("Figma Fetch Error:", e.message);
    }
    return null;
  }

  async compare(liveScreenshot, figmaScreenshot) {
    if (!figmaScreenshot) return "No Figma Design provided for comparison.";
    
    console.log("🎨 [Design] Comparing Live vs Design...");
    const prompt = `
      ROLE: Lead UI Designer.
      TASK: Compare the 'Live Implementation' (Image 1) vs 'Figma Design' (Image 2).
      OUTPUT: A short paragraph describing the visual discrepancies (colors, alignment, missing elements).
      Be strict but concise.
    `;

    const parts = [
      { inlineData: { data: liveScreenshot, mimeType: "image/png" } },
      { inlineData: { data: figmaScreenshot, mimeType: "image/png" } }
    ];

    return await this.ai.generate(prompt, parts);
  }
}

// --- ORCHESTRATOR ---
const orchestrator = {
  ai: new AI_Provider(),
  
  async startMission(config) {
    const { url, device, figmaToken, figmaFile, llmModel } = config;
    const figmaAuth = figmaToken || process.env.FIGMA_ACCESS_TOKEN;

    // Initialize Agents
    const executor = new ExecutorAgent();
    const architect = new ArchitectAgent(this.ai);
    const designer = new DesignAgent(this.ai);

    // Step 1: Executor gathers intelligence (Run Audit)
    const auditData = await executor.executeAudit(url, device);

    // Step 2: Architect creates the plan based on what was found
    const plan = await architect.createTestPlan(auditData.htmlSnippet, auditData.screenshot, device);

    // Step 3: Designer validates visuals (Parallelizable)
    const figmaImage = await designer.fetchFigmaImage(figmaAuth, figmaFile);
    const designAnalysis = await designer.compare(auditData.screenshot, figmaImage);

    // Step 4: Final Synthesis (The Report)
    // We ask the AI to synthesize the audit data + plan + design analysis into one final JSON
    const finalReportPrompt = `
      ROLE: QA Lead.
      
      INPUTS:
      1. Test Plan Generated: ${JSON.stringify(plan)}
      2. Automated Execution Logs: Console Errors: ${auditData.consoleLogs.length}, Network Status: ${auditData.networkStatus}
      3. Design Analysis: ${designAnalysis}
      
      TASK: Generate a Final QA Report JSON.
      Determine 'status' based on: Status 200? Any Console Errors? Design matches?
      
      JSON OUTPUT:
      {
        "status": "pass" | "fail" | "warning",
        "analysis": "Summary of the mission.",
        "issues": ["List technical or visual issues"],
        "test_plan": ${JSON.stringify(plan)}, 
        "figma_analysis": "${designAnalysis ? designAnalysis.replace(/"/g, "'") : 'Not compared'}"
      }
    `;

    const parts = [{ inlineData: { data: auditData.screenshot, mimeType: "image/png" } }];
    const finalJsonRaw = await this.ai.generate(finalReportPrompt, parts, llmModel);
    const finalJson = JSON.parse(finalJsonRaw.replace(/```json/g, '').replace(/```/g, '').trim());

    return {
      ...finalJson,
      screenshot_preview: auditData.screenshot.substring(0, 50) + "...",
      figma_status: figmaImage ? 'success' : (figmaFile ? 'failed' : 'skipped')
    };
  }
};

// --- SERVER SETUP ---

app.post('/api/start-test', async (req, res) => {
  try {
    const { url, devices, figmaToken, figmaFile, llmModel } = req.body;
    const deviceToTest = devices && devices.length > 0 ? devices[0] : 'desktop';
    
    console.log(`🚀 Mission Start: ${url} [${deviceToTest}]`);
    const result = await orchestrator.startMission({ 
      url, 
      device: deviceToTest, 
      figmaToken, 
      figmaFile, 
      llmModel 
    });
    
    res.json({ success: true, data: result });
  } catch (error) {
    console.error("Mission Aborted:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/health', (req, res) => res.send('Multi-Agent System Online 🤖'));

app.listen(3000, () => console.log('Backend listening on port 3000'));