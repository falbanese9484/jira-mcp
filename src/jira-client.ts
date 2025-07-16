import { z } from "zod";

// Configuration schema
export const JiraConfigSchema = z.object({
  baseUrl: z.string().url(),
  email: z.string().email(),
  apiToken: z.string(),
});

export type JiraConfig = z.infer<typeof JiraConfigSchema>;

// Jira API response types
export interface JiraIssue {
  id: string;
  key: string;
  fields: {
    summary: string;
    description?: string;
    status: {
      name: string;
    };
    assignee?: {
      displayName: string;
      emailAddress: string;
    };
    reporter: {
      displayName: string;
      emailAddress: string;
    };
    priority: {
      name: string;
    };
    issuetype: {
      name: string;
    };
    created: string;
    updated: string;
    project: {
      key: string;
      name: string;
    };
  };
}

export interface JiraProject {
  id: string;
  key: string;
  name: string;
  projectTypeKey: string;
  lead: {
    displayName: string;
  };
}

export interface JiraSearchResult {
  issues: JiraIssue[];
  total: number;
  maxResults: number;
  startAt: number;
}

export class JiraClient {
  private config: JiraConfig;
  private authHeader: string;

  constructor(config: JiraConfig) {
    this.config = config;
    this.authHeader = `Basic ${Buffer.from(`${config.email}:${config.apiToken}`).toString('base64')}`;
  }

  private async makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.config.baseUrl}/rest/api/3${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': this.authHeader,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Jira API error (${response.status}): ${errorText}`);
    }

    return response.json() as T;
  }

  async searchIssues(jql: string, maxResults: number = 50): Promise<JiraSearchResult> {
    const params = new URLSearchParams({
      jql,
      maxResults: maxResults.toString(),
      fields: 'id,key,summary,description,status,assignee,reporter,priority,issuetype,created,updated,project',
    });

    return this.makeRequest<JiraSearchResult>(`/search?${params}`);
  }

  async getIssue(issueKey: string): Promise<JiraIssue> {
    return this.makeRequest<JiraIssue>(`/issue/${issueKey}`);
  }

  async createIssue(projectKey: string, summary: string, description: string, issueType: string = 'Task', assignee?: string, storyPoints?: number): Promise<JiraIssue> {
    const fields: any = {
      project: { key: projectKey },
      summary,
      description: {
        type: 'doc',
        version: 1,
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: description,
              },
            ],
          },
        ],
      },
      issuetype: { name: issueType },
    };

    // Add assignee if provided
    if (assignee) {
      // Try different assignee formats
      if (assignee.includes('@')) {
        fields.assignee = { emailAddress: assignee };
      } else {
        fields.assignee = { accountId: assignee };
      }
    }

    // Add story points if provided
    if (storyPoints !== undefined) {
      fields.customfield_10032 = storyPoints;
    }

    const body = { fields };

    return this.makeRequest<JiraIssue>('/issue', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async updateIssue(issueKey: string, fields: Record<string, any>): Promise<void> {
    await this.makeRequest(`/issue/${issueKey}`, {
      method: 'PUT',
      body: JSON.stringify({ fields }),
    });
  }

  async addComment(issueKey: string, comment: string): Promise<void> {
    const body = {
      body: {
        type: 'doc',
        version: 1,
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: comment,
              },
            ],
          },
        ],
      },
    };

    await this.makeRequest(`/issue/${issueKey}/comment`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async getProjects(): Promise<JiraProject[]> {
    return this.makeRequest<JiraProject[]>('/project');
  }

  async transitionIssue(issueKey: string, transitionId: string): Promise<void> {
    const body = {
      transition: { id: transitionId },
    };

    await this.makeRequest(`/issue/${issueKey}/transitions`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async getTransitions(issueKey: string): Promise<any[]> {
    const response = await this.makeRequest<{ transitions: any[] }>(`/issue/${issueKey}/transitions`);
    return response.transitions;
  }
}

// Helper function to format issue for display
export function formatIssue(issue: JiraIssue): string {
  const assignee = issue.fields?.assignee?.displayName || 'Unassigned';
  const description = issue.fields?.description || 'No description';
  
  return `**${issue.key}: ${issue.fields?.summary || 'No title'}**
Project: ${issue.fields?.project?.name || 'Unknown'} (${issue.fields?.project?.key || 'Unknown'})
Status: ${issue.fields?.status?.name || 'Unknown'}
Type: ${issue.fields?.issuetype?.name || 'Unknown'}
Priority: ${issue.fields?.priority?.name || 'Unknown'}
Assignee: ${assignee}
Reporter: ${issue.fields?.reporter?.displayName || 'Unknown'}
Created: ${issue.fields?.created ? new Date(issue.fields.created).toLocaleDateString() : 'Unknown'}
Updated: ${issue.fields?.updated ? new Date(issue.fields.updated).toLocaleDateString() : 'Unknown'}

Description: ${description}`;
}

// Helper function to format project for display
export function formatProject(project: JiraProject): string {
  return `**${project.key}: ${project.name}**
Type: ${project.projectTypeKey}
Lead: ${project.lead.displayName}`;
}