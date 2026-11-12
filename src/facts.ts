// Shared facts for public pages. The guides import nothing from the application, so they can live and build in
// their own repository. Every value below is a checked copy: the application repository's
// scripts/check-public-facts.mjs fails when app source no longer matches it.

export const product = {name: 'WriMo', appUrl: 'https://wrimo.app'} as const;

// Status text the browser app shows. Checked against src/renderer.ts and web/entry.ts.
export const status = {
  pending: 'Pending edits…',
  saved: 'Saved locally',
  saveFailed: 'Save failed — retry Save now',
  pendingNotBackedUp: 'Pending edits · GitHub backup does not include these edits',
  backedUp: 'Backed up to GitHub',
  backedUpEarlier: 'Saved locally · last GitHub backup',
  notBackedUp: 'Saved locally · not backed up to GitHub',
  backupFailed: 'Saved locally · backup failed — retry Back up to GitHub',
} as const;

// Control labels. Checked against src/index.html, scripts/build-web.mjs, web/entry.ts and web/first-backup-ui.ts.
// newProject, openLocal and localProjects are no longer shown in the browser app and no page uses them; they stay
// until the application repository's check stops requiring them.
export const ui = {
  startWriting: 'Just start writing',
  existingProject: 'Already have a project?',
  newBlankProject: 'New blank Project',
  createProject: 'Create Project',
  openProject: 'Open Project',
  nameProject: 'Name Project',
  rename: 'Rename',
  saveName: 'Save name',
  beforeSignIn: 'Started before sign-in',
  copyAndOpen: 'Copy and open',
  signOutForOriginals: 'Sign out to open the originals',
  connectOrRecover: 'Connect or recover an existing backup',
  recoverFile: 'Recover from file',
  createAndBackUp: 'Create and back up',
  useExistingRepository: 'Use an existing repository',
  account: 'Account',
  newProject: 'New project',
  newChapter: '+ New chapter',
  saveNow: 'Save now',
  backUp: 'Back up to GitHub',
  openLocal: 'Open local project',
  recover: 'Recover from GitHub',
  signIn: 'Sign in with GitHub',
  tryGitHubAgain: 'Try GitHub again',
  exportState: 'Export current state (no history)',
  localProjects: 'Local projects',
} as const;

// GitHub sign-in renews itself while you keep using WriMo; it ends after this many months
// without use. Checked against web/github-session.ts (GitHub's documented refresh-token lifetime).
export const signInIdleMonths = 6;

// Autosave interval in milliseconds. Checked against src/renderer.ts.
export const autosaveMs = 500;

// Largest backup in bytes. Checked against MAX_BACKUP_BYTES in web/backup-format.ts.
export const backupLimitBytes = 5_000_000;
export const backupLimitLabel = `${backupLimitBytes / 1_000_000} MB`;

// Usage event names, in app order. Checked against the keys of usageRules in src/usage.ts.
export const usageEvents = [
  'page_view', 'cta_click', 'faq_open', 'splash_interaction',
  'marketing_intro', 'marketing_press', 'marketing_effect', 'marketing_celebration',
  'marketing_signup', 'marketing_beta_interest', 'marketing_dialog', 'marketing_phrase', 'early_access_submit', 'auth_state', 'sign_in_start', 'sign_in_return', 'sign_out',
  'project_create', 'project_open', 'project_close', 'project_rename', 'welcome_route', 'writing_resume', 'backup_destination',
  'backup_space', 'chapter_create', 'chapter_select', 'chapter_rename', 'outline_jump', 'format_use', 'sidebar_toggle',
  'sidebar_resize', 'focus_toggle', 'account_toggle', 'tools_toggle', 'zoom_change', 'appearance_change', 'skin_change',
  'protection_details', 'save_request', 'local_save', 'backup', 'recovery', 'project_export', 'writing_activity',
] as const;
