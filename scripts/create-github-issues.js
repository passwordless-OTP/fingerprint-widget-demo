#!/usr/bin/env node

/**
 * Script to create GitHub issues for the widget restoration project
 * 
 * Usage: 
 * 1. Set your GitHub token: export GITHUB_TOKEN=your_token
 * 2. Run: node scripts/create-github-issues.js
 */

const { Octokit } = require('@octokit/rest');
const fs = require('fs');
const path = require('path');

// Configuration
const owner = 'passwordless-OTP';
const repo = 'sso-plus-shopify';
const token = process.env.GITHUB_TOKEN;

if (!token) {
  console.error('Error: GITHUB_TOKEN environment variable is not set');
  process.exit(1);
}

const octokit = new Octokit({ auth: token });

// Define milestone
const milestone = {
  title: 'Phase 4: Incremental Deployment',
  description: 'Deploy the restored widget incrementally to ensure stability and minimize risk',
  due_on: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days from now
};

// Define labels
const labels = [
  { name: 'bug', color: 'd73a4a', description: 'Something isn\'t working' },
  { name: 'enhancement', color: 'a2eeef', description: 'New feature or request' },
  { name: 'documentation', color: '0075ca', description: 'Improvements or additions to documentation' },
  { name: 'test', color: '006b75', description: 'Test-related tasks' },
  { name: 'infrastructure', color: 'fbca04', description: 'CI/CD and deployment tasks' },
  { name: 'priority:high', color: 'ff0000', description: 'High priority task' },
  { name: 'priority:medium', color: 'ffff00', description: 'Medium priority task' },
  { name: 'priority:low', color: '00ff00', description: 'Low priority task' },
  { name: 'status:in-progress', color: '0052cc', description: 'Currently being worked on' },
  { name: 'status:review', color: '5319e7', description: 'Ready for review' },
  { name: 'status:blocked', color: 'b60205', description: 'Blocked by another issue or external factor' }
];

// Define issues
const issues = [
  {
    title: 'P4-001: Staging Deployment of Restored Widget',
    body: `## Description
Deploy the restored widget to the staging environment for testing and validation before production release.

## Objectives
- Verify widget functionality in a production-like environment
- Confirm backend integration
- Document deployment process

## Tasks
- [x] Set up staging environment configuration
- [x] Deploy widget code to staging server
- [x] Configure staging environment variables
- [x] Run automated tests against staging deployment
- [x] Perform manual testing of widget functionality
- [x] Verify backend integration in staging environment
- [x] Document staging deployment process
- [x] Create rollback procedure

## Acceptance Criteria
- [x] Widget is successfully deployed to staging environment
- [x] Widget is accessible at staging URL
- [x] Automated tests pass in staging environment
- [x] Manual testing confirms widget functionality
- [x] Backend integration is verified and working correctly
- [x] Deployment process is documented
- [x] Rollback procedure is in place

## Dependencies
- Phase 3: Integration Testing Complete

## Notes
- Local staging environment is configured to mirror production settings
- Deployment scripts are located in \`/scripts/deploy-staging.sh\`
- Testing scripts are located in \`/scripts/test-staging.sh\`
- Documentation available at \`/docs/staging-environment.md\`
- Local staging server is running at http://localhost:3001
- Test coverage is below thresholds - see issue for P4-004 for improvement plan
- Backend integration verified with Firebase authentication tests`,
    labels: ['infrastructure', 'status:in-progress', 'priority:high'],
    state: 'closed'
  },
  {
    title: 'P4-002: Canary Deployment',
    body: `## Description
Deploy the restored widget to a small subset of users to verify functionality in production with minimal risk.

## Objectives
- Validate widget in production environment with limited exposure
- Monitor for any issues or regressions
- Gather real user feedback

## Tasks
- [ ] Define canary deployment strategy
- [ ] Set up feature flags for canary deployment
- [ ] Configure monitoring and alerting
- [ ] Deploy widget to 5% of users
- [ ] Monitor metrics and error rates
- [ ] Collect user feedback
- [ ] Gradually increase deployment percentage if no issues
- [ ] Document canary deployment process

## Acceptance Criteria
- [ ] Widget is successfully deployed to a subset of users
- [ ] Monitoring shows no significant increase in errors
- [ ] User feedback is positive
- [ ] Deployment can be rolled back quickly if issues arise
- [ ] Canary deployment process is documented

## Dependencies
- P4-001: Staging Deployment Complete

## Notes
- Use feature flags to control deployment percentage
- Monitor key metrics: error rates, load times, conversion rates
- Have a quick rollback plan ready`,
    labels: ['infrastructure', 'priority:medium'],
    state: 'open'
  },
  {
    title: 'P4-003: Production Deployment',
    body: `## Description
Deploy the restored widget to all users after successful canary deployment.

## Objectives
- Complete the rollout of the restored widget to all users
- Ensure smooth transition with minimal disruption
- Document final production deployment process

## Tasks
- [ ] Review canary deployment results
- [ ] Update deployment scripts if needed
- [ ] Deploy widget to all users
- [ ] Monitor production metrics
- [ ] Verify widget functionality in production
- [ ] Document production deployment process
- [ ] Update project documentation

## Acceptance Criteria
- [ ] Widget is successfully deployed to all users
- [ ] All functionality works correctly in production
- [ ] No significant increase in error rates
- [ ] User experience is consistent with expectations
- [ ] Production deployment process is documented

## Dependencies
- P4-002: Canary Deployment Complete

## Notes
- Final step in the widget restoration project
- Consider scheduling deployment during low-traffic period
- Have all team members on standby during deployment`,
    labels: ['infrastructure', 'priority:medium'],
    state: 'open'
  },
  {
    title: 'P4-004: Test Coverage Improvement',
    body: `## Description
Improve test coverage for the widget and related components to meet the required thresholds (70% for statements, branches, lines, and functions).

## Objectives
- Identify areas with insufficient test coverage
- Write additional tests to improve coverage
- Document testing strategy and approach

## Tasks
- [ ] Analyze current test coverage to identify areas with the lowest coverage
- [ ] Prioritize components and functions for test coverage improvement
- [ ] Write additional tests for the LoginWidget component
- [ ] Write additional tests for the OTPLoginWidget component
- [ ] Write tests for the Firebase service mock
- [ ] Write tests for other critical components and services
- [ ] Ensure all edge cases and error scenarios are covered
- [ ] Run tests with coverage to verify improvements
- [ ] Document testing strategy and approach

## Acceptance Criteria
- [ ] Test coverage meets or exceeds the required thresholds:
  - Statements: ≥ 70%
  - Branches: ≥ 70%
  - Lines: ≥ 70%
  - Functions: ≥ 70%
- [ ] All tests pass successfully
- [ ] Testing strategy is documented
- [ ] Edge cases and error scenarios are covered

## Dependencies
- P4-001: Staging Deployment Complete

## Notes
- Focus on critical components and services first
- Consider using test-driven development (TDD) for new features
- Explore using snapshot testing for UI components
- Consider implementing integration tests in addition to unit tests`,
    labels: ['test', 'priority:high'],
    state: 'open'
  }
];

// Create project board
const createProjectBoard = async () => {
  try {
    const { data: project } = await octokit.projects.createForRepo({
      owner,
      repo,
      name: 'Widget Restoration Project',
      body: 'Project board for the widget restoration project'
    });

    console.log(`Created project board: ${project.html_url}`);

    // Create columns
    const columns = ['Backlog', 'To Do', 'In Progress', 'Review', 'Done'];
    for (const column of columns) {
      const { data } = await octokit.projects.createColumn({
        project_id: project.id,
        name: column
      });
      console.log(`Created column: ${column}`);
    }

    return project.id;
  } catch (error) {
    console.error('Error creating project board:', error.message);
    return null;
  }
};

// Create milestone
const createMilestone = async () => {
  try {
    const { data } = await octokit.issues.createMilestone({
      owner,
      repo,
      title: milestone.title,
      description: milestone.description,
      due_on: milestone.due_on
    });

    console.log(`Created milestone: ${data.title}`);
    return data.number;
  } catch (error) {
    console.error('Error creating milestone:', error.message);
    return null;
  }
};

// Create labels
const createLabels = async () => {
  for (const label of labels) {
    try {
      await octokit.issues.createLabel({
        owner,
        repo,
        name: label.name,
        color: label.color,
        description: label.description
      });
      console.log(`Created label: ${label.name}`);
    } catch (error) {
      if (error.status === 422) {
        // Label already exists, update it
        try {
          await octokit.issues.updateLabel({
            owner,
            repo,
            name: label.name,
            color: label.color,
            description: label.description
          });
          console.log(`Updated label: ${label.name}`);
        } catch (updateError) {
          console.error(`Error updating label ${label.name}:`, updateError.message);
        }
      } else {
        console.error(`Error creating label ${label.name}:`, error.message);
      }
    }
  }
};

// Create issues
const createIssues = async (milestoneNumber) => {
  for (const issue of issues) {
    try {
      const { data } = await octokit.issues.create({
        owner,
        repo,
        title: issue.title,
        body: issue.body,
        labels: issue.labels,
        milestone: milestoneNumber,
        state: issue.state
      });

      console.log(`Created issue: ${data.html_url}`);

      // If issue is closed, update its state
      if (issue.state === 'closed') {
        await octokit.issues.update({
          owner,
          repo,
          issue_number: data.number,
          state: 'closed'
        });
        console.log(`Closed issue: ${data.html_url}`);
      }
    } catch (error) {
      console.error(`Error creating issue ${issue.title}:`, error.message);
    }
  }
};

// Main function
const main = async () => {
  try {
    // Create labels
    await createLabels();

    // Create milestone
    const milestoneNumber = await createMilestone();
    if (!milestoneNumber) {
      throw new Error('Failed to create milestone');
    }

    // Create project board
    const projectId = await createProjectBoard();
    if (!projectId) {
      throw new Error('Failed to create project board');
    }

    // Create issues
    await createIssues(milestoneNumber);

    console.log('GitHub issues creation completed successfully!');
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
};

main(); 