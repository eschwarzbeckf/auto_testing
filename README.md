# AgentSwarm QA (formerly OmniTest QA Agent)

AgentSwarm QA is a sophisticated, AI-powered Quality Assurance automation tool designed to autonomously audit web applications. It leverages a multi-agent system to perform technical analysis, generate test plans, compare web interfaces against Figma designs, and produce comprehensive reports.

## Architecture

The application is composed of a React frontend and a Node.js backend, containerized using Docker.

### Frontend

The frontend is a single-page application built with **React** and styled with **Tailwind CSS**. It serves as the control panel for the entire system, allowing users to:

-   Specify the target URL to be tested.
-   Select device types for testing (desktop, mobile, tablet).
-   Optionally provide Figma credentials for visual comparison.
-   View a real-time log of the backend operations.
-   Receive a final, detailed report of the audit.

### Backend

The backend is a **Node.js** server using the **Express** framework. It features a multi-agent architecture where different "agents" are responsible for specific tasks. These agents are orchestrated to perform a comprehensive analysis of the target URL.

The agents are:

1.  **Executor Agent**: Uses **Playwright** to perform a "technical audit" of the target URL. It captures screenshots, console logs, and network status.
2.  **Architect Agent**: Uses a **Google Gemini** model to analyze the screenshot captured by the Executor Agent and generates a high-level test plan in JSON format.
3.  **Design Agent**: Utilizes the multi-modal capabilities of the **Google Gemini** model to compare the website's screenshot against a design fetched from the **Figma API**. It reports on any visual discrepancies.
4.  **Orchestrator**: The central controller that manages the agents in a sequential workflow: Audit -> Plan -> Compare -> Synthesize. It uses the AI one last time to generate a final summary report from all the collected data.

## Functionality

The user initiates a test by providing a URL through the frontend. The backend then deploys its "agent swarm" to autonomously audit the site. The agents work together to:

1.  Generate a test plan on the fly based on the visual structure of the page.
2.  Execute the plan and perform a technical audit.
3.  Compare the live site to the provided Figma designs.
4.  Produce a comprehensive report that details technical issues, visual bugs, and an overall pass/fail status.

## How to Run

The application is designed to be run with Docker.

1.  **Environment Variables**: Create a `.env` file in the root of the project and add the following environment variables:
    ```
    GOOGLE_API_KEY=your_google_api_key
    FIGMA_ACCESS_TOKEN=your_figma_access_token
    ```
2.  **Build and Run**: Use Docker Compose to build and run the containers.
    ```bash
    docker-compose up --build
    ```
3.  **Access the application**: The frontend will be available at `http://localhost:3000`.

## Future Architecture Note

The project includes an unused file, `frontend/mcp-orchestrator.js`. This file outlines a more advanced, decoupled architecture using a "Model Context Protocol" (MCP). This suggests that the current monolithic backend may be a first version, with potential plans to evolve into a more modular system of orchestrated, standalone tool servers.