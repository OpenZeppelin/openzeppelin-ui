import { createInterface } from 'node:readline/promises';

import { parseFeatureList } from './options';
import type { CreateFeature, CreatePreset, CreateUserOptions, CreateWallet } from './types';

function normalizeAnswer(answer: string): string {
  return answer.trim().toLowerCase();
}

async function askChoice<T extends string>(
  question: (prompt: string) => Promise<string>,
  prompt: string,
  choices: readonly T[],
  defaultValue: T
): Promise<T> {
  const answer = normalizeAnswer(
    await question(`${prompt} (${choices.join('/')}) [${defaultValue}]: `)
  );
  if (!answer) return defaultValue;
  if (choices.includes(answer as T)) return answer as T;
  throw new Error(`Unsupported answer "${answer}" for ${prompt}.`);
}

/**
 *
 */
export async function promptForCreateOptions(
  initial: Partial<CreateUserOptions>
): Promise<CreateUserOptions> {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    const question = rl.question.bind(rl);
    const projectName =
      initial.projectName ?? (await question('Project directory name: ')).trim() ?? '';
    const preset = await askChoice<CreatePreset>(
      question,
      'Preset',
      ['minimal', 'dapp', 'app-shell', 'wizard'],
      initial.preset ?? 'dapp'
    );
    const wallet =
      preset === 'minimal'
        ? await askChoice<CreateWallet>(
            question,
            'Wallet integration',
            ['none', 'custom', 'rainbowkit'],
            initial.wallet ?? 'none'
          )
        : await askChoice<CreateWallet>(
            question,
            'Wallet integration',
            ['custom', 'rainbowkit', 'none'],
            initial.wallet ?? 'custom'
          );

    const advanced = normalizeAnswer(
      await question('Configure advanced scaffold components? (y/n) [n]: ')
    );
    const withFeatures: CreateFeature[] = [...(initial.withFeatures ?? [])];
    const withoutFeatures: CreateFeature[] = [...(initial.withoutFeatures ?? [])];

    if (advanced === 'y' || advanced === 'yes') {
      const withAnswer = await question(
        'Add features (comma-separated: router,sidebar,theme,toasts,tooltips,wizard,status-panel) []: '
      );
      const withoutAnswer = await question(
        'Remove features (comma-separated: wallet,router,theme,toasts,tooltips,status-panel) []: '
      );
      withFeatures.push(...parseFeatureList(withAnswer));
      withoutFeatures.push(...parseFeatureList(withoutAnswer));
    }

    return {
      ...initial,
      projectName,
      preset,
      ecosystem: 'evm',
      wallet,
      withFeatures,
      withoutFeatures,
    };
  } finally {
    rl.close();
  }
}
