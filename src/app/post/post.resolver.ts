import { ActivatedRouteSnapshot } from '@angular/router';
import { inject } from '@angular/core';
import { map } from 'rxjs';
import { ApiService } from '../api.service';
import { PostModel } from './post.model';

export const resolvePost = {
  post: (route: ActivatedRouteSnapshot) =>
    inject(ApiService)
      .client.posts[route.params['id']]
      .get()
      .pipe(
        map((response) => {
          const body = response as unknown as { data?: PostModel | null };

          return body.data ?? null;
        })
      ),
};
