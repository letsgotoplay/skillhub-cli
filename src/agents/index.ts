import { registerAgent } from './types.js';
import { claudeCodeAgent } from './claude-code.js';
import { cursorAgent } from './cursor.js';
import { copilotAgent } from './copilot.js';
import { windsurfAgent } from './windsurf.js';
import { clineAgent } from './cline.js';
import { codexAgent } from './codex.js';
import { opencodeAgent } from './opencode.js';
import { gooseAgent } from './goose.js';
import { kiloAgent } from './kilo.js';
import { rooAgent } from './roo.js';
import { traeAgent } from './trae.js';

// Register all agents
registerAgent(claudeCodeAgent);
registerAgent(cursorAgent);
registerAgent(copilotAgent);
registerAgent(windsurfAgent);
registerAgent(clineAgent);
registerAgent(codexAgent);
registerAgent(opencodeAgent);
registerAgent(gooseAgent);
registerAgent(kiloAgent);
registerAgent(rooAgent);
registerAgent(traeAgent);

// Re-export
export * from './types.js';
export { claudeCodeAgent } from './claude-code.js';
export { cursorAgent } from './cursor.js';
export { copilotAgent } from './copilot.js';
export { windsurfAgent } from './windsurf.js';
export { clineAgent } from './cline.js';
export { codexAgent } from './codex.js';
export { opencodeAgent } from './opencode.js';
export { gooseAgent } from './goose.js';
export { kiloAgent } from './kilo.js';
export { rooAgent } from './roo.js';
export { traeAgent } from './trae.js';
