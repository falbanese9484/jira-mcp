#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { JiraClient, JiraConfigSchema, formatIssue, formatProject } from "./jira-client.js";

// Environment configuration
function getJiraConfig() {
  const baseUrl = process.env.JIRA_BASE_URL;
  const email = process.env.JIRA_EMAIL;
  const apiToken = process.env.JIRA_API_TOKEN;

  if (!baseUrl || !email || !apiToken) {
    throw new Error(
      "Missing required environment variables: JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN"
    );
  }

  return JiraConfigSchema.parse({ baseUrl, email, apiToken });
}

// Create server instance
const server = new McpServer({
  name: "jira-mcp-server",
  version: "1.0.0",
  capabilities: {
    resources: {},
    tools: {},
  },
});

// Initialize Jira client
let jiraClient: JiraClient;

try {
  const config = getJiraConfig();
  jiraClient = new JiraClient(config);
} catch (error) {
  console.error("Failed to initialize Jira client:", error);
  process.exit(1);
}

// Tool: Search Issues
server.tool(
  "search_issues",
  "Search for Jira issues using JQL (Jira Query Language)",
  {
    jql: z.string().describe("JQL query string (e.g., 'project = PROJ AND status = Open')"),
    maxResults: z.number().optional().default(20).describe("Maximum number of results to return (default: 20)"),
  },
  async ({ jql, maxResults }) => {
    try {
      const result = await jiraClient.searchIssues(jql, maxResults);
      
      if (result.issues.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: `No issues found for JQL: ${jql}`,
            },
          ],
        };
      }

      const formattedIssues = result.issues.map(formatIssue).join("\n\n---\n\n");
      const summary = `Found ${result.issues.length} of ${result.total} issues:\n\n${formattedIssues}`;

      return {
        content: [
          {
            type: "text",
            text: summary,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error searching issues: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
      };
    }
  }
);

// Tool: Get Issue
server.tool(
  "get_issue",
  "Get detailed information about a specific Jira issue",
  {
    issueKey: z.string().describe("Issue key (e.g., 'PROJ-123')"),
  },
  async ({ issueKey }) => {
    try {
      const issue = await jiraClient.getIssue(issueKey);
      const formattedIssue = formatIssue(issue);

      return {
        content: [
          {
            type: "text",
            text: formattedIssue,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error getting issue ${issueKey}: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
      };
    }
  }
);

// Tool: Create Issue
server.tool(
  "create_issue",
  "Create a new Jira issue",
  {
    projectKey: z.string().describe("Project key (e.g., 'PROJ')"),
    summary: z.string().describe("Issue summary/title"),
    description: z.string().describe("Issue description"),
    issueType: z.string().optional().default("Task").describe("Issue type (default: 'Task')"),
    assignee: z.string().optional().describe("Assignee username or email (optional)"),
    storyPoints: z.number().optional().describe("Story points for the issue (optional)"),
  },
  async ({ projectKey, summary, description, issueType, assignee, storyPoints }) => {
    try {
      const createResponse = await jiraClient.createIssue(projectKey, summary, description, issueType, assignee, storyPoints);
      // Fetch the full issue details after creation
      const issue = await jiraClient.getIssue(createResponse.key);
      const formattedIssue = formatIssue(issue);

      return {
        content: [
          {
            type: "text",
            text: `Successfully created issue:\n\n${formattedIssue}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error creating issue: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
      };
    }
  }
);

// Tool: Add Comment
server.tool(
  "add_comment",
  "Add a comment to a Jira issue",
  {
    issueKey: z.string().describe("Issue key (e.g., 'PROJ-123')"),
    comment: z.string().describe("Comment text"),
  },
  async ({ issueKey, comment }) => {
    try {
      await jiraClient.addComment(issueKey, comment);

      return {
        content: [
          {
            type: "text",
            text: `Successfully added comment to ${issueKey}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error adding comment to ${issueKey}: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
      };
    }
  }
);

// Tool: Get Projects
server.tool(
  "get_projects",
  "Get list of available Jira projects",
  {},
  async () => {
    try {
      const projects = await jiraClient.getProjects();
      
      if (projects.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: "No projects found",
            },
          ],
        };
      }

      const formattedProjects = projects.map(formatProject).join("\n\n");
      const summary = `Found ${projects.length} projects:\n\n${formattedProjects}`;

      return {
        content: [
          {
            type: "text",
            text: summary,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error getting projects: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
      };
    }
  }
);

// Tool: Get Transitions
server.tool(
  "get_transitions",
  "Get available transitions for a Jira issue",
  {
    issueKey: z.string().describe("Issue key (e.g., 'PROJ-123')"),
  },
  async ({ issueKey }) => {
    try {
      const transitions = await jiraClient.getTransitions(issueKey);
      
      if (transitions.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: `No transitions available for ${issueKey}`,
            },
          ],
        };
      }

      const formattedTransitions = transitions
        .map(t => `- ${t.name} (ID: ${t.id})`)
        .join("\n");

      return {
        content: [
          {
            type: "text",
            text: `Available transitions for ${issueKey}:\n\n${formattedTransitions}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error getting transitions for ${issueKey}: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
      };
    }
  }
);

// Tool: Transition Issue
server.tool(
  "transition_issue",
  "Transition a Jira issue to a new status",
  {
    issueKey: z.string().describe("Issue key (e.g., 'PROJ-123')"),
    transitionId: z.string().describe("Transition ID (use get_transitions to find available IDs)"),
  },
  async ({ issueKey, transitionId }) => {
    try {
      await jiraClient.transitionIssue(issueKey, transitionId);

      return {
        content: [
          {
            type: "text",
            text: `Successfully transitioned ${issueKey} using transition ID ${transitionId}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error transitioning ${issueKey}: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
      };
    }
  }
);

// Main function to run the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Jira MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});