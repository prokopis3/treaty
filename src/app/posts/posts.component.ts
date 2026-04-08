import { AsyncPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Observable, map } from 'rxjs';
import { ApiService } from '../api.service';
import { PostModel } from '../post/post.model';

@Component({
  selector: 'app-posts',
  imports: [AsyncPipe, DatePipe, RouterLink],
  template: `
    <main class="mx-auto min-h-screen w-full max-w-5xl px-6 py-10 text-slate-100 lg:px-8">
      <header class="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p class="text-xs uppercase tracking-[0.18em] text-cyan-300">Backend Data Test</p>
          <h1 class="text-3xl font-bold text-white">SurrealDB Posts</h1>
        </div>
        <a
          class="rounded-xl bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-cyan-200"
          routerLink="/post/1"
        >
          Go To Post 1
        </a>
      </header>

      @if (posts$ | async; as posts) {
        @if (posts.length > 0) {
          <section class="grid gap-4 sm:grid-cols-2">
            @for (post of posts; track post.id) {
              <article class="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
                <p class="text-xs uppercase tracking-wide text-cyan-300">{{ post.source }}</p>
                <h2 class="mt-2 text-xl font-semibold text-white">{{ post.title }}</h2>
                <p class="mt-2 text-sm leading-6 text-slate-300">{{ post.content }}</p>
                <div class="mt-4 flex items-center justify-between text-xs text-slate-400">
                  <span>{{ post.createdAt | date: 'medium' }}</span>
                  <a class="font-semibold text-cyan-300 hover:text-cyan-200" [routerLink]="'/post/' + post.id">
                    Open
                  </a>
                </div>
              </article>
            }
          </section>
        } @else {
          <p class="rounded-xl border border-amber-400/30 bg-amber-300/10 p-4 text-amber-200">
            No posts found in SurrealDB.
          </p>
        }
      }
    </main>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class PostsComponent {
  private readonly apiService = inject(ApiService);

  protected readonly posts$: Observable<PostModel[]> = this.apiService.client.posts.get().pipe(
    map((response) => {
      const body = response as unknown as { data?: { data?: PostModel[] } | PostModel[] };

      if (Array.isArray(body.data)) {
        return body.data;
      }

      return body.data?.data ?? [];
    })
  );
}
