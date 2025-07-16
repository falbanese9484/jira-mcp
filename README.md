# Jira MCP Server

A Model Context Protocol (MCP) server that provides integration with Jira, allowing AI assistants to interact with Jira issues, projects, and workflows.

## Features

This MCP server provides the following tools:

- **search_issues**: Search for Jira issues using JQL (Jira Query Language)
- **get_issue**: Get detailed information about a specific Jira issue
- **create_issue**: Create a new Jira issue
- **add_comment**: Add a comment to a Jira issue
- **get_projects**: Get list of available Jira projects
- **get_transitions**: Get available transitions for a Jira issue
- **transition_issue**: Transition a Jira issue to a new status

## Prerequisites

- Node.js 16 or higher
- A Jira instance (Cloud or Server)
- Jira API token for authentication

## Installation

1. Clone or download this repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Build the server:
   ```bash
   npm run build
   ```

## Configuration

The server requires the following environment variables:

- `JIRA_BASE_URL`: Your Jira instance URL (e.g., `https://yourcompany.atlassian.net`)
- `JIRA_EMAIL`: Your Jira account email
- `JIRA_API_TOKEN`: Your Jira API token

### Getting a Jira API Token

1. Go to [Atlassian Account Settings](https://id.atlassian.com/manage-profile/security/api-tokens)
2. Click "Create API token"
3. Give it a label and click "Create"
4. Copy the token (you won't be able to see it again)

## Usage with opencode

1. Add the server to your opencode configuration file (`opencode.json`):

```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "jira": {
      "type": "local",
      "command": ["node", "/absolute/path/to/jira-mcp/build/index.js"],
      "enabled": true,
      "environment": {
        "JIRA_BASE_URL": "https://yourcompany.atlassian.net",
        "JIRA_EMAIL": "your-email@company.com",
        "JIRA_API_TOKEN": "your-api-token-here"
      }
    }
  }
}
```

2. Restart opencode
3. The Jira tools should now be available

## Usage with Claude Desktop

If you want to use this with Claude Desktop instead, add the server to your Claude Desktop configuration file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "jira": {
      "command": "node",
      "args": ["/absolute/path/to/jira-mcp/build/index.js"],
      "env": {
        "JIRA_BASE_URL": "https://yourcompany.atlassian.net",
        "JIRA_EMAIL": "your-email@company.com",
        "JIRA_API_TOKEN": "your-api-token-here"
      }
    }
  }
}
```

## Example Usage

Once configured, you can ask opencode to help with Jira tasks:

- "Search for all open issues in project ABC"
- "Create a new task in project XYZ with summary 'Fix login bug'"
- "Add a comment to issue ABC-123 saying 'Working on this now'"
- "Show me the details of issue ABC-456"
- "What projects are available?"
- "What are the available transitions for issue ABC-789?"
- "Move issue ABC-123 to 'In Progress' status"

## JQL Examples

The `search_issues` tool uses JQL (Jira Query Language). Here are some common examples:

- `project = "ABC"` - All issues in project ABC
- `project = "ABC" AND status = "Open"` - Open issues in project ABC
- `assignee = currentUser()` - Issues assigned to you
- `reporter = currentUser()` - Issues reported by you
- `status IN ("To Do", "In Progress")` - Issues in specific statuses
- `created >= -7d` - Issues created in the last 7 days
- `priority = "High"` - High priority issues
- `text ~ "login"` - Issues containing the word "login"

## Development

To run the server in development mode:

```bash
npm run dev
```

This will watch for changes and rebuild automatically.

## Troubleshooting

### Authentication Issues
- Verify your API token is correct and hasn't expired
- Make sure you're using your email address, not username
- Check that your Jira base URL is correct (include https://)

### Connection Issues
- Ensure your Jira instance is accessible
- Check firewall/network restrictions
- Verify the base URL format (should not end with a slash)

### Permission Issues
- Make sure your account has the necessary permissions for the operations you're trying to perform
- Some operations may require project admin or Jira admin permissions

## API Reference

### search_issues
- **jql** (string): JQL query string
- **maxResults** (number, optional): Maximum results to return (default: 20)

### get_issue
- **issueKey** (string): Issue key (e.g., "PROJ-123")

### create_issue
- **projectKey** (string): Project key (e.g., "PROJ")
- **summary** (string): Issue summary/title
- **description** (string): Issue description
- **issueType** (string, optional): Issue type (default: "Task")

### add_comment
- **issueKey** (string): Issue key (e.g., "PROJ-123")
- **comment** (string): Comment text

### get_projects
No parameters required.

### get_transitions
- **issueKey** (string): Issue key (e.g., "PROJ-123")

### transition_issue
- **issueKey** (string): Issue key (e.g., "PROJ-123")
- **transitionId** (string): Transition ID (use get_transitions to find available IDs)

## License

MIT License