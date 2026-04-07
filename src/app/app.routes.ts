import { Routes } from '@angular/router';
import { resolvePost } from './post/post.resolver';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./landing/landing.component'),
  },
  {
    path: 'posts',
    loadComponent: () => import('./posts/posts.component'),
  },
  {
    path: 'post/:id',
    loadComponent: () => import('./post/post.component'),
    resolve: {
      ...resolvePost,
    },
  },
];
