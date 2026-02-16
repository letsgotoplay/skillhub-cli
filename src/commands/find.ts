import chalk from 'chalk';
import { search } from '@inquirer/prompts';
import { apiClient } from '../api/client.js';
import { add } from './add.js';

interface SkillSearchResult {
  name: string;
  slug: string;
  description?: string;
}

export async function find(_initialQuery?: string): Promise<void> {
  console.log();
  console.log(chalk.cyan('Search for skills to install'));
  console.log(chalk.gray('Type at least 2 characters to search'));
  console.log();

  try {
    const selected = await search({
      message: 'Search skills:',
      source: async (input) => {
        if (!input || input.length < 2) {
          return [];
        }

        try {
          const results = await apiClient.getSkills({ query: input, limit: 10 });

          return (results.skills as SkillSearchResult[]).map((skill) => ({
            name: `${skill.name} (${skill.slug})${skill.description ? ` - ${skill.description.substring(0, 50)}...` : ''}`,
            value: skill.slug,
            description: skill.description,
          }));
        } catch {
          return [];
        }
      },
    });

    if (!selected) {
      console.log(chalk.gray('No skill selected.'));
      return;
    }

    console.log();
    console.log(chalk.green(`Selected skill: ${selected}`));
    console.log();

    // Run add command with the selected skill
    await add(selected);

  } catch (error) {
    if (error instanceof Error && error.message.includes('cancel')) {
      console.log(chalk.gray('Search cancelled.'));
      return;
    }
    throw error;
  }
}
