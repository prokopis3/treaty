import { PostRepository } from '../domain/post.repository';

function isAlreadyExistsError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const withKind = error as { kind?: unknown; message?: unknown };
  if (withKind.kind === 'AlreadyExists') {
    return true;
  }

  return typeof withKind.message === 'string'
    && withKind.message.toLowerCase().includes('already exists');
}

export async function seedPosts(postRepository: PostRepository): Promise<void> {
  const seedData = [
    {
      id: '1',
      title: 'Browser Automation Health Check',
      content:
        'Run scripted smoke flows every 5 minutes and alert when login or checkout steps drift.',
      source: 'seed',
    },
    {
      id: '2',
      title: 'Scraping Pipeline Throughput',
      content:
        'Processed 12,400 product pages with selector fallbacks and anti-blocking retry windows.',
      source: 'seed',
    },
    {
      id: '3',
      title: 'DOM Change Regression Log',
      content:
        'Detected structural changes on 7 target pages, replay snapshots stored for verification.',
      source: 'seed',
    },
  ] as const;

  await Promise.all(
    seedData.map(async (seed) => {
      const existing = await postRepository.getById(seed.id);

      if (existing) {
        return;
      }

      try {
        await postRepository.create(seed);
      } catch (error) {
        if (!isAlreadyExistsError(error)) {
          throw error;
        }
      }
    })
  );
}
