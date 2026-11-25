import type { WorldProject } from '../types/world';
import { validateLogicGraph } from '../editor/logic/logicEngine';

export interface PublishValidationItem {
  id: string;
  label: string;
  status: 'pass' | 'error' | 'warning';
  detail: string;
}

export interface PublishValidationReport {
  canPublish: boolean;
  items: PublishValidationItem[];
}

/**
 * Sanitizes user-entered text (project titles, bios, comments, notifications)
 * by stripping HTML angle brackets and normalizing whitespace.
 */
export function sanitizeUserText(input: string, maxLength = 280): string {
  return input
    .replace(/[<>]/g, '')
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .trim()
    .slice(0, maxLength);
}

/**
 * Validates a WorldProject before publishing into Discover.
 * Enforces title, description, spawn point presence, object budget, and logic graph integrity.
 */
export function validateProjectForPublish(
  project: WorldProject,
  maxObjectBudget = 1200
): PublishValidationReport {
  const items: PublishValidationItem[] = [];

  const title = sanitizeUserText(project.title, 80);
  if (title.length < 3) {
    items.push({
      id: 'title',
      label: 'Game Title',
      status: 'error',
      detail: 'Title must be at least 3 characters long.',
    });
  } else {
    items.push({
      id: 'title',
      label: 'Game Title',
      status: 'pass',
      detail: `"${title}" is valid.`,
    });
  }

  const description = sanitizeUserText(project.description, 400);
  if (description.length < 10) {
    items.push({
      id: 'description',
      label: 'Description',
      status: 'error',
      detail: 'Add a short description (at least 10 characters) so players know how to play.',
    });
  } else {
    items.push({
      id: 'description',
      label: 'Description',
      status: 'pass',
      detail: 'Description meets publishing guidelines.',
    });
  }

  const spawnPoints = project.objects.filter((o) => o.assetType === 'spawn_point');
  if (spawnPoints.length === 0) {
    items.push({
      id: 'spawn',
      label: 'Player Spawn Point',
      status: 'error',
      detail: 'Place at least one Spawn Point object in your world before publishing.',
    });
  } else {
    items.push({
      id: 'spawn',
      label: 'Player Spawn Point',
      status: 'pass',
      detail: `${spawnPoints.length} spawn point${spawnPoints.length > 1 ? 's' : ''} configured.`,
    });
  }

  if (project.objects.length > maxObjectBudget) {
    items.push({
      id: 'budget',
      label: 'Performance Budget',
      status: 'error',
      detail: `World has ${project.objects.length} objects, exceeding the ${maxObjectBudget} limit for browser playback.`,
    });
  } else {
    items.push({
      id: 'budget',
      label: 'Performance Budget',
      status: 'pass',
      detail: `${project.objects.length} / ${maxObjectBudget} objects (optimized for integrated graphics).`,
    });
  }

  const logicCheck = validateLogicGraph(project.logicGraph);
  if (!logicCheck.valid) {
    const firstErr = logicCheck.issues.find((i) => i.severity === 'error');
    items.push({
      id: 'logic',
      label: 'Visual Logic Graph',
      status: 'error',
      detail: firstErr?.message || 'Fix invalid logic graph connections.',
    });
  } else {
    const warnings = logicCheck.issues.filter((i) => i.severity === 'warning').length;
    items.push({
      id: 'logic',
      label: 'Visual Logic Graph',
      status: warnings > 0 ? 'warning' : 'pass',
      detail:
        warnings > 0
          ? `Logic graph compiles cleanly with ${warnings} disconnected event notice(s).`
          : `${project.logicGraph.nodes.length} visual nodes verified in sandbox.`,
    });
  }

  const canPublish = !items.some((i) => i.status === 'error');
  return { canPublish, items };
}
