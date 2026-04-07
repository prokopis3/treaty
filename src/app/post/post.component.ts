import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../api.service';
import { CreatePostPayload, PostModel } from './post.model';

const fb = new FormBuilder();

@Component({
  selector: 'app-post',
  imports: [ReactiveFormsModule, DatePipe, RouterLink],
  template: `
    <main class="mx-auto min-h-screen w-full max-w-3xl px-6 py-10 text-slate-100 lg:px-8">
      <header class="mb-7 flex flex-wrap items-center justify-between gap-3">
        <h1 class="text-3xl font-bold text-white">Post Details</h1>
        <a class="text-sm font-semibold text-cyan-300 hover:text-cyan-200" routerLink="/posts">
          View all posts
        </a>
      </header>

      @if (post(); as currentPost) {
        <section class="mb-8 rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
          <p class="text-xs uppercase tracking-wide text-cyan-300">{{ currentPost.source }}</p>
          <h2 class="mt-2 text-2xl font-semibold text-white">{{ currentPost.title }}</h2>
          <p class="mt-3 text-sm leading-7 text-slate-300">{{ currentPost.content }}</p>
          <p class="mt-4 text-xs text-slate-400">Created: {{ currentPost.createdAt | date: 'medium' }}</p>
        </section>
      } @else {
        <section class="mb-8 rounded-2xl border border-amber-500/30 bg-amber-300/10 p-5 text-amber-200">
          This post was not found in backend storage.
        </section>
      }

      <section class="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
        <h3 class="text-xl font-semibold text-white">Create New Post</h3>

        <form class="mt-4 grid gap-3" [formGroup]="form" (submit)="submit()">
          <label class="grid gap-1">
            <span class="text-sm text-slate-300">Title</span>
            <input
              class="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
              type="text"
              formControlName="title"
              placeholder="Browser run summary"
            />
          </label>

          <label class="grid gap-1">
            <span class="text-sm text-slate-300">Content</span>
            <textarea
              class="min-h-28 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
              formControlName="content"
              placeholder="Describe scraping results from the latest run"
            ></textarea>
          </label>

          <label class="grid gap-1">
            <span class="text-sm text-slate-300">Source</span>
            <input
              class="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
              type="text"
              formControlName="source"
              placeholder="manual"
            />
          </label>

          <button
            class="mt-2 w-fit rounded-xl bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-cyan-200 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
            type="submit"
            [disabled]="form.invalid"
          >
            Save Post
          </button>
        </form>

        @if (createdPost(); as newestPost) {
          <p class="mt-4 rounded-lg border border-emerald-400/30 bg-emerald-300/10 p-3 text-sm text-emerald-200">
            Created <strong>{{ newestPost.title }}</strong> (id: {{ newestPost.id }}).
          </p>
        }
      </section>
    </main>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class PostComponent {
  private readonly apiService = inject(ApiService);

  post = input<PostModel | null>(null);

  title = 'treaty';

  protected readonly createdPost = signal<PostModel | null>(null);

  form = fb.group({
    title: fb.control('', [Validators.required, Validators.minLength(3)]),
    content: fb.control('', [Validators.required, Validators.minLength(10)]),
    source: fb.control('manual', [Validators.required]),
  });

  submit() {
    if (this.form.invalid) return;

    const value = this.form.getRawValue();

    const payload: CreatePostPayload = {
      title: value.title ?? '',
      content: value.content ?? '',
      source: value.source ?? 'manual',
    };

    this.apiService.client.posts
      .post(payload)
      .subscribe((response) => {
        const body = response as unknown as { data?: PostModel };

        this.createdPost.set(body.data ?? null);

        if (this.createdPost()) {
          this.form.reset({
            title: '',
            content: '',
            source: 'manual',
          });
        }
      });
  }
}
